"""
API ViewSets for notifications app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg
from django.shortcuts import get_object_or_404

from .models import NotificationTemplate, Notification, NotificationRecipient
from .serializers import (
    NotificationTemplateSerializer,
    NotificationSerializer,
    NotificationRecipientSerializer,
    NotificationCreateSerializer,
    NotificationStatisticsSerializer,
    NotificationTemplatePreviewSerializer,
)
from .services import NotificationService, TemplateService


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for notification templates.
    
    list: Get all templates
    create: Create new template
    retrieve: Get template details
    update: Update template
    destroy: Delete template (except system templates)
    preview: Preview rendered template with context
    """
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'is_active', 'building']

    def get_queryset(self):
        """Filter templates by building access."""
        user = self.request.user
        # TODO: Add proper building permission filtering
        return NotificationTemplate.objects.all()

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """
        Preview a rendered template with provided context.
        
        POST /api/notifications/templates/{id}/preview/
        Body: {"context": {"building_name": "...", "owner_name": "..."}}
        """
        template = self.get_object()
        serializer = NotificationTemplatePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        context = serializer.validated_data.get('context', {})
        rendered = template.render(context)

        return Response({
            'subject': rendered['subject'],
            'body': rendered['body'],
            'sms': rendered['sms'],
        })


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for notifications.
    
    list: Get all notifications
    create: Create and send notification
    retrieve: Get notification details with recipients
    stats: Get notification statistics
    resend: Resend failed notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'notification_type', 'priority', 'building']

    def get_queryset(self):
        """Filter notifications by building access."""
        user = self.request.user
        # TODO: Add proper building permission filtering
        return Notification.objects.select_related(
            'building', 'template', 'created_by'
        ).prefetch_related('recipients')

    def get_serializer_class(self):
        """Use different serializer for create action."""
        if self.action == 'create':
            return NotificationCreateSerializer
        return NotificationSerializer

    def create(self, request, *args, **kwargs):
        """
        Create and send a notification.
        
        POST /api/notifications/
        Body: {
            "template_id": 1,  // OR manual content
            "subject": "...",
            "body": "...",
            "context": {"key": "value"},  // for template
            "apartment_ids": [1, 2, 3],  // OR send_to_all
            "send_to_all": false,
            "notification_type": "email",
            "priority": "normal",
            "scheduled_at": "2025-10-01T10:00:00Z"  // optional
        }
        """
        print(f"[NOTIFICATIONS] Create request data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"[NOTIFICATIONS] Validation errors: {serializer.errors}")
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get or render content
        if data.get('template_id'):
            template = get_object_or_404(
                NotificationTemplate,
                id=data['template_id']
            )
            context = data.get('context', {})
            rendered = template.render(context)
            
            subject = rendered['subject']
            body = rendered['body']
            sms_body = rendered['sms']
        else:
            template = None
            subject = data['subject']
            body = data['body']
            sms_body = data.get('sms_body', '')

        # Get building from request (TODO: proper building selection)
        from buildings.models import Building
        building = Building.objects.first()  # TEMP

        # Create notification
        notification = NotificationService.create_notification(
            building=building,
            created_by=request.user,
            subject=subject,
            body=body,
            sms_body=sms_body,
            notification_type=data['notification_type'],
            priority=data['priority'],
            scheduled_at=data.get('scheduled_at'),
            template=template,
        )

        # Add recipients
        NotificationService.add_recipients(
            notification=notification,
            apartment_ids=data.get('apartment_ids'),
            send_to_all=data.get('send_to_all', False),
        )

        # Send immediately if not scheduled
        if not data.get('scheduled_at'):
            result = NotificationService.send_notification(notification)
            
            return Response({
                'id': notification.id,
                'status': 'sent',
                'total_recipients': notification.total_recipients,
                'successful_sends': result['success'],
                'failed_sends': result['failed'],
            }, status=status.HTTP_201_CREATED)

        # Scheduled notification
        return Response({
            'id': notification.id,
            'status': 'scheduled',
            'scheduled_at': notification.scheduled_at,
            'total_recipients': notification.total_recipients,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """
        Resend failed notifications.
        
        POST /api/notifications/{id}/resend/
        """
        notification = self.get_object()
        
        if notification.status != 'sent':
            return Response(
                {'error': 'Can only resend completed notifications'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset failed recipients to pending
        failed_recipients = notification.recipients.filter(
            status__in=['failed', 'bounced']
        )
        failed_recipients.update(status='pending')

        # Resend
        result = NotificationService.send_notification(notification)

        return Response({
            'resent': result['success'],
            'failed': result['failed'],
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get notification statistics.
        
        GET /api/notifications/stats/
        """
        notifications = self.get_queryset()

        total = notifications.count()
        by_status = dict(
            notifications.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        by_type = dict(
            notifications.values('notification_type')
            .annotate(count=Count('id'))
            .values_list('notification_type', 'count')
        )
        
        total_recipients = notifications.aggregate(
            total=Count('recipients')
        )['total'] or 0
        
        avg_delivery = notifications.exclude(
            total_recipients=0
        ).aggregate(
            avg=Avg('successful_sends') * 100 / Avg('total_recipients')
        )['avg'] or 0

        recent = notifications.order_by('-created_at')[:10]

        serializer = NotificationStatisticsSerializer(data={
            'total_notifications': total,
            'total_sent': by_status.get('sent', 0),
            'total_failed': by_status.get('failed', 0),
            'total_recipients': total_recipients,
            'average_delivery_rate': avg_delivery,
            'by_type': by_type,
            'by_status': by_status,
            'recent_notifications': NotificationSerializer(
                recent, many=True
            ).data,
        })
        serializer.is_valid()

        return Response(serializer.data)


class NotificationRecipientViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for notification recipients (read-only).
    
    list: Get all recipients
    retrieve: Get recipient details
    """
    serializer_class = NotificationRecipientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'notification', 'apartment']

    def get_queryset(self):
        """Filter recipients by building access."""
        user = self.request.user
        # TODO: Add proper building permission filtering
        return NotificationRecipient.objects.select_related(
            'notification', 'apartment'
        )

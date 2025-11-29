"""
API ViewSets for notifications app.
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db import connection
from django.db.models import Q, Count, Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone

from buildings.models import Building, BuildingMembership
from apartments.models import Apartment

from .models import (
    NotificationTemplate,
    Notification,
    NotificationRecipient,
    MonthlyNotificationTask,
    NotificationEvent
)
from .serializers import (
    NotificationTemplateSerializer,
    NotificationSerializer,
    NotificationRecipientSerializer,
    NotificationCreateSerializer,
    NotificationStatisticsSerializer,
    NotificationTemplatePreviewSerializer,
    MonthlyNotificationTaskSerializer,
    MonthlyTaskConfirmSerializer,
    MonthlyTaskConfigureSerializer,
    MonthlyTaskPreviewSerializer,
    MonthlyTaskTestSendSerializer,
    NotificationEventSerializer,
    DigestPreviewSerializer,
    SendDigestSerializer,
)
from .services import (
    NotificationService,
    TemplateService,
    NotificationEventService,
    DigestService,
    MonthlyTaskService
)
from .tasks import send_notification_task


logger = logging.getLogger(__name__)


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

    def _get_schema_name(self):
        tenant = getattr(self.request, 'tenant', None)
        if tenant:
            return tenant.schema_name
        return connection.schema_name

    def _resolve_building(self, building_id):
        """Return building ensuring the current user has access."""
        if building_id is None:
            raise ValidationError("building_id is required")

        try:
            building_id = int(building_id)
        except (TypeError, ValueError):
            raise ValidationError("Μη έγκυρο building_id")

        building = get_object_or_404(Building, id=building_id)
        user = self.request.user

        if user.is_superuser:
            return building

        if user.is_staff and building.manager_id == user.id:
            return building

        if BuildingMembership.objects.filter(building=building, resident=user).exists():
            return building

        if Apartment.objects.filter(
            building=building
        ).filter(
            Q(owner_user=user) | Q(tenant_user=user)
        ).exists():
            return building

        raise PermissionDenied("Δεν έχετε πρόσβαση στο συγκεκριμένο κτίριο")

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
        logger.info("[NOTIFICATIONS] Create request data: %s", request.data)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("[NOTIFICATIONS] Validation errors: %s", serializer.errors)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        building = self._resolve_building(data.pop('building_id'))
        
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

        # Send immediately if not scheduled via background task
        if not data.get('scheduled_at'):
            async_result = send_notification_task.delay(
                notification.id,
                self._get_schema_name(),
            )
            
            return Response({
                'id': notification.id,
                'status': 'queued',
                'task_id': async_result.id,
                'total_recipients': notification.total_recipients,
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

        # Resend asynchronously
        async_result = send_notification_task.delay(
            notification.id,
            self._get_schema_name(),
        )

        return Response({
            'status': 'queued',
            'task_id': async_result.id,
            'total_recipients': notification.total_recipients,
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

    @action(detail=False, methods=['post'])
    def send_common_expenses(self, request):
        """
        Send common expenses sheet notification with JPG attachment.

        POST /api/notifications/send_common_expenses/
        Body (multipart/form-data):
            - attachment: JPG file
            - subject: Email subject
            - body: Email body
            - month: Month string (e.g., "2025-10")
            - building_id: Building ID
            - send_to_all: Boolean (default: true)
        """
        from django.core.files.base import ContentFile

        # Get form data
        attachment_file = request.FILES.get('attachment')
        subject = request.data.get('subject', 'Λογαριασμός Κοινοχρήστων')
        body = request.data.get('body', '')
        building_id = request.data.get('building_id')
        send_to_all = request.data.get('send_to_all', 'true').lower() == 'true'

        if not attachment_file:
            return Response(
                {'error': 'Attachment file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not building_id:
            raise ValidationError("building_id is required")

        building = self._resolve_building(building_id)

        # Create notification
        notification = NotificationService.create_notification(
            building=building,
            created_by=request.user,
            subject=subject,
            body=body,
            notification_type='email',
            priority='normal',
        )

        # Save attachment
        notification.attachment.save(
            attachment_file.name,
            ContentFile(attachment_file.read()),
            save=True
        )

        # Add recipients
        NotificationService.add_recipients(
            notification=notification,
            send_to_all=send_to_all,
        )

        # Send via background task
        async_result = send_notification_task.delay(
            notification.id,
            self._get_schema_name(),
        )

        return Response({
            'id': notification.id,
            'status': 'queued',
            'task_id': async_result.id,
            'total_recipients': notification.total_recipients,
            'attachment_url': notification.attachment.url if notification.attachment else None,
        }, status=status.HTTP_201_CREATED)


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


class MonthlyNotificationTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for monthly notification tasks.
    
    Supports:
    - Listing pending tasks
    - Confirming tasks (with optional auto-send enable)
    - Skipping tasks
    - Enabling/disabling auto-send
    """
    
    serializer_class = MonthlyNotificationTaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'task_type', 'building', 'period_month']
    
    def get_queryset(self):
        """Filter by building context."""
        building_id = self.request.query_params.get('building_id')
        
        queryset = MonthlyNotificationTask.objects.select_related(
            'building',
            'template',
            'notification',
            'confirmed_by'
        )
        
        if building_id:
            queryset = queryset.filter(
                Q(building_id=building_id) | Q(building__isnull=True)
            )
        
        return queryset.order_by('-period_month', '-created_at')
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Get all pending tasks that need confirmation.
        Used for dashboard modal.
        """
        queryset = self.get_queryset().filter(
            status='pending_confirmation',
            period_month__lte=timezone.now().date()
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """
        Confirm a monthly task and optionally send immediately.
        
        Body:
        {
            "send_immediately": true,
            "enable_auto_send": false
        }
        """
        task = self.get_object()
        
        if task.status != 'pending_confirmation':
            return Response(
                {'error': 'Task is not pending confirmation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = MonthlyTaskConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update auto-send setting
        if serializer.validated_data.get('enable_auto_send'):
            task.auto_send_enabled = True
        
        # Confirm task
        task.status = 'confirmed'
        task.confirmed_at = timezone.now()
        task.confirmed_by = request.user
        task.save()
        
        # Send notification if requested
        if serializer.validated_data.get('send_immediately', True):
            from .services import MonthlyTaskService
            notification = MonthlyTaskService.execute_task(task, request.user)
            
            task.notification = notification
            task.status = 'sent'
            task.sent_at = timezone.now()
            task.save()
        
        return Response(
            MonthlyNotificationTaskSerializer(task).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def skip(self, request, pk=None):
        """Skip a monthly task for this period."""
        task = self.get_object()
        
        if task.status not in ['pending_confirmation', 'confirmed']:
            return Response(
                {'error': 'Cannot skip this task'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.status = 'skipped'
        task.save()
        
        return Response(
            MonthlyNotificationTaskSerializer(task).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def enable_auto_send(self, request, pk=None):
        """Enable automatic sending for this task (future periods)."""
        task = self.get_object()
        
        task.auto_send_enabled = True
        task.save()
        
        return Response(
            {'message': 'Auto-send enabled', 'auto_send_enabled': True},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def disable_auto_send(self, request, pk=None):
        """Disable automatic sending for this task."""
        task = self.get_object()
        
        task.auto_send_enabled = False
        task.save()

        return Response(
            {'message': 'Auto-send disabled', 'auto_send_enabled': False},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'])
    def configure(self, request):
        """
        Configure or create a monthly notification task.
        
        POST /api/notifications/monthly-tasks/configure/
        Body: {
            "task_type": "common_expense",
            "building": 1,  // or null for all buildings
            "day_of_month": 1,
            "time_to_send": "09:00",
            "template": 1,  // optional - auto-selects based on task_type if 0 or not provided
            "auto_send_enabled": false,
            "period_month": "2025-11-01"  // optional
        }
        """
        serializer = MonthlyTaskConfigureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get building
        building = None
        if data.get('building'):
            from buildings.models import Building
            building = get_object_or_404(Building, id=data['building'])
        
        # Get template - auto-select based on task_type if not provided or if 0
        template_id = data.get('template')
        if not template_id or template_id == 0:
            # Map task_type to template category
            task_type = data['task_type']
            category_map = {
                'common_expense': 'payment',
                'balance_reminder': 'payment',
                'custom': 'announcement',
            }
            category = category_map.get(task_type, 'announcement')
            
            # Try to find an active template for this category
            template = NotificationTemplate.objects.filter(
                category=category,
                is_active=True
            ).first()
            
            # If no template found, create a default one
            if not template:
                if task_type == 'common_expense':
                    template = NotificationTemplate.objects.create(
                        name=f'Κοινόχρηστα Μήνα (Auto)',
                        category='payment',
                        subject='Κοινόχρηστα {{month}}',
                        body='Αγαπητέ/ή {{resident_name}},\n\nΕπισυνάπτονται τα κοινόχρηστα του μήνα {{month}}.\n\nΜε εκτίμηση,\nΗ Διαχείριση',
                        is_active=True
                    )
                elif task_type == 'balance_reminder':
                    template = NotificationTemplate.objects.create(
                        name=f'Υπενθύμιση Οφειλής (Auto)',
                        category='payment',
                        subject='Υπενθύμιση Οφειλής',
                        body='Αγαπητέ/ή {{resident_name}},\n\nΣας υπενθυμίζουμε ότι υπάρχει εκκρεμές υπόλοιπο στον λογαριασμό σας.\n\nΜε εκτίμηση,\nΗ Διαχείριση',
                        is_active=True
                    )
                else:
                    template = NotificationTemplate.objects.create(
                        name=f'Γενική Ανακοίνωση (Auto)',
                        category='announcement',
                        subject='Ανακοίνωση',
                        body='Αγαπητέ/ή {{resident_name}},\n\n{{message}}\n\nΜε εκτίμηση,\nΗ Διαχείριση',
                        is_active=True
                    )
        else:
            template = get_object_or_404(
                NotificationTemplate,
                id=template_id
            )
        
        # Configure task
        task = MonthlyTaskService.configure_task(
            building=building,
            task_type=data['task_type'],
            day_of_month=data['day_of_month'],
            time_to_send=data['time_to_send'],
            template=template,
            auto_send_enabled=data.get('auto_send_enabled', False),
            period_month=data.get('period_month')
        )
        
        return Response(
            MonthlyNotificationTaskSerializer(task).data,
            status=status.HTTP_201_CREATED if task.status == 'pending_confirmation' else status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def schedule(self, request):
        """
        Get all scheduled monthly tasks.
        
        GET /api/notifications/monthly-tasks/schedule/
        Query params: building_id (optional)
        """
        queryset = self.get_queryset()
        
        # Filter by building if provided
        building_id = request.query_params.get('building_id')
        if building_id:
            queryset = queryset.filter(
                Q(building_id=building_id) | Q(building__isnull=True)
            )
        
        # Order by period_month and day_of_month
        queryset = queryset.order_by('period_month', 'day_of_month', 'time_to_send')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """
        Preview what notification would be sent for this task.
        
        POST /api/notifications/monthly-tasks/{id}/preview/
        Body: {
            "context": {}  // optional additional context
        }
        """
        task = self.get_object()
        
        serializer = MonthlyTaskPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        context = serializer.validated_data.get('context')
        
        try:
            preview = MonthlyTaskService.preview_task(task.id, context)
            return Response(preview, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """
        Send a test notification for this task.
        
        POST /api/notifications/monthly-tasks/{id}/test/
        Body: {
            "test_email": "test@example.com"
        }
        """
        task = self.get_object()
        
        serializer = MonthlyTaskTestSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        test_email = serializer.validated_data['test_email']
        
        try:
            result = MonthlyTaskService.test_send(task.id, test_email, request.user)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class NotificationEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for notification events (read-only).

    list: Get all events
    retrieve: Get event details
    pending: Get pending events (not sent yet)
    digest_preview: Preview digest email
    send_digest: Send digest email to all residents
    """
    serializer_class = NotificationEventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event_type', 'building', 'is_urgent', 'included_in_digest', 'sent_immediately']

    def get_queryset(self):
        """Filter events by building access."""
        user = self.request.user
        # TODO: Add proper building permission filtering
        return NotificationEvent.objects.select_related('building', 'immediate_notification')

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Get pending events that haven't been sent.

        GET /api/notifications/events/pending/?building_id=1&since_date=2025-10-01
        """
        building_id = request.query_params.get('building_id')
        since_date = request.query_params.get('since_date')

        if not building_id:
            return Response(
                {'error': 'building_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from buildings.models import Building
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Parse since_date if provided
        since_datetime = None
        if since_date:
            from dateutil import parser
            try:
                since_datetime = parser.parse(since_date)
            except Exception:
                return Response(
                    {'error': 'Invalid since_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Get pending events
        events = NotificationEventService.get_pending_events(building, since_datetime)
        serializer = self.get_serializer(events, many=True)

        # Group events by type
        grouped = NotificationEventService.group_events_by_type(events)

        return Response({
            'count': events.count(),
            'events': serializer.data,
            'events_by_type': {
                event_type: len(event_list)
                for event_type, event_list in grouped.items()
            }
        })

    @action(detail=False, methods=['post'])
    def digest_preview(self, request):
        """
        Get preview of digest email without sending.

        POST /api/notifications/events/digest_preview/
        Body: {"building_id": 1, "since_date": "2025-10-01T00:00:00Z"}
        """
        serializer = DigestPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        building_id = serializer.validated_data.get('building_id')
        since_date = serializer.validated_data.get('since_date')

        if not building_id:
            return Response(
                {'error': 'building_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from buildings.models import Building
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get digest preview
        preview = DigestService.get_digest_preview(building, since_date)

        return Response(preview)

    @action(detail=False, methods=['post'])
    def send_digest(self, request):
        """
        Send digest email to all building residents.

        POST /api/notifications/events/send_digest/
        Body: {"building_id": 1, "since_date": "2025-10-01T00:00:00Z"}
        """
        serializer = SendDigestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        building_id = serializer.validated_data.get('building_id')
        since_date = serializer.validated_data.get('since_date')

        if not building_id:
            return Response(
                {'error': 'building_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from buildings.models import Building
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Send digest
        notification = DigestService.send_digest(building, request.user, since_date)

        if notification:
            return Response({
                'message': 'Digest sent successfully',
                'notification_id': notification.id,
                'subject': notification.subject,
                'recipients': notification.total_recipients,
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'message': 'No pending events to send',
                'notification_id': None,
            }, status=status.HTTP_200_OK)

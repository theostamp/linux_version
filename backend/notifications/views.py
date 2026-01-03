"""
API ViewSets for notifications app.
"""
import logging
from datetime import datetime

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db import connection
from django.db.models import Q, Count, Avg, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from buildings.models import Building, BuildingMembership
from apartments.models import Apartment

from .models import (
    NotificationTemplate,
    Notification,
    NotificationRecipient,
    MonthlyNotificationTask,
    NotificationEvent,
    UserDeviceToken,
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
    UserDeviceTokenSerializer,
)
from .services import (
    NotificationService,
    TemplateService,
    NotificationEventService,
    DigestService,
    MonthlyTaskService
)
from .debt_reminder_breakdown_service import DebtReminderBreakdownService
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

        # ✅ Tenant-office access: allow office manager/staff of the current tenant to access tenant buildings.
        # In our multi-tenant setup, buildings live in tenant schemas, while users are shared (public schema).
        # The strict membership checks below may not cover office roles consistently.
        current_tenant = getattr(self.request, "tenant", None)
        user_tenant_id = getattr(user, "tenant_id", None)
        user_role = getattr(user, "role", None)
        if (
            current_tenant
            and user_tenant_id
            and int(user_tenant_id) == int(getattr(current_tenant, "id", 0) or 0)
            and user_role in ["manager", "office_staff"]
        ):
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

    def _parse_date_param(self, value, param_name):
        try:
            return datetime.strptime(value, '%Y-%m-%d').date()
        except (TypeError, ValueError):
            raise ValidationError({param_name: 'Invalid date format. Use YYYY-MM-DD.'})

    def _apply_date_range(self, queryset):
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            start_date = self._parse_date_param(start_date, 'start_date')
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            end_date = self._parse_date_param(end_date, 'end_date')
            queryset = queryset.filter(created_at__date__lte=end_date)

        return queryset

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return self._apply_date_range(queryset)

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

    @action(detail=False, methods=['post'])
    def send_debt_reminders(self, request):
        """
        Send personalized debt reminder emails with full breakdown + total due.

        POST /api/notifications/notifications/send_debt_reminders/
        Body:
        {
          "building_id": 1,
          "month": "2025-12",              // optional, defaults to current month
          "min_debt": "0" | "50" | "100",  // optional
          "apartment_ids": [1,2,3],        // optional; if omitted uses all apartments
          "custom_message": "..."          // optional
        }
        """
        from decimal import Decimal
        from datetime import date

        data = request.data or {}
        building = self._resolve_building(data.get('building_id'))

        month = (data.get('month') or '').strip()
        if not month:
            month = date.today().strftime('%Y-%m')

        min_debt_raw = data.get('min_debt', '0')
        try:
            min_debt = Decimal(str(min_debt_raw))
        except Exception:
            raise ValidationError("min_debt must be numeric")

        apartment_ids = data.get('apartment_ids') or None
        if apartment_ids is not None and not isinstance(apartment_ids, list):
            raise ValidationError("apartment_ids must be a list")

        custom_message = (data.get('custom_message') or '').strip()

        result = DebtReminderBreakdownService.send_debt_reminders(
            building=building,
            created_by=request.user,
            month=month,
            min_debt=min_debt,
            apartment_ids=apartment_ids,
            custom_message=custom_message,
            create_notification_if_empty=True,
        )

        return Response(
            {
                "notification_id": result.notification_id,
                "month": result.month,
                "sent": result.sent,
                "failed": result.failed,
                "skipped": result.skipped,
                "details": result.details,
            },
            status=status.HTTP_200_OK,
        )

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
        notifications = self.filter_queryset(self.get_queryset())

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

        totals = notifications.aggregate(
            total_recipients=Sum('total_recipients'),
            successful_sends=Sum('successful_sends'),
            failed_sends=Sum('failed_sends'),
        )
        total_recipients = totals['total_recipients'] or 0
        total_successful_sends = totals['successful_sends'] or 0
        total_failed_sends = totals['failed_sends'] or 0
        delivery_rate = 0
        if total_recipients > 0:
            delivery_rate = (total_successful_sends / total_recipients) * 100

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
            'total_successful_sends': total_successful_sends,
            'total_failed_sends': total_failed_sends,
            'delivery_rate': delivery_rate,
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

    @action(detail=False, methods=['post'])
    def send_personalized_common_expenses(self, request):
        """
        Send personalized common expense notifications with auto-attached sheet.

        Each apartment receives:
        - The common expense sheet (JPG) - auto-attached from existing data or uploaded
        - A personalized payment notification (Ειδοποιητήριο) with their specific amounts

        POST /api/notifications/send_personalized_common_expenses/
        Body (JSON or multipart/form-data):
            - building_id: Building ID (required)
            - month: Month string in YYYY-MM format (required, e.g., "2025-01")
            - include_sheet: Boolean - attach common expense sheet (default: true)
            - include_notification: Boolean - include personalized Ειδοποιητήριο (default: true)
            - custom_message: Optional custom message to prepend
            - attachment: Optional custom JPG file (overrides auto-attach)
            - apartment_ids: Optional list of specific apartment IDs (default: all)
        """
        from datetime import datetime
        from .common_expense_service import CommonExpenseNotificationService

        building_id = request.data.get('building_id')
        month_str = request.data.get('month')
        include_sheet = request.data.get('include_sheet', True)
        include_notification = request.data.get('include_notification', True)
        custom_message = request.data.get('custom_message', '')
        apartment_ids = request.data.get('apartment_ids')
        custom_attachment = request.FILES.get('attachment')
        mark_period_sent = request.data.get('mark_period_sent', False)
        skip_if_already_sent = request.data.get('skip_if_already_sent', False)
        sent_source = request.data.get('sent_source')

        # Validate required fields
        if not building_id:
            return Response(
                {'error': 'building_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce building access (prevents accidental sends across buildings)
        self._resolve_building(building_id)

        if not month_str:
            return Response(
                {'error': 'month is required (format: YYYY-MM)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse month
        try:
            month = datetime.strptime(month_str, '%Y-%m').date()
        except ValueError:
            return Response(
                {'error': 'Invalid month format. Use YYYY-MM'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle boolean conversion from form data
        if isinstance(include_sheet, str):
            include_sheet = include_sheet.lower() in ('true', '1', 'yes')
        if isinstance(include_notification, str):
            include_notification = include_notification.lower() in ('true', '1', 'yes')
        if isinstance(mark_period_sent, str):
            mark_period_sent = mark_period_sent.lower() in ('true', '1', 'yes')
        if isinstance(skip_if_already_sent, str):
            skip_if_already_sent = skip_if_already_sent.lower() in ('true', '1', 'yes')

        # Handle apartment_ids if string
        if isinstance(apartment_ids, str) and apartment_ids:
            try:
                apartment_ids = [int(x.strip()) for x in apartment_ids.split(',')]
            except ValueError:
                apartment_ids = None

        # Save custom attachment if provided
        custom_attachment_path = None
        if custom_attachment:
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile

            path = f'common_expenses/{building_id}/{month_str}/{custom_attachment.name}'
            custom_attachment_path = default_storage.save(path, ContentFile(custom_attachment.read()))

        # Send notifications
        results = CommonExpenseNotificationService.send_common_expense_notifications(
            building_id=int(building_id),
            month=month,
            apartment_ids=apartment_ids,
            include_sheet=include_sheet,
            include_notification=include_notification,
            custom_attachment=custom_attachment_path,
            custom_message=custom_message,
            sender_user=request.user,
            mark_period_sent=mark_period_sent,
            sent_source=sent_source,
            skip_if_already_sent=skip_if_already_sent
        )

        return Response({
            'success': results['success'],
            'sent_count': results['sent_count'],
            'failed_count': results['failed_count'],
            'sheet_attached': results.get('sheet_attached', False),
            'notification_included': results.get('notification_included', False),
            'details': results['details']
        }, status=status.HTTP_200_OK if results['success'] else status.HTTP_207_MULTI_STATUS)

    @action(detail=False, methods=['post'])
    def send_personalized_common_expenses_bulk(self, request):
        """
        Queue personalized common expense notifications for multiple buildings.

        Body (JSON):
            - building_ids: List of building IDs
            - month: Month string in YYYY-MM format (required)
            - include_sheet: Boolean (default: true)
            - include_notification: Boolean (default: true)
            - custom_message: Optional custom message to prepend
            - stagger_seconds: Optional delay between building sends (default: 60)
            - mark_period_sent: Boolean (default: true)
            - skip_if_already_sent: Boolean (default: true)
            - sent_source: Optional marker string (e.g., "manual")
        """
        from datetime import datetime
        from .tasks import send_personalized_common_expenses_task

        building_ids = request.data.get('building_ids') or request.data.get('buildings') or []
        month_str = request.data.get('month')
        include_sheet = request.data.get('include_sheet', True)
        include_notification = request.data.get('include_notification', True)
        custom_message = request.data.get('custom_message', '')
        stagger_seconds = request.data.get('stagger_seconds', 60)
        mark_period_sent = request.data.get('mark_period_sent', True)
        skip_if_already_sent = request.data.get('skip_if_already_sent', True)
        sent_source = request.data.get('sent_source')

        if isinstance(building_ids, str):
            try:
                building_ids = [int(x.strip()) for x in building_ids.split(',') if x.strip()]
            except ValueError:
                return Response(
                    {'error': 'Invalid building_ids format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if not building_ids:
            return Response(
                {'error': 'building_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not month_str:
            return Response(
                {'error': 'month is required (format: YYYY-MM)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            datetime.strptime(month_str, '%Y-%m')
        except ValueError:
            return Response(
                {'error': 'Invalid month format. Use YYYY-MM'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if isinstance(include_sheet, str):
            include_sheet = include_sheet.lower() in ('true', '1', 'yes')
        if isinstance(include_notification, str):
            include_notification = include_notification.lower() in ('true', '1', 'yes')
        if isinstance(mark_period_sent, str):
            mark_period_sent = mark_period_sent.lower() in ('true', '1', 'yes')
        if isinstance(skip_if_already_sent, str):
            skip_if_already_sent = skip_if_already_sent.lower() in ('true', '1', 'yes')

        try:
            stagger_seconds = int(stagger_seconds)
        except (ValueError, TypeError):
            stagger_seconds = 60
        if stagger_seconds < 0:
            stagger_seconds = 0

        # Enforce access for each building
        validated_building_ids = []
        for building_id in building_ids:
            try:
                building_id = int(building_id)
            except (ValueError, TypeError):
                continue
            self._resolve_building(building_id)
            validated_building_ids.append(building_id)

        if not validated_building_ids:
            return Response(
                {'error': 'No valid building_ids provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        schema_name = self._get_schema_name()
        sender_user_id = request.user.id
        queued = []

        for index, building_id in enumerate(validated_building_ids):
            countdown = max(0, index * stagger_seconds)
            async_result = send_personalized_common_expenses_task.apply_async(
                kwargs={
                    'building_id': building_id,
                    'month': month_str,
                    'include_sheet': include_sheet,
                    'include_notification': include_notification,
                    'custom_message': custom_message,
                    'mark_period_sent': mark_period_sent,
                    'sent_source': sent_source,
                    'sender_user_id': sender_user_id,
                    'schema_name': schema_name,
                    'skip_if_already_sent': skip_if_already_sent,
                },
                countdown=countdown,
            )
            queued.append({
                'building_id': building_id,
                'task_id': async_result.id,
                'countdown': countdown,
            })

        return Response({
            'queued_count': len(queued),
            'queued': queued,
        }, status=status.HTTP_202_ACCEPTED)


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
            recurrence_type=data.get('recurrence_type', 'monthly'),
            day_of_week=data.get('day_of_week'),
            day_of_month=data.get('day_of_month', 1),
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


class DeviceTokenViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user device tokens.

    list: Get all active tokens for current user
    create: Register new device token
    deactivate: Deactivate a specific token
    """
    serializer_class = UserDeviceTokenSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserDeviceToken.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def deactivate(self, request):
        """
        Deactivate a specific token.

        POST /api/notifications/devices/deactivate/
        Body: { "token": "..." }
        """
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        UserDeviceToken.objects.filter(token=token, user=request.user).update(is_active=False)
        return Response({'status': 'deactivated'})

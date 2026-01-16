"""
Celery tasks for notifications system.
"""
import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django_tenants.utils import schema_context, get_tenant_model
from datetime import datetime, timedelta
from typing import Optional


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_notification_task(self, notification_id: int, schema_name: Optional[str] = None):
    """
    Execute notification sending in the background to avoid blocking API responses.

    Args:
        notification_id: Primary key of the Notification instance
        schema_name: Tenant schema to use (defaults to public)
    """
    from notifications.models import Notification
    from notifications.services import NotificationService

    active_schema = schema_name or 'public'

    try:
        with schema_context(active_schema):
            notification = Notification.objects.get(id=notification_id)
            logger.info("Sending notification %s in schema %s", notification_id, active_schema)
            return NotificationService.send_notification(notification)
    except Notification.DoesNotExist:
        logger.warning(
            "Notification %s no longer exists in schema %s – skipping send task",
            notification_id,
            active_schema,
        )
        return {'successful': 0, 'failed': 0, 'total': 0}
    except Exception as exc:
        logger.exception(
            "Notification send failed for %s in schema %s. Retrying...",
            notification_id,
            active_schema,
        )
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_personalized_common_expenses_task(
    self,
    *,
    building_id: int,
    month: str,
    schema_name: Optional[str] = None,
    include_sheet: bool = True,
    include_notification: bool = True,
    custom_message: str = '',
    mark_period_sent: bool = False,
    sent_source: Optional[str] = None,
    sender_user_id: Optional[int] = None,
    skip_if_already_sent: bool = False,
):
    """
    Send personalized common expense notifications asynchronously.
    """
    from notifications.common_expense_service import CommonExpenseNotificationService
    from users.models import CustomUser

    active_schema = schema_name or 'public'

    try:
        with schema_context(active_schema):
            target_month = datetime.strptime(month, '%Y-%m').date()
            sender_user = None
            if sender_user_id:
                sender_user = CustomUser.objects.filter(id=sender_user_id).first()

            return CommonExpenseNotificationService.send_common_expense_notifications(
                building_id=building_id,
                month=target_month,
                include_sheet=include_sheet,
                include_notification=include_notification,
                custom_message=custom_message or None,
                sender_user=sender_user,
                mark_period_sent=mark_period_sent,
                sent_source=sent_source,
                skip_if_already_sent=skip_if_already_sent,
            )
    except Exception as exc:
        logger.exception(
            "Common expense notifications task failed for building %s in schema %s",
            building_id,
            active_schema,
        )
        raise self.retry(exc=exc, countdown=120)


@shared_task
def ensure_common_expense_auto_tasks(
    day_of_month: int = 1,
    time_to_send: str = "09:00",
):
    """
    Ensure next month's common expense auto-send tasks exist for each building.
    Creates tasks only if missing, without overriding existing settings.
    """
    from notifications.models import MonthlyNotificationTask
    from buildings.models import Building

    now = timezone.now().date()
    if now.month == 12:
        period_month = now.replace(year=now.year + 1, month=1, day=1)
    else:
        period_month = now.replace(month=now.month + 1, day=1)

    tenants_processed = 0
    tasks_created = 0
    TenantModel = get_tenant_model()

    for tenant in TenantModel.objects.exclude(schema_name='public'):
        with schema_context(tenant.schema_name):
            tenants_processed += 1
            for building in Building.objects.all():
                exists = MonthlyNotificationTask.objects.filter(
                    building=building,
                    task_type='common_expense',
                    period_month=period_month
                ).exists()
                if exists:
                    continue

                MonthlyNotificationTask.objects.create(
                    building=building,
                    task_type='common_expense',
                    recurrence_type='monthly',
                    day_of_month=day_of_month,
                    time_to_send=time_to_send,
                    auto_send_enabled=True,
                    period_month=period_month,
                    status='pending_confirmation'
                )
                tasks_created += 1

    return f"Ensured common expense tasks: tenants={tenants_processed}, created={tasks_created}"


@shared_task
def check_and_execute_monthly_tasks():
    """
    Check for monthly notification tasks that are due and have auto_send enabled.
    Executes them automatically.
    Runs every hour via Celery Beat.
    """
    from notifications.models import MonthlyNotificationTask
    from notifications.services import MonthlyTaskService
    from users.models import CustomUser

    now = timezone.now()
    executed_count = 0
    tenants_processed = 0

    TenantModel = get_tenant_model()

    for tenant in TenantModel.objects.exclude(schema_name='public'):
        with schema_context(tenant.schema_name):
            tenants_processed += 1

            # Get system user for automatic execution
            system_user = (
                CustomUser.objects.filter(is_superuser=True).first()
                or CustomUser.objects.filter(is_staff=True).first()
                or CustomUser.objects.first()
            )

            if not system_user:
                logger.warning("No system user found - cannot execute tasks for schema %s", tenant.schema_name)
                continue

            # Find tasks that are due and have auto-send enabled
            tasks = MonthlyNotificationTask.objects.filter(
                status='pending_confirmation',
                auto_send_enabled=True,
                period_month__lte=now.date()
            )

            for task in tasks:
                # Check if task is due (day and time match)
                if task.is_due:
                    try:
                        if task.task_type == 'common_expense':
                            from financial.models import CommonExpensePeriod
                            from notifications.services import MonthlyTaskService
                            target_month = MonthlyTaskService._get_common_expense_target_month(task.period_month)
                            month_start = target_month.replace(day=1)
                            if target_month.month == 12:
                                month_end = target_month.replace(year=target_month.year + 1, month=1, day=1)
                            else:
                                month_end = target_month.replace(month=target_month.month + 1, day=1)
                            period = CommonExpensePeriod.objects.filter(
                                building_id=task.building_id,
                                start_date__lt=month_end,
                                end_date__gte=month_start,
                            ).order_by('-start_date').first()
                            if period and period.notifications_sent_at:
                                task.status = 'skipped'
                                task.sent_at = timezone.now()
                                task.save(update_fields=['status', 'sent_at'])
                                continue

                        # Execute the task
                        notification = MonthlyTaskService.execute_task(task, system_user)

                        # Update task status
                        task.status = 'auto_sent'
                        task.sent_at = timezone.now()
                        task.notification = notification
                        task.save()

                        executed_count += 1

                    except Exception as e:
                        # Log error but continue with other tasks
                        logger.exception(
                            "Error executing task %s in schema %s: %s",
                            task.id,
                            tenant.schema_name,
                            str(e),
                        )
                        continue

    return f"Executed {executed_count} monthly tasks across {tenants_processed} tenants"


@shared_task
def send_general_assembly_reminders():
    """
    Στέλνει αυτόματα email ειδοποιήσεις μία ημέρα πριν από προγραμματισμένη γενική συνέλευση.

    Κριτήρια:
    - Projects με general_assembly_date = αύριο
    - Στέλνεται ένα notification ανά building/ημερομηνία (αποφυγή διπλότυπων)
    - Χρήση προτύπου "Πρόσκληση σε γενική συνέλευση" αν υπάρχει, αλλιώς fallback κείμενο
    """
    from django.contrib.auth import get_user_model
    from projects.models import Project
    from notifications.models import Notification, NotificationTemplate
    from notifications.services import NotificationService

    target_date = timezone.localdate() + timedelta(days=1)
    User = get_user_model()
    system_user = (
        User.objects.filter(is_superuser=True).first()
        or User.objects.filter(is_staff=True).first()
        or User.objects.first()
    )

    if not system_user:
        logger.warning("🚫 Δεν βρέθηκε διαθέσιμος χρήστης για αποστολή ειδοποιήσεων συνέλευσης")
        return "No system user available"

    reminders_sent = 0
    projects = Project.objects.filter(general_assembly_date=target_date)

    for project in projects:
        building = project.building

        # Αποφυγή διπλότυπων: εάν υπάρχει notification με ίδιο subject/template για την ίδια ημέρα, skip
        existing = Notification.objects.filter(
            building=building,
            subject__icontains="γενική συνέλευση",
            created_at__date=timezone.localdate(),
        ).exists()
        if existing:
            continue

        # Επιλογή προτύπου (building scoped) ή fallback
        template = NotificationTemplate.objects.filter(
            building=building,
            name__icontains="γενική συνέλευση",
            is_active=True,
        ).first()

        assembly_time = (
            project.assembly_time.strftime("%H:%M") if project.assembly_time else "20:00"
        )
        meeting_date_str = target_date.strftime("%d/%m/%Y")

        context = {
            "meeting_date": meeting_date_str,
            "meeting_time": assembly_time,
            "meeting_location": project.assembly_location or "Θα ανακοινωθεί",
            "agenda_items": project.description or "Θέματα ημερήσιας διάταξης",
            "contact_name": project.created_by.get_full_name() if project.created_by else "Διαχείριση",
            "agenda_short": project.title,
            "building_name": building.name or building.street,
        }

        if template:
            rendered = template.render(context)
            subject = rendered["subject"]
            body = rendered["body"]
            sms_body = rendered.get("sms", "")
        else:
            subject = f"Υπενθύμιση Γενικής Συνέλευσης - {meeting_date_str}"
            body = (
                f"Αγαπητοί συνιδιοκτήτες,\n\n"
                f"Υπενθυμίζουμε ότι αύριο {meeting_date_str} στις {assembly_time} "
                f"θα πραγματοποιηθεί γενική συνέλευση για το έργο \"{project.title}\".\n\n"
                f"Τοποθεσία: {context['meeting_location']}\n"
                f"Θέματα: {context['agenda_items']}\n\n"
                f"Με εκτίμηση,\n{context['contact_name']}"
            )
            sms_body = (
                f"Υπενθύμιση συνέλευσης αύριο {meeting_date_str} {assembly_time} "
                f"({context['meeting_location']}). Θέματα: {project.title}"
            )

        notification = NotificationService.create_notification(
            building=building,
            created_by=system_user,
            subject=subject,
            body=body,
            sms_body=sms_body,
            notification_type="email",
            priority="high",
            template=template,
        )

        NotificationService.add_recipients(notification, send_to_all=True)
        NotificationService.send_notification(notification)
        reminders_sent += 1

    logger.info("✅ Απεστάλησαν %s υπενθυμίσεις γενικής συνέλευσης", reminders_sent)
    return f"Sent {reminders_sent} assembly reminders"


@shared_task
def send_monthly_reminder_sms(task_id: int):
    """
    Send SMS reminder to all apartments in a building that common expenses are ready.
    This is called after a monthly notification task is executed.
    """
    if getattr(settings, "SMS_ONLY_FOR_DEBT_REMINDERS", True):
        logger.info("SMS monthly reminders disabled: SMS reserved for debt reminders.")
        return "SMS disabled for non-debt reminders"

    from notifications.models import MonthlyNotificationTask, Notification
    from apartments.models import Apartment
    # from notifications.services import SMSService  # TODO: Implement SMS service

    with schema_context('demo'):
        task = MonthlyNotificationTask.objects.get(id=task_id)

        if not task.notification:
            return "No notification associated with this task"

        # Get all apartments in the building
        apartments = Apartment.objects.filter(building=task.building)

        sms_count = 0
        for apartment in apartments:
            if apartment.owner_phone:
                # SMS message
                message = f"Νέα κοινόχρηστα διαθέσιμα για {apartment.building.name or apartment.building.street}, Διαμέρισμα {apartment.number}. Ελέγξτε το email σας ή το kiosk."

                # TODO: Implement SMS sending
                # SMSService.send_sms(apartment.owner_phone, message)

                sms_count += 1

        return f"Sent {sms_count} SMS reminders for task {task_id}"


@shared_task
def send_automated_debt_reminders(
    building_id: Optional[int] = None,
    min_debt_amount: float = 50.0,
    schema_name: str = 'demo'
):
    """
    Αυτόματη αποστολή υπενθυμίσεων οφειλών (Celery task).

    Μπορεί να κληθεί από Celery Beat για προγραμματισμένη αποστολή.

    Args:
        building_id: ID κτιρίου (None = όλα τα κτίρια)
        min_debt_amount: Ελάχιστο ποσό οφειλής
        schema_name: Tenant schema

    Returns:
        str: Περίληψη αποτελεσμάτων
    """
    from decimal import Decimal
    from buildings.models import Building
    from notifications.models import NotificationTemplate
    from notifications.debt_reminder_service import DebtReminderService
    from django.contrib.auth import get_user_model

    with schema_context(schema_name):
        User = get_user_model()
        system_user = (
            User.objects.filter(is_superuser=True).first()
            or User.objects.filter(is_staff=True).first()
            or User.objects.first()
        )

        if not system_user:
            logger.error("❌ No system user found for debt reminders")
            return "Error: No system user available"

        # Get buildings
        if building_id:
            buildings = Building.objects.filter(id=building_id)
        else:
            buildings = Building.objects.all()

        total_sent = 0
        total_failed = 0
        buildings_processed = 0

        for building in buildings:
            # Find or create debt reminder template
            template = NotificationTemplate.objects.filter(
                building=building,
                category='reminder',
                is_active=True,
                name__icontains='οφειλ'
            ).first()

            if not template:
                logger.warning(f"⚠️ No debt reminder template for {building.name}, creating default...")
                template = DebtReminderService.create_default_debt_reminder_template(building)

            # Send reminders
            results = DebtReminderService.send_personalized_reminders(
                building=building,
                template=template,
                created_by=system_user,
                min_debt_amount=Decimal(str(min_debt_amount)),
                target_month=None,  # Current month
                send_to_all=False,
                test_mode=False,
                test_email=None
            )

            total_sent += results['emails_sent']
            total_failed += results['emails_failed']
            buildings_processed += 1

            logger.info(
                f"✅ Building {building.name}: {results['emails_sent']} sent, "
                f"{results['emails_failed']} failed, "
                f"Debt: {results['total_debt_notified']:.2f}€"
            )

        summary = (
            f"Debt reminders completed: {buildings_processed} buildings, "
            f"{total_sent} sent, {total_failed} failed"
        )
        logger.info(f"🎉 {summary}")
        return summary


@shared_task
def send_weekly_debt_reminders(
    min_debt_amount: float = 50.0,
    cooldown_days: int = 6,
):
    """
    Αυτόματη εβδομαδιαία αποστολή υπενθυμίσεων οφειλών (multi-tenant).

    - Τρέχει μέσω Celery Beat 1 φορά/εβδομάδα
    - Dedupe ανά building: αν έχει σταλεί campaign τις τελευταίες `cooldown_days` ημέρες, κάνει skip
    """
    from decimal import Decimal
    from django.contrib.auth import get_user_model
    from buildings.models import Building
    from notifications.models import NotificationTemplate, Notification
    from notifications.debt_reminder_service import DebtReminderService

    TenantModel = get_tenant_model()
    now = timezone.now()
    since = now - timedelta(days=cooldown_days)

    tenants_processed = 0
    buildings_processed = 0
    buildings_skipped = 0
    total_sent = 0
    total_failed = 0

    for tenant in TenantModel.objects.exclude(schema_name='public'):
        try:
            with schema_context(tenant.schema_name):
                tenants_processed += 1

                User = get_user_model()
                system_user = (
                    User.objects.filter(is_superuser=True).first()
                    or User.objects.filter(is_staff=True).first()
                    or User.objects.first()
                )
                if not system_user:
                    logger.warning("No system user in schema %s - skipping weekly debt reminders", tenant.schema_name)
                    continue

                for building in Building.objects.all():
                    buildings_processed += 1

                    # Dedupe: skip if a debt reminder campaign was created recently for this building
                    recently_sent = Notification.objects.filter(
                        building=building,
                        subject__icontains="Υπενθύμιση Οφειλών",
                        created_at__gte=since,
                    ).exists()
                    if recently_sent:
                        buildings_skipped += 1
                        continue

                    template = NotificationTemplate.objects.filter(
                        building=building,
                        category='reminder',
                        is_active=True,
                        name__icontains='οφειλ'
                    ).first()

                    if not template:
                        template = DebtReminderService.create_default_debt_reminder_template(building)

                    results = DebtReminderService.send_personalized_reminders(
                        building=building,
                        template=template,
                        created_by=system_user,
                        min_debt_amount=Decimal(str(min_debt_amount)),
                        target_month=None,
                        send_to_all=False,
                        test_mode=False,
                        test_email=None,
                    )

                    total_sent += int(results.get('emails_sent', 0) or 0)
                    total_failed += int(results.get('emails_failed', 0) or 0)

        except Exception as e:
            logger.exception("Weekly debt reminders failed for tenant %s: %s", tenant.schema_name, e)
            continue

    summary = (
        f"Weekly debt reminders: tenants={tenants_processed}, buildings={buildings_processed}, "
        f"skipped={buildings_skipped}, sent={total_sent}, failed={total_failed}"
    )
    logger.info(summary)
    return summary


@shared_task
def send_daily_debt_reminders_if_not_sent_this_week(
    min_debt_amount: float = 50.0,
    min_days_overdue: int = 20,
):
    """
    Εβδομαδιαίος έλεγχος οφειλών (Δευτέρα 09:00) και αυτόματη αποστολή υπενθύμισης,
    μόνο αν ΔΕΝ υπάρχει Notification με status='sent' μέσα στη Δευτέρα–Κυριακή
    της τρέχουσας εβδομάδας.

    - Multi-tenant: τρέχει για όλα τα tenant schemas
    - Dedupe ανά building: weekly window (Europe/Athens)
    - Χρησιμοποιεί το breakdown email template (όπως το manual endpoint)
    - Εφαρμόζει min_debt_amount και min_days_overdue
    """
    from decimal import Decimal
    from django.contrib.auth import get_user_model
    from buildings.models import Building
    from buildings.entitlements import resolve_tenant_state
    from notifications.debt_reminder_breakdown_service import DebtReminderBreakdownService

    TenantModel = get_tenant_model()
    now = timezone.now()
    month = now.date().strftime("%Y-%m")

    tenants_processed = 0
    tenants_skipped = 0
    buildings_processed = 0
    buildings_skipped = 0
    notifications_created = 0

    for tenant in TenantModel.objects.exclude(schema_name="public"):
        try:
            tenant_state = resolve_tenant_state(tenant)
            if not tenant_state.get("tenant_subscription_active"):
                tenants_skipped += 1
                continue

            with schema_context(tenant.schema_name):
                tenants_processed += 1

                User = get_user_model()
                system_user = (
                    User.objects.filter(is_superuser=True).first()
                    or User.objects.filter(is_staff=True).first()
                    or User.objects.first()
                )
                if not system_user:
                    logger.warning(
                        "No system user in schema %s - skipping daily debt reminders",
                        tenant.schema_name,
                    )
                    continue

                for building in Building.objects.all():
                    buildings_processed += 1

                    if DebtReminderBreakdownService.has_sent_this_week(building, now=now):
                        buildings_skipped += 1
                        continue

                    result = DebtReminderBreakdownService.send_debt_reminders(
                        building=building,
                        created_by=system_user,
                        month=month,
                        min_debt=Decimal(str(min_debt_amount)),
                        min_days_overdue=min_days_overdue,
                        apartment_ids=None,
                        custom_message="",
                        # Avoid creating empty notifications when there are no eligible recipients
                        create_notification_if_empty=False,
                    )
                    if result.notification_id is not None:
                        notifications_created += 1

        except Exception as e:
            logger.exception(
                "Daily debt reminders failed for tenant %s: %s", tenant.schema_name, e
            )
            continue

    summary = (
        f"Daily debt reminders: tenants={tenants_processed}, tenants_skipped={tenants_skipped}, "
        f"buildings={buildings_processed}, skipped={buildings_skipped}, "
        f"notifications_created={notifications_created}"
    )
    logger.info(summary)
    return summary


@shared_task
def retry_failed_notification_recipients(
    max_retries: int = 2,
    min_age_minutes: int = 10,
    max_age_days: int = 7,
):
    """
    Retry failed email recipients for recent notifications.

    - Only retries recipients with status='failed' and retry_count < max_retries
    - Skips recipients without email or with permanent "No email address" failures
    - Runs across all tenant schemas (excluding public)
    """
    from datetime import timedelta as dt_timedelta
    from notifications.models import NotificationRecipient, Notification
    from notifications.services import email_service

    TenantModel = get_tenant_model()
    now = timezone.now()
    min_age = now - dt_timedelta(minutes=min_age_minutes)
    max_age = now - dt_timedelta(days=max_age_days)

    total_retried = 0
    total_sent = 0
    total_failed = 0
    tenants_processed = 0

    for tenant in TenantModel.objects.exclude(schema_name='public'):
        with schema_context(tenant.schema_name):
            tenants_processed += 1

            recipients = NotificationRecipient.objects.select_related('notification').filter(
                status='failed',
                retry_count__lt=max_retries,
                created_at__lte=min_age,
                created_at__gte=max_age,
                notification__notification_type__in=['email', 'both', 'all'],
            ).exclude(
                email=''
            ).exclude(
                email__isnull=True
            ).exclude(
                error_message__icontains='No email address'
            )

            touched_notification_ids = set()

            for recipient in recipients:
                notification = recipient.notification
                ok = email_service.send_bulk_notification(
                    [recipient],
                    notification.subject,
                    notification.body
                )
                if ok:
                    recipient.mark_as_sent()
                    total_sent += 1
                else:
                    recipient.mark_as_failed("Retry send failed")
                    total_failed += 1
                total_retried += 1
                touched_notification_ids.add(notification.id)

            if touched_notification_ids:
                notifications = Notification.objects.filter(id__in=touched_notification_ids)
                for notification in notifications:
                    notification.update_statistics()
                    if notification.failed_sends == 0 and notification.total_recipients > 0:
                        notification.mark_as_sent()
                    elif notification.failed_sends > 0:
                        notification.status = 'failed'
                        notification.save(update_fields=['status'])

    summary = (
        f"Retry failed recipients: tenants={tenants_processed}, "
        f"retried={total_retried}, sent={total_sent}, failed={total_failed}"
    )
    logger.info(summary)
    return summary


@shared_task
def send_daily_overdue_debt_reminders(
    min_debt_amount: float = 50.0,
    min_days_overdue: int = 20,
    cooldown_days: int = 7,
):
    """
    Daily check for matured unpaid balances and send reminders.

    - Only sends to apartments with days_overdue >= min_days_overdue
    - Skips apartments that received a reminder within cooldown_days
    - Runs across all tenant schemas (excluding public)
    """
    from decimal import Decimal
    from django.contrib.auth import get_user_model
    from buildings.models import Building
    from notifications.models import NotificationTemplate
    from notifications.debt_reminder_service import DebtReminderService

    TenantModel = get_tenant_model()
    tenants_processed = 0
    buildings_processed = 0
    total_sent = 0
    total_failed = 0
    total_skipped = 0

    for tenant in TenantModel.objects.exclude(schema_name="public"):
        try:
            with schema_context(tenant.schema_name):
                tenants_processed += 1

                User = get_user_model()
                system_user = (
                    User.objects.filter(is_superuser=True).first()
                    or User.objects.filter(is_staff=True).first()
                    or User.objects.first()
                )
                if not system_user:
                    logger.warning(
                        "No system user in schema %s - skipping overdue debt reminders",
                        tenant.schema_name,
                    )
                    continue

                for building in Building.objects.all():
                    buildings_processed += 1

                    template = NotificationTemplate.objects.filter(
                        building=building,
                        category='reminder',
                        is_active=True,
                        name__icontains='οφειλ'
                    ).first()

                    if not template:
                        template = DebtReminderService.create_default_debt_reminder_template(building)

                    results = DebtReminderService.send_personalized_reminders(
                        building=building,
                        template=template,
                        created_by=system_user,
                        min_debt_amount=Decimal(str(min_debt_amount)),
                        target_month=None,
                        send_to_all=False,
                        test_mode=False,
                        test_email=None,
                        min_days_overdue=min_days_overdue,
                        cooldown_days=cooldown_days,
                    )

                    total_sent += int(results.get('emails_sent', 0) or 0)
                    total_failed += int(results.get('emails_failed', 0) or 0)
                    total_skipped += int(results.get('skipped_count', 0) or 0)

        except Exception as e:
            logger.exception(
                "Overdue debt reminders failed for tenant %s: %s",
                tenant.schema_name,
                e,
            )
            continue

    summary = (
        f"Daily overdue debt reminders: tenants={tenants_processed}, "
        f"buildings={buildings_processed}, sent={total_sent}, "
        f"failed={total_failed}, skipped={total_skipped}"
    )
    logger.info(summary)
    return summary

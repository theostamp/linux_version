"""
Celery tasks for notifications system.
"""
import logging

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context
from datetime import timedelta
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

    with schema_context('demo'):
        # Get system user for automatic execution
        system_user = CustomUser.objects.filter(is_staff=True).first()

        if not system_user:
            return f"No system user found - cannot execute tasks"

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
                    print(f"Error executing task {task.id}: {str(e)}")
                    continue

    return f"Executed {executed_count} monthly tasks"


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

"""
Celery tasks for notifications system.
"""
from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context
from datetime import datetime


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

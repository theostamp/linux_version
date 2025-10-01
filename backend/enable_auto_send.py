"""
Enable auto-send for November 2025 task to test Celery automation.
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from notifications.models import MonthlyNotificationTask
from datetime import date

print("=" * 80)
print("ENABLE AUTO-SEND FOR NOVEMBER 2025 TASK")
print("=" * 80)

with schema_context('demo'):
    # Get November 2025 task
    task = MonthlyNotificationTask.objects.filter(
        period_month=date(2025, 11, 1),
        status='pending_confirmation'
    ).first()

    if not task:
        print("❌ No pending task found for November 2025")
        sys.exit(1)

    print(f"\n📋 Task #{task.id}")
    print(f"   Building: {task.building.name if task.building else 'All'}")
    print(f"   Period: {task.period_month.strftime('%B %Y')}")
    print(f"   Auto-send (before): {'✅' if task.auto_send_enabled else '❌'}")

    # Enable auto-send
    task.auto_send_enabled = True
    task.save()

    print(f"   Auto-send (after): {'✅' if task.auto_send_enabled else '❌'}")

    print("\n✅ Auto-send enabled successfully!")

    print("\n" + "=" * 80)
    print("TESTING CELERY TASK EXECUTION")
    print("=" * 80)

    # Import and run the Celery task manually
    from notifications.tasks import check_and_execute_monthly_tasks

    print("\nExecuting check_and_execute_monthly_tasks()...")
    result = check_and_execute_monthly_tasks()
    print(f"Result: {result}")

    # Check task status after execution
    task.refresh_from_db()
    print(f"\nTask Status (after): {task.status}")
    print(f"Sent At: {task.sent_at}")
    print(f"Notification: #{task.notification.id if task.notification else 'None'}")

    if task.notification:
        print(f"\n📧 Notification Details:")
        print(f"   Subject: {task.notification.subject}")
        print(f"   Recipients: {task.notification.total_recipients}")
        print(f"   Successful: {task.notification.successful_sends}")
        print(f"   Failed: {task.notification.failed_sends}")

    print("\n" + "=" * 80)
    print("AUTO-SEND TEST COMPLETE")
    print("=" * 80)

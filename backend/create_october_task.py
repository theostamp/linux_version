"""
Create October 2025 task for immediate auto-send testing.
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from notifications.models import MonthlyNotificationTask, NotificationTemplate
from buildings.models import Building
from datetime import date, time

print("=" * 80)
print("CREATE OCTOBER 2025 TASK FOR AUTO-SEND TESTING")
print("=" * 80)

with schema_context('demo'):
    # Get building
    building = Building.objects.first()

    if not building:
        print("❌ No buildings found")
        sys.exit(1)

    # Get template
    template = NotificationTemplate.objects.filter(
        category='payment',
        name__icontains='κοινόχρηστ'
    ).first()

    print(f"\n🏢 Building: {building.name or building.street}")
    print(f"📋 Template: {template.name if template else 'None'}")

    # Delete existing October task if any
    existing = MonthlyNotificationTask.objects.filter(
        building=building,
        task_type='common_expense',
        period_month=date(2025, 10, 1)
    ).first()

    if existing:
        print(f"\n🗑️  Deleting existing October task (ID: {existing.id})")
        existing.delete()

    # Create October task with auto-send enabled
    task = MonthlyNotificationTask.objects.create(
        task_type='common_expense',
        building=building,
        template=template,
        day_of_month=1,  # October 1st, 2025
        time_to_send=time(9, 0),  # 09:00
        auto_send_enabled=True,  # ✅ Enable auto-send
        period_month=date(2025, 10, 1),
        status='pending_confirmation'
    )

    print(f"\n✅ Created Task #{task.id}")
    print(f"   Period: {task.period_month.strftime('%B %Y')}")
    print(f"   Day: {task.day_of_month}")
    print(f"   Time: {task.time_to_send}")
    print(f"   Auto-send: {'✅' if task.auto_send_enabled else '❌'}")
    print(f"   Is Due: {'✅' if task.is_due else '❌'}")

    print("\n" + "=" * 80)
    print("TESTING CELERY TASK EXECUTION")
    print("=" * 80)

    # Import and run the Celery task
    from notifications.tasks import check_and_execute_monthly_tasks

    print("\n🚀 Executing check_and_execute_monthly_tasks()...")
    result = check_and_execute_monthly_tasks()
    print(f"📊 Result: {result}")

    # Check task status after execution
    task.refresh_from_db()
    print(f"\n📋 Task Status (after): {task.status}")
    print(f"   Sent At: {task.sent_at}")
    print(f"   Notification: #{task.notification.id if task.notification else 'None'}")

    if task.notification:
        print(f"\n📧 Notification Details:")
        print(f"   ID: {task.notification.id}")
        print(f"   Subject: {task.notification.subject}")
        print(f"   Recipients: {task.notification.total_recipients}")
        print(f"   Successful: {task.notification.successful_sends}")
        print(f"   Failed: {task.notification.failed_sends}")
        print(f"   Status: {task.notification.status}")

    print("\n" + "=" * 80)
    print("✅ AUTO-SEND TEST COMPLETE")
    print("=" * 80)

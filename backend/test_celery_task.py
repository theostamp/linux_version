"""
Test script to verify Celery task implementation.
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

print("=" * 80)
print("CELERY TASK TEST")
print("=" * 80)

with schema_context('demo'):
    # Check existing tasks
    pending_tasks = MonthlyNotificationTask.objects.filter(
        status='pending_confirmation'
    )

    print(f"\n📋 Pending Tasks: {pending_tasks.count()}")

    for task in pending_tasks:
        print(f"\n  Task #{task.id}:")
        print(f"    Building: {task.building.name if task.building else 'All'}")
        print(f"    Period: {task.period_month.strftime('%B %Y')}")
        print(f"    Auto-send: {'✅' if task.auto_send_enabled else '❌'}")
        print(f"    Is Due: {'✅' if task.is_due else '❌'}")

    # Test auto-send eligible tasks
    auto_send_tasks = pending_tasks.filter(auto_send_enabled=True)
    print(f"\n✅ Auto-send Enabled Tasks: {auto_send_tasks.count()}")

    print("\n" + "=" * 80)
    print("TEST: Import Celery Task")
    print("=" * 80)

    try:
        from notifications.tasks import check_and_execute_monthly_tasks
        print("✅ Successfully imported check_and_execute_monthly_tasks")
        print(f"   Task name: {check_and_execute_monthly_tasks.name}")
        print(f"   Task module: {check_and_execute_monthly_tasks.__module__}")
    except Exception as e:
        print(f"❌ Error importing task: {e}")

    print("\n" + "=" * 80)
    print("CELERY TASK TEST COMPLETE")
    print("=" * 80)

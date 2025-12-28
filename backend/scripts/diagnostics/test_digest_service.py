"""
Test script for digest service.
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from notifications.models import NotificationEvent
from notifications.services import DigestService, NotificationEventService
from buildings.models import Building
from users.models import CustomUser

with schema_context('demo'):
    building = Building.objects.first()
    user = CustomUser.objects.filter(is_staff=True).first()

    print(f"Building: {building.name}")
    print(f"User: {user.email}\n")

    # Get pending events
    pending_events = NotificationEventService.get_pending_events(building)
    print(f"=== Pending Events: {pending_events.count()} ===")
    for event in pending_events:
        print(f"  {event.get_icon()} {event.title}")

    # Create a few more test events
    print("\n=== Creating additional test events ===")

    NotificationEventService.create_event(
        event_type='maintenance',
        building=building,
        title="Συντήρηση Ασανσέρ",
        description="Προγραμματισμένη συντήρηση ασανσέρ για 15/10/2025",
        url="/maintenance/1",
    )
    print("  ✓ Created maintenance event")

    NotificationEventService.create_event(
        event_type='vote',
        building=building,
        title="Ψηφοφορία: Ανακαίνιση Εισόδου",
        description="Ψηφίστε για την ανακαίνιση της εισόδου του κτιρίου",
        url="/votes/1",
    )
    print("  ✓ Created vote event")

    # Get updated pending events
    pending_events = NotificationEventService.get_pending_events(building)
    print(f"\nTotal pending events: {pending_events.count()}\n")

    # Get digest preview
    print("=== Digest Preview ===")
    preview = DigestService.get_digest_preview(building)

    print(f"Subject: {preview['subject']}")
    print(f"Event count: {preview['event_count']}")
    print(f"Events by type: {preview['events_by_type']}")
    print(f"\nHTML Body (first 500 chars):")
    print(preview['body'][:500])
    print("...")

    # Test sending digest (will actually send emails in DEBUG mode)
    print("\n=== Attempting to send digest ===")
    try:
        notification = DigestService.send_digest(building, user)
        if notification:
            print(f"✅ Digest sent! Notification ID: {notification.id}")
            print(f"   Subject: {notification.subject}")
            print(f"   Recipients: {notification.total_recipients}")
            print(f"   Status: {notification.get_status_display()}")
        else:
            print("No digest sent (no pending events)")
    except Exception as e:
        print(f"❌ Error sending digest: {str(e)}")
        import traceback
        traceback.print_exc()

    # Check if events were marked as sent
    print("\n=== Events after digest ===")
    remaining_pending = NotificationEventService.get_pending_events(building)
    print(f"Remaining pending events: {remaining_pending.count()}")

    sent_in_digest = NotificationEvent.objects.filter(
        building=building,
        included_in_digest=True
    ).count()
    print(f"Events sent in digest: {sent_in_digest}")

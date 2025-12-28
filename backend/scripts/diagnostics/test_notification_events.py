"""
Test script for notification event system.
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from announcements.models import Announcement
from notifications.models import NotificationEvent
from buildings.models import Building
from users.models import CustomUser

with schema_context('demo'):
    # Get building and user
    building = Building.objects.first()
    user = CustomUser.objects.filter(is_staff=True).first()

    print(f"Building: {building.name if building else 'None'}")
    print(f"User: {user.email if user else 'None'}")

    # Check existing events
    existing_events = NotificationEvent.objects.count()
    print(f"\nExisting notification events: {existing_events}")

    # Create a new announcement
    print("\n=== Creating new announcement ===")
    announcement = Announcement.objects.create(
        building=building,
        author=user,
        title="Test Ανακοίνωση - Αυτόματο Event",
        description="Αυτή η ανακοίνωση θα πρέπει να δημιουργήσει αυτόματα ένα NotificationEvent μέσω signal.",
        published=True,
        is_active=True,
        is_urgent=False
    )

    print(f"Created announcement: {announcement.title} (ID: {announcement.id})")

    # Check if event was created
    new_events = NotificationEvent.objects.count()
    print(f"\nNotification events after creation: {new_events}")

    if new_events > existing_events:
        print("✅ SUCCESS! Event was created automatically!")

        # Show the event
        event = NotificationEvent.objects.latest('created_at')
        print(f"\nEvent details:")
        print(f"  Type: {event.get_event_type_display()}")
        print(f"  Title: {event.title}")
        print(f"  Description: {event.description[:100]}...")
        print(f"  URL: {event.url}")
        print(f"  Icon: {event.get_icon()}")
        print(f"  Urgent: {event.is_urgent}")
        print(f"  Pending: {event.is_pending}")
    else:
        print("❌ FAILED! No event was created.")
        print("Signal handler may not be loaded correctly.")

    # List all events
    print(f"\n=== All Notification Events ({new_events}) ===")
    for event in NotificationEvent.objects.all().order_by('-created_at')[:5]:
        status = "📨 Sent" if event.sent_immediately else ("📧 In Digest" if event.included_in_digest else "⏳ Pending")
        print(f"  {event.get_icon()} {event.title} - {status}")

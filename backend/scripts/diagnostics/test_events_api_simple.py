import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from notifications.models import NotificationEvent

with schema_context('demo'):
    events = NotificationEvent.objects.all()
    print(f"Total events: {events.count()}")

    pending = NotificationEvent.objects.filter(
        included_in_digest=False,
        sent_immediately=False
    )
    print(f"Pending events: {pending.count()}")

    # Show event details
    for event in events[:3]:
        print(f"\nEvent: {event.title}")
        print(f"  Type: {event.get_event_type_display()}")
        print(f"  Icon: {event.get_icon()}")
        print(f"  Pending: {event.is_pending}")
        print(f"  URL: {event.url}")

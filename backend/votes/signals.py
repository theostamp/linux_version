"""
Signal handlers for automatic notification event creation when votes are created.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Vote


@receiver(post_save, sender=Vote)
def create_notification_event_for_vote(sender, instance, created, **kwargs):
    """
    Automatically create NotificationEvent when a vote is created or activated.

    Triggers:
    - New vote created with is_active=True
    - Existing vote changes from is_active=False to is_active=True
    """
    # Import here to avoid circular imports
    from notifications.services import NotificationEventService

    # Only create event for active votes with a building
    if instance.is_active and instance.building:
        # Check if this is a new vote or newly activated
        is_new_event = False

        if created:
            # Newly created and active
            is_new_event = True

        if is_new_event:
            # Format end date
            end_date_str = instance.end_date.strftime('%d/%m/%Y') if instance.end_date else 'Χωρίς λήξη'

            # Create notification event
            NotificationEventService.create_event(
                event_type='vote',
                building=instance.building,
                title=f"Νέα Ψηφοφορία: {instance.title}",
                description=f"{instance.description[:300]}... Ψηφίστε μέχρι {end_date_str}",
                url=f"/votes/{instance.id}",
                is_urgent=instance.is_urgent,
                icon='🗳️' if not instance.is_urgent else '🚨',
                event_date=instance.end_date if instance.end_date else None,
                related_vote_id=instance.id,
            )

            print(f"✅ Created NotificationEvent for Vote: {instance.title}")

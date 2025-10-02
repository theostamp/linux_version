"""
Signal handlers for automatic notification event creation.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Announcement


@receiver(post_save, sender=Announcement)
def announcement_created_or_published(sender, instance, created, **kwargs):
    """
    Automatically create NotificationEvent when announcement is created or published.

    Triggers:
    - New announcement created with published=True
    - Existing announcement changes from published=False to published=True
    """
    # Import here to avoid circular imports
    from notifications.services import NotificationEventService

    # Track if this is a new publication
    is_new_publication = False

    if created and instance.published:
        # Newly created and published
        is_new_publication = True
    elif not created and instance.published:
        # Check if it was just published (changed from False to True)
        # We need to check the old value - use update_fields or compare with DB
        try:
            old_instance = Announcement.objects.get(pk=instance.pk)
            if hasattr(old_instance, '_state') and old_instance._state.adding:
                # This is a new instance
                is_new_publication = True
        except Announcement.DoesNotExist:
            pass

    if is_new_publication and instance.building:
        # Create notification event
        NotificationEventService.create_event(
            event_type='announcement',
            building=instance.building,
            title=f"Νέα Ανακοίνωση: {instance.title}",
            description=instance.description[:500],  # Truncate long descriptions
            url=f"/announcements/{instance.id}",
            is_urgent=instance.is_urgent,
            related_announcement_id=instance.id,
            icon='📢' if not instance.is_urgent else '🚨'
        )

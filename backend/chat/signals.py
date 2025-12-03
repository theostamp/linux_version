"""
Chat signals for automatic chat room creation.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from buildings.models import Building
from .models import ChatRoom


@receiver(post_save, sender=Building)
def create_chat_room_for_building(sender, instance, created, **kwargs):
    """
    Αυτόματη δημιουργία chat room όταν δημιουργείται νέο κτίριο.
    """
    if created:
        # Check if chat room doesn't already exist (safety check)
        if not ChatRoom.objects.filter(building=instance).exists():
            ChatRoom.objects.create(
                building=instance,
                name=f'Chat - {instance.name}',
                is_active=True
            )


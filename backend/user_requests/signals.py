# backend/user_requests/signals.py

from django.db.models.signals import m2m_changed
    # typ
from django.dispatch import receiver
    # type:
from .models import UserRequest
   
   

# backend/user_requests/signals.py

from .utils import send_urgent_request_email
from .models import UrgentRequestLog

@receiver(m2m_changed, sender=UserRequest.supporters.through)
def user_request_supporters_changed(sender, instance, action, **kwargs):
    if action == "post_add" and instance.supporters.count() >= 10:
        # Αν δεν υπάρχει ήδη log (για να μην γράφει κάθε φορά)
        if not UrgentRequestLog.objects.filter(user_request=instance).exists():
            UrgentRequestLog.objects.create(
                user_request=instance,
                supporter_count=instance.supporters.count()
            )
            send_urgent_request_email(instance)

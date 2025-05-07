from django.db import models
from django.contrib.auth import get_user_model
from buildings.models import Building

User = get_user_model()

class UserRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Σε εκκρεμότητα'),
        ('in_progress', 'Σε εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('rejected', 'Απορρίφθηκε'),
    ]

    # ➕ New: link to Building
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='user_requests'
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    type = models.CharField(
        max_length=20,
        choices=[
            ('maintenance', 'Συντήρηση'),
            ('cleaning', 'Καθαριότητα'),
            ('technical', 'Τεχνικό'),
            ('other', 'Άλλο'),
        ],
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_requests'
    )
    supporters = models.ManyToManyField(
        User,
        related_name='supported_requests',
        blank=True
    )

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    @property
    def supporter_count(self):
        return self.supporters.count()

    @property
    def is_urgent(self):
        return self.supporter_count >= 10


class UrgentRequestLog(models.Model):
    user_request = models.ForeignKey(
        UserRequest,
        on_delete=models.CASCADE,
        related_name='urgent_logs'
    )
    triggered_at = models.DateTimeField(auto_now_add=True)
    supporter_count = models.PositiveIntegerField()

    def __str__(self):
        return f"Urgent: {self.user_request.title} @ {self.triggered_at:%Y-%m-%d %H:%M}"

# backend/votes/models.py
from django.db import models
from buildings.models import Building
from django.conf import settings

from django.db import models
from django.conf import settings  # για AUTH_USER_MODEL
from buildings.models import Building

class Vote(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    building = models.ForeignKey(Building, on_delete=models.CASCADE)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_votes'
    )

    def __str__(self):
        return self.title


class VoteSubmission(models.Model):
    CHOICES = [
        ("ΝΑΙ", "ΝΑΙ"),
        ("ΟΧΙ", "ΟΧΙ"),
        ("ΛΕΥΚΟ", "ΛΕΥΚΟ"),
    ]

    vote = models.ForeignKey(Vote, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    choice = models.CharField(max_length=50, choices=CHOICES)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('vote', 'user')
        ordering = ['-id']

    def __str__(self):
        return f'{self.user} ➜ {self.choice}'

from django.db import models
from django.conf import settings  # 👈 για AUTH_USER_MODEL
from buildings.models import Building

class Announcement(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='announcements')
    author = models.ForeignKey(  # 👈 Προσθήκη αυτού του πεδίου
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_announcements'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    file = models.FileField(upload_to='announcements/', blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    published = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    is_urgent = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} ({self.building.name})"

    @property
    def is_currently_active(self):
        from django.utils import timezone
        today = timezone.now().date()
        if self.start_date and self.end_date:
            return self.start_date <= today <= self.end_date and self.published
        return self.published

from django.db import models 
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from buildings.models import Building

class Announcement(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='announcements')
    author = models.ForeignKey(
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
    updated_at = models.DateTimeField(auto_now=True)
    published = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    is_urgent = models.BooleanField(default=False)
    priority = models.IntegerField(default=0, help_text="Υψηλότερος αριθμός = υψηλότερη προτεραιότητα")

    class Meta:
        ordering = ['-priority', '-created_at']
        verbose_name = "Ανακοίνωση"
        verbose_name_plural = "Ανακοινώσεις"

    def __str__(self):
        return f"{self.title} ({self.building.name})"

    def clean(self):
        """Validation για τις ημερομηνίες"""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Η ημερομηνία έναρξης δεν μπορεί να είναι μετά την ημερομηνία λήξης")
        
        if self.is_urgent and not self.published:
            raise ValidationError("Οι επείγουσες ανακοινώσεις πρέπει να είναι δημοσιευμένες")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def is_currently_active(self):
        """Ελέγχει αν η ανακοίνωση είναι ενεργή αυτή τη στιγμή"""
        today = timezone.now().date()
        if self.start_date and self.end_date:
            return self.start_date <= today <= self.end_date and self.published and self.is_active
        return self.published and self.is_active

    @property
    def days_remaining(self):
        """Επιστρέφει τις ημέρες που απομένουν μέχρι τη λήξη"""
        if not self.end_date:
            return None
        today = timezone.now().date()
        if today > self.end_date:
            return 0
        return (self.end_date - today).days

    @property
    def status_display(self):
        """Επιστρέφει την κατάσταση της ανακοίνωσης σε ανάγνωση"""
        if self.is_urgent:
            return "🚨 Επείγουσα"
        elif self.is_currently_active:
            return "✅ Ενεργή"
        elif self.published:
            return "📢 Δημοσιευμένη"
        else:
            return "📝 Πρόχειρη"

    def get_absolute_url(self):
        """URL για την προβολή της ανακοίνωσης"""
        from django.urls import reverse
        return reverse('announcement-detail', kwargs={'pk': self.pk})

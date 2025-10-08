# backend/votes/models.py
from django.db import models 
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from buildings.models import Building

class Vote(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, help_text="Ενεργή ψηφοφορία")
    is_urgent = models.BooleanField(default=False, help_text="Επείγουσα ψηφοφορία")
    min_participation = models.IntegerField(
        default=0, 
        help_text="Ελάχιστο ποσοστό συμμετοχής για έγκυρα αποτελέσματα (%)"
    )

    building = models.ForeignKey(
        Building, 
        on_delete=models.CASCADE, 
        related_name='votes',
        null=True,
        blank=True,
        help_text="Αφήστε κενό για ψηφοφορία σε όλα τα κτίρια"
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_votes'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='votes',
        null=True,
        blank=True,
        help_text="Σύνδεση με έργο - διαγράφεται αυτόματα όταν διαγραφεί το έργο"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Ψηφοφορία"
        verbose_name_plural = "Ψηφοφορίες"

    def __str__(self):
        building_name = self.building.name if self.building else "Όλα τα κτίρια"
        return f"{self.title} ({building_name})"

    def clean(self):
        """Validation για τις ημερομηνίες"""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Η ημερομηνία έναρξης δεν μπορεί να είναι μετά την ημερομηνία λήξης")
        
        if self.min_participation < 0 or self.min_participation > 100:
            raise ValidationError("Το ελάχιστο ποσοστό συμμετοχής πρέπει να είναι μεταξύ 0-100%")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def is_currently_active(self):
        """Ελέγχει αν η ψηφοφορία είναι ενεργή αυτή τη στιγμή"""
        today = timezone.now().date()
        if self.end_date:
            return self.start_date <= today <= self.end_date and self.is_active
        return self.start_date <= today and self.is_active

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
    def total_votes(self):
        """Συνολικός αριθμός ψήφων"""
        return self.submissions.count()

    @property
    def participation_percentage(self):
        """Ποσοστό συμμετοχής"""
        if self.building is None:
            # For global votes, calculate based on all residents from all buildings
            from residents.models import Resident
            total_residents = Resident.objects.count()
        else:
            total_residents = self.building.residents.count()
        
        if total_residents == 0:
            return 0
        return round((self.total_votes / total_residents) * 100, 1)

    @property
    def is_valid_result(self):
        """Ελέγχει αν τα αποτελέσματα είναι έγκυρα βάσει ελάχιστης συμμετοχής"""
        return self.participation_percentage >= self.min_participation

    @property
    def status_display(self):
        """Επιστρέφει την κατάσταση της ψηφοφορίας σε ανάγνωση"""
        if self.is_urgent:
            return "🚨 Επείγουσα"
        elif self.is_currently_active:
            return "✅ Ενεργή"
        elif self.is_active:
            return "📢 Ανοιχτή"
        else:
            return "🔒 Κλειστή"

    def get_results(self):
        """Επιστρέφει τα αποτελέσματα της ψηφοφορίας"""
        results = {}
        for choice, _ in VoteSubmission.CHOICES:
            results[choice] = self.submissions.filter(choice=choice).count()
        results['total'] = self.total_votes
        results['participation_percentage'] = self.participation_percentage
        results['is_valid'] = self.is_valid_result
        return results

    def get_absolute_url(self):
        """URL για την προβολή της ψηφοφορίας"""
        from django.urls import reverse
        return reverse('vote-detail', kwargs={'pk': self.pk})


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
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('vote', 'user')
        ordering = ['-submitted_at']
        verbose_name = "Ψήφος"
        verbose_name_plural = "Ψήφοι"

    def __str__(self):
        return f'{self.user} ➜ {self.choice}'

    def clean(self):
        """Validation για την ψήφο"""
        if not self.vote.is_currently_active:
            raise ValidationError("Η ψηφοφορία δεν είναι ενεργή αυτή τη στιγμή")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

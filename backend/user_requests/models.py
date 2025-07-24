
# backend/user_requests/models.py
from django.db import models 
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from buildings.models import Building

User = get_user_model()

class UserRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Σε εκκρεμότητα'),        
        ('in_progress', 'Σε εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('rejected', 'Απορρίφθηκε'),
        ('cancelled', 'Ακυρώθηκε'),
    ]

    TYPE_CHOICES = [
        ('maintenance', 'Συντήρηση'),
        ('cleaning', 'Καθαριότητα'),
        ('technical', 'Τεχνικό'),
        ('security', 'Ασφάλεια'),
        ('noise', 'Θόρυβος'),
        ('other', 'Άλλο'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μέτρια'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
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
        choices=TYPE_CHOICES,
        blank=True,
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_requests'
    )
    estimated_completion = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Σημειώσεις από διαχειριστές")

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

    class Meta:
        ordering = ['-priority', '-created_at']
        verbose_name = "Αίτημα Χρήστη"
        verbose_name_plural = "Αιτήματα Χρηστών"

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    def clean(self):
        """Validation για το αίτημα"""
        if self.completed_at and self.status != 'completed':
            raise ValidationError("Η ημερομηνία ολοκλήρωσης μπορεί να οριστεί μόνο για ολοκληρωμένα αιτήματα")
        
        if self.assigned_to and not self.assigned_to.is_staff:
            raise ValidationError("Μόνο προσωπικό μπορεί να αναλάβει αιτήματα")

    def save(self, *args, **kwargs):
        self.clean()
        # Αυτόματη ενημέρωση completed_at
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != 'completed':
            self.completed_at = None
        super().save(*args, **kwargs)

    @property
    def supporter_count_cached(self):
        return self.supporters.count()

    @property
    def is_urgent(self):
        """Επείγουσα αν έχει πολλούς υποστηρικτές ή υψηλή προτεραιότητα"""
        return self.supporter_count_cached >= 10 or self.priority == 'urgent'

    @property
    def days_since_creation(self):
        """Ημέρες από τη δημιουργία"""
        return (timezone.now() - self.created_at).days

    @property
    def is_overdue(self):
        """Ελέγχει αν το αίτημα έχει καθυστερήσει"""
        if self.estimated_completion:
            return timezone.now().date() > self.estimated_completion and self.status not in ['completed', 'cancelled']
        return False

    @property
    def status_display(self):
        """Επιστρέφει την κατάσταση σε ανάγνωση με emoji"""
        status_icons = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'rejected': '❌',
            'cancelled': '🚫',
        }
        icon = status_icons.get(self.status, '📋')
        return f"{icon} {self.get_status_display()}"

    @property
    def priority_display(self):
        """Επιστρέφει την προτεραιότητα σε ανάγνωση με emoji"""
        priority_icons = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'urgent': '🔴',
        }
        icon = priority_icons.get(self.priority, '⚪')
        return f"{icon} {self.get_priority_display()}"

    def get_absolute_url(self):
        """URL για την προβολή του αιτήματος"""
        from django.urls import reverse
        return reverse('userrequest-detail', kwargs={'pk': self.pk})

    def can_be_supported_by(self, user):
        """Ελέγχει αν ο χρήστης μπορεί να υποστηρίξει το αίτημα"""
        return user != self.created_by and user not in self.supporters.all()

    def add_supporter(self, user):
        """Προσθήκη υποστηρικτή"""
        if self.can_be_supported_by(user):
            self.supporters.add(user)
            return True
        return False

    def remove_supporter(self, user):
        """Αφαίρεση υποστηρικτή"""
        if user in self.supporters.all():
            self.supporters.remove(user)
            return True
        return False


class UrgentRequestLog(models.Model):
    user_request = models.ForeignKey(
        UserRequest,
        on_delete=models.CASCADE,
        related_name='urgent_logs'
    )
    triggered_at = models.DateTimeField(auto_now_add=True)
    supporter_count = models.PositiveIntegerField()
    action_taken = models.CharField(
        max_length=255,
        blank=True,
        help_text="Τι ενέργεια έγινε για το επείγον αίτημα"
    )

    class Meta:
        ordering = ['-triggered_at']
        verbose_name = "Καταγραφή Επείγοντος Αιτήματος"
        verbose_name_plural = "Καταγραφές Επείγοντων Αιτημάτων"

    def __str__(self):
        return f"Επείγον αίτημα {self.user_request.title} - {self.triggered_at.strftime('%d/%m/%Y %H:%M')}"

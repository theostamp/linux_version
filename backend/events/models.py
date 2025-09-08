from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from buildings.models import Building
from apartments.models import Apartment


class Event(models.Model):
    EVENT_TYPES = [
        ('call', 'Τηλεφωνική κλήση'),
        ('notification', 'Ομαδική ειδοποίηση'),
        ('payment_delay', 'Καθυστέρηση πληρωμής'),
        ('maintenance', 'Συντήρηση'),
        ('project', 'Έργο'),
        ('urgent', 'Επείγον'),
        ('meeting', 'Συνάντηση'),
        ('inspection', 'Επιθεώρηση'),
        ('reminder', 'Υπενθύμιση'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμές'),
        ('in_progress', 'Σε εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρωμένο'),
        ('postponed', 'Αναβλήθηκε'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μέση'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]

    # Basic Information
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    event_type = models.CharField(
        max_length=20, 
        choices=EVENT_TYPES, 
        default='reminder',
        verbose_name="Τύπος συμβάντος"
    )
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_CHOICES, 
        default='medium',
        verbose_name="Προτεραιότητα"
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name="Κατάσταση"
    )
    
    # Building and Apartment Relations
    building = models.ForeignKey(
        Building, 
        on_delete=models.CASCADE, 
        related_name='events',
        verbose_name="Κτίριο"
    )
    apartments = models.ManyToManyField(
        Apartment,
        blank=True,
        related_name='events',
        verbose_name="Διαμερίσματα",
        help_text="Αφήστε κενό για όλα τα διαμερίσματα του κτιρίου"
    )
    
    # User Relations
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_events',
        verbose_name="Δημιουργήθηκε από"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_events',
        verbose_name="Ανατέθηκε σε"
    )
    
    # Date and Time
    scheduled_date = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Προγραμματισμένη ημερομηνία"
    )
    due_date = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Ημερομηνία λήξης"
    )
    completed_at = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Ολοκληρώθηκε στις"
    )
    
    # Additional Fields
    notes = models.TextField(
        blank=True,
        verbose_name="Σημειώσεις"
    )
    contact_phone = models.CharField(
        max_length=20, 
        blank=True,
        verbose_name="Τηλέφωνο επικοινωνίας"
    )
    contact_email = models.EmailField(
        blank=True,
        verbose_name="Email επικοινωνίας"
    )
    
    # System Fields
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Δημιουργήθηκε")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Ενημερώθηκε")
    is_recurring = models.BooleanField(default=False, verbose_name="Επαναλαμβανόμενο")
    recurrence_pattern = models.CharField(
        max_length=50, 
        blank=True,
        verbose_name="Μοτίβο επανάληψης",
        help_text="π.χ. 'weekly', 'monthly', 'yearly'"
    )
    
    class Meta:
        ordering = ['-priority', 'scheduled_date', '-created_at']
        verbose_name = "Συμβάν"
        verbose_name_plural = "Συμβάντα"
        indexes = [
            models.Index(fields=['building', 'status']),
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['event_type', 'priority']),
            models.Index(fields=['created_by', 'assigned_to']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_event_type_display()}) - {self.building.name}"

    def clean(self):
        if self.scheduled_date and self.due_date:
            if self.scheduled_date > self.due_date:
                raise ValidationError("Η προγραμματισμένη ημερομηνία δεν μπορεί να είναι μετά την ημερομηνία λήξης")
        
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        if not self.due_date or self.status in ['completed', 'cancelled']:
            return False
        return timezone.now() > self.due_date

    @property
    def days_until_due(self):
        if not self.due_date:
            return None
        delta = self.due_date - timezone.now()
        return delta.days if delta.days >= 0 else 0

    @property
    def is_urgent_priority(self):
        return self.priority == 'urgent' or self.event_type == 'urgent'

    @property
    def status_icon(self):
        icons = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'cancelled': '❌',
            'postponed': '⏸️',
        }
        return icons.get(self.status, '❓')

    @property
    def type_icon(self):
        icons = {
            'call': '📞',
            'notification': '📢',
            'payment_delay': '💳',
            'maintenance': '🔧',
            'project': '🏗️',
            'urgent': '⚡',
            'meeting': '👥',
            'inspection': '🔍',
            'reminder': '⏰',
        }
        return icons.get(self.event_type, '📅')


class EventNote(models.Model):
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='event_notes',
        verbose_name="Συμβάν"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="Συγγραφέας"
    )
    content = models.TextField(verbose_name="Περιεχόμενο")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Δημιουργήθηκε")
    is_internal = models.BooleanField(
        default=False,
        verbose_name="Εσωτερική σημείωση",
        help_text="Δεν εμφανίζεται σε ενοίκους"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Σημείωση συμβάντος"
        verbose_name_plural = "Σημειώσεις συμβάντων"

    def __str__(self):
        return f"Σημείωση για {self.event.title} από {self.author}"
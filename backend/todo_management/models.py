from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta

User = get_user_model()

class TodoCategory(models.Model):
    """Κατηγορίες για τα TODO items"""
    
    PRIORITY_COLORS = [
        ('blue', 'Μπλε'),
        ('green', 'Πράσινο'),
        ('yellow', 'Κίτρινο'),
        ('orange', 'Πορτοκαλί'),
        ('red', 'Κόκκινο'),
        ('purple', 'Μωβ'),
        ('gray', 'Γκρι'),
    ]
    
    name = models.CharField(_('Όνομα'), max_length=100)
    icon = models.CharField(_('Εικονίδιο'), max_length=50, default='check-square')
    color = models.CharField(_('Χρώμα'), max_length=20, choices=PRIORITY_COLORS, default='blue')
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE, related_name='todo_categories')
    description = models.TextField(_('Περιγραφή'), blank=True)
    is_active = models.BooleanField(_('Ενεργό'), default=True)
    created_at = models.DateTimeField(_('Δημιουργήθηκε'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Ενημερώθηκε'), auto_now=True)
    
    class Meta:
        verbose_name = _('Κατηγορία TODO')
        verbose_name_plural = _('Κατηγορίες TODO')
        unique_together = ['name', 'building']
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.building.name}"


class TodoItem(models.Model):
    """Βασικό TODO item"""
    
    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μεσαία'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρώθηκε'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    title = models.CharField(_('Τίτλος'), max_length=200)
    description = models.TextField(_('Περιγραφή'), blank=True)
    category = models.ForeignKey(TodoCategory, on_delete=models.CASCADE, related_name='todos')
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE, related_name='todos')
    apartment = models.ForeignKey('apartments.Apartment', on_delete=models.SET_NULL, null=True, blank=True, related_name='todos')
    
    priority = models.CharField(_('Προτεραιότητα'), max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(_('Κατάσταση'), max_length=20, choices=STATUS_CHOICES, default='pending')
    
    due_date = models.DateTimeField(_('Ημερομηνία Λήξης'), null=True, blank=True)
    completed_at = models.DateTimeField(_('Ολοκληρώθηκε'), null=True, blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_todos')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_todos')
    
    estimated_hours = models.DecimalField(_('Εκτιμώμενες Ώρες'), max_digits=5, decimal_places=2, null=True, blank=True)
    actual_hours = models.DecimalField(_('Πραγματικές Ώρες'), max_digits=5, decimal_places=2, null=True, blank=True)
    
    tags = models.JSONField(_('Ετικέτες'), default=list, blank=True)
    attachments = models.JSONField(_('Συνημμένα'), default=list, blank=True)
    
    created_at = models.DateTimeField(_('Δημιουργήθηκε'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Ενημερώθηκε'), auto_now=True)
    
    class Meta:
        verbose_name = _('TODO Item')
        verbose_name_plural = _('TODO Items')
        ordering = ['-priority', 'due_date', '-created_at']
        indexes = [
            models.Index(fields=['building', 'status']),
            models.Index(fields=['building', 'due_date']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['category', 'status']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.building.name}"
    
    @property
    def is_overdue(self):
        """Ελέγχει αν το TODO έχει λήξει"""
        if not self.due_date:
            return False
        return self.due_date < timezone.now() and self.status != 'completed'
    
    @property
    def is_due_soon(self):
        """Ελέγχει αν το TODO λήγει σύντομα (24 ώρες)"""
        if not self.due_date:
            return False
        return (self.due_date - timezone.now()) <= timedelta(days=1) and self.status != 'completed'
    
    @property
    def priority_score(self):
        """Επιστρέφει αριθμητικό σκορ προτεραιότητας"""
        priority_scores = {'low': 1, 'medium': 2, 'high': 3, 'urgent': 4}
        return priority_scores.get(self.priority, 2)
    
    def complete(self, user=None):
        """Ολοκληρώνει το TODO"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if user:
            self.assigned_to = user
        self.save()
    
    def get_priority_color(self):
        """Επιστρέφει το χρώμα προτεραιότητας"""
        priority_colors = {
            'low': 'text-green-600 bg-green-100',
            'medium': 'text-blue-600 bg-blue-100',
            'high': 'text-orange-600 bg-orange-100',
            'urgent': 'text-red-600 bg-red-100',
        }
        return priority_colors.get(self.priority, 'text-gray-600 bg-gray-100')


class TodoTemplate(models.Model):
    """Πρότυπα για επαναλαμβανόμενες εργασίες"""
    
    FREQUENCY_CHOICES = [
        ('daily', 'Καθημερινά'),
        ('weekly', 'Εβδομαδιαία'),
        ('monthly', 'Μηνιαία'),
        ('quarterly', 'Τριμηνιαία'),
        ('yearly', 'Ετήσια'),
        ('custom', 'Προσαρμοσμένη'),
    ]
    
    title = models.CharField(_('Τίτλος'), max_length=200)
    description = models.TextField(_('Περιγραφή'), blank=True)
    category = models.ForeignKey(TodoCategory, on_delete=models.CASCADE, related_name='templates')
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE, related_name='todo_templates')
    
    frequency = models.CharField(_('Συχνότητα'), max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    custom_days = models.IntegerField(_('Προσαρμοσμένες Ημέρες'), null=True, blank=True)
    
    auto_create = models.BooleanField(_('Αυτόματη Δημιουργία'), default=False)
    last_created = models.DateTimeField(_('Τελευταία Δημιουργία'), null=True, blank=True)
    
    priority = models.CharField(_('Προτεραιότητα'), max_length=20, choices=TodoItem.PRIORITY_CHOICES, default='medium')
    estimated_hours = models.DecimalField(_('Εκτιμώμενες Ώρες'), max_digits=5, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(_('Ενεργό'), default=True)
    created_at = models.DateTimeField(_('Δημιουργήθηκε'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Ενημερώθηκε'), auto_now=True)
    
    class Meta:
        verbose_name = _('Πρότυπο TODO')
        verbose_name_plural = _('Πρότυπα TODO')
        ordering = ['frequency', 'title']
    
    def __str__(self):
        return f"{self.title} - {self.building.name}"
    
    def should_create_todo(self):
        """Ελέγχει αν πρέπει να δημιουργηθεί νέο TODO"""
        if not self.auto_create or not self.is_active:
            return False
        
        if not self.last_created:
            return True
        
        now = timezone.now()
        if self.frequency == 'daily':
            return (now - self.last_created).days >= 1
        elif self.frequency == 'weekly':
            return (now - self.last_created).days >= 7
        elif self.frequency == 'monthly':
            return (now - self.last_created).days >= 30
        elif self.frequency == 'quarterly':
            return (now - self.last_created).days >= 90
        elif self.frequency == 'yearly':
            return (now - self.last_created).days >= 365
        elif self.frequency == 'custom' and self.custom_days:
            return (now - self.last_created).days >= self.custom_days
        
        return False
    
    def create_todo(self, user):
        """Δημιουργεί νέο TODO από το πρότυπο"""
        if not self.should_create_todo():
            return None
        
        # Υπολογισμός due_date βάσει συχνότητας
        due_date = timezone.now()
        if self.frequency == 'daily':
            due_date += timedelta(days=1)
        elif self.frequency == 'weekly':
            due_date += timedelta(weeks=1)
        elif self.frequency == 'monthly':
            due_date += timedelta(days=30)
        elif self.frequency == 'quarterly':
            due_date += timedelta(days=90)
        elif self.frequency == 'yearly':
            due_date += timedelta(days=365)
        elif self.frequency == 'custom' and self.custom_days:
            due_date += timedelta(days=self.custom_days)
        
        todo = TodoItem.objects.create(
            title=self.title,
            description=self.description,
            category=self.category,
            building=self.building,
            priority=self.priority,
            estimated_hours=self.estimated_hours,
            due_date=due_date,
            created_by=user
        )
        
        self.last_created = timezone.now()
        self.save()
        
        return todo


class TodoNotification(models.Model):
    """Ειδοποιήσεις για TODOs"""
    
    NOTIFICATION_TYPES = [
        ('due_soon', 'Λήγει Σύντομα'),
        ('overdue', 'Λήξει'),
        ('completed', 'Ολοκληρώθηκε'),
        ('assigned', 'Ανατέθηκε'),
        ('reminder', 'Υπενθύμιση'),
    ]
    
    todo = models.ForeignKey(TodoItem, on_delete=models.CASCADE, related_name='notifications')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todo_notifications')
    
    notification_type = models.CharField(_('Τύπος Ειδοποίησης'), max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField(_('Μήνυμα'), blank=True)
    
    is_read = models.BooleanField(_('Διαβασμένη'), default=False)
    read_at = models.DateTimeField(_('Διαβάστηκε'), null=True, blank=True)
    
    created_at = models.DateTimeField(_('Δημιουργήθηκε'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('Ειδοποίηση TODO')
        verbose_name_plural = _('Ειδοποιήσεις TODO')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['todo', 'notification_type']),
        ]
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.todo.title}"
    
    def mark_as_read(self):
        """Σημειώνει την ειδοποίηση ως διαβασμένη"""
        self.is_read = True
        self.read_at = timezone.now()
        self.save()
    
    @classmethod
    def create_notification(cls, todo, user, notification_type, message=''):
        """Δημιουργεί νέα ειδοποίηση"""
        if not message:
            if notification_type == 'due_soon':
                message = f"Το TODO '{todo.title}' λήγει σύντομα"
            elif notification_type == 'overdue':
                message = f"Το TODO '{todo.title}' έχει λήξει"
            elif notification_type == 'completed':
                message = f"Το TODO '{todo.title}' ολοκληρώθηκε"
            elif notification_type == 'assigned':
                message = f"Σας ανατέθηκε το TODO '{todo.title}'"
            elif notification_type == 'reminder':
                message = f"Υπενθύμιση για το TODO '{todo.title}'"
        
        return cls.objects.create(
            todo=todo,
            user=user,
            notification_type=notification_type,
            message=message
        )


class TodoLink(models.Model):
    """Σύνδεση domain αντικειμένων (Ticket/WorkOrder/Project/Milestone) με TodoItem"""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    todo = models.ForeignKey(TodoItem, on_delete=models.CASCADE, related_name='links')
    primary_due_at = models.DateTimeField(null=True, blank=True)
    recurrence_rule = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Σύνδεση TODO')
        verbose_name_plural = _('Συνδέσεις TODO')
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]

    def __str__(self):
        return f"TodoLink -> {self.todo_id}"

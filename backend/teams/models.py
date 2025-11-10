from django.db import models
from django.contrib.auth import get_user_model
from buildings.models import Building
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

class Team(models.Model):
    """Μοντέλο για διαχείριση ομάδων εργασίας"""
    
    TEAM_TYPES = [
        ('management', 'Διαχείριση'),
        ('maintenance', 'Συντήρηση'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('technical', 'Τεχνική Υποστήριξη'),
        ('administrative', 'Διοικητική Υποστήριξη'),
        ('project', 'Έργα'),
        ('emergency', 'Επείγοντα'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Ενεργή'),
        ('inactive', 'Ανενεργή'),
        ('suspended', 'Ανασταλμένη'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Όνομα Ομάδας")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    team_type = models.CharField(
        max_length=20,
        choices=TEAM_TYPES,
        verbose_name="Τύπος Ομάδας"
    )
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='teams',
        verbose_name="Κτίριο"
    )
    leader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_teams',
        verbose_name="Ηγέτης Ομάδας"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Κατάσταση"
    )
    max_members = models.PositiveIntegerField(
        default=10,
        verbose_name="Μέγιστος Αριθμός Μελών"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Ομάδα"
        verbose_name_plural = "Ομάδες"
        ordering = ['name']
        unique_together = ['building', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.building.name}"
    
    @property
    def member_count(self):
        """Επιστρέφει τον αριθμό των ενεργών μελών"""
        return self.members.filter(is_active=True).count()
    
    @property
    def is_full(self):
        """Ελέγχει αν η ομάδα είναι γεμάτη"""
        return self.member_count >= self.max_members


class TeamRole(models.Model):
    """Μοντέλο για τους ρόλους μέσα στην ομάδα"""
    
    ROLE_TYPES = [
        ('leader', 'Ηγέτης'),
        ('member', 'Μέλος'),
        ('specialist', 'Ειδικός'),
        ('assistant', 'Βοηθός'),
        ('trainee', 'Εκπαιδευόμενος'),
    ]
    
    name = models.CharField(max_length=100, verbose_name="Όνομα Ρόλου")
    role_type = models.CharField(
        max_length=20,
        choices=ROLE_TYPES,
        verbose_name="Τύπος Ρόλου"
    )
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    permissions = models.JSONField(
        default=dict,
        verbose_name="Δικαιώματα",
        help_text="JSON object με τα δικαιώματα του ρόλου"
    )
    is_default = models.BooleanField(
        default=False,
        verbose_name="Προεπιλεγμένος Ρόλος"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Ρόλος Ομάδας"
        verbose_name_plural = "Ρόλοι Ομάδων"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_role_type_display()})"


class TeamMember(models.Model):
    """Μοντέλο για τα μέλη των ομάδων"""
    
    STATUS_CHOICES = [
        ('active', 'Ενεργό'),
        ('inactive', 'Ανενεργό'),
        ('suspended', 'Ανασταλμένο'),
        ('left', 'Αποχώρησε'),
    ]
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name="Ομάδα"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='team_memberships',
        verbose_name="Χρήστης"
    )
    role = models.ForeignKey(
        TeamRole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_members',
        verbose_name="Ρόλος"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Κατάσταση"
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Ένταξης")
    left_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Αποχώρησης")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Μέλος Ομάδας"
        verbose_name_plural = "Μέλη Ομάδων"
        ordering = ['-joined_at']
        unique_together = ['team', 'user']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.team.name}"
    
    def save(self, *args, **kwargs):
        if self.status == 'left' and not self.left_at:
            from django.utils import timezone
            self.left_at = timezone.now()
        super().save(*args, **kwargs)


class TeamTask(models.Model):
    """Μοντέλο για εργασίες των ομάδων"""
    
    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μέτρια'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρώθηκε'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name="Ομάδα"
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος Εργασίας")
    description = models.TextField(verbose_name="Περιγραφή")
    assigned_to = models.ForeignKey(
        TeamMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        verbose_name="Ανατέθηκε σε"
    )
    priority = models.CharField(
        max_length=20,
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
    due_date = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Λήξης")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Ολοκλήρωσης")
    estimated_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Εκτιμώμενες Ώρες"
    )
    actual_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πραγματικές Ώρες"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_team_tasks',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Εργασία Ομάδας"
        verbose_name_plural = "Εργασίες Ομάδων"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.team.name}"


class TeamMeeting(models.Model):
    """Μοντέλο για συναντήσεις ομάδων"""
    
    MEETING_TYPES = [
        ('regular', 'Τακτική'),
        ('emergency', 'Επείγουσα'),
        ('planning', 'Σχεδιασμού'),
        ('review', 'Ανασκόπησης'),
        ('training', 'Εκπαίδευσης'),
    ]
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='meetings',
        verbose_name="Ομάδα"
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος Συνάντησης")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    meeting_type = models.CharField(
        max_length=20,
        choices=MEETING_TYPES,
        default='regular',
        verbose_name="Τύπος Συνάντησης"
    )
    scheduled_at = models.DateTimeField(verbose_name="Προγραμματισμένη Ώρα")
    duration = models.PositiveIntegerField(
        default=60,
        verbose_name="Διάρκεια (λεπτά)"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Τοποθεσία"
    )
    is_online = models.BooleanField(default=False, verbose_name="Διαδικτυακή")
    meeting_link = models.URLField(blank=True, verbose_name="Σύνδεσμος Συνάντησης")
    agenda = models.TextField(blank=True, verbose_name="Ημερήσια Διάταξη")
    minutes = models.TextField(blank=True, verbose_name="Πρακτικά")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_team_meetings',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συνάντηση Ομάδας"
        verbose_name_plural = "Συναντήσεις Ομάδων"
        ordering = ['-scheduled_at']
    
    def __str__(self):
        return f"{self.title} - {self.team.name} - {self.scheduled_at.strftime('%d/%m/%Y %H:%M')}"


class TeamPerformance(models.Model):
    """Μοντέλο για την απόδοση των ομάδων"""
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='performance_records',
        verbose_name="Ομάδα"
    )
    period_start = models.DateField(verbose_name="Έναρξη Περιόδου")
    period_end = models.DateField(verbose_name="Λήξη Περιόδου")
    tasks_completed = models.PositiveIntegerField(default=0, verbose_name="Ολοκληρωμένες Εργασίες")
    tasks_total = models.PositiveIntegerField(default=0, verbose_name="Συνολικές Εργασίες")
    average_completion_time = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Μέσος Χρόνος Ολοκλήρωσης (ώρες)"
    )
    satisfaction_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name="Αξιολόγηση Ικανοποίησης"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Απόδοση Ομάδας"
        verbose_name_plural = "Αποδόσεις Ομάδων"
        ordering = ['-period_end']
        unique_together = ['team', 'period_start', 'period_end']
    
    def __str__(self):
        return f"{self.team.name} - {self.period_start} έως {self.period_end}"
    
    @property
    def completion_rate(self):
        """Υπολογίζει το ποσοστό ολοκλήρωσης"""
        if self.tasks_total > 0:
            return (self.tasks_completed / self.tasks_total) * 100
        return 0 
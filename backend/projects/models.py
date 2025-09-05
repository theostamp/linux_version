from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from buildings.models import Building
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class Project(models.Model):
    """Μοντέλο για έργα και projects"""
    
    PROJECT_TYPES = [
        ('maintenance', 'Συντήρηση'),
        ('renovation', 'Ανακαίνιση'),
        ('construction', 'Κατασκευή'),
        ('installation', 'Εγκατάσταση'),
        ('repair', 'Επισκευή'),
        ('upgrade', 'Αναβάθμιση'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('planning', 'Σχεδιασμός'),
        ('bidding', 'Διαγωνισμός'),
        ('awarded', 'Ανατεθειμένο'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Τίτλος Έργου")
    description = models.TextField(verbose_name="Περιγραφή")
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='projects',
        verbose_name="Κτίριο"
    )
    project_type = models.CharField(
        max_length=20,
        choices=PROJECT_TYPES,
        verbose_name="Τύπος Έργου"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planning',
        verbose_name="Κατάσταση"
    )
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Προϋπολογισμός"
    )
    actual_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πραγματικό Κόστος"
    )
    start_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Ολοκλήρωσης")
    estimated_duration = models.IntegerField(
        null=True,
        blank=True,
        help_text="Διάρκεια σε ημέρες",
        verbose_name="Εκτιμώμενη Διάρκεια"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Τοποθεσία"
    )
    specifications = models.TextField(blank=True, verbose_name="Προδιαγραφές")
    requirements = models.TextField(blank=True, verbose_name="Απαιτήσεις")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    attachment = models.FileField(upload_to='projects/%Y/%m/', blank=True, null=True, verbose_name="Συνημμένο")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_projects',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Έργο"
        verbose_name_plural = "Έργα"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.building.name} ({self.get_status_display()})"
    
    @property
    def progress_percentage(self):
        """Υπολογίζει το ποσοστό προόδου του έργου"""
        if self.status == 'completed':
            return 100
        elif self.status == 'planning':
            return 10
        elif self.status == 'bidding':
            return 25
        elif self.status == 'awarded':
            return 50
        elif self.status == 'in_progress':
            return 75
        return 0


class RFQ(models.Model):
    """Αίτημα Προσφοράς (RFQ) για έργα"""

    STATUS_CHOICES = [
        ('draft', 'Πρόχειρο'),
        ('sent', 'Στάλθηκε'),
        ('received', 'Ελήφθησαν'),
        ('closed', 'Κλειστό'),
    ]

    project = models.ForeignKey(
        'Project',
        on_delete=models.CASCADE,
        related_name='rfqs',
        verbose_name="Έργο",
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος RFQ")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    due_date = models.DateField(null=True, blank=True, verbose_name="Προθεσμία Υποβολής")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Κατάσταση")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_rfqs',
        verbose_name="Δημιουργήθηκε από",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "RFQ"
        verbose_name_plural = "RFQs"
        ordering = ['-created_at']

    def __str__(self):
        return f"RFQ: {self.title} ({self.get_status_display()})"

class Offer(models.Model):
    """Μοντέλο για προσφορές σε έργα"""
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('under_review', 'Υπό Αξιολόγηση'),
        ('accepted', 'Αποδεκτή'),
        ('rejected', 'Απορριφθείσα'),
        ('withdrawn', 'Αποσυρθείσα'),
    ]
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='offers',
        verbose_name="Έργο"
    )
    rfq = models.ForeignKey(
        'RFQ',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='offers',
        verbose_name="RFQ",
    )
    contractor = models.ForeignKey(
        'maintenance.Contractor',
        on_delete=models.CASCADE,
        related_name='offers',
        verbose_name="Συνεργείο"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό Προσφοράς"
    )
    description = models.TextField(verbose_name="Περιγραφή Προσφοράς")
    technical_specifications = models.TextField(blank=True, verbose_name="Τεχνικές Προδιαγραφές")
    delivery_time = models.IntegerField(
        help_text="Χρόνος παράδοσης σε ημέρες",
        verbose_name="Χρόνος Παράδοσης"
    )
    warranty_period = models.IntegerField(
        help_text="Περίοδος εγγύησης σε μήνες",
        verbose_name="Περίοδος Εγγύησης"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    submitted_date = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Υποβολής")
    evaluation_date = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Αξιολόγησης")
    evaluation_notes = models.TextField(blank=True, verbose_name="Σημειώσεις Αξιολόγησης")
    evaluation_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name="Βαθμολογία Αξιολόγησης"
    )
    offer_file = models.FileField(upload_to='offers/%Y/%m/', blank=True, null=True, verbose_name="Αρχείο Προσφοράς")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_offers',
        verbose_name="Δημιουργήθηκε από"
    )
    
    class Meta:
        verbose_name = "Προσφορά"
        verbose_name_plural = "Προσφορές"
        ordering = ['-submitted_date']
        unique_together = ['project', 'contractor']
    
    def __str__(self):
        return f"{self.contractor.name} - {self.project.title} - €{self.amount}"

class Contract(models.Model):
    """Μοντέλο για συμβόλαια με συνεργεία"""
    
    CONTRACT_TYPES = [
        ('service', 'Υπηρεσίες'),
        ('construction', 'Κατασκευή'),
        ('maintenance', 'Συντήρηση'),
        ('consulting', 'Σύμβουλος'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Πρόχειρο'),
        ('active', 'Ενεργό'),
        ('completed', 'Ολοκληρωμένο'),
        ('terminated', 'Λυμένο'),
        ('expired', 'Ληγμένο'),
    ]
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='contracts',
        verbose_name="Έργο"
    )
    contractor = models.ForeignKey(
        'maintenance.Contractor',
        on_delete=models.CASCADE,
        related_name='contracts',
        verbose_name="Συνεργείο"
    )
    offer = models.ForeignKey(
        Offer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contracts',
        verbose_name="Προσφορά"
    )
    contract_type = models.CharField(
        max_length=20,
        choices=CONTRACT_TYPES,
        verbose_name="Τύπος Συμβολαίου"
    )
    contract_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Συμβολαίου"
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος Συμβολαίου")
    description = models.TextField(verbose_name="Περιγραφή")
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό Συμβολαίου"
    )
    start_date = models.DateField(verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Κατάσταση"
    )
    payment_terms = models.TextField(blank=True, verbose_name="Όροι Εισπράξεως")
    warranty_terms = models.TextField(blank=True, verbose_name="Όροι Εγγύησης")
    contract_file = models.FileField(
        upload_to='contracts/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Συμβολαίου"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_contracts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συμβόλαιο"
        verbose_name_plural = "Συμβόλαια"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.contract_number} - {self.contractor.name} - {self.title}"
    
    @property
    def is_active(self):
        """Ελέγχει αν το συμβόλαιο είναι ενεργό"""
        from django.utils import timezone
        today = timezone.now().date()
        return (self.status == 'active' and 
                self.start_date <= today <= self.end_date)
    
    @property
    def days_remaining(self):
        """Υπολογίζει τις ημέρες που απομένουν"""
        from django.utils import timezone
        today = timezone.now().date()
        if self.end_date > today:
            return (self.end_date - today).days
        return 0


class Milestone(models.Model):
    """Ορόσημα έργου"""

    STATUS_CHOICES = [
        ('pending', 'Σε εκκρεμότητα'),
        ('in_progress', 'Σε εξέλιξη'),
        ('awaiting_approval', 'Προς έγκριση'),
        ('approved', 'Εγκρίθηκε'),
        ('overdue', 'Ληξιπρόθεσμο'),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='milestones',
        verbose_name="Έργο",
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    due_at = models.DateTimeField(null=True, blank=True, verbose_name="Προθεσμία")
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="Ποσό")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Κατάσταση")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Έγκρισης")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_milestones', verbose_name="Δημιουργήθηκε από")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ορόσημο"
        verbose_name_plural = "Ορόσημα"
        ordering = ['due_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['project', 'due_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.project.title}"

    @property
    def is_overdue(self):
        return self.due_at and self.status not in ['approved'] and self.due_at < timezone.now()

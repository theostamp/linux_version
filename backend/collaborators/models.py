from django.db import models
from django.contrib.auth import get_user_model
from buildings.models import Building
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

class Collaborator(models.Model):
    """Μοντέλο για εξωτερικούς συνεργάτες"""
    
    COLLABORATOR_TYPES = [
        ('consultant', 'Σύμβουλος'),
        ('contractor', 'Ανάδοχος'),
        ('specialist', 'Ειδικός'),
        ('advisor', 'Σύμβουλος'),
        ('partner', 'Συνεργάτης'),
        ('vendor', 'Προμηθευτής'),
        ('service_provider', 'Πάροχος Υπηρεσιών'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Ενεργός'),
        ('inactive', 'Ανενεργός'),
        ('suspended', 'Ανασταλμένος'),
        ('terminated', 'Τερματισμένος'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Όνομα/Επωνυμία")
    collaborator_type = models.CharField(
        max_length=20,
        choices=COLLABORATOR_TYPES,
        verbose_name="Τύπος Συνεργάτη"
    )
    contact_person = models.CharField(max_length=255, verbose_name="Επικοινωνία")
    phone = models.CharField(max_length=20, verbose_name="Τηλέφωνο")
    email = models.EmailField(verbose_name="Email")
    address = models.TextField(verbose_name="Διεύθυνση")
    tax_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    vat_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    website = models.URLField(blank=True, verbose_name="Ιστοσελίδα")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    expertise_areas = models.JSONField(
        default=list,
        verbose_name="Τομείς Εξειδίκευσης",
        help_text="List με τους τομείς εξειδίκευσης"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Κατάσταση"
    )
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
        verbose_name="Αξιολόγηση"
    )
    hourly_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Ωριαίος Τιμολογιακός Ταρίφ"
    )
    availability = models.CharField(
        max_length=20,
        choices=[
            ('available', 'Διαθέσιμος'),
            ('busy', 'Απασχολημένος'),
            ('unavailable', 'Μη Διαθέσιμος'),
        ],
        default='available',
        verbose_name="Διαθεσιμότητα"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συνεργάτης"
        verbose_name_plural = "Συνεργάτες"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_collaborator_type_display()})"


class CollaborationProject(models.Model):
    """Μοντέλο για έργα συνεργασίας"""
    
    PROJECT_TYPES = [
        ('consulting', 'Συμβουλευτική'),
        ('implementation', 'Υλοποίηση'),
        ('maintenance', 'Συντήρηση'),
        ('training', 'Εκπαίδευση'),
        ('audit', 'Ελεγκτική'),
        ('research', 'Έρευνα'),
        ('development', 'Ανάπτυξη'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('planning', 'Σχεδιασμός'),
        ('active', 'Ενεργό'),
        ('on_hold', 'Σε Αναμονή'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Τίτλος Έργου")
    description = models.TextField(verbose_name="Περιγραφή")
    project_type = models.CharField(
        max_length=20,
        choices=PROJECT_TYPES,
        verbose_name="Τύπος Έργου"
    )
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='collaboration_projects',
        verbose_name="Κτίριο"
    )
    collaborator = models.ForeignKey(
        Collaborator,
        on_delete=models.CASCADE,
        related_name='projects',
        verbose_name="Συνεργάτης"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planning',
        verbose_name="Κατάσταση"
    )
    start_date = models.DateField(verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Ολοκλήρωσης")
    budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Προϋπολογισμός"
    )
    actual_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πραγματικό Κόστος"
    )
    project_manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_collaboration_projects',
        verbose_name="Διευθυντής Έργου"
    )
    deliverables = models.JSONField(
        default=list,
        verbose_name="Παραδοτέα",
        help_text="List με τα παραδοτέα του έργου"
    )
    milestones = models.JSONField(
        default=list,
        verbose_name="Ορόσημα",
        help_text="List με τα ορόσημα του έργου"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Έργο Συνεργασίας"
        verbose_name_plural = "Έργα Συνεργασίας"
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.title} - {self.collaborator.name}"
    
    @property
    def progress_percentage(self):
        """Υπολογίζει το ποσοστό προόδου του έργου"""
        if self.status == 'completed':
            return 100
        elif self.status == 'planning':
            return 10
        elif self.status == 'active':
            return 50
        elif self.status == 'on_hold':
            return 25
        return 0


class CollaborationContract(models.Model):
    """Μοντέλο για συμβόλαια συνεργασίας"""
    
    CONTRACT_TYPES = [
        ('service', 'Υπηρεσίες'),
        ('consulting', 'Συμβουλευτική'),
        ('maintenance', 'Συντήρηση'),
        ('project', 'Έργο'),
        ('support', 'Υποστήριξη'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Πρόχειρο'),
        ('active', 'Ενεργό'),
        ('expired', 'Ληγμένο'),
        ('terminated', 'Τερματισμένο'),
        ('renewed', 'Ανανεωμένο'),
    ]
    
    contract_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Συμβολαίου"
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος Συμβολαίου")
    contract_type = models.CharField(
        max_length=20,
        choices=CONTRACT_TYPES,
        verbose_name="Τύπος Συμβολαίου"
    )
    collaborator = models.ForeignKey(
        Collaborator,
        on_delete=models.CASCADE,
        related_name='contracts',
        verbose_name="Συνεργάτης"
    )
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='collaboration_contracts',
        verbose_name="Κτίριο"
    )
    start_date = models.DateField(verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Κατάσταση"
    )
    total_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Συνολική Αξία"
    )
    payment_terms = models.TextField(verbose_name="Όροι Πληρωμής")
    scope_of_work = models.TextField(verbose_name="Πεδίο Εργασίας")
    deliverables = models.TextField(verbose_name="Παραδοτέα")
    terms_conditions = models.TextField(verbose_name="Όροι & Προϋποθέσεις")
    contract_file = models.FileField(
        upload_to='collaboration_contracts/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Συμβολαίου"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_collaboration_contracts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συμβόλαιο Συνεργασίας"
        verbose_name_plural = "Συμβόλαια Συνεργασίας"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.contract_number} - {self.collaborator.name}"
    
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


class CollaborationInvoice(models.Model):
    """Μοντέλο για τιμολόγια συνεργασίας"""
    
    STATUS_CHOICES = [
        ('draft', 'Πρόχειρο'),
        ('sent', 'Αποσταλμένο'),
        ('paid', 'Εισπραχθέν'),
        ('overdue', 'Ληξιπρόθεσμο'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Τιμολογίου"
    )
    contract = models.ForeignKey(
        CollaborationContract,
        on_delete=models.CASCADE,
        related_name='invoices',
        verbose_name="Συμβόλαιο"
    )
    collaborator = models.ForeignKey(
        Collaborator,
        on_delete=models.CASCADE,
        related_name='invoices',
        verbose_name="Συνεργάτης"
    )
    issue_date = models.DateField(verbose_name="Ημερομηνία Έκδοσης")
    due_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Ποσό"
    )
    vat_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Ποσό ΦΠΑ"
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Συνολικό Ποσό"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Κατάσταση"
    )
    payment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
    )
    description = models.TextField(verbose_name="Περιγραφή")
    invoice_file = models.FileField(
        upload_to='collaboration_invoices/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Τιμολογίου"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Τιμολόγιο Συνεργασίας"
        verbose_name_plural = "Τιμολόγια Συνεργασίας"
        ordering = ['-issue_date']
    
    def __str__(self):
        return f"{self.invoice_number} - {self.collaborator.name} - €{self.total_amount}"
    
    def save(self, *args, **kwargs):
        # Αυτόματος υπολογισμός του συνολικού ποσού
        self.total_amount = self.amount + self.vat_amount
        super().save(*args, **kwargs)


class CollaborationMeeting(models.Model):
    """Μοντέλο για συναντήσεις με συνεργάτες"""
    
    MEETING_TYPES = [
        ('kickoff', 'Εκκίνηση Έργου'),
        ('progress', 'Πρόοδος'),
        ('review', 'Ανασκόπηση'),
        ('planning', 'Σχεδιασμός'),
        ('issue', 'Επίλυση Προβλήματος'),
        ('closure', 'Ολοκλήρωση'),
        ('other', 'Άλλο'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Τίτλος Συνάντησης")
    meeting_type = models.CharField(
        max_length=20,
        choices=MEETING_TYPES,
        default='other',
        verbose_name="Τύπος Συνάντησης"
    )
    collaborator = models.ForeignKey(
        Collaborator,
        on_delete=models.CASCADE,
        related_name='meetings',
        verbose_name="Συνεργάτης"
    )
    project = models.ForeignKey(
        CollaborationProject,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='meetings',
        verbose_name="Έργο"
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
    attendees = models.ManyToManyField(
        User,
        related_name='collaboration_meetings',
        verbose_name="Παρευρισκόμενοι"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_collaboration_meetings',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συνάντηση Συνεργασίας"
        verbose_name_plural = "Συναντήσεις Συνεργασίας"
        ordering = ['-scheduled_at']
    
    def __str__(self):
        return f"{self.title} - {self.collaborator.name} - {self.scheduled_at.strftime('%d/%m/%Y %H:%M')}"


class CollaboratorPerformance(models.Model):
    """Μοντέλο για την απόδοση των συνεργατών"""
    
    collaborator = models.ForeignKey(
        Collaborator,
        on_delete=models.CASCADE,
        related_name='performance_records',
        verbose_name="Συνεργάτης"
    )
    period_start = models.DateField(verbose_name="Έναρξη Περιόδου")
    period_end = models.DateField(verbose_name="Λήξη Περιόδου")
    projects_completed = models.PositiveIntegerField(default=0, verbose_name="Ολοκληρωμένα Έργα")
    projects_total = models.PositiveIntegerField(default=0, verbose_name="Συνολικά Έργα")
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name="Μέση Αξιολόγηση"
    )
    on_time_delivery_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Ποσοστό Εγκαίρων Παράδοσης (%)"
    )
    quality_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name="Βαθμός Ποιότητας"
    )
    communication_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        null=True,
        blank=True,
        verbose_name="Βαθμός Επικοινωνίας"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Απόδοση Συνεργάτη"
        verbose_name_plural = "Αποδόσεις Συνεργατών"
        ordering = ['-period_end']
        unique_together = ['collaborator', 'period_start', 'period_end']
    
    def __str__(self):
        return f"{self.collaborator.name} - {self.period_start} έως {self.period_end}"
    
    @property
    def completion_rate(self):
        """Υπολογίζει το ποσοστό ολοκλήρωσης"""
        if self.projects_total > 0:
            return (self.projects_completed / self.projects_total) * 100
        return 0 
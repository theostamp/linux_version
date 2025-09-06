from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from buildings.models import Building
from django.contrib.auth import get_user_model
from apartments.models import Apartment
from django.utils import timezone

User = get_user_model()

class Contractor(models.Model):
    """Μοντέλο για συνεργεία επισκευών, καθαρισμού, ασφαλείας κλπ"""
    
    SERVICE_TYPES = [
        ('repair', 'Επισκευές'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('electrical', 'Ηλεκτρολογικά'),
        ('plumbing', 'Υδραυλικά'),
        ('heating', 'Θέρμανση/Κλιματισμός'),
        ('elevator', 'Ανελκυστήρες'),
        ('landscaping', 'Κηπουρική'),
        ('painting', 'Βαψίματα'),
        ('carpentry', 'Ξυλουργική'),
        ('masonry', 'Κατασκευές'),
        ('technical', 'Τεχνικές Υπηρεσίες'),
        ('maintenance', 'Συντήρηση'),
        ('emergency', 'Επείγοντα'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Ενεργό'),
        ('inactive', 'Ανενεργό'),
        ('suspended', 'Ανασταλμένο'),
        ('terminated', 'Τερματισμένο'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Όνομα Συνεργείου")
    service_type = models.CharField(
        max_length=20, 
        choices=SERVICE_TYPES,
        verbose_name="Τύπος Υπηρεσίας"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Κατάσταση"
    )
    contact_person = models.CharField(max_length=255, verbose_name="Επικοινωνία")
    phone = models.CharField(max_length=20, verbose_name="Τηλέφωνο")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Διεύθυνση")
    tax_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    vat_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    website = models.URLField(blank=True, verbose_name="Ιστοσελίδα")
    license_number = models.CharField(max_length=50, blank=True, verbose_name="Αριθμός Άδειας")
    insurance_number = models.CharField(max_length=50, blank=True, verbose_name="Αριθμός Ασφάλισης")
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
        verbose_name="Αξιολόγηση"
    )
    reliability_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
        verbose_name="Βαθμός Αξιοπιστίας"
    )
    response_time_hours = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Χρόνος Απόκρισης (ώρες)"
    )
    emergency_contact = models.CharField(max_length=50, blank=True, verbose_name="Επείγουσα Επικοινωνία")
    emergency_phone = models.CharField(max_length=50, blank=True, verbose_name="Επείγουσο Τηλέφωνο")
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
            ('available', 'Διαθέσιμο'),
            ('busy', 'Απασχολημένο'),
            ('unavailable', 'Μη Διαθέσιμο'),
        ],
        default='available',
        verbose_name="Διαθεσιμότητα"
    )
    specializations = models.JSONField(
        default=list,
        verbose_name="Εξειδικεύσεις",
        help_text="List με τις εξειδικεύσεις του συνεργείου"
    )
    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Συνεργείο"
        verbose_name_plural = "Συνεργεία"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_service_type_display()})"

class ServiceReceipt(models.Model):
    """Μοντέλο για αποδείξεις παροχής υπηρεσιών από συνεργεία"""
    
    contractor = models.ForeignKey(
        Contractor, 
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name="Συνεργείο"
    )
    building = models.ForeignKey(
        Building, 
        on_delete=models.CASCADE,
        related_name='service_receipts',
        verbose_name="Κτίριο"
    )
    service_date = models.DateField(verbose_name="Ημερομηνία Υπηρεσίας")
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name="Ποσό"
    )
    receipt_file = models.FileField(
        upload_to='receipts/%Y/%m/',
        verbose_name="Απόδειξη",
        blank=True,
        null=True,
    )
    description = models.TextField(verbose_name="Περιγραφή Υπηρεσίας")
    invoice_number = models.CharField(
        max_length=50, 
        blank=True,
        verbose_name="Αριθμός Τιμολογίου"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Εκκρεμεί'),
            ('paid', 'Εισπραχθέν'),
            ('overdue', 'Ληξιπρόθεσμο'),
        ],
        default='pending',
        verbose_name="Κατάσταση Εισπράξεως"
    )
    payment_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Ημερομηνία Εισπράξεως"
    )
    scheduled_maintenance = models.ForeignKey(
        'maintenance.ScheduledMaintenance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='service_receipts',
        verbose_name="Σχετικό Έργο"
    )
    linked_expense = models.ForeignKey(
        'financial.Expense',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_service_receipts',
        verbose_name="Συνδεδεμένη Δαπάνη"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_receipts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Απόδειξη Υπηρεσίας"
        verbose_name_plural = "Αποδείξεις Υπηρεσιών"
        ordering = ['-service_date']
    
    def __str__(self):
        return f"{self.contractor.name} - {self.service_date} - €{self.amount}"

class ScheduledMaintenance(models.Model):
    """Μοντέλο για προγραμματισμένα έργα συντήρησης"""
    
    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μέτρια'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Προγραμματισμένο'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(verbose_name="Περιγραφή")
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='scheduled_maintenance',
        verbose_name="Κτίριο"
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_work',
        verbose_name="Συνεργείο"
    )
    scheduled_date = models.DateField(verbose_name="Προγραμματισμένη Ημερομηνία")
    estimated_duration = models.IntegerField(
        help_text="Διάρκεια σε ώρες",
        verbose_name="Εκτιμώμενη Διάρκεια"
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
        default='scheduled',
        verbose_name="Κατάσταση"
    )
    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Εκτιμώμενο Κόστος"
    )
    actual_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πραγματικό Κόστος"
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Τοποθεσία"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_maintenance',
        verbose_name="Δημιουργήθηκε από"
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Ολοκλήρωσης")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Προγραμματισμένη Συντήρηση"
        verbose_name_plural = "Προγραμματισμένες Συντηρήσεις"
        ordering = ['scheduled_date', 'priority']
    
    def __str__(self):
        return f"{self.title} - {self.building.name} - {self.scheduled_date}"


class MaintenanceTicket(models.Model):
    """Αίτημα/αναφορά τεχνικού ζητήματος ή συντήρησης"""

    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μέτρια'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]

    STATUS_CHOICES = [
        ('open', 'Ανοιχτό'),
        ('triaged', 'Κατηγοριοποιημένο'),
        ('in_progress', 'Σε εξέλιξη'),
        ('waiting_vendor', 'Αναμονή συνεργείου'),
        ('blocked', 'Μπλοκαρισμένο'),
        ('completed', 'Ολοκληρωμένο'),
        ('closed', 'Κλειστό'),
        ('cancelled', 'Ακυρώθηκε'),
    ]

    CATEGORY_CHOICES = [
        ('electrical', 'Ηλεκτρολογικά'),
        ('plumbing', 'Υδραυλικά'),
        ('elevator', 'Ανελκυστήρας'),
        ('hvac', 'Θέρμανση/Κλιματισμός'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('general', 'Γενικό'),
        ('other', 'Άλλο'),
    ]

    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='maintenance_tickets',
        verbose_name="Κτίριο",
    )
    apartment = models.ForeignKey(
        Apartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_tickets',
        verbose_name="Διαμέρισμα",
    )
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(verbose_name="Περιγραφή")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='general', verbose_name="Κατηγορία")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium', verbose_name="Προτεραιότητα")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', verbose_name="Κατάσταση")
    reporter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reported_tickets',
        verbose_name="Αναφέρων",
    )
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        verbose_name="Υπεύθυνος",
    )
    contractor = models.ForeignKey(
        'maintenance.Contractor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets',
        verbose_name="Συνεργείο",
    )
    attachment = models.FileField(
        upload_to='tickets/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Συνημμένο"
    )
    location = models.CharField(max_length=255, blank=True, verbose_name="Τοποθεσία")
    sla_due_at = models.DateTimeField(null=True, blank=True, verbose_name="Προθεσμία SLA")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Κλεισίματος")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Αίτημα Συντήρησης"
        verbose_name_plural = "Αιτήματα Συντήρησης"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['building', 'status']),
            models.Index(fields=['building', 'priority']),
            models.Index(fields=['building', 'sla_due_at']),
        ]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title} - {self.building.name}"

    @property
    def is_overdue(self):
        if not self.sla_due_at:
            return False
        return self.status not in ['completed', 'closed', 'cancelled'] and self.sla_due_at < timezone.now()


class WorkOrder(models.Model):
    """Εντολή εργασίας που παράγεται από ticket"""

    STATUS_CHOICES = [
        ('scheduled', 'Προγραμματισμένο'),
        ('assigned', 'Ανατεθειμένο'),
        ('en_route', 'Καθοδόν'),
        ('in_progress', 'Σε εξέλιξη'),
        ('paused', 'Παύση'),
        ('done', 'Ολοκληρώθηκε'),
        ('verified', 'Επαληθεύτηκε'),
        ('cancelled', 'Ακυρώθηκε'),
    ]

    ticket = models.ForeignKey(
        MaintenanceTicket,
        on_delete=models.CASCADE,
        related_name='work_orders',
        verbose_name="Αίτημα",
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_orders',
        verbose_name="Συνεργείο",
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_orders',
        verbose_name="Υπεύθυνος",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', verbose_name="Κατάσταση")
    scheduled_at = models.DateTimeField(null=True, blank=True, verbose_name="Προγραμματισμένη Ημ/νία")
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Έναρξη")
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name="Λήξη")
    location = models.CharField(max_length=255, blank=True, verbose_name="Τοποθεσία")
    cost_estimate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Εκτίμηση Κόστους")
    actual_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Πραγματικό Κόστος")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_work_orders', verbose_name="Δημιουργήθηκε από")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Εντολή Εργασίας"
        verbose_name_plural = "Εντολές Εργασίας"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f"WO#{self.id} - {self.ticket.title} ({self.get_status_display()})"

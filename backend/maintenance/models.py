from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from buildings.models import Building
from django.contrib.auth import get_user_model

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
        ('other', 'Άλλο'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Όνομα Συνεργείου")
    service_type = models.CharField(
        max_length=20, 
        choices=SERVICE_TYPES,
        verbose_name="Τύπος Υπηρεσίας"
    )
    contact_person = models.CharField(max_length=255, verbose_name="Επικοινωνία")
    phone = models.CharField(max_length=20, verbose_name="Τηλέφωνο")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Διεύθυνση")
    tax_number = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ")
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        default=0,
        verbose_name="Αξιολόγηση"
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
        verbose_name="Απόδειξη"
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
            ('paid', 'Πληρωμένο'),
            ('overdue', 'Ληξιπρόθεσμο'),
        ],
        default='pending',
        verbose_name="Κατάσταση Πληρωμής"
    )
    payment_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
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

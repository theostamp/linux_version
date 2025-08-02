from django.db import models
from django.core.validators import MinValueValidator
from buildings.models import Building
from apartments.models import Apartment
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class Payment(models.Model):
    """Μοντέλο για πληρωμές κοινοχρήστων"""
    
    PAYMENT_TYPES = [
        ('common_expenses', 'Κοινοχρήστων'),
        ('heating', 'Θέρμανση'),
        ('electricity_common', 'Ηλεκτρικό Κοινοχρήστων'),
        ('cleaning', 'Καθαριότητα'),
        ('security', 'Ασφάλεια'),
        ('elevator', 'Ανελκυστήρες'),
        ('other', 'Άλλο'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('paid', 'Πληρωμένο'),
        ('overdue', 'Ληξιπρόθεσμο'),
        ('partial', 'Μερική Πληρωμή'),
    ]
    
    apartment = models.ForeignKey(
        Apartment,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name="Διαμέρισμα"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPES,
        verbose_name="Τύπος Πληρωμής"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    due_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    payment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Ποσό που Πληρώθηκε"
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Μέθοδος Πληρωμής"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_payments',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Πληρωμή"
        verbose_name_plural = "Πληρωμές"
        ordering = ['-due_date']
    
    def __str__(self):
        return f"{self.apartment} - {self.get_payment_type_display()} - €{self.amount}"
    
    @property
    def is_overdue(self):
        """Ελέγχει αν η πληρωμή είναι ληξιπρόθεσμη"""
        return self.due_date < timezone.now().date() and self.status != 'paid'
    
    @property
    def remaining_amount(self):
        """Υπολογίζει το υπόλοιπο ποσό"""
        return self.amount - self.amount_paid

class FinancialReceipt(models.Model):
    """Μοντέλο για αποδείξεις εισπράξεων"""
    
    RECEIPT_TYPES = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('check', 'Επιταγή'),
        ('online', 'Online Πληρωμή'),
        ('other', 'Άλλο'),
    ]
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name="Πληρωμή"
    )
    receipt_type = models.CharField(
        max_length=20,
        choices=RECEIPT_TYPES,
        verbose_name="Τύπος Απόδειξης"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    receipt_date = models.DateField(verbose_name="Ημερομηνία Απόδειξης")
    receipt_file = models.FileField(
        upload_to='financial_receipts/%Y/%m/',
        blank=True,
        verbose_name="Αρχείο Απόδειξης"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_financial_receipts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Απόδειξη Εισπράξεως"
        verbose_name_plural = "Αποδείξεις Εισπράξεων"
        ordering = ['-receipt_date']
    
    def __str__(self):
        return f"{self.payment.apartment} - {self.receipt_date} - €{self.amount}"

class BuildingAccount(models.Model):
    """Μοντέλο για λογαριασμούς κτιρίου"""
    
    ACCOUNT_TYPES = [
        ('operating', 'Λειτουργικός'),
        ('reserve', 'Αποθεματικό'),
        ('special', 'Ειδικός'),
    ]
    
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='accounts',
        verbose_name="Κτίριο"
    )
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPES,
        verbose_name="Τύπος Λογαριασμού"
    )
    account_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Λογαριασμού"
    )
    bank_name = models.CharField(
        max_length=100,
        verbose_name="Όνομα Τράπεζας"
    )
    current_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name="Τρέχον Υπόλοιπο"
    )
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργός")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Λογαριασμός Κτιρίου"
        verbose_name_plural = "Λογαριασμοί Κτιρίου"
        unique_together = ['building', 'account_type']
    
    def __str__(self):
        return f"{self.building.name} - {self.get_account_type_display()} - €{self.current_balance}"

class FinancialTransaction(models.Model):
    """Μοντέλο για οικονομικές συναλλαγές"""
    
    TRANSACTION_TYPES = [
        ('income', 'Έσοδο'),
        ('expense', 'Έξοδο'),
    ]
    
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='financial_transactions',
        verbose_name="Κτίριο"
    )
    account = models.ForeignKey(
        BuildingAccount,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name="Λογαριασμός"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES,
        verbose_name="Τύπος Συναλλαγής"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Ποσό"
    )
    description = models.TextField(verbose_name="Περιγραφή")
    transaction_date = models.DateField(verbose_name="Ημερομηνία Συναλλαγής")
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Κατηγορία"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_transactions',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Οικονομική Συναλλαγή"
        verbose_name_plural = "Οικονομικές Συναλλαγές"
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"{self.building.name} - {self.get_transaction_type_display()} - €{self.amount}"
    
    def save(self, *args, **kwargs):
        """Ενημέρωση του υπολοίπου του λογαριασμού"""
        if self.transaction_type == 'income':
            self.account.current_balance += self.amount
        else:
            self.account.current_balance -= self.amount
        self.account.save()
        super().save(*args, **kwargs)

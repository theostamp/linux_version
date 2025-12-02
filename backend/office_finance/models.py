"""
Office Finance Models
Διαχείριση εσόδων και εξόδων του γραφείου διαχείρισης.
Ξεχωριστό από τα οικονομικά των κτιρίων.
"""

from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from decimal import Decimal


class OfficeExpenseCategory(models.Model):
    """
    Κατηγορίες εξόδων γραφείου.
    Προκαθορισμένες + δυνατότητα προσθήκης custom.
    """
    
    # Γενικές κατηγορίες εξόδων (για ομαδοποίηση)
    GROUP_TYPES = [
        ('fixed', 'Πάγια Έξοδα'),
        ('operational', 'Λειτουργικά Έξοδα'),
        ('collaborators', 'Συνεργάτες & Εξωτερικοί'),
        ('suppliers', 'Προμηθευτές'),
        ('staff', 'Προσωπικό'),
        ('taxes_legal', 'Φόροι & Νομικά'),
        ('other', 'Λοιπά'),
    ]
    
    # Προκαθορισμένες υπο-κατηγορίες
    CATEGORY_TYPES = [
        # Πάγια Έξοδα
        ('rent', 'Ενοίκιο Γραφείου'),
        ('common_charges', 'Κοινόχρηστα Γραφείου'),
        ('insurance', 'Ασφάλειες'),
        ('equipment_depreciation', 'Αποσβέσεις Εξοπλισμού'),
        # Λειτουργικά Έξοδα
        ('utilities', 'Πάγιοι Λογαριασμοί (ΔΕΗ/Νερό/Τηλ)'),
        ('office_supplies', 'Γραφική Ύλη & Αναλώσιμα'),
        ('platform', 'Πλατφόρμα & Λογισμικό'),
        ('equipment', 'Εξοπλισμός'),
        ('maintenance', 'Συντήρηση & Επισκευές'),
        ('transport', 'Μετακινήσεις & Καύσιμα'),
        # Συνεργάτες & Εξωτερικοί
        ('accountant', 'Λογιστής'),
        ('lawyer', 'Δικηγόρος'),
        ('technical_consultant', 'Τεχνικός Σύμβουλος'),
        ('external_services', 'Εξωτερικές Υπηρεσίες'),
        # Προμηθευτές
        ('supplier_materials', 'Υλικά & Προμήθειες'),
        ('supplier_services', 'Υπηρεσίες Προμηθευτών'),
        ('subcontractors', 'Υπεργολάβοι'),
        # Προσωπικό
        ('salaries', 'Μισθοδοσία'),
        ('social_security', 'Ασφαλιστικές Εισφορές'),
        ('benefits', 'Παροχές Προσωπικού'),
        # Φόροι & Νομικά
        ('taxes', 'Φόροι & Τέλη'),
        ('legal_fees', 'Νομικά Έξοδα'),
        ('fines', 'Πρόστιμα'),
        # Marketing
        ('marketing', 'Marketing & Διαφήμιση'),
        ('events', 'Εκδηλώσεις'),
        # Λοιπά
        ('bank_fees', 'Τραπεζικά Έξοδα'),
        ('other', 'Λοιπά Έξοδα'),
    ]
    
    name = models.CharField(max_length=100, verbose_name="Όνομα Κατηγορίας")
    group_type = models.CharField(
        max_length=20,
        choices=GROUP_TYPES,
        default='other',
        verbose_name="Ομάδα Κατηγορίας"
    )
    category_type = models.CharField(
        max_length=30, 
        choices=CATEGORY_TYPES, 
        default='other',
        verbose_name="Τύπος Κατηγορίας"
    )
    icon = models.CharField(max_length=50, blank=True, verbose_name="Εικονίδιο")
    color = models.CharField(max_length=20, default='slate', verbose_name="Χρώμα")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Σειρά Εμφάνισης")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργή")
    is_system = models.BooleanField(default=False, verbose_name="Κατηγορία Συστήματος")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Κατηγορία Εξόδων Γραφείου"
        verbose_name_plural = "Κατηγορίες Εξόδων Γραφείου"
        ordering = ['group_type', 'display_order', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class OfficeIncomeCategory(models.Model):
    """
    Κατηγορίες εσόδων γραφείου.
    Σύνδεση με δαπάνες διαχείρισης κτιρίων.
    """
    
    # Γενικές κατηγορίες εσόδων (για ομαδοποίηση)
    GROUP_TYPES = [
        ('building_fees', 'Αμοιβές Κτιρίων'),
        ('services', 'Υπηρεσίες'),
        ('commissions', 'Προμήθειες'),
        ('other', 'Λοιπά'),
    ]
    
    CATEGORY_TYPES = [
        # Αμοιβές Κτιρίων (συνδέονται με δαπάνες διαχείρισης)
        ('management_fee_monthly', 'Αμοιβή Διαχείρισης (Μηνιαία)'),
        ('management_fee_annual', 'Αμοιβή Διαχείρισης (Ετήσια)'),
        ('special_assembly_fee', 'Αμοιβή Έκτακτης Γ.Σ.'),
        ('audit_fee', 'Αμοιβή Ελέγχου/Απολογισμού'),
        # Υπηρεσίες
        ('certificate_issue', 'Έκδοση Πιστοποιητικών'),
        ('assembly_attendance', 'Παράσταση σε Γ.Σ.'),
        ('technical_advice', 'Τεχνική Συμβουλή'),
        ('mediation', 'Διαμεσολάβηση'),
        ('document_preparation', 'Σύνταξη Εγγράφων'),
        ('project_supervision', 'Επίβλεψη Έργων'),
        # Προμήθειες
        ('contractor_commission', 'Προμήθεια Συνεργείου'),
        ('supplier_commission', 'Προμήθεια Προμηθευτή'),
        ('insurance_commission', 'Προμήθεια Ασφάλειας'),
        # Λοιπά
        ('interest_income', 'Τόκοι Καταθέσεων'),
        ('late_payment_fees', 'Προσαυξήσεις Καθυστέρησης'),
        ('other', 'Λοιπά Έσοδα'),
    ]
    
    name = models.CharField(max_length=100, verbose_name="Όνομα Κατηγορίας")
    group_type = models.CharField(
        max_length=20,
        choices=GROUP_TYPES,
        default='other',
        verbose_name="Ομάδα Κατηγορίας"
    )
    category_type = models.CharField(
        max_length=30, 
        choices=CATEGORY_TYPES, 
        default='other',
        verbose_name="Τύπος Κατηγορίας"
    )
    icon = models.CharField(max_length=50, blank=True, verbose_name="Εικονίδιο")
    color = models.CharField(max_length=20, default='emerald', verbose_name="Χρώμα")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Σειρά Εμφάνισης")
    
    # Σύνδεση με δαπάνες διαχείρισης (για αυτόματη καταγραφή)
    links_to_management_expense = models.BooleanField(
        default=False,
        verbose_name="Συνδέεται με Δαπάνες Διαχείρισης",
        help_text="Αν ενεργοποιηθεί, τα έσοδα αυτής της κατηγορίας θα αντιστοιχούν στις δαπάνες διαχείρισης κτιρίων"
    )
    
    is_active = models.BooleanField(default=True, verbose_name="Ενεργή")
    is_system = models.BooleanField(default=False, verbose_name="Κατηγορία Συστήματος")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Κατηγορία Εσόδων Γραφείου"
        verbose_name_plural = "Κατηγορίες Εσόδων Γραφείου"
        ordering = ['group_type', 'display_order', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class OfficeExpense(models.Model):
    """
    Έξοδα του γραφείου διαχείρισης.
    """
    
    PAYMENT_METHODS = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('card', 'Κάρτα'),
        ('check', 'Επιταγή'),
        ('direct_debit', 'Πάγια Εντολή'),
        ('other', 'Άλλο'),
    ]
    
    RECURRENCE_TYPES = [
        ('once', 'Εφάπαξ'),
        ('monthly', 'Μηνιαίο'),
        ('quarterly', 'Τριμηνιαίο'),
        ('yearly', 'Ετήσιο'),
    ]
    
    # Βασικά στοιχεία
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Ποσό (€)"
    )
    date = models.DateField(verbose_name="Ημερομηνία")
    
    # Κατηγοριοποίηση
    category = models.ForeignKey(
        OfficeExpenseCategory,
        on_delete=models.PROTECT,
        related_name='expenses',
        verbose_name="Κατηγορία"
    )
    
    # Πληρωμή
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHODS,
        default='bank_transfer',
        verbose_name="Τρόπος Πληρωμής"
    )
    is_paid = models.BooleanField(default=True, verbose_name="Πληρώθηκε")
    paid_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Πληρωμής")
    
    # Επαναλαμβανόμενο
    recurrence = models.CharField(
        max_length=20,
        choices=RECURRENCE_TYPES,
        default='once',
        verbose_name="Επανάληψη"
    )
    
    # Προμηθευτής
    supplier_name = models.CharField(max_length=255, blank=True, verbose_name="Προμηθευτής")
    supplier_vat = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ Προμηθευτή")
    
    # Παραστατικό
    document = models.FileField(
        upload_to='office_expenses/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Παραστατικό"
    )
    document_number = models.CharField(max_length=100, blank=True, verbose_name="Αριθμός Παραστατικού")
    
    # Σημειώσεις
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_office_expenses',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Έξοδο Γραφείου"
        verbose_name_plural = "Έξοδα Γραφείου"
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['category']),
            models.Index(fields=['-date', 'category']),
        ]
    
    def __str__(self):
        return f"{self.title} - €{self.amount} ({self.date})"


class OfficeIncome(models.Model):
    """
    Έσοδα του γραφείου διαχείρισης.
    Με δυνατότητα σύνδεσης με κτίριο για αμοιβές διαχείρισης.
    """
    
    PAYMENT_METHODS = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('card', 'Κάρτα'),
        ('check', 'Επιταγή'),
        ('direct_debit', 'Πάγια Εντολή'),
        ('other', 'Άλλο'),
    ]
    
    RECURRENCE_TYPES = [
        ('once', 'Εφάπαξ'),
        ('monthly', 'Μηνιαίο'),
        ('quarterly', 'Τριμηνιαίο'),
        ('yearly', 'Ετήσιο'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('received', 'Εισπράχθηκε'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    # Βασικά στοιχεία
    title = models.CharField(max_length=255, verbose_name="Τίτλος")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Ποσό (€)"
    )
    date = models.DateField(verbose_name="Ημερομηνία")
    
    # Κατηγοριοποίηση
    category = models.ForeignKey(
        OfficeIncomeCategory,
        on_delete=models.PROTECT,
        related_name='incomes',
        verbose_name="Κατηγορία"
    )
    
    # Σύνδεση με κτίριο (για αμοιβές διαχείρισης)
    building = models.ForeignKey(
        'buildings.Building',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='office_incomes',
        verbose_name="Κτίριο",
        help_text="Συνδέστε με κτίριο αν είναι αμοιβή διαχείρισης"
    )
    
    # Κατάσταση & Πληρωμή
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHODS,
        blank=True,
        verbose_name="Τρόπος Είσπραξης"
    )
    received_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Είσπραξης")
    
    # Επαναλαμβανόμενο
    recurrence = models.CharField(
        max_length=20,
        choices=RECURRENCE_TYPES,
        default='once',
        verbose_name="Επανάληψη"
    )
    
    # Πελάτης (αν δεν είναι κτίριο)
    client_name = models.CharField(max_length=255, blank=True, verbose_name="Πελάτης")
    client_vat = models.CharField(max_length=20, blank=True, verbose_name="ΑΦΜ Πελάτη")
    
    # Παραστατικό
    document = models.FileField(
        upload_to='office_income/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Παραστατικό"
    )
    invoice_number = models.CharField(max_length=100, blank=True, verbose_name="Αριθμός Τιμολογίου")
    
    # Σημειώσεις
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_office_incomes',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Έσοδο Γραφείου"
        verbose_name_plural = "Έσοδα Γραφείου"
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['category']),
            models.Index(fields=['building']),
            models.Index(fields=['status']),
            models.Index(fields=['-date', 'category']),
        ]
    
    def __str__(self):
        building_info = f" - {self.building.name}" if self.building else ""
        return f"{self.title}{building_info} - €{self.amount} ({self.date})"
    
    @property
    def is_received(self):
        return self.status == 'received'


class OfficeFinancialSummary(models.Model):
    """
    Μηνιαία σύνοψη οικονομικών γραφείου.
    Υπολογίζεται αυτόματα ή χειροκίνητα.
    """
    
    year = models.PositiveIntegerField(verbose_name="Έτος")
    month = models.PositiveIntegerField(verbose_name="Μήνας")
    
    # Σύνολα
    total_income = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Συνολικά Έσοδα"
    )
    total_expenses = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Συνολικά Έξοδα"
    )
    net_result = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Καθαρό Αποτέλεσμα"
    )
    
    # Ανάλυση ανά κατηγορία (JSON)
    income_by_category = models.JSONField(
        default=dict,
        verbose_name="Έσοδα ανά Κατηγορία"
    )
    expenses_by_category = models.JSONField(
        default=dict,
        verbose_name="Έξοδα ανά Κατηγορία"
    )
    
    # Έσοδα ανά κτίριο (JSON)
    income_by_building = models.JSONField(
        default=dict,
        verbose_name="Έσοδα ανά Κτίριο"
    )
    
    # Metadata
    is_closed = models.BooleanField(default=False, verbose_name="Κλειστός Μήνας")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Κλεισίματος")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Μηνιαία Σύνοψη Γραφείου"
        verbose_name_plural = "Μηνιαίες Συνόψεις Γραφείου"
        unique_together = ['year', 'month']
        ordering = ['-year', '-month']
    
    def __str__(self):
        return f"Σύνοψη {self.month:02d}/{self.year}"
    
    @property
    def period_display(self):
        months = ['', 'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 
                  'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ']
        return f"{months[self.month]} {self.year}"
    
    def calculate_totals(self):
        """Υπολογίζει τα σύνολα από τις εγγραφές του μήνα."""
        from django.db.models import Sum
        from django.db.models.functions import Coalesce
        
        # Ημερομηνίες μήνα
        from datetime import date
        import calendar
        
        first_day = date(self.year, self.month, 1)
        last_day = date(self.year, self.month, calendar.monthrange(self.year, self.month)[1])
        
        # Έσοδα
        income_qs = OfficeIncome.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            status='received'
        )
        self.total_income = income_qs.aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )['total']
        
        # Έσοδα ανά κατηγορία
        income_by_cat = income_qs.values('category__name').annotate(
            total=Sum('amount')
        )
        self.income_by_category = {
            item['category__name']: float(item['total']) 
            for item in income_by_cat
        }
        
        # Έσοδα ανά κτίριο
        income_by_bld = income_qs.filter(building__isnull=False).values(
            'building__id', 'building__name'
        ).annotate(total=Sum('amount'))
        self.income_by_building = {
            item['building__name']: {
                'id': item['building__id'],
                'total': float(item['total'])
            }
            for item in income_by_bld
        }
        
        # Έξοδα
        expense_qs = OfficeExpense.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            is_paid=True
        )
        self.total_expenses = expense_qs.aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )['total']
        
        # Έξοδα ανά κατηγορία
        expenses_by_cat = expense_qs.values('category__name').annotate(
            total=Sum('amount')
        )
        self.expenses_by_category = {
            item['category__name']: float(item['total']) 
            for item in expenses_by_cat
        }
        
        # Καθαρό αποτέλεσμα
        self.net_result = self.total_income - self.total_expenses
        
        self.save()
        return self


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
    # Financial integration
    linked_expense = models.ForeignKey(
        'financial.Expense',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_maintenance_tasks',
        verbose_name="Συνδεδεμένη Δαπάνη"
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
    
    def create_or_update_expense(self):
        """Create or update linked expenses based on maintenance data and payment schedule"""
        from financial.models import Expense
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        # Don't create expenses if no cost is specified
        if not self.estimated_cost and not (hasattr(self, 'payment_schedule') and self.payment_schedule):
            return None
        
        # Get payment schedule if available
        payment_schedule = None
        try:
            if hasattr(self, 'payment_schedule') and self.payment_schedule:
                payment_schedule = self.payment_schedule
        except:
            pass
        
        # Determine expense category
        category = self._determine_expense_category()
        
        # Handle different payment types
        if payment_schedule and payment_schedule.payment_type in ['advance_installments', 'periodic']:
            return self._create_installment_expenses(payment_schedule, category)
        else:
            # Handle lump sum or no payment schedule
            return self._create_single_expense(payment_schedule, category)
    
    def _create_single_expense(self, payment_schedule, category):
        """Create or update a single expense for lump sum payments"""
        from financial.models import Expense
        from django.utils import timezone
        
        # Calculate amount
        total_amount = self.estimated_cost or 0
        if payment_schedule:
            total_amount = payment_schedule.total_amount
        
        if total_amount <= 0:
            return None
        
        if self.linked_expense:
            # Update existing expense
            expense = self.linked_expense
            expense.title = f"Συντήρηση: {self.title}"
            expense.amount = total_amount
            expense.date = self.scheduled_date or timezone.now().date()
            expense.category = category
            expense.notes = f"Αυτόματα συνδεδεμένο με προγραμματισμένο έργο #{self.id}"
            expense.save()
            return expense
        else:
            # Create new expense
            expense = Expense.objects.create(
                building=self.building,
                title=f"Συντήρηση: {self.title}",
                amount=total_amount,
                date=self.scheduled_date or timezone.now().date(),
                category=category,
                expense_type='regular',
                distribution_type='by_participation_mills',
                notes=f"Αυτόματα συνδεδεμένο με προγραμματισμένο έργο #{self.id}"
            )
            # Link back to this maintenance
            self.linked_expense = expense
            self.save(update_fields=['linked_expense'])
            return expense
    
    def _create_installment_expenses(self, payment_schedule, category):
        """Create separate expenses for each installment based on payment schedule"""
        from financial.models import Expense
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        from decimal import Decimal
        import calendar
        
        # Clear existing single expense if it exists
        if self.linked_expense:
            old_expense = self.linked_expense
            self.linked_expense = None
            self.save(update_fields=['linked_expense'])
            # Delete old single expense
            old_expense.delete()
        
        created_expenses = []
        
        if payment_schedule.payment_type == 'advance_installments':
            # Handle advance + installments
            advance_amount = payment_schedule.advance_amount or Decimal('0')
            remaining_amount = payment_schedule.remaining_amount or payment_schedule.total_amount
            installment_count = payment_schedule.installment_count or 1
            
            current_date = payment_schedule.start_date
            
            # Create advance payment expense if there's an advance
            if advance_amount > 0:
                advance_expense = Expense.objects.create(
                    building=self.building,
                    title=f"Συντήρηση: {self.title} (Προκαταβολή)",
                    amount=advance_amount,
                    date=current_date,
                    category=category,
                    expense_type='regular',
                    distribution_type='by_participation_mills',
                    notes=f"Προκαταβολή για προγραμματισμένο έργο #{self.id}"
                )
                created_expenses.append(advance_expense)
                
                # Move to next month for first installment
                current_date = current_date + relativedelta(months=1)
            
            # Create installment expenses
            if installment_count > 0 and remaining_amount > 0:
                installment_amount = remaining_amount / installment_count
                
                for i in range(installment_count):
                    # Ensure we don't go beyond the last day of the month
                    try:
                        # Get the last day of the target month
                        last_day = calendar.monthrange(current_date.year, current_date.month)[1]
                        # If the original day is beyond the last day of this month, use the last day
                        expense_date = current_date.replace(day=min(current_date.day, last_day))
                    except:
                        expense_date = current_date
                    
                    installment_expense = Expense.objects.create(
                        building=self.building,
                        title=f"Συντήρηση: {self.title} (Δόση {i+1}/{installment_count})",
                        amount=installment_amount,
                        date=expense_date,
                        category=category,
                        expense_type='regular',
                        distribution_type='by_participation_mills',
                        notes=f"Δόση {i+1} από {installment_count} για προγραμματισμένο έργο #{self.id}"
                    )
                    created_expenses.append(installment_expense)
                    
                    # Move to next month
                    current_date = current_date + relativedelta(months=1)
        
        elif payment_schedule.payment_type == 'periodic':
            # Handle periodic payments
            periodic_amount = payment_schedule.periodic_amount or Decimal('0')
            if periodic_amount <= 0:
                return None
            
            # Calculate number of periods based on total amount and periodic amount
            total_periods = int(payment_schedule.total_amount / periodic_amount)
            current_date = payment_schedule.start_date
            
            for i in range(total_periods):
                # Handle month boundaries properly
                try:
                    last_day = calendar.monthrange(current_date.year, current_date.month)[1]
                    expense_date = current_date.replace(day=min(current_date.day, last_day))
                except:
                    expense_date = current_date
                
                periodic_expense = Expense.objects.create(
                    building=self.building,
                    title=f"Συντήρηση: {self.title} (Περίοδος {i+1}/{total_periods})",
                    amount=periodic_amount,
                    date=expense_date,
                    category=category,
                    expense_type='regular',
                    distribution_type='by_participation_mills',
                    notes=f"Περιοδική πληρωμή {i+1} από {total_periods} για προγραμματισμένο έργο #{self.id}"
                )
                created_expenses.append(periodic_expense)
                
                # Move to next period (assuming monthly for now)
                current_date = current_date + relativedelta(months=1)
        
        # Link the first expense as the primary linked expense for backward compatibility
        if created_expenses:
            self.linked_expense = created_expenses[0]
            self.save(update_fields=['linked_expense'])
            return created_expenses[0]
        
        return None
    
    def _determine_expense_category(self):
        """Determine expense category based on maintenance type"""
        title_lower = self.title.lower()
        
        # Map maintenance types to expense categories
        category_mapping = {
            'ανελκυστήρα': 'elevator_maintenance',
            'elevator': 'elevator_maintenance',
            'θέρμανση': 'heating_maintenance',
            'καυστήρα': 'heating_maintenance',
            'heating': 'heating_maintenance',
            'ηλεκτρικ': 'electrical_maintenance',
            'electrical': 'electrical_maintenance',
            'υδραυλικ': 'plumbing_repair',
            'plumbing': 'plumbing_repair',
            'καθαρισμ': 'cleaning',
            'cleaning': 'cleaning',
            'ασφάλει': 'security',
            'security': 'security',
            'κήπ': 'landscaping',
            'garden': 'landscaping',
            'ενδοεπικοινων': 'electrical_maintenance',
            'intercom': 'electrical_maintenance',
            'θυροτηλ': 'electrical_maintenance',
        }
        
        for keyword, category in category_mapping.items():
            if keyword in title_lower:
                return category
        
        # Default category
        return 'maintenance'
    
    def delete_linked_expense(self):
        """Delete linked expenses when maintenance is deleted"""
        from financial.models import Expense
        
        # Delete the primary linked expense
        if self.linked_expense:
            expense = self.linked_expense
            self.linked_expense = None
            self.save(update_fields=['linked_expense'])
            expense.delete()
        
        # Delete any additional expenses created for this maintenance (installments)
        # Find expenses that reference this maintenance in their notes
        related_expenses = Expense.objects.filter(
            building=self.building,
            notes__icontains=f"προγραμματισμένο έργο #{self.id}"
        )
        
        for expense in related_expenses:
            expense.delete()


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


class PaymentSchedule(models.Model):
    """Πρόγραμμα πληρωμών για έργα συντήρησης"""
    
    PAYMENT_TYPE_CHOICES = [
        ('lump_sum', 'Εφάπαξ'),
        ('advance_installments', 'Προκαταβολή + Δόσεις'),
        ('periodic', 'Περιοδικές Καταβολές'),
        ('milestone_based', 'Βάσει Ορόσημων'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Ενεργό'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρώθηκε'),
        ('suspended', 'Αναστολή'),
    ]
    
    scheduled_maintenance = models.OneToOneField(
        ScheduledMaintenance,
        on_delete=models.CASCADE,
        related_name='payment_schedule',
        verbose_name="Προγραμματισμένη Συντήρηση"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        default='lump_sum',
        verbose_name="Τύπος Πληρωμής"
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Συνολικό Ποσό")
    # Advance + installments configuration
    advance_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Ποσοστό Προκαταβολής (%)")
    installment_count = models.PositiveIntegerField(null=True, blank=True, verbose_name="Αριθμός Δόσεων")
    installment_frequency = models.CharField(max_length=20, null=True, blank=True, verbose_name="Συχνότητα Δόσεων (weekly/monthly/biweekly)")
    # Periodic configuration
    periodic_frequency = models.CharField(max_length=20, null=True, blank=True, verbose_name="Συχνότητα Περιοδικών (weekly/monthly/quarterly/annual)")
    periodic_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Ποσό Περιοδικής Καταβολής")
    # Legacy/compat fields (kept for compatibility)
    number_of_installments = models.PositiveIntegerField(default=1, verbose_name="Αριθμός Δόσεων (legacy)")
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Ποσό Δόσης (legacy)")
    start_date = models.DateField(verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Ημερομηνία Λήξης"
    )
    payment_frequency_days = models.PositiveIntegerField(default=30, verbose_name="Συχνότητα Πληρωμής (ημέρες)")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Κατάσταση"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_payment_schedules',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Πρόγραμμα Πληρωμών"
        verbose_name_plural = "Προγράμματα Πληρωμών"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Πληρωμές για {self.scheduled_maintenance.title}"
    
    def save(self, *args, **kwargs):
        # Auto-calc legacy installment_amount for compatibility
        if self.payment_type in ['advance_installments'] and (self.installment_count or 0) > 0:
            try:
                from decimal import Decimal
                adv = (self.total_amount * (self.advance_percentage or 0)) / Decimal('100') if self.advance_percentage is not None else None
                remaining = (self.total_amount - (adv or 0)) if adv is not None else self.total_amount
                count = self.installment_count or 1
                self.installment_amount = remaining / count
            except Exception:
                pass
        super().save(*args, **kwargs)

    @property
    def advance_amount(self):
        """Υπολογισμός ποσού προκαταβολής από ποσοστό."""
        try:
            from decimal import Decimal
            if self.payment_type == 'advance_installments' and self.advance_percentage is not None:
                return (self.total_amount * Decimal(self.advance_percentage)) / Decimal('100')
        except Exception:
            pass
        return None

    @property
    def remaining_amount(self):
        """Υπολογισμός υπολοίπου μετά την προκαταβολή."""
        adv = self.advance_amount or 0
        try:
            return self.total_amount - adv
        except Exception:
            return None


class PaymentInstallment(models.Model):
    """Μεμονωμένες δόσεις πληρωμής"""
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('paid', 'Εξοφλήθηκε'),
        ('overdue', 'Ληξιπρόθεσμη'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    payment_schedule = models.ForeignKey(
        PaymentSchedule,
        on_delete=models.CASCADE,
        related_name='installments',
        verbose_name="Πρόγραμμα Πληρωμών"
    )
    installment_type = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name="Τύπος Δόσης (full/advance/installment/periodic/milestone)"
    )
    installment_number = models.PositiveIntegerField(verbose_name="Αριθμός Δόσης")
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Ποσό"
    )
    due_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    payment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Ημερομηνία Πληρωμής"
    )
    # Legacy field kept for compatibility
    paid_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Πληρωμής (legacy)")
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Πληρωθέν Ποσό"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Τρόπος Πληρωμής"
    )
    transaction_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αναφορά Συναλλαγής"
    )
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Δόση Πληρωμής"
        verbose_name_plural = "Δόσεις Πληρωμών"
        ordering = ['due_date', 'installment_number']
        unique_together = ['payment_schedule', 'installment_number']
    
    def __str__(self):
        return f"Δόση {self.installment_number} - €{self.amount} - {self.due_date}"
    
    @property
    def is_overdue(self):
        return self.status == 'pending' and self.due_date < timezone.now().date()


class PaymentReceipt(models.Model):
    """Αποδείξεις πληρωμών με ψηφιακή υπογραφή"""
    
    RECEIPT_TYPES = [
        ('advance', 'Προκαταβολή'),
        ('installment', 'Δόση'),
        ('final', 'Εξόφληση'),
        ('periodic', 'Περιοδική Καταβολή'),
        ('payment', 'Πληρωμή'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Πρόχειρο'),
        ('issued', 'Εκδόθηκε'),
        ('signed', 'Υπογεγραμμένη'),
        ('approved', 'Εγκεκριμένη'),
        ('archived', 'Αρχειοθετημένη'),
        ('disputed', 'Αμφισβητείται'),
    ]
    
    scheduled_maintenance = models.ForeignKey(
        ScheduledMaintenance,
        on_delete=models.CASCADE,
        related_name='payment_receipts',
        null=True,
        blank=True,
        verbose_name="Προγραμματισμένη Συντήρηση"
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_receipts',
        verbose_name="Συνεργείο"
    )
    installment = models.OneToOneField(
        PaymentInstallment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipt',
        verbose_name="Δόση"
    )
    receipt_type = models.CharField(max_length=20, choices=RECEIPT_TYPES, default='payment', verbose_name="Τύπος Απόδειξης")
    receipt_number = models.CharField(max_length=50, unique=True, verbose_name="Αριθμός Απόδειξης")
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Ποσό")
    payment_date = models.DateField(verbose_name="Ημερομηνία Πληρωμής")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Κατάσταση")
    # Contractor signature fields
    contractor_signature = models.TextField(blank=True, verbose_name="Ψηφιακή Υπογραφή Συνεργείου")
    contractor_signature_date = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Υπογραφής")
    contractor_signature_ip = models.CharField(max_length=64, blank=True, verbose_name="IP Υπογραφής")
    # Files
    receipt_file = models.FileField(upload_to='payment_receipts/%Y/%m/', null=True, blank=True, verbose_name="Αρχείο Απόδειξης")
    contractor_invoice = models.FileField(upload_to='contractor_invoices/%Y/%m/', null=True, blank=True, verbose_name="Τιμολόγιο Συνεργείου")
    pdf_file = models.FileField(upload_to='payment_receipts/%Y/%m/', null=True, blank=True, verbose_name="Αρχείο PDF")
    # Financial integration
    linked_expense = models.ForeignKey('financial.Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_payment_receipts', verbose_name="Συνδεδεμένη Δαπάνη")
    # Audit
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_payment_receipts', verbose_name="Δημιουργήθηκε από")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_payment_receipts', verbose_name="Εγκρίθηκε από")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Έγκρισης")
    issue_date = models.DateField(auto_now_add=True, verbose_name="Ημερομηνία Έκδοσης")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Αρχειοθέτησης")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Απόδειξη Πληρωμής"
        verbose_name_plural = "Αποδείξεις Πληρωμών"
        ordering = ['-issue_date']
    
    def __str__(self):
        return f"Απόδειξη {self.receipt_number} - €{self.amount}"
    
    def save(self, *args, **kwargs):
        if not self.receipt_number:
            # Generate unique receipt number
            from django.utils import timezone
            base_id = self.installment.id if self.installment_id else (self.scheduled_maintenance_id or 'X')
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.receipt_number = f"REC-{timestamp}-{base_id}"
        super().save(*args, **kwargs)

    @property
    def is_signed(self):
        return bool(self.contractor_signature)

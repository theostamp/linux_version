from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from buildings.models import Building
from apartments.models import Apartment


class Supplier(models.Model):
    """Μοντέλο για τους προμηθευτές/συναλλασόμενους"""
    
    SUPPLIER_CATEGORIES = [
        ('electricity', 'ΔΕΗ (Ηλεκτρικό Ρεύμα)'),
        ('water', 'ΕΥΔΑΠ (Νερό)'),
        ('cleaning', 'Καθαρισμός'),
        ('elevator', 'Ανελκυστήρας'),
        ('heating', 'Θέρμανση'),
        ('insurance', 'Ασφάλεια'),
        ('administrative', 'Διοικητικά'),
        ('repairs', 'Επισκευές'),
        ('maintenance', 'Συντήρηση'),
        ('security', 'Ασφάλεια'),
        ('landscaping', 'Κηπουρική'),
        ('technical', 'Τεχνικές Υπηρεσίες'),
        ('legal', 'Νομικές Υπηρεσίες'),
        ('accounting', 'Λογιστικές Υπηρεσίες'),
        ('other', 'Άλλοι'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Ενεργός'),
        ('inactive', 'Ανενεργός'),
        ('suspended', 'Ανασταλμένος'),
        ('terminated', 'Τερματισμένος'),
    ]
    
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='suppliers')
    name = models.CharField(max_length=255, verbose_name="Όνομα Προμηθευτή")
    category = models.CharField(max_length=50, choices=SUPPLIER_CATEGORIES, verbose_name="Κατηγορία")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Κατάσταση"
    )
    contact_person = models.CharField(max_length=255, blank=True, verbose_name="Επικοινωνία")
    account_number = models.CharField(max_length=100, blank=True, verbose_name="Αριθμός Λογαριασμού")
    phone = models.CharField(max_length=50, blank=True, verbose_name="Τηλέφωνο")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Διεύθυνση")
    vat_number = models.CharField(max_length=50, blank=True, verbose_name="ΑΦΜ")
    tax_number = models.CharField(max_length=50, blank=True, verbose_name="ΑΦΜ")
    website = models.URLField(blank=True, verbose_name="Ιστοσελίδα")
    contract_number = models.CharField(max_length=100, blank=True, verbose_name="Αριθμός Συμβολαίου")
    contract_start_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Έναρξης Συμβολαίου")
    contract_end_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Λήξης Συμβολαίου")
    payment_terms = models.CharField(max_length=255, blank=True, verbose_name="Όροι Πληρωμής")
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
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργός")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Προμηθευτής"
        verbose_name_plural = "Προμηθευτές"
        ordering = ['name']
        unique_together = ['building', 'name', 'category']
    
    def __str__(self):
        return f"{self.name} - {self.get_category_display()}"


class Expense(models.Model):
    """Μοντέλο για τις δαπάνες κτιρίου"""
    
    # Expense Type choices for easy identification and reversal
    EXPENSE_TYPE_CHOICES = [
        ('regular', 'Κανονική Δαπάνη'),
        ('management_fee', 'Διαχειριστικά Έξοδα'),
        ('reserve_fund', 'Εισφορά Αποθεματικού'),
        ('auto_generated', 'Αυτόματη Δαπάνη'),
    ]
    
    EXPENSE_CATEGORIES = [
        # Πάγιες Δαπάνες Κοινοχρήστων
        ('cleaning', 'Καθαρισμός Κοινοχρήστων Χώρων'),
        ('electricity_common', 'ΔΕΗ Κοινοχρήστων'),
        ('water_common', 'Νερό Κοινοχρήστων'),
        ('garbage_collection', 'Συλλογή Απορριμμάτων'),
        ('security', 'Ασφάλεια Κτιρίου'),
        ('concierge', 'Καθαριστής/Πυλωρός'),
        
        # Δαπάνες Ανελκυστήρα
        ('elevator_maintenance', 'Ετήσια Συντήρηση Ανελκυστήρα'),
        ('elevator_repair', 'Επισκευή Ανελκυστήρα'),
        ('elevator_inspection', 'Επιθεώρηση Ανελκυστήρα'),
        ('elevator_modernization', 'Μοντέρνιση Ανελκυστήρα'),
        
        # Δαπάνες Θέρμανσης
        ('heating_fuel', 'Πετρέλαιο Θέρμανσης'),
        ('heating_gas', 'Φυσικό Αέριο Θέρμανσης'),
        ('heating_maintenance', 'Συντήρηση Καυστήρα'),
        ('heating_repair', 'Επισκευή Θερμαντικών'),
        ('heating_inspection', 'Επιθεώρηση Θερμαντικών'),
        ('heating_modernization', 'Μοντέρνιση Θερμαντικών'),
        
        # Δαπάνες Ηλεκτρικών Εγκαταστάσεων
        ('electrical_maintenance', 'Συντήρηση Ηλεκτρικών'),
        ('electrical_repair', 'Επισκευή Ηλεκτρικών'),
        ('electrical_upgrade', 'Αναβάθμιση Ηλεκτρικών'),
        ('lighting_common', 'Φωτισμός Κοινοχρήστων'),
        ('intercom_system', 'Σύστημα Εσωτερικής Επικοινωνίας'),
        
        # Δαπάνες Υδραυλικών Εγκαταστάσεων
        ('plumbing_maintenance', 'Συντήρηση Υδραυλικών'),
        ('plumbing_repair', 'Επισκευή Υδραυλικών'),
        ('water_tank_cleaning', 'Καθαρισμός Δεξαμενής Νερού'),
        ('water_tank_maintenance', 'Συντήρηση Δεξαμενής Νερού'),
        ('sewage_system', 'Σύστημα Αποχέτευσης'),
        
        # Δαπάνες Κτιρίου & Εξωτερικών Χώρων
        ('building_insurance', 'Ασφάλεια Κτιρίου'),
        ('building_maintenance', 'Συντήρηση Κτιρίου'),
        ('roof_maintenance', 'Συντήρηση Στέγης'),
        ('roof_repair', 'Επισκευή Στέγης'),
        ('facade_maintenance', 'Συντήρηση Πρόσοψης'),
        ('facade_repair', 'Επισκευή Πρόσοψης'),
        ('painting_exterior', 'Βαψίματα Εξωτερικών'),
        ('painting_interior', 'Βαψίματα Εσωτερικών Κοινοχρήστων'),
        ('garden_maintenance', 'Συντήρηση Κήπου'),
        ('parking_maintenance', 'Συντήρηση Χώρων Στάθμευσης'),
        ('entrance_maintenance', 'Συντήρηση Εισόδου'),
        
        # Έκτακτες Δαπάνες & Επισκευές
        ('emergency_repair', 'Έκτακτη Επισκευή'),
        ('storm_damage', 'Ζημιές από Κακοκαιρία'),
        ('flood_damage', 'Ζημιές από Πλημμύρα'),
        ('fire_damage', 'Ζημιές από Πυρκαγιά'),
        ('earthquake_damage', 'Ζημιές από Σεισμό'),
        ('vandalism_repair', 'Επισκευή Βανδαλισμών'),
        
        # Ειδικές Επισκευές
        ('locksmith', 'Κλειδαράς'),
        ('glass_repair', 'Επισκευή Γυαλιών'),
        ('door_repair', 'Επισκευή Πόρτας'),
        ('window_repair', 'Επισκευή Παραθύρων'),
        ('balcony_repair', 'Επισκευή Μπαλκονιού'),
        ('staircase_repair', 'Επισκευή Σκάλας'),
        
        # Δαπάνες Ασφάλειας & Πρόσβασης
        ('security_system', 'Σύστημα Ασφάλειας'),
        ('cctv_installation', 'Εγκατάσταση CCTV'),
        ('access_control', 'Σύστημα Ελέγχου Πρόσβασης'),
        ('fire_alarm', 'Σύστημα Πυρασφάλειας'),
        ('fire_extinguishers', 'Πυροσβεστήρες'),
        
        # Δαπάνες Διοικητικές & Νομικές
        ('legal_fees', 'Δικαστικά Έξοδα'),
        ('notary_fees', 'Συμβολαιογραφικά Έξοδα'),
        ('surveyor_fees', 'Εκτιμητής'),
        ('architect_fees', 'Αρχιτέκτονας'),
        ('engineer_fees', 'Μηχανικός'),
        ('accounting_fees', 'Λογιστικά Έξοδα'),
        ('management_fees', 'Διοικητικά Έξοδα'),
        
        # Δαπάνες Ειδικών Εργασιών
        ('asbestos_removal', 'Αφαίρεση Ασβέστη'),
        ('lead_paint_removal', 'Αφαίρεση Μολύβδου'),
        ('mold_removal', 'Αφαίρεση Μούχλας'),
        ('pest_control', 'Εντομοκτονία'),
        ('tree_trimming', 'Κλάδεμα Δέντρων'),
        ('snow_removal', 'Καθαρισμός Χιονιού'),
        
        # Δαπάνες Ενεργειακής Απόδοσης
        ('energy_upgrade', 'Ενεργειακή Αναβάθμιση'),
        ('insulation_work', 'Θερμομόνωση'),
        ('solar_panel_installation', 'Εγκατάσταση Φωτοβολταϊκών'),
        ('led_lighting', 'Αντικατάσταση με LED'),
        ('smart_systems', 'Έξυπνα Συστήματα'),
        
        # Δαπάνες Ιδιοκτητών
        ('special_contribution', 'Έκτακτη Εισφορά'),
        ('reserve_fund', 'Αποθεματικό Ταμείο'),
        ('emergency_fund', 'Ταμείο Έκτακτης Ανάγκης'),
        ('renovation_fund', 'Ταμείο Ανακαίνισης'),
        
        # Άλλες Δαπάνες
        ('miscellaneous', 'Διάφορες Δαπάνες'),
        ('consulting_fees', 'Εργασίες Συμβούλου'),
        ('permits_licenses', 'Άδειες & Αποδοχές'),
        ('taxes_fees', 'Φόροι & Τέλη'),
        ('utilities_other', 'Άλλες Κοινόχρηστες Υπηρεσίες'),
        ('other', 'Άλλο'),
    ]
    
    DISTRIBUTION_TYPES = [
        ('by_participation_mills', 'Ανά Χιλιοστά'),
        ('equal_share', 'Ισόποσα'),
        ('specific_apartments', 'Συγκεκριμένα'),
        ('by_meters', 'Μετρητές'),
    ]
    
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='expenses')
    title = models.CharField(max_length=255, verbose_name="Τίτλος Δαπάνης")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ποσό (€)")
    date = models.DateField(verbose_name="Ημερομηνία")
    category = models.CharField(max_length=50, choices=EXPENSE_CATEGORIES, verbose_name="Κατηγορία")
    expense_type = models.CharField(
        max_length=20, 
        choices=EXPENSE_TYPE_CHOICES, 
        default='regular',
        verbose_name="Τύπος Δαπάνης",
        help_text="Χρησιμοποιείται για αναγνώριση αυτόματων δαπανών"
    )
    distribution_type = models.CharField(max_length=50, choices=DISTRIBUTION_TYPES, verbose_name="Τρόπος Κατανομής")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses', verbose_name="Προμηθευτής")
    attachment = models.FileField(
        upload_to='expenses/',
        null=True, 
        blank=True, 
        verbose_name="Επισύναψη",
        help_text="Παραστατικό ή άλλο σχετικό αρχείο"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    due_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Πληρωτέο ως",
        help_text="Ημερομηνία πληρωμής της δαπάνης"
    )
    add_to_calendar = models.BooleanField(
        default=True,
        verbose_name="Προσθήκη στο ημερολόγιο",
        help_text="Προσθήκη της δαπάνης στο ημερολόγιο για υπενθύμιση"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Δαπάνη"
        verbose_name_plural = "Δαπάνες"
        ordering = ['-date', '-created_at']
    
    def has_installments(self):
        """Ελέγχει αν η δαπάνη έχει δόσεις/διακανονισμούς μέσω συνδεδεμένων έργων συντήρησης"""
        return self.scheduled_maintenance_tasks.exists()
    
    def get_linked_maintenance_projects(self):
        """Επιστρέφει τα συνδεδεμένα έργα συντήρησης (με ή χωρίς δόσεις)"""
        # Πρώτα επιστρέφουμε έργα με payment schedule
        projects_with_schedule = self.scheduled_maintenance_tasks.filter(
            payment_schedule__isnull=False
        ).select_related('payment_schedule')
        
        # Αν δεν υπάρχουν, επιστρέφουμε όλα τα συνδεδεμένα έργα
        if projects_with_schedule.exists():
            return projects_with_schedule
        else:
            return self.scheduled_maintenance_tasks.all().select_related('payment_schedule')
    
    def __str__(self):
        return f"{self.title} - {self.amount}€ ({self.get_category_display()})"
    
    def _create_apartment_transactions(self):
        """Δημιουργεί συναλλαγές για όλα τα διαμερίσματα"""
        from apartments.models import Apartment
        from decimal import Decimal
        from datetime import datetime
        from django.utils import timezone
        
        # Get all apartments in the building
        apartments = Apartment.objects.filter(building=self.building)
        
        # Calculate share for each apartment based on distribution type
        for apartment in apartments:
            share_amount = self._calculate_apartment_share(apartment)
            
            if share_amount > 0:
                # Calculate balances
                current_balance = apartment.current_balance or Decimal('0.00')
                new_balance = current_balance + share_amount  # Προσθήκη χρέους
                
                # Convert expense.date (DateField) to DateTimeField for Transaction
                expense_datetime = datetime.combine(self.date, datetime.min.time())
                if timezone.is_naive(expense_datetime):
                    expense_datetime = timezone.make_aware(expense_datetime)
                
                # Create transaction for this apartment
                Transaction.objects.create(
                    apartment=apartment,
                    building=self.building,
                    amount=share_amount,
                    type='expense_created',
                    description=f"Δαπάνη: {self.title}",
                    date=expense_datetime,
                    reference_id=str(self.id),
                    reference_type='expense',
                    balance_before=current_balance,
                    balance_after=new_balance
                )
                
                # Update apartment balance
                apartment.current_balance = new_balance
                apartment.save()
    
    def _calculate_apartment_share(self, apartment):
        """Υπολογίζει το μερίδιο διαμερίσματος για τη δαπάνη"""
        from decimal import Decimal
        
        if self.distribution_type == 'equal_share':
            # Ισόποσα κατανομή
            total_apartments = Apartment.objects.filter(building=self.building).count()
            return self.amount / total_apartments if total_apartments > 0 else Decimal('0.00')
        
        elif self.distribution_type == 'by_participation_mills':
            # Κατανομή βάσει χιλιοστών
            total_mills = sum(apt.participation_mills or 0 for apt in Apartment.objects.filter(building=self.building))
            if total_mills > 0:
                apartment_mills = apartment.participation_mills or 0
                return (self.amount * apartment_mills) / total_mills
            return Decimal('0.00')
        
        elif self.distribution_type == 'by_meters':
            # Κατανομή βάσει τετραγωνικών μέτρων
            total_meters = sum(apt.square_meters or 0 for apt in Apartment.objects.filter(building=self.building))
            if total_meters > 0:
                apartment_meters = apartment.square_meters or 0
                return (self.amount * apartment_meters) / total_meters
            return Decimal('0.00')
        
        else:
            return Decimal('0.00')


class Transaction(models.Model):
    """Μοντέλο για τις κινήσεις του ταμείου"""
    
    TRANSACTION_TYPES = [
        ('common_expense_payment', 'Είσπραξη Κοινοχρήστων'),
        ('expense_payment', 'Είσπραξη Δαπάνης'),
        ('refund', 'Επιστροφή'),
        ('common_expense_charge', 'Χρέωση Κοινοχρήστων'),
        ('payment_received', 'Είσπραξη Ληφθείσα'),
        ('expense_created', 'Δαπάνη Δημιουργήθηκε'),
        ('expense_issued', 'Δαπάνη Εκδόθηκε'),
        ('balance_adjustment', 'Προσαρμογή Υπολοίπου'),
        ('interest_charge', 'Χρέωση Τόκων'),
        ('penalty_charge', 'Χρέωση Προστίμου'),
    ]
    
    TRANSACTION_STATUS = [
        ('pending', 'Εκκρεμεί'),
        ('completed', 'Ολοκληρώθηκε'),
        ('cancelled', 'Ακυρώθηκε'),
        ('failed', 'Απέτυχε'),
    ]
    
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='transactions')
    date = models.DateTimeField(verbose_name="Ημερομηνία")
    type = models.CharField(max_length=50, choices=TRANSACTION_TYPES, verbose_name="Τύπος")
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS, default='completed', verbose_name="Κατάσταση")
    description = models.TextField(verbose_name="Περιγραφή")
    apartment_number = models.CharField(max_length=50, null=True, blank=True, verbose_name="Αριθμός Διαμερίσματος")
    apartment = models.ForeignKey(Apartment, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions', verbose_name="Διαμέρισμα")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ποσό")
    balance_before = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Υπόλοιπο Πριν")
    balance_after = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Υπόλοιπο Μετά")
    reference_id = models.CharField(max_length=100, null=True, blank=True, verbose_name="Αναφορά")
    reference_type = models.CharField(max_length=50, null=True, blank=True, verbose_name="Τύπος Αναφοράς")
    receipt = models.FileField(upload_to='receipts/', null=True, blank=True, verbose_name="Απόδειξη")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_by = models.CharField(max_length=100, null=True, blank=True, verbose_name="Δημιουργήθηκε από")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Κίνηση Ταμείου"
        verbose_name_plural = "Κινήσεις Ταμείου"
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.amount}€ ({self.date.strftime('%d/%m/%Y')})"
    
    def save(self, *args, **kwargs):
        # Ensure date is timezone-aware (only for datetime objects)
        from django.utils import timezone
        from datetime import datetime
        if self.date and isinstance(self.date, datetime) and timezone.is_naive(self.date):
            self.date = timezone.make_aware(self.date)
        super().save(*args, **kwargs)
    
    def _create_apartment_transactions(self):
        """Δημιουργεί συναλλαγές για όλα τα διαμερίσματα"""
        from apartments.models import Apartment
        from decimal import Decimal
        
        # Get all apartments in the building
        apartments = Apartment.objects.filter(building=self.building)
        
        # Calculate share for each apartment based on allocation type
        for apartment in apartments:
            share_amount = self._calculate_apartment_share(apartment)
            
            if share_amount > 0:
                # Calculate balances
                current_balance = apartment.current_balance or Decimal('0.00')
                new_balance = current_balance + share_amount  # Προσθήκη χρέους
                
                # Create transaction for this apartment
                Transaction.objects.create(
                    apartment=apartment,
                    building=self.building,
                    amount=share_amount,
                    type='expense_created',
                    description=f"Δαπάνη: {self.title}",
                    date=self.date,
                    reference_id=str(self.id),
                    reference_type='expense',
                    balance_before=current_balance,
                    balance_after=new_balance
                )
                
                # Update apartment balance
                apartment.current_balance = new_balance
                apartment.save()
    
    def _calculate_apartment_share(self, apartment):
        """Υπολογίζει το μερίδιο διαμερίσματος για τη δαπάνη"""
        from decimal import Decimal
        
        if self.allocation_type == 'equal_share':
            # Ισόποσα κατανομή
            total_apartments = Apartment.objects.filter(building=self.building).count()
            return self.amount / total_apartments if total_apartments > 0 else Decimal('0.00')
        
        elif self.allocation_type == 'by_participation_mills':
            # Κατανομή βάσει χιλιοστών
            total_mills = sum(apt.participation_mills or 0 for apt in Apartment.objects.filter(building=self.building))
            if total_mills > 0:
                apartment_mills = apartment.participation_mills or 0
                return (self.amount * apartment_mills) / total_mills
            return Decimal('0.00')
        
        elif self.allocation_type == 'by_meters':
            # Κατανομή βάσει τετραγωνικών μέτρων
            total_meters = sum(apt.square_meters or 0 for apt in Apartment.objects.filter(building=self.building))
            if total_meters > 0:
                apartment_meters = apartment.square_meters or 0
                return (self.amount * apartment_meters) / total_meters
            return Decimal('0.00')
        
        else:
            return Decimal('0.00')


class Payment(models.Model):
    """Μοντέλο για τις εισπράξεις των ιδιοκτητών"""
    
    PAYMENT_METHODS = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('check', 'Επιταγή'),
        ('card', 'Κάρτα'),
    ]
    
    PAYMENT_TYPES = [
        ('common_expense', 'Κοινόχρηστα'),
        ('reserve_fund', 'Ταμείο Εφεδρείας'),
        ('special_expense', 'Ειδική Δαπάνη'),
        ('advance', 'Προκαταβολή'),
        ('other', 'Άλλο'),
    ]
    
    PAYER_TYPES = [
        ('owner', 'Ιδιοκτήτης'),
        ('tenant', 'Ενοικιαστής'),
        ('other', 'Άλλος'),
    ]
    
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ποσό")
    reserve_fund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Ποσό Αποθεματικού")
    previous_obligations_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Παλαιότερες Οφειλές")
    date = models.DateField(verbose_name="Ημερομηνία Εισπράξεως")
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS, verbose_name="Τρόπος Εισπράξεως")
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='common_expense', verbose_name="Τύπος Εισπράξεως")
    payer_type = models.CharField(max_length=20, choices=PAYER_TYPES, default='owner', verbose_name="Ένοικος")
    payer_name = models.CharField(max_length=200, blank=True, verbose_name="Όνομα Ενοίκου")
    reference_number = models.CharField(max_length=100, blank=True, verbose_name="Αριθμός Αναφοράς")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    receipt = models.FileField(upload_to='payment_receipts/', null=True, blank=True, verbose_name="Απόδειξη")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Είσπραξη"
        verbose_name_plural = "Εισπράξεις"
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"Είσπραξη {self.apartment.number} - {self.amount}€ ({self.get_method_display()})"
    
    def save(self, *args, **kwargs):
        # Save first to get the ID
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # If this is a new payment, create transaction
        if is_new:
            self._create_payment_transaction()
    
    def _create_payment_transaction(self):
        """Δημιουργεί συναλλαγή για την πληρωμή"""
        from decimal import Decimal
        
        # Calculate balances
        current_balance = self.apartment.current_balance or Decimal('0.00')
        amount_decimal = Decimal(str(self.amount))
        new_balance = current_balance + amount_decimal
        
        # Create transaction for this payment
        Transaction.objects.create(
            apartment=self.apartment,
            building=self.apartment.building,
            amount=amount_decimal,
            type='payment_received',
            description=f"Είσπραξη: {self.get_payment_type_display()}",
            date=self.date,
            reference_id=str(self.id),
            reference_type='payment',
            balance_before=current_balance,
            balance_after=new_balance
        )
        
        # Update apartment balance
        self.apartment.current_balance = new_balance
        self.apartment.save()


class ExpenseApartment(models.Model):
    """Μοντέλο για τη σύνδεση δαπανών με συγκεκριμένα διαμερίσματα"""
    
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='affected_apartments')
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='expenses')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Δαπάνη-Διαμέρισμα"
        verbose_name_plural = "Δαπάνες-Διαμερίσματα"
        unique_together = ['expense', 'apartment']
    
    def __str__(self):
        return f"{self.expense.title} - {self.apartment.number}"


class MeterReading(models.Model):
    """Μοντέλο για τις μετρήσεις (θέρμανση, νερό, κλπ.)"""
    
    METER_TYPE_WATER = 'water'
    METER_TYPE_ELECTRICITY = 'electricity'
    METER_TYPE_HEATING_HOURS = 'heating_hours'
    METER_TYPE_HEATING_ENERGY = 'heating_energy'  # για θερμιδομετρητές

    METER_TYPES = [
        (METER_TYPE_WATER, 'Νερό'),
        (METER_TYPE_ELECTRICITY, 'Ηλεκτρικό'),
        (METER_TYPE_HEATING_HOURS, 'Θέρμανση (Ώρες)'),
        (METER_TYPE_HEATING_ENERGY, 'Θέρμανση (kWh/MWh)'),
    ]
    
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='meter_readings')
    reading_date = models.DateField(verbose_name="Ημερομηνία Μετρήσης")
    value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ένδειξη")
    meter_type = models.CharField(
        max_length=20,
        choices=METER_TYPES,
        default=METER_TYPE_WATER,
        verbose_name="Τύπος Μετρητή"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Μετρήση"
        verbose_name_plural = "Μετρήσεις"
        ordering = ['-reading_date', '-created_at']
        unique_together = ['apartment', 'reading_date', 'meter_type']
    
    def __str__(self):
        return f"{self.apartment.number} - {self.get_meter_type_display()} - {self.value} ({self.reading_date})"
    
    def get_previous_reading(self):
        """Λήψη της προηγούμενης μετρήσης για το ίδιο διαμέρισμα και τύπο μετρητή"""
        try:
            return MeterReading.objects.filter(
                apartment=self.apartment,
                meter_type=self.meter_type,
                reading_date__lt=self.reading_date
            ).order_by('-reading_date').first()
        except Exception:
            return None
    
    def calculate_consumption(self):
        """Υπολογισμός κατανάλωσης σε σχέση με την προηγούμενη μέτρηση"""
        previous_reading = self.get_previous_reading()
        if previous_reading and self.value > previous_reading.value:
            return float(self.value) - float(previous_reading.value)
        return 0.0
    
    def get_consumption_period(self):
        """Επιστρέφει την περίοδο κατανάλωσης (από προηγούμενη μέτρηση μέχρι τρέχουσα)"""
        previous_reading = self.get_previous_reading()
        if previous_reading:
            return previous_reading.reading_date, self.reading_date
        return self.reading_date, self.reading_date

class CommonExpensePeriod(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='common_expense_periods')
    period_name = models.CharField(max_length=255, verbose_name="Όνομα Περιόδου")
    start_date = models.DateField(verbose_name="Ημερομηνία Έναρξης")
    end_date = models.DateField(verbose_name="Ημερομηνία Λήξης")
    is_active = models.BooleanField(default=True, verbose_name="Ενεργή")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Περίοδος Κοινοχρήστων"
        verbose_name_plural = "Περίοδοι Κοινοχρήστων"
        ordering = ['-start_date']
        unique_together = ['building', 'period_name']

    def __str__(self):
        return f"{self.period_name} ({self.building.name})"

class ApartmentShare(models.Model):
    period = models.ForeignKey(CommonExpensePeriod, on_delete=models.CASCADE, related_name='apartment_shares')
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='shares')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Συνολικό Ποσό")
    previous_balance = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Προηγούμενο Υπόλοιπο")
    total_due = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Συνολική Οφειλή")
    breakdown = models.JSONField(default=dict, verbose_name="Ανάλυση Δαπανών")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Μερίδιο Διαμερίσματος"
        verbose_name_plural = "Μερίδια Διαμερισμάτων"
        unique_together = ['period', 'apartment']

    def __str__(self):
        return f"Μερίδιο για {self.apartment.number} - Περίοδος: {self.period.period_name}"


class FinancialReceipt(models.Model):
    """Μοντέλο για αποδείξεις εισπράξεων"""
    
    RECEIPT_TYPES = [
        ('cash', 'Μετρητά'),
        ('bank_transfer', 'Τραπεζική Μεταφορά'),
        ('check', 'Επιταγή'),
        ('card', 'Κάρτα'),
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
    receipt_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Αριθμός Απόδειξης"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Αριθμός Αναφοράς"
    )
    payer_name = models.CharField(
        max_length=255,
        verbose_name="Όνομα Πληρωμέα"
    )
    payer_type = models.CharField(
        max_length=20,
        choices=Payment.PAYER_TYPES,
        verbose_name="Τύπος Πληρωμέα"
    )
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    receipt_file = models.FileField(
        upload_to='financial_receipts/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Αρχείο Απόδειξης"
    )
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_financial_receipts',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Απόδειξη Εισπράξεως"
        verbose_name_plural = "Αποδείξεις Εισπράξεων"
        ordering = ['-receipt_date', '-created_at']
    
    def __str__(self):
        return f"{self.payment.apartment} - {self.receipt_date} - €{self.amount}"
    
    def save(self, *args, **kwargs):
        # Auto-generate receipt number if not provided
        if not self.receipt_number:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            self.receipt_number = f"RCP-{timestamp}-{self.payment.id}"
        super().save(*args, **kwargs)


class MonthlyBalance(models.Model):
    """Αποθηκεύει το κλείσιμο κάθε μήνα για κάθε κτίριο"""
    
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='monthly_balances')
    year = models.PositiveIntegerField(verbose_name="Έτος")
    month = models.PositiveIntegerField(verbose_name="Μήνας")
    
    # Δαπάνες μήνα
    total_expenses = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Συνολικές Δαπάνες")
    
    # Εισπράξεις μήνα  
    total_payments = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Συνολικές Εισπράξεις")
    
    # Παλιές οφειλές που έρχονται από προηγούμενους μήνες
    previous_obligations = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Παλιές Οφειλές")
    
    # Υπόλοιπο προς μεταφορά στον επόμενο μήνα (αρνητικό = οφειλή)
    carry_forward = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Προς Μεταφορά")
    
    # Αποθεματικό & διαχείριση
    reserve_fund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Αποθεματικό")
    management_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Έξοδα Διαχείρισης")
    
    # Ετήσια μεταφορά υπολοίπων
    annual_carry_forward = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Ετήσια Μεταφορά",
        help_text="Υπόλοιπο που μεταφέρεται στο νέο έτος (μόνο για Δεκέμβριο)"
    )
    
    balance_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Έτος Υπολοίπου",
        help_text="Έτος που ανήκει το υπόλοιπο (για ετήσια μεταφορά)"
    )
    
    # Υβριδικό Σύστημα - Ξεχωριστά Υπολοιπα
    # Κύριο Υπόλοιπο: Κανονικές Δαπάνες + Παλαιότερες Οφειλές
    main_balance_carry_forward = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Κύριο Υπόλοιπο Μεταφορά",
        help_text="Μεταφορά κύριου υπολοίπου (κανονικές δαπάνες + παλαιότερες οφειλές)"
    )
    
    # Αποθεματικό Υπόλοιπο: Μόνο για αποταμίευση
    reserve_balance_carry_forward = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Αποθεματικό Υπόλοιπο Μεταφορά",
        help_text="Μεταφορά αποθεματικού υπολοίπου (μόνο για αποταμίευση)"
    )
    
    # Διαχείριση Υπόλοιπο: Έξοδα διαχείρισης
    management_balance_carry_forward = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Διαχείριση Υπόλοιπο Μεταφορά",
        help_text="Μεταφορά υπολοίπου διαχείρισης (έξοδα διαχείρισης)"
    )
    
    # Κατάσταση
    is_closed = models.BooleanField(default=False, verbose_name="Κλειστός Μήνας")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Κλεισίματος")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Μηνιαίο Υπόλοιπο"
        verbose_name_plural = "Μηνιαία Υπόλοιπα"
        unique_together = ['building', 'year', 'month']
        ordering = ['-year', '-month']
    
    def __str__(self):
        return f"{self.building.name} - {self.month:02d}/{self.year}"
    
    @property
    def month_display(self):
        return f"{self.month:02d}/{self.year}"
    
    @property 
    def total_obligations(self):
        """Συνολικές υποχρεώσεις = δαπάνες + παλιές οφειλές + αποθεματικό + διαχείριση"""
        return self.total_expenses + self.previous_obligations + self.reserve_fund_amount + self.management_fees
    
    # Υβριδικό Σύστημα - Ξεχωριστά Υπολοιπα
    @property
    def main_obligations(self):
        """Κύριες υποχρεώσεις = κανονικές δαπάνες + παλαιότερες οφειλές"""
        return self.total_expenses + self.previous_obligations
    
    @property
    def reserve_obligations(self):
        """Αποθεματικές υποχρεώσεις = μόνο αποθεματικό"""
        return self.reserve_fund_amount
    
    @property
    def management_obligations(self):
        """Διαχειριστικές υποχρεώσεις = μόνο έξοδα διαχείρισης"""
        return self.management_fees
    
    @property
    def main_net_result(self):
        """Κύριο καθαρό αποτέλεσμα = εισπράξεις - κύριες υποχρεώσεις"""
        return self.total_payments - self.main_obligations
    
    @property
    def reserve_net_result(self):
        """Αποθεματικό καθαρό αποτέλεσμα = εισπράξεις - αποθεματικές υποχρεώσεις"""
        return self.total_payments - self.reserve_obligations
    
    @property
    def management_net_result(self):
        """Διαχειριστικό καθαρό αποτέλεσμα = εισπράξεις - διαχειριστικές υποχρεώσεις"""
        return self.total_payments - self.management_obligations
    
    @property
    def net_result(self):
        """Καθαρό αποτέλεσμα = εισπράξεις - υποχρεώσεις (συμβατότητα)"""
        return self.total_payments - self.total_obligations
    
    def close_month(self):
        """Κλείνει τον μήνα και υπολογίζει τα carry_forward (Υβριδικό Σύστημα)"""
        from django.utils import timezone
        from decimal import Decimal
        
        # Υπολογισμός carry_forward για συμβατότητα (αρνητικό = οφειλή)
        self.carry_forward = -self.net_result if self.net_result < 0 else Decimal('0.00')
        
        # Υβριδικό Σύστημα - Υπολογισμός ξεχωριστών carry_forward
        # Κύριο Υπόλοιπο: Κανονικές Δαπάνες + Παλαιότερες Οφειλές
        self.main_balance_carry_forward = -self.main_net_result if self.main_net_result < 0 else Decimal('0.00')
        
        # Αποθεματικό Υπόλοιπο: Μόνο για αποταμίευση (θετικό = πλεόνασμα)
        self.reserve_balance_carry_forward = self.reserve_net_result if self.reserve_net_result > 0 else Decimal('0.00')
        
        # Διαχείριση Υπόλοιπο: Έξοδα διαχείρισης (αρνητικό = οφειλή)
        self.management_balance_carry_forward = -self.management_net_result if self.management_net_result < 0 else Decimal('0.00')
        
        # Συνεχής μεταφορά ποσών - χωρίς ετήσια απομόνωση
        # Κρατάμε μόνο την ημερομηνία έναρξης υπολογισμών (1-6-2025)
        print(f"📅 {self.month:02d}/{self.year}: Συνεχής μεταφορά = €{self.carry_forward}")
        print(f"   🏠 Κύριο Υπόλοιπο: €{self.main_balance_carry_forward}")
        print(f"   🏦 Αποθεματικό: €{self.reserve_balance_carry_forward}")
        print(f"   🏢 Διαχείριση: €{self.management_balance_carry_forward}")
        
        self.is_closed = True
        self.closed_at = timezone.now()
        self.save()
        
        # Δημιουργεί τον επόμενο μήνα
        self.create_next_month()
    
    def create_next_month(self):
        """Δημιουργεί τον επόμενο μήνα με παλιές οφειλές (Υβριδικό Σύστημα)"""
        from decimal import Decimal
        
        next_month = self.month + 1
        next_year = self.year
        
        # Συνεχής μεταφορά ποσών ανεξάρτητα του έτους
        # Μόνο η ημερομηνία έναρξης υπολογισμών (1-6-2025) είναι σημαντική
        if next_month > 12:
            # Δεκέμβριος → Ιανουάριος (συνεχής μεταφορά)
            next_month = 1 
            next_year += 1
            # Συνεχής μεταφορά όλων των υπολοίπων χωρίς μηδενισμό
            previous_obligations = self.carry_forward
            print(f"🔄 Συνεχής μεταφορά: Δεκέμβριος {self.year} → Ιανουάριος {next_year} = €{previous_obligations}")
        else:
            # Μηνιαία μεταφορά: Ν → Ν+1 (συνεχής μεταφορά)
            previous_obligations = self.carry_forward
            print(f"📅 Μηνιαία μεταφορά: {self.month:02d}/{self.year} → {next_month:02d}/{next_year} = €{previous_obligations}")
        
        next_balance, created = MonthlyBalance.objects.get_or_create(
            building=self.building,
            year=next_year,
            month=next_month,
            defaults={
                'previous_obligations': previous_obligations,
                'balance_year': next_year,
                'total_expenses': Decimal('0.00'),
                'total_payments': Decimal('0.00'),
                'reserve_fund_amount': Decimal('0.00'),
                'management_fees': Decimal('0.00'),
                'carry_forward': Decimal('0.00'),
                'annual_carry_forward': Decimal('0.00'),
                'main_balance_carry_forward': Decimal('0.00'),
                'reserve_balance_carry_forward': Decimal('0.00'),
                'management_balance_carry_forward': Decimal('0.00'),
            }
        )
        
        # Αν το record υπάρχει ήδη, ενημερώνουμε τα πεδία μεταφοράς
        if not created:
            next_balance.previous_obligations = previous_obligations
            # Συνεχής μεταφορά - balance_year παραμένει το ίδιο
            next_balance.save()
            print(f"   📝 Ενημερώθηκε υπάρχον record: {next_balance.month_display}")
            print(f"   💰 Συνεχής μεταφορά: €{previous_obligations}")


# Import του audit model στο τέλος για να αποφύγουμε circular imports

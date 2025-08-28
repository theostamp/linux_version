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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Δαπάνη"
        verbose_name_plural = "Δαπάνες"
        ordering = ['-date', '-created_at']
    
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
                new_balance = current_balance - share_amount
                
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
        # Ensure date is timezone-aware
        from django.utils import timezone
        if self.date and timezone.is_naive(self.date):
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
                new_balance = current_balance - share_amount
                
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
        new_balance = current_balance + self.amount
        
        # Create transaction for this payment
        Transaction.objects.create(
            apartment=self.apartment,
            building=self.apartment.building,
            amount=self.amount,
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
    
    METER_TYPES = [
        ('heating', 'Θέρμανση'),
        ('water', 'Νερό'),
        ('electricity', 'Ηλεκτρικό'),
    ]
    
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='meter_readings')
    reading_date = models.DateField(verbose_name="Ημερομηνία Μετρήσης")
    value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Τιμή Μετρήσης")
    meter_type = models.CharField(max_length=50, choices=METER_TYPES, verbose_name="Τύπος Μετρητή")
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Μετρήση"
        verbose_name_plural = "Μετρήσεις"
        ordering = ['-reading_date', '-created_at']
        unique_together = ['apartment', 'reading_date', 'meter_type']
    
    def __str__(self):
        return f"{self.apartment.number} - {self.get_meter_type_display()} - {self.value} ({self.reading_date})"

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

# Import του audit model στο τέλος για να αποφύγουμε circular imports
from .audit import FinancialAuditLog

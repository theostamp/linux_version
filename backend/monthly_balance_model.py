
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
    
    @property
    def net_result(self):
        """Καθαρό αποτέλεσμα = εισπράξεις - υποχρεώσεις"""
        return self.total_payments - self.total_obligations
    
    def close_month(self):
        """Κλείνει τον μήνα και υπολογίζει το carry_forward"""
        self.carry_forward = -self.net_result if self.net_result < 0 else Decimal('0.00')
        self.is_closed = True
        self.closed_at = timezone.now()
        self.save()
        
        # Δημιουργεί τον επόμενο μήνα με previous_obligations = carry_forward
        self.create_next_month()
    
    def create_next_month(self):
        """Δημιουργεί τον επόμενο μήνα με παλιές οφειλές"""
        next_month = self.month + 1
        next_year = self.year
        
        if next_month > 12:
            next_month = 1 
            next_year += 1
        
        MonthlyBalance.objects.get_or_create(
            building=self.building,
            year=next_year,
            month=next_month,
            defaults={
                'previous_obligations': self.carry_forward,
                'total_expenses': Decimal('0.00'),
                'total_payments': Decimal('0.00'),
                'reserve_fund_amount': Decimal('0.00'),
                'management_fees': Decimal('0.00'),
            }
        )

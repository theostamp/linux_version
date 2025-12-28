import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment
from django.db.models import Sum
from decimal import Decimal
from datetime import date

# All database operations within tenant context
with schema_context('demo'):
    print("=== Creating Proper Monthly Closing System ===")
    
    print("\n📋 STEP 1: Create MonthlyBalance Model")
    
    # We need to create a new model to store monthly balances
    # This will be added to financial/models.py
    
    model_code = '''
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
'''
    
    print("📄 Model code created (needs to be added to models.py)")
    
    print("\n📋 STEP 2: Demonstrate Monthly Closing Logic")
    
    # Calculate August 2025 data
    august_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=8
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    august_payments = Payment.objects.filter(
        apartment__building_id=1,
        date__year=2025,
        date__month=8
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    print(f"August 2025:")
    print(f"  - Total expenses: €{august_expenses}")
    print(f"  - Total payments: €{august_payments}")
    print(f"  - Net result: €{august_payments - august_expenses}")
    
    august_carry_forward = august_expenses - august_payments if august_expenses > august_payments else Decimal('0.00')
    print(f"  - Carry forward to September: €{august_carry_forward}")
    
    # September data
    september_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=9
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    september_payments = Payment.objects.filter(
        apartment__building_id=1,
        date__year=2025,
        date__month=9
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    print(f"\nSeptember 2025:")
    print(f"  - Current month expenses: €{september_expenses}")
    print(f"  - Previous obligations (from August): €{august_carry_forward}")
    print(f"  - Total obligations: €{september_expenses + august_carry_forward}")
    print(f"  - Total payments: €{september_payments}")
    print(f"  - Net result: €{september_payments - (september_expenses + august_carry_forward)}")
    
    print("\n📋 STEP 3: Required Implementation")
    print("1. Add MonthlyBalance model to financial/models.py")
    print("2. Run migration: python manage.py makemigrations && python manage.py migrate")
    print("3. Update FinancialDashboardService to read from MonthlyBalance")
    print("4. Add monthly closing functionality")
    print("5. Frontend will show: Δαπάνες + Παλιές Οφειλές + Αποθεματικό + Διαχείριση")
    
    print(f"\n✅ CLEAR ARCHITECTURE:")
    print(f"   August closes with €{august_carry_forward} debt")
    print(f"   September starts with €{august_carry_forward} previous obligations")  
    print(f"   All data stored in database, no calculations needed")
    
    with open('/app/monthly_balance_model.py', 'w') as f:
        f.write(model_code)
    
    print(f"\n📁 Model code saved to /app/monthly_balance_model.py")
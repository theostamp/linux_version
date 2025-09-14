import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment
from decimal import Decimal
from django.db.models import Sum

# All database operations within tenant context
with schema_context('demo'):
    print("=== Debugging Transaction Linkage ===")
    
    apartments = Apartment.objects.filter(building_id=1, number__in=['1', '10', '2', '3']).order_by('number')
    
    for apartment in apartments:
        print(f"\n🏠 Apartment {apartment.number} ({apartment.owner_name}):")
        
        # Method 1: Filter by apartment field (foreign key)
        transactions_by_apartment = Transaction.objects.filter(apartment=apartment)
        print(f"   Transactions by apartment FK: {transactions_by_apartment.count()}")
        
        # Method 2: Filter by apartment_number field (string)
        transactions_by_number = Transaction.objects.filter(apartment_number=apartment.number)
        print(f"   Transactions by apartment_number: {transactions_by_number.count()}")
        
        # List August 2025 transactions specifically
        august_transactions = Transaction.objects.filter(
            apartment_number=apartment.number,
            date__year=2025,
            date__month=8
        )
        
        print(f"   August 2025 transactions: {august_transactions.count()}")
        for trans in august_transactions:
            print(f"      {trans.date}: {trans.type} - €{trans.amount}")
        
        # Check the historical balance calculation manually
        from datetime import date
        from django.utils import timezone
        end_date = date(2025, 10, 1)  # September view end date
        
        # Manual calculation like _calculate_historical_balance
        total_payments = apartment.payments.filter(date__lt=end_date).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"   Total payments before {end_date}: €{total_payments}")
        
        # Find transactions before September (i.e., August and earlier)
        month_start = date(2025, 9, 1)  # Start of September
        august_transactions_for_calc = Transaction.objects.filter(
            apartment_number=apartment.number,
            date__lt=month_start,
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        )
        
        total_charges = august_transactions_for_calc.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"   Total charges before September: €{total_charges}")
        
        # Manual balance calculation: charges - payments
        manual_balance = total_charges - total_payments
        print(f"   Manual calculated balance: €{total_charges} - €{total_payments} = €{manual_balance}")
        
    print(f"\n🔧 DIAGNOSIS:")
    print(f"   If apartments 1 & 10 have the same transactions as 2 & 3,")
    print(f"   but different calculated balances, then:")
    print(f"   1. Either the transaction amounts are different")
    print(f"   2. Or the payment amounts are different") 
    print(f"   3. Or there's a logic error in the calculation")
import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from apartments.models import Apartment
from financial.services import FinancialDashboardService
from decimal import Decimal
from django.db.models import Sum

# All database operations within tenant context
with schema_context('demo'):
    print("=== Detailed Previous Obligations Debug ===")
    
    # Check expenses for August and before
    print("\n1. Checking expenses before September 2025:")
    
    # September 1st, 2025
    september_start = date(2025, 9, 1)
    
    expenses_before_september = Expense.objects.filter(
        building_id=1,
        date__lt=september_start
    ).order_by('date')
    
    print(f"  Expenses before {september_start}: {expenses_before_september.count()}")
    
    for expense in expenses_before_september:
        print(f"    - ID: {expense.id}, Date: {expense.date}, Amount: €{expense.amount}, Title: {expense.title}")
        
        # Check transactions for this expense
        expense_transactions = Transaction.objects.filter(
            reference_type='expense',
            reference_id=str(expense.id)
        )
        print(f"      Transactions: {expense_transactions.count()}")
        
        for tx in expense_transactions[:3]:  # First 3
            print(f"        - {tx.apartment}: €{tx.amount} on {tx.date}")
    
    print("\n2. Checking September 2025 previous obligations calculation:")
    
    service = FinancialDashboardService(building_id=1)
    apartments = Apartment.objects.filter(building_id=1)[:3]  # First 3 apartments
    
    # Calculate previous month end for September (August 31, 2025)
    august_end = date(2025, 8, 31)
    print(f"  Calculating historical balance until: {august_end}")
    
    total_previous_obligations = Decimal('0.00')
    
    for apartment in apartments:
        print(f"\n  🏠 Apartment {apartment.number}:")
        
        # Calculate total payments until August 31, 2025
        total_payments = apartment.payments.filter(
            date__lt=september_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"    Total payments until {august_end}: €{total_payments}")
        
        # Calculate total charges from expenses before September
        expense_ids_before_september = list(expenses_before_september.values_list('id', flat=True))
        
        if expense_ids_before_september:
            total_charges = Transaction.objects.filter(
                apartment_number=apartment.number,
                reference_type='expense',
                reference_id__in=[str(exp_id) for exp_id in expense_ids_before_september],
                type__in=['common_expense_charge', 'expense_created', 'expense_issued']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"    Total charges from pre-September expenses: €{total_charges}")
        else:
            total_charges = Decimal('0.00')
            print(f"    No expenses before September, charges: €{total_charges}")
        
        # Calculate historical balance
        historical_balance = total_payments - total_charges
        print(f"    Historical balance (payments - charges): €{historical_balance}")
        
        # Use the service method to compare
        service_balance = service._calculate_historical_balance(apartment, september_start)
        print(f"    Service calculated balance: €{service_balance}")
        
        if historical_balance < 0:
            obligation = abs(historical_balance)
            total_previous_obligations += obligation
            print(f"    ✅ Previous obligation: €{obligation}")
        else:
            print(f"    ❌ No previous obligation (balance is positive)")
    
    print(f"\n  📊 Total Previous Obligations: €{total_previous_obligations}")
    
    # Now test the service method directly
    print("\n3. Service method result:")
    summary = service.get_summary('2025-09')
    print(f"  Service previous_obligations: {summary.get('previous_obligations', 'NOT FOUND')}")
    
    print("\n4. Check if any apartments have negative current_balance:")
    for apartment in apartments:
        print(f"  🏠 Apartment {apartment.number}: current_balance = €{apartment.current_balance}")
        if apartment.current_balance and apartment.current_balance < 0:
            print(f"    ✅ Has debt: €{abs(apartment.current_balance)}")
        else:
            print(f"    ❌ No debt")
    
    print("\n=== Debug Complete ===")
    print("Key findings:")
    print("- Check if expenses exist before the selected month")
    print("- Verify transaction-based calculation vs service method")
    print("- Compare with actual apartment current_balance values")
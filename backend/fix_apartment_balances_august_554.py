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

# All database operations within tenant context
with schema_context('demo'):
    print("=== Fixing Apartment Balances for August €554 Expense ===")
    
    print("\n1. Finding August expense transactions:")
    
    # Find the August expense transactions
    august_expense_transactions = Transaction.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=8,
        type='expense_created',
        description__icontains='Συλλογή Απορριμμάτων'
    )
    
    print(f"   Found {august_expense_transactions.count()} transactions for August expense")
    
    print(f"\n2. Current apartment balances BEFORE fix:")
    apartments = Apartment.objects.filter(building_id=1)
    
    for apartment in apartments:
        balance = apartment.current_balance or Decimal('0.00')
        print(f"   🏠 {apartment.number}: €{balance}")
    
    print(f"\n3. Applying expense charges to apartment balances:")
    
    updated_count = 0
    total_applied = Decimal('0.00')
    
    for tx in august_expense_transactions:
        if tx.apartment:
            # Get current balance
            current_balance = tx.apartment.current_balance or Decimal('0.00')
            
            # Apply the expense charge (subtract from balance = add debt)
            charge_amount = tx.amount
            new_balance = current_balance - charge_amount
            
            # Update apartment balance
            tx.apartment.current_balance = new_balance
            tx.apartment.save()
            
            print(f"   🏠 {tx.apartment.number}: €{current_balance} → €{new_balance} (charge: -€{charge_amount})")
            
            updated_count += 1
            total_applied += charge_amount
    
    print(f"\n4. Updated apartment balances AFTER fix:")
    
    total_debt_after = Decimal('0.00')
    total_credit_after = Decimal('0.00')
    
    for apartment in apartments:
        balance = apartment.current_balance or Decimal('0.00')
        if balance < 0:
            debt = abs(balance)
            total_debt_after += debt
            print(f"   🏠 {apartment.number}: -€{debt} (DEBT)")
        elif balance > 0:
            total_credit_after += balance
            print(f"   🏠 {apartment.number}: +€{balance} (CREDIT)")
        else:
            print(f"   🏠 {apartment.number}: €{balance} (BALANCED)")
    
    print(f"\n5. Summary:")
    print(f"   - Updated {updated_count} apartments")
    print(f"   - Total charges applied: €{total_applied}")
    print(f"   - Total debt after fix: €{total_debt_after}")
    print(f"   - Total credit after fix: €{total_credit_after}")
    print(f"   - Net building position: €{total_credit_after - total_debt_after}")
    
    if total_applied == 554:
        print(f"   ✅ Successfully applied all €554 charges")
    else:
        print(f"   ⚠️ Expected €554, but applied €{total_applied}")
    
    if total_debt_after > 0:
        print(f"   ✅ Apartments now have debt that will show as previous obligations")
    else:
        print(f"   ❌ Still no debt - something went wrong")
    
    print(f"\n6. Testing September previous obligations:")
    from financial.services import FinancialDashboardService
    
    service = FinancialDashboardService(building_id=1)
    september_data = service.get_summary('2025-09')
    
    print(f"   September previous_obligations: €{september_data.get('previous_obligations', 'ERROR')}")
    
    if september_data.get('previous_obligations', 0) > 0:
        print(f"   ✅ Previous obligations now correctly showing!")
    else:
        print(f"   ❌ Still showing €0 previous obligations")
    
    print(f"\n✅ FIX COMPLETE")
    print(f"   August €554 expense should now properly carry forward to September")
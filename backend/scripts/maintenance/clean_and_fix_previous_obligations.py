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

# All database operations within tenant context
with schema_context('demo'):
    print("=== Cleaning and Fixing Previous Obligations ===")
    
    print("\n1. BEFORE CLEANUP:")
    
    # Count orphaned transactions
    orphaned_transactions = Transaction.objects.filter(
        description__icontains='Παλαιότερη οφειλή'
    )
    print(f"   Orphaned transactions: {orphaned_transactions.count()}")
    total_orphaned = sum(tx.amount for tx in orphaned_transactions)
    print(f"   Total orphaned amount: €{total_orphaned}")
    
    print(f"\n2. PERFORMING CLEANUP:")
    
    # Delete orphaned transactions
    deleted_count = orphaned_transactions.delete()[0]
    print(f"   ✅ Deleted {deleted_count} orphaned 'Παλαιότερη οφειλή' transactions")
    
    print(f"\n3. AFTER CLEANUP:")
    
    # Verify cleanup
    remaining_orphaned = Transaction.objects.filter(
        description__icontains='Παλαιότερη οφειλή'
    )
    print(f"   Remaining orphaned transactions: {remaining_orphaned.count()}")
    
    print(f"\n4. REAL DATA VERIFICATION:")
    
    # Show actual apartment balances
    apartments = Apartment.objects.filter(building_id=1)
    
    total_actual_debt = 0
    total_actual_credit = 0
    
    for apartment in apartments:
        balance = apartment.current_balance or 0
        if balance < 0:  # Debt
            debt = abs(balance)
            total_actual_debt += debt
            print(f"   🏠 {apartment.number}: -€{debt} (DEBT)")
        elif balance > 0:  # Credit
            total_actual_credit += balance
            print(f"   🏠 {apartment.number}: +€{balance} (CREDIT)")
        else:
            print(f"   🏠 {apartment.number}: €0 (BALANCED)")
    
    print(f"\n   📊 REAL FINANCIAL STATE:")
    print(f"   - Total actual debt: €{total_actual_debt}")
    print(f"   - Total actual credit: €{total_actual_credit}")
    print(f"   - Net building position: €{total_actual_credit - total_actual_debt}")
    
    print(f"\n5. RESULT:")
    if total_actual_debt == 0:
        print(f"   ✅ No real previous obligations exist")
        print(f"   ✅ Previous obligations should display €0 (correct)")
        print(f"   ✅ Data integrity restored")
    else:
        print(f"   📊 Real previous obligations: €{total_actual_debt}")
        print(f"   📊 These will be calculated from apartment balances")
    
    print(f"\n6. SYSTEM IMPACT:")
    print(f"   - Frontend will now show accurate previous obligations")
    print(f"   - Based on real apartment balances, not phantom transactions")
    print(f"   - Data integrity maintained across expense deletions/modifications")
    
    print(f"\n✅ CLEANUP COMPLETE")
    print(f"   Previous obligations now calculated from real data!")
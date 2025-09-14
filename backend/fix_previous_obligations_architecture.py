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
    print("=== Fixing Previous Obligations Architecture ===")
    
    print("\n1. Current Problematic State:")
    
    # Show orphaned "Παλαιότερη οφειλή" transactions
    orphaned_transactions = Transaction.objects.filter(
        description__icontains='Παλαιότερη οφειλή'
    )
    print(f"   Orphaned 'Παλαιότερη οφειλή' transactions: {orphaned_transactions.count()}")
    total_orphaned = sum(tx.amount for tx in orphaned_transactions)
    print(f"   Total orphaned amount: €{total_orphaned}")
    
    # Show actual apartment balances
    apartments = Apartment.objects.filter(building_id=1)
    print(f"\n2. Actual Apartment Balances (Ground Truth):")
    
    total_actual_debt = 0
    apartments_with_debt = 0
    
    for apartment in apartments:
        balance = apartment.current_balance or 0
        print(f"   🏠 {apartment.number}: €{balance}")
        
        if balance < 0:  # Negative balance = debt
            debt = abs(balance)
            total_actual_debt += debt
            apartments_with_debt += 1
            print(f"      ❌ Has debt: €{debt}")
        elif balance > 0:
            print(f"      ✅ Has credit: €{balance}")
        else:
            print(f"      ⚪ Balanced: €{balance}")
    
    print(f"\n   📊 Summary:")
    print(f"   - Apartments with actual debt: {apartments_with_debt}")
    print(f"   - Total actual debt: €{total_actual_debt}")
    
    print(f"\n3. Data Integrity Issue:")
    print(f"   - Orphaned transactions claim: €{total_orphaned}")
    print(f"   - Actual apartment debts: €{total_actual_debt}")
    print(f"   - Difference: €{total_orphaned - total_actual_debt}")
    
    if total_orphaned != total_actual_debt:
        print(f"   ⚠️  DATA INTEGRITY VIOLATION!")
        print(f"   📋 SOLUTION: Calculate previous obligations from apartment balances, not transactions")
    else:
        print(f"   ✅ Data is consistent")
    
    print(f"\n4. Proposed Fix:")
    print(f"   - DELETE orphaned 'Παλαιότερη οφειλή' transactions")
    print(f"   - Calculate previous obligations from apartment.current_balance < 0")
    print(f"   - Use actual financial state, not phantom transactions")
    
    print(f"\n5. Implementation Steps:")
    print(f"   A) Remove orphaned transactions")
    print(f"   B) Update FinancialDashboardService to use apartment balances")
    print(f"   C) Ensure real-time accuracy")
    
    # Ask for confirmation
    print(f"\n🚨 DECISION REQUIRED:")
    print(f"   Should we clean up the orphaned transactions and use real data?")
    print(f"   This will ensure data integrity and prevent phantom obligations.")
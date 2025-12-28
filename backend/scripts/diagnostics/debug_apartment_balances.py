import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService

# All database operations within tenant context
with schema_context('demo'):
    print("=== Debugging Apartment Balances for September 2025 ===")
    
    service = FinancialDashboardService(building_id=1)
    
    print("\n🔍 Getting apartment balances from API:")
    september_data = service.get_summary('2025-09')
    apartment_balances = september_data.get('apartment_balances', [])
    
    print(f"\n📊 Found {len(apartment_balances)} apartments:")
    
    for apt in apartment_balances:
        print(f"\n🏠 Διαμέρισμα {apt['apartment_number']} ({apt['owner_name']}):")
        print(f"  current_balance: €{apt.get('current_balance', 'N/A')}")
        print(f"  previous_balance: €{apt.get('previous_balance', 'N/A')}")
        print(f"  net_obligation: €{apt.get('net_obligation', 'N/A')}")
        print(f"  expense_share: €{apt.get('expense_share', 'N/A')}")
        print(f"  total_obligations: €{apt.get('total_obligations', 'N/A')}")
        print(f"  total_payments: €{apt.get('total_payments', 'N/A')}")
        print(f"  status: {apt.get('status', 'N/A')}")
    
    print(f"\n🔧 Expected vs Actual for September 2025:")
    print(f"Expected:")
    print(f"  - Most apartments should have €0 current_balance (only apartments 1,3 have debts)")
    print(f"  - All apartments should have previous_balance from August carryover")
    print(f"  - net_obligation should reflect their share of unpaid August expenses")
    
    print(f"\nActual:")
    apartments_with_debt = [apt for apt in apartment_balances if float(apt.get('current_balance', 0)) != 0]
    apartments_with_previous = [apt for apt in apartment_balances if float(apt.get('previous_balance', 0)) != 0]
    
    print(f"  - Apartments with current debt: {len(apartments_with_debt)}")
    for apt in apartments_with_debt:
        print(f"    Διαμέρισμα {apt['apartment_number']}: €{apt['current_balance']}")
    
    print(f"  - Apartments with previous balance: {len(apartments_with_previous)}")
    for apt in apartments_with_previous:
        print(f"    Διαμέρισμα {apt['apartment_number']}: €{apt['previous_balance']}")
    
    print(f"\n🎯 ISSUE ANALYSIS:")
    if len(apartments_with_previous) == 0:
        print(f"  ❌ NO apartments have previous_balance data!")
        print(f"  ❌ This means August expense carryover is not working properly")
    else:
        print(f"  ✅ Some apartments have previous_balance data")
    
    print(f"\n📋 What should happen:")
    print(f"  1. August 2025: €554 expense was issued but only partially paid")
    print(f"  2. September 2025: Unpaid amounts should appear as 'previous_balance'")
    print(f"  3. Each apartment's share should be distributed based on participation_mills")
    print(f"  4. Example: Apt 1 (95 mills) should have: €554 × (95/1000) = €52.63 previous balance")
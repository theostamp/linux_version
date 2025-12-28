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
    print("=== Debugging Balance Sign Issue ===")
    
    service = FinancialDashboardService(building_id=1)
    
    print("\n🔍 September 2025 Data:")
    september_data = service.get_summary('2025-09')
    
    for key, value in september_data.items():
        if 'balance' in key.lower() or 'obligation' in key.lower():
            print(f"  {key}: {value} (type: {type(value)})")
    
    print(f"\n📊 Key Values:")
    total_balance = september_data.get('total_balance', 0)
    previous_obligations = september_data.get('previous_obligations', 0)
    current_obligations = september_data.get('current_obligations', 0)
    
    print(f"  total_balance: {total_balance}")
    print(f"  previous_obligations: {previous_obligations}")
    print(f"  current_obligations: {current_obligations}")
    
    print(f"\n❌ PROBLEM ANALYSIS:")
    
    if total_balance > 0:
        print(f"  - total_balance is POSITIVE (+{total_balance})")
        print(f"  - But we have €{previous_obligations} debt!")
        print(f"  - Frontend shows 'Θετικό Υπόλοιπο' because total_balance > 0")
    else:
        print(f"  - total_balance is NEGATIVE ({total_balance})")
        print(f"  - This would show 'Αρνητικό Υπόλοιπο' (correct for debt)")
    
    print(f"\n🔧 EXPECTED LOGIC:")
    print(f"  - September has €200 previous obligations")
    print(f"  - September has €0 current expenses")  
    print(f"  - September has €197.98 payments")
    print(f"  - Net result = €197.98 - €200 = €-2.02 (DEBT)")
    print(f"  - Should show 'Αρνητικό Υπόλοιπο €2.02'")
    
    print(f"\n📋 SIGN CONVENTION ANALYSIS:")
    
    # Αναλυτική λογική
    expected_total_obligations = previous_obligations + current_obligations
    total_payments = september_data.get('total_payments', 0)
    expected_net_balance = total_payments - expected_total_obligations
    
    print(f"  Total obligations: €{expected_total_obligations}")
    print(f"  Total payments: €{total_payments}")
    print(f"  Expected net balance: €{expected_net_balance}")
    print(f"  Actual total_balance: €{total_balance}")
    
    if abs(expected_net_balance - total_balance) > 0.01:
        print(f"  ⚠️ CALCULATION MISMATCH!")
        print(f"     Expected: €{expected_net_balance}")
        print(f"     Actual: €{total_balance}")
    else:
        print(f"  ✅ Calculation is correct")
    
    print(f"\n🎯 FRONTEND LOGIC:")
    print(f"  Frontend checks: total_balance >= 0 ? 'Θετικό' : 'Αρνητικό'")
    print(f"  Current: {total_balance} >= 0 = {total_balance >= 0}")
    
    if total_balance >= 0 and (previous_obligations > 0 or current_obligations > 0):
        print(f"  ❌ WRONG: Shows 'Θετικό' despite having obligations")
    else:
        print(f"  ✅ CORRECT: Sign matches financial reality")
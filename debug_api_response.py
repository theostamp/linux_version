import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
import json

# All database operations within tenant context
with schema_context('demo'):
    print("=== Debugging API Response for Frontend ===")
    
    service = FinancialDashboardService(building_id=1)
    
    print("\n🔍 API Response for September 2025:")
    september_data = service.get_summary('2025-09')
    
    # Print the apartment_balances as they would appear in the API
    apartment_balances = september_data.get('apartment_balances', [])
    
    print(f"\n📊 apartment_balances field ({len(apartment_balances)} apartments):")
    for i, apt in enumerate(apartment_balances):
        print(f"\n  Apartment {apt.get('apartment_number', 'N/A')}:")
        print(f"    previous_balance: {apt.get('previous_balance', 'MISSING')}")
        print(f"    net_obligation: {apt.get('net_obligation', 'MISSING')}")
        print(f"    current_balance: {apt.get('current_balance', 'MISSING')}")
        print(f"    expense_share: {apt.get('expense_share', 'MISSING')}")
        print(f"    status: {apt.get('status', 'MISSING')}")
        
        # Stop after first few apartments to avoid spam
        if i >= 2:
            print(f"    ... (και άλλα {len(apartment_balances) - 3} διαμερίσματα)")
            break
    
    print(f"\n🎯 Full JSON for first apartment (debugging):")
    if apartment_balances:
        first_apt = apartment_balances[0]
        print(json.dumps(first_apt, indent=2, default=str))
    
    print(f"\n📋 Summary statistics:")
    total_previous_balance = sum(float(apt.get('previous_balance', 0)) for apt in apartment_balances)
    total_net_obligation = sum(float(apt.get('net_obligation', 0)) for apt in apartment_balances)
    
    print(f"  Total previous_balance: €{total_previous_balance:.2f}")
    print(f"  Total net_obligation: €{total_net_obligation:.2f}")
    print(f"  Expected total: €200.00 (from August expense)")
    
    print(f"\n🚨 ISSUE ANALYSIS:")
    if total_previous_balance == 0:
        print(f"  ❌ All apartments have previous_balance = 0!")
        print(f"  ❌ Frontend will show €0.00 because API returns 0")
        print(f"  🔧 Need to check why get_apartment_balances returns 0 values")
    else:
        print(f"  ✅ API returns correct previous_balance values")
        print(f"  🔧 Problem might be in frontend rendering or data binding")
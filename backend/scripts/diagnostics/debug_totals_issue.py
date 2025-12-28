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
    print("=== Debugging Financial Dashboard Totals ===")
    
    service = FinancialDashboardService(building_id=1)
    
    print("\n🔍 September 2025 Financial Dashboard:")
    september_data = service.get_summary('2025-09')
    
    print(f"\n📊 Current Dashboard Values:")
    print(f"  Σύνολο Διαμερισμάτων: {september_data.get('apartments_count', 'N/A')}")
    print(f"  Συνολικές Οφειλές: €{september_data.get('current_obligations', 0):.2f}")
    print(f"  Συνολικές Πληρωμές: €{september_data.get('total_payments_month', 0):.2f}")
    print(f"  Παλιές Οφειλές: €{september_data.get('previous_obligations', 0):.2f}")
    print(f"  Υπόλοιπο: €{september_data.get('total_balance', 0):.2f}")
    
    print(f"\n🎯 Your Expected Values:")
    print(f"  Σύνολο Διαμερισμάτων: 10 ✓")
    print(f"  Συνολικές Οφειλές: 0,00 € (current_obligations) ✓")
    print(f"  Συνολικές Πληρωμές: 97,42 € (but showing {september_data.get('total_payments_month', 0):.2f})")
    
    print(f"\n🔧 Analysis:")
    if september_data.get('total_payments_month', 0) != 97.42:
        print(f"  ❌ MISMATCH: Expected payments €97.42 but got €{september_data.get('total_payments_month', 0):.2f}")
    else:
        print(f"  ✅ Payments match expected value")
    
    # Let's check apartment balances to understand the €97.42 figure
    apartment_balances = september_data.get('apartment_balances', [])
    
    print(f"\n📋 Apartment Payment Details:")
    total_payments_from_apartments = 0
    for apt in apartment_balances:
        if apt.get('last_payment_amount'):
            print(f"  Διαμέρισμα {apt['apartment_number']}: €{apt['last_payment_amount']} (στις {apt['last_payment_date']})")
            total_payments_from_apartments += float(apt['last_payment_amount'])
    
    print(f"\n🧮 Manual Payment Calculation:")
    print(f"  Total from apartment last payments: €{total_payments_from_apartments:.2f}")
    print(f"  Dashboard total_payments_month: €{september_data.get('total_payments_month', 0):.2f}")
    
    if abs(total_payments_from_apartments - september_data.get('total_payments_month', 0)) > 0.01:
        print(f"  ⚠️ These don't match - might be different calculation methods")
    else:
        print(f"  ✅ Manual calculation matches dashboard")
    
    print(f"\n📈 Balance Calculation Check:")
    payments = september_data.get('total_payments_month', 0)
    previous_obligations = september_data.get('previous_obligations', 0) 
    current_obligations = september_data.get('current_obligations', 0)
    calculated_balance = payments - (previous_obligations + current_obligations)
    actual_balance = september_data.get('total_balance', 0)
    
    print(f"  Calculated: €{payments:.2f} - (€{previous_obligations:.2f} + €{current_obligations:.2f}) = €{calculated_balance:.2f}")
    print(f"  Actual: €{actual_balance:.2f}")
    
    if abs(calculated_balance - actual_balance) > 0.01:
        print(f"  ❌ BALANCE MISMATCH!")
    else:
        print(f"  ✅ Balance calculation is correct")
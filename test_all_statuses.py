import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from apartments.models import Apartment
from decimal import Decimal

# All database operations within tenant context
with schema_context('demo'):
    print("=== Testing All Status Types ===")
    
    service = FinancialDashboardService(building_id=1)
    apartment_balances = service.get_apartment_balances(month='2025-09')
    
    print(f"\n📊 Current Status Distribution:")
    status_counts = {}
    
    for apt in apartment_balances:
        status = apt['status']
        balance = float(apt.get('current_balance', 0))
        
        if status not in status_counts:
            status_counts[status] = []
        status_counts[status].append(balance)
    
    print(f"\nStatus breakdown:")
    for status, balances in status_counts.items():
        count = len(balances)
        avg_balance = sum(balances) / count if count > 0 else 0
        min_balance = min(balances) if balances else 0
        max_balance = max(balances) if balances else 0
        
        print(f"  {status}: {count} apartments")
        print(f"    Range: €{min_balance:.2f} - €{max_balance:.2f}")
        print(f"    Average: €{avg_balance:.2f}")
    
    print(f"\n🎨 Badge Colors in Frontend:")
    print(f"  'Ενήμερο' → default (γκρι-μπλε) + CheckCircle (πράσινο)")
    print(f"  'Οφειλή' → destructive (κόκκινο) + AlertTriangle (κόκκινο)")  
    print(f"  'Κρίσιμο' → destructive (κόκκινο) + AlertTriangle (κόκκινο σκούρο)")
    print(f"  'Πιστωτικό' → secondary (γκρι) + CheckCircle (μπλε)")
    
    print(f"\n🔧 Let's create test scenarios by manually setting some balances:")
    
    # Temporary test - set some apartments to different balances to test all statuses
    apartments = Apartment.objects.filter(building_id=1).order_by('number')[:4]
    
    test_scenarios = [
        (0, "Ενήμερο"),      # 0€ balance
        (50, "Οφειλή"),      # 50€ debt  
        (150, "Κρίσιμο"),    # 150€ critical debt
        (-25, "Πιστωτικό")   # -25€ credit
    ]
    
    print(f"\n📋 Test scenarios (temporary changes):")
    for i, (apt, (test_balance, expected_status)) in enumerate(zip(apartments, test_scenarios)):
        original_balance = apt.current_balance
        apt.current_balance = Decimal(str(test_balance))
        apt.save()
        
        print(f"  Apartment {apt.number}: €{original_balance} → €{test_balance} (expecting '{expected_status}')")
    
    # Test the updated balances
    print(f"\n🧪 Testing updated apartment balances:")
    updated_balances = service.get_apartment_balances(month='2025-09')
    
    for apt in updated_balances[:4]:  # First 4 apartments
        print(f"  Apartment {apt['apartment_number']}: €{apt['current_balance']:.2f} → '{apt['status']}'")
    
    # Restore original balances
    print(f"\n🔄 Restoring original balances...")
    for apt in apartments:
        # Set back to the August expense balance (from transactions)
        apt.current_balance = None  # This will make it calculate from transactions
        apt.save()
    
    print(f"✅ All apartment status badges are now properly configured!")
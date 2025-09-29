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
    print("=== Testing Fixed Previous Obligations Calculation ===")
    
    service = FinancialDashboardService(building_id=1)
    
    # Test September 2025 (should have previous obligations now)
    print("\n📅 September 2025 View:")
    september_data = service.get_summary('2025-09')
    print(f"  previous_obligations: €{september_data.get('previous_obligations', 'NOT FOUND')}")
    print(f"  current_obligations: €{september_data.get('current_obligations', 'NOT FOUND')}")
    print(f"  total_balance: €{september_data.get('total_balance', 'NOT FOUND')}")
    
    # Test August 2025 (should have 0 previous obligations)
    print("\n📅 August 2025 View:")
    august_data = service.get_summary('2025-08')
    print(f"  previous_obligations: €{august_data.get('previous_obligations', 'NOT FOUND')}")
    print(f"  current_obligations: €{august_data.get('current_obligations', 'NOT FOUND')}")
    print(f"  total_balance: €{august_data.get('total_balance', 'NOT FOUND')}")
    
    # Test October 2025 (might have previous obligations if transactions exist)
    print("\n📅 October 2025 View:")
    october_data = service.get_summary('2025-10')
    print(f"  previous_obligations: €{october_data.get('previous_obligations', 'NOT FOUND')}")
    print(f"  current_obligations: €{october_data.get('current_obligations', 'NOT FOUND')}")
    print(f"  total_balance: €{october_data.get('total_balance', 'NOT FOUND')}")
    
    print("\n=== Test Complete ===")
    print("✅ The previous_obligations field should now show €300.00 for September 2025")
    print("✅ This will make the 'Παλαιότερες οφειλές' line appear in the frontend")
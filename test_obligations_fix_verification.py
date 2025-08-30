import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from buildings.models import Building
from apartments.models import Apartment

def test_obligations_fix():
    """Test the fix for previous obligations calculation"""
    
    with schema_context('demo'):
        print("🧪 TESTING PREVIOUS OBLIGATIONS FIX")
        print("=" * 50)
        
        # Test Araxovis building (ID 1)
        building = Building.objects.get(id=1)
        print(f"🏢 Building: {building.name}")
        
        # Create service
        service = FinancialDashboardService(building.id)
        
        # Test July 2025 view
        print(f"\n📅 Testing July 2025 view:")
        july_data = service.get_summary('2025-07')
        
        print(f"   Previous obligations: {july_data['previous_obligations']:.2f}€")
        print(f"   Current obligations: {july_data['current_obligations']:.2f}€")
        print(f"   Total balance: {july_data['total_balance']:.2f}€")
        
        # Test apartment balances for July 2025
        print(f"\n🏠 Testing apartment balances for July 2025:")
        apartment_balances = service.get_apartment_balances('2025-07')
        
        for balance in apartment_balances[:3]:  # Show first 3 apartments
            print(f"   Apartment {balance['number']}: {balance['current_balance']:.2f}€")
        
        # Test August 2025 view for comparison
        print(f"\n📅 Testing August 2025 view:")
        august_data = service.get_summary('2025-08')
        
        print(f"   Previous obligations: {august_data['previous_obligations']:.2f}€")
        print(f"   Current obligations: {august_data['current_obligations']:.2f}€")
        print(f"   Total balance: {august_data['total_balance']:.2f}€")
        
        # Verify the fix
        print(f"\n✅ VERIFICATION:")
        if july_data['previous_obligations'] == 0.0:
            print(f"   ✅ SUCCESS: July 2025 previous obligations are now 0.00€ (correct)")
        else:
            print(f"   ❌ ISSUE: July 2025 previous obligations are {july_data['previous_obligations']:.2f}€")
        
        if august_data['previous_obligations'] > 0:
            print(f"   ✅ SUCCESS: August 2025 has previous obligations: {august_data['previous_obligations']:.2f}€")
        else:
            print(f"   ⚠️  NOTE: August 2025 previous obligations: {august_data['previous_obligations']:.2f}€")

if __name__ == "__main__":
    test_obligations_fix()

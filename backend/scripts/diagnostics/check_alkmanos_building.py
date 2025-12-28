import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def check_alkmanos_building():
    """Check Alkmanos building ID and configuration"""
    
    with schema_context('demo'):
        print("🔍 CHECKING ALKMANOS BUILDING")
        print("=" * 50)
        
        # List all buildings
        buildings = Building.objects.all()
        print("\nAll buildings in database:")
        for building in buildings:
            print(f"   ID: {building.id} - {building.name} - {building.address}")
            if 'Αλκμάνος' in building.name or 'Αλκμάνος' in building.address:
                print(f"   ✅ FOUND ALKMANOS: ID {building.id}")
                
                # Check reserve fund settings
                print(f"   Reserve Fund Goal: €{building.reserve_fund_goal or 0:,.2f}")
                print(f"   Reserve Fund Duration: {building.reserve_fund_duration_months or 0} months")
                print(f"   Reserve Fund Start Date: {building.reserve_fund_start_date}")
                print(f"   Reserve Contribution per Apartment: €{building.reserve_contribution_per_apartment or 0:,.2f}")

if __name__ == "__main__":
    check_alkmanos_building()

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

with schema_context('demo'):
    building = Building.objects.get(id=1)

    print("=" * 60)
    print("BUILDING CONFIGURATION")
    print("=" * 60)
    print(f"Building: {building.name}")
    print(f"Address: {building.address}")
    print(f"Management Fee per Apartment: €{building.management_fee_per_apartment}")
    print(f"Financial System Start Date: {building.financial_system_start_date}")
    print("=" * 60)

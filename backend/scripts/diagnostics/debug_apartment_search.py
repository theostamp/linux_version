import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment

def debug_search():
    with schema_context('demo'):
        print("🔍 Debug apartment search")
        print("=" * 40)
        
        # Όλα τα διαμερίσματα
        apartments = Apartment.objects.all()
        
        for apt in apartments:
            print(f"Number: '{apt.number}' (length: {len(apt.number)})")
            print(f"  Owner: {apt.owner_name}")
            print(f"  Balance: €{apt.current_balance:,.2f}")
            print()
        
        # Δοκιμή με διαφορετικούς τρόπους αναζήτησης
        print("🔍 Δοκιμές αναζήτησης:")
        
        # 1. Exact match
        try:
            b3_exact = Apartment.objects.get(number='B3')
            print("✅ Exact match 'B3' found")
        except Apartment.DoesNotExist:
            print("❌ Exact match 'B3' not found")
        
        # 2. Case insensitive
        try:
            b3_lower = Apartment.objects.get(number__iexact='b3')
            print("✅ Case insensitive 'b3' found")
        except Apartment.DoesNotExist:
            print("❌ Case insensitive 'b3' not found")
        
        # 3. Contains
        b3_contains = Apartment.objects.filter(number__contains='B3')
        print(f"✅ Contains 'B3': {b3_contains.count()} results")
        for apt in b3_contains:
            print(f"   - '{apt.number}': {apt.owner_name}")
        
        # 4. Filter all B apartments
        b_apartments = Apartment.objects.filter(number__startswith='B')
        print(f"✅ B apartments: {b_apartments.count()} results")
        for apt in b_apartments:
            print(f"   - '{apt.number}': {apt.owner_name}")

if __name__ == "__main__":
    debug_search()

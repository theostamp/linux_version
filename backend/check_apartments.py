import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment

def check_apartments():
    """Έλεγχος διαμερισμάτων στο demo schema"""
    
    with schema_context('demo'):
        apartments = Apartment.objects.all().order_by('number')
        
        print(f"🏢 Διαμερίσματα στο demo schema: {apartments.count()}")
        print("=" * 50)
        
        for apartment in apartments:
            print(f"🏠 {apartment.number}: {apartment.owner_name}")
            print(f"   💰 Υπόλοιπο: €{apartment.current_balance:,.2f}")
            print(f"   📏 Μύλοι συμμετοχής: {apartment.participation_mills}")
            print()

if __name__ == "__main__":
    check_apartments()

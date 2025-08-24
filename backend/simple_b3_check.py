import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Transaction, Payment
from decimal import Decimal

def check_b3():
    with schema_context('demo'):
        print("🔍 Έλεγχος διαμερίσματος Β3")
        print("=" * 40)
        
        # Όλα τα διαμερίσματα
        all_apartments = Apartment.objects.all()
        print(f"Συνολικά διαμερίσματα: {all_apartments.count()}")
        
        for apt in all_apartments:
            print(f"  - {apt.number}: {apt.owner_name}")
        
        print()
        
        # Αναζήτηση Β3
        try:
            b3 = Apartment.objects.get(number='B3')
            print(f"✅ Βρέθηκε Β3: {b3.owner_name}")
            print(f"💰 Υπόλοιπο: €{b3.current_balance:,.2f}")
            
            # Πληρωμές
            payments = Payment.objects.filter(apartment=b3)
            print(f"💳 Πληρωμές: {payments.count()}")
            for p in payments:
                print(f"   {p.date}: €{p.amount:,.2f}")
            
            # Συναλλαγές
            transactions = Transaction.objects.filter(apartment=b3)
            print(f"💳 Συναλλαγές: {transactions.count()}")
            for t in transactions:
                print(f"   {t.date}: €{t.amount:,.2f} - {t.type}")
                
        except Apartment.DoesNotExist:
            print("❌ Δεν βρέθηκε Β3")
            # Δοκιμή με διαφορετικές παραλλαγές
            for apt in all_apartments:
                if 'B3' in apt.number or 'b3' in apt.number.lower():
                    print(f"🤔 Πιθανό: {apt.number}")

if __name__ == "__main__":
    check_b3()

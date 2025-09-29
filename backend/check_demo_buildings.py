import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Transaction
from apartments.models import Apartment
from buildings.models import Building

def check_demo_buildings():
    """Check what buildings exist in the demo tenant"""
    
    print("🔍 ΕΡΕΥΝΑ ΚΤΙΡΙΩΝ ΣΤΟ DEMO TENANT")
    print("=" * 60)
    
    with schema_context('demo'):
        try:
            # Check all buildings
            buildings = Building.objects.all().order_by('id')
            print(f"📋 Συνολικά κτίρια: {buildings.count()}")
            
            if buildings.exists():
                print("\n🏢 Λεπτομερής λίστα κτιρίων:")
                print("-" * 80)
                print(f"{'ID':<5} {'Όνομα':<30} {'Διεύθυνση':<40}")
                print("-" * 80)
                
                for building in buildings:
                    print(f"{building.id:<5} {building.name:<30} {building.address[:40]:<40}")
                
                # Check apartments for each building
                print("\n🏠 Διαμερίσματα ανά κτίριο:")
                print("-" * 50)
                
                for building in buildings:
                    apartments_count = Apartment.objects.filter(building=building).count()
                    print(f"🏢 {building.name} (ID: {building.id}): {apartments_count} διαμερίσματα")
                    
                    # Check transactions for this building
                    transactions_count = Transaction.objects.filter(building=building).count()
                    print(f"   📋 Συναλλαγές: {transactions_count}")
                    
                    # Check payments for this building
                    payments_count = Payment.objects.filter(apartment__building=building).count()
                    print(f"   💰 Πληρωμές: {payments_count}")
                    
                    # If there are transactions, show recent ones
                    if transactions_count > 0:
                        recent_transactions = Transaction.objects.filter(
                            building=building
                        ).order_by('-date', '-id')[:3]
                        
                        print("   📋 Τελευταίες 3 συναλλαγές:")
                        for trans in recent_transactions:
                            apartment_num = trans.apartment_number or 'N/A'
                            print(f"      - {trans.date}: {trans.amount}€ ({trans.type}) - Διαμέρισμα {apartment_num}")
                    
                    # If there are payments, show recent ones
                    if payments_count > 0:
                        recent_payments = Payment.objects.filter(
                            apartment__building=building
                        ).order_by('-date', '-id')[:3]
                        
                        print("   💰 Τελευταίες 3 πληρωμές:")
                        for payment in recent_payments:
                            print(f"      - {payment.date}: {payment.amount}€ ({payment.get_method_display()}) - Διαμέρισμα {payment.apartment.number}")
                    
                    print()
            else:
                print("❌ Δεν βρέθηκαν κτίρια στο demo tenant")
                
        except Exception as e:
            print(f"❌ Σφάλμα: {str(e)}")
    
    print("=" * 60)
    print("✅ Έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    check_demo_buildings()

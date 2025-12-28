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

def check_all_tenants():
    """Check all tenants for transactions and payments"""
    
    print("🔍 ΕΡΕΥΝΑ ΟΛΩΝ ΤΩΝ TENANTS")
    print("=" * 60)
    
    # Check public tenant first
    print("\n🏢 Public Tenant (public)")
    print("-" * 50)
    
    try:
        from django_tenants.utils import get_public_schema_name
        public_schema = get_public_schema_name()
        
        with schema_context(public_schema):
            # Check if there are any tenants defined
            from django.db import connection
            cursor = connection.cursor()
            cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')")
            schemas = [row[0] for row in cursor.fetchall()]
            
            print(f"   📋 Διαθέσιμα schemas: {schemas}")
            
    except Exception as e:
        print(f"   ❌ Σφάλμα: {str(e)}")
    
    # Check demo tenant
    print("\n🏢 Demo Tenant (demo)")
    print("-" * 50)
    
    with schema_context('demo'):
        try:
            # Check if building 4 exists in this tenant
            building = Building.objects.filter(id=4).first()
            if not building:
                print("   ❌ Building 4 δεν υπάρχει σε αυτόν τον tenant")
            else:
                print(f"   ✅ Building 4 βρέθηκε: {building.name}")
                
                # Check transactions
                transactions_count = Transaction.objects.filter(building_id=4).count()
                print(f"   📋 Συναλλαγές: {transactions_count}")
                
                # Check payments
                payments_count = Payment.objects.filter(apartment__building_id=4).count()
                print(f"   💰 Πληρωμές: {payments_count}")
                
                # Check apartments
                apartments_count = Apartment.objects.filter(building_id=4).count()
                print(f"   🏠 Διαμερίσματα: {apartments_count}")
                
                # If there are transactions, show some details
                if transactions_count > 0:
                    recent_transactions = Transaction.objects.filter(
                        building_id=4
                    ).order_by('-date', '-id')[:3]
                    
                    print("   📋 Τελευταίες 3 συναλλαγές:")
                    for trans in recent_transactions:
                        print(f"      - {trans.date}: {trans.amount}€ ({trans.type}) - {trans.description[:30]}")
                
                # If there are payments, show some details
                if payments_count > 0:
                    recent_payments = Payment.objects.filter(
                        apartment__building_id=4
                    ).order_by('-date', '-id')[:3]
                    
                    print("   💰 Τελευταίες 3 πληρωμές:")
                    for payment in recent_payments:
                        print(f"      - {payment.date}: {payment.amount}€ ({payment.get_method_display()}) - Διαμέρισμα {payment.apartment.number}")
                
        except Exception as e:
            print(f"   ❌ Σφάλμα: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ Έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    check_all_tenants()

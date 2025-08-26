import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.utils import timezone
from financial.models import Payment, Transaction
from apartments.models import Apartment
from buildings.models import Building

def create_transactions_from_payments():
    """Δημιουργία Transaction records από Payment records"""
    
    print("🔄 ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ ΑΠΟ ΠΛΗΡΩΜΕΣ")
    print("=" * 50)
    
    with schema_context('demo'):
        # Έλεγχος υπάρχοντων συναλλαγών
        existing_transactions = Transaction.objects.count()
        if existing_transactions > 0:
            print(f"⚠️  Υπάρχουν ήδη {existing_transactions} συναλλαγές!")
            response = input("Θέλετε να συνεχίσετε; (y/N): ")
            if response.lower() != 'y':
                print("❌ Ακυρώθηκε η διαδικασία.")
                return
        
        # Λήψη όλων των πληρωμών
        payments = Payment.objects.all().order_by('created_at')
        print(f"📊 Βρέθηκαν {payments.count()} πληρωμές")
        
        if payments.count() == 0:
            print("❌ Δεν βρέθηκαν πληρωμές για μετατροπή.")
            return
        
        # Λήψη κτιρίου
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο.")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        
        # Αρχικοποίηση μετρητών
        created_count = 0
        error_count = 0
        
        print("\n🔄 ΕΠΕΞΕΡΓΑΣΙΑ ΠΛΗΡΩΜΩΝ:")
        print("-" * 30)
        
        for payment in payments:
            try:
                # Έλεγχος αν υπάρχει ήδη συναλλαγή για αυτή την πληρωμή
                existing_transaction = Transaction.objects.filter(
                    reference_id=str(payment.id),
                    reference_type='payment'
                ).first()
                
                if existing_transaction:
                    print(f"⏭️  Παραλείπεται πληρωμή {payment.id} (υπάρχει ήδη συναλλαγή)")
                    continue
                
                # Δημιουργία συναλλαγής
                transaction = Transaction.objects.create(
                    building=building,
                    date=timezone.make_aware(datetime.combine(payment.date, datetime.min.time())),
                    type='payment_received',
                    status='completed',
                    description=f"Είσπραξη πληρωμής - {payment.apartment.number}",
                    apartment_number=payment.apartment.number,
                    apartment=payment.apartment,
                    amount=payment.amount,
                    balance_before=payment.apartment.current_balance,
                    balance_after=payment.apartment.current_balance + payment.amount,
                    reference_id=str(payment.id),
                    reference_type='payment',
                    notes=f"Αυτόματη δημιουργία από πληρωμή {payment.id}. Τύπος: {payment.get_payment_type_display()}, Μέθοδος: {payment.get_method_display()}",
                    created_by='system_audit'
                )
                
                # Ενημέρωση υπόλοιπου διαμερίσματος
                payment.apartment.current_balance += payment.amount
                payment.apartment.save()
                
                created_count += 1
                print(f"✅ Δημιουργήθηκε συναλλαγή {transaction.id} για πληρωμή {payment.id} ({payment.amount}€)")
                
            except Exception as e:
                error_count += 1
                print(f"❌ Σφάλμα στη πληρωμή {payment.id}: {str(e)}")
        
        # Σύνοψη
        print("\n📋 ΣΥΝΟΨΗ:")
        print("-" * 20)
        print(f"✅ Δημιουργήθηκαν: {created_count} συναλλαγές")
        print(f"❌ Σφάλματα: {error_count}")
        print(f"📊 Συνολικές πληρωμές: {payments.count()}")
        
        if created_count > 0:
            print(f"\n🎉 Επιτυχής δημιουργία {created_count} συναλλαγών!")
            print("💡 Τώρα μπορείτε να εκτελέσετε τον έλεγχο μεταφοράς υπολοίπων.")
        else:
            print("\n⚠️  Δεν δημιουργήθηκαν συναλλαγές.")

def verify_transactions_creation():
    """Έλεγχος της δημιουργίας συναλλαγών"""
    
    print("\n🔍 ΕΛΕΓΧΟΣ ΔΗΜΙΟΥΡΓΙΑΣ ΣΥΝΑΛΛΑΓΩΝ:")
    print("=" * 50)
    
    with schema_context('demo'):
        transactions = Transaction.objects.all()
        payments = Payment.objects.all()
        
        print(f"📊 Συναλλαγές: {transactions.count()}")
        print(f"💰 Πληρωμές: {payments.count()}")
        
        if transactions.count() > 0:
            print(f"   - Πρώτη συναλλαγή: {transactions.earliest('created_at').created_at}")
            print(f"   - Τελευταία συναλλαγή: {transactions.latest('created_at').created_at}")
            print(f"   - Συνολικό ποσό: {sum(t.amount for t in transactions):.2f}€")
            
            # Έλεγχος ανά διαμέρισμα
            print("\n🏢 ΕΛΕΓΧΟΣ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
            print("-" * 30)
            
            apartments_with_payments = Apartment.objects.filter(payments__isnull=False).distinct()
            
            for apartment in apartments_with_payments:
                apartment_transactions = transactions.filter(apartment=apartment)
                apartment_payments = payments.filter(apartment=apartment)
                
                print(f"Διαμέρισμα {apartment.number}:")
                print(f"  - Πληρωμές: {apartment_payments.count()}")
                print(f"  - Συναλλαγές: {apartment_transactions.count()}")
                print(f"  - Συνολικό ποσό πληρωμών: {sum(p.amount for p in apartment_payments):.2f}€")
                print(f"  - Συνολικό ποσό συναλλαγών: {sum(t.amount for t in apartment_transactions):.2f}€")
                print(f"  - Τρέχον υπόλοιπο: {apartment.current_balance:.2f}€")
                print()

if __name__ == "__main__":
    create_transactions_from_payments()
    verify_transactions_creation()

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def clean_test_data():
    """Clean all test data from the demo tenant"""
    
    with schema_context('demo'):
        print("🧹 ΚΑΘΑΡΙΣΜΟΣ ΔΟΚΙΜΑΣΤΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
        print("=" * 60)
        print("⚠️  ΠΡΟΣΟΧΗ: Θα διαγραφούν όλα τα δεδομένα!")
        print()
        
        # 1. Καταγραφή τρέχοντος состояния
        print("📊 1. ΤΡΕΧΟΝ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        buildings = Building.objects.all()
        print(f"🏢 Κτίρια: {buildings.count()}")
        
        for building in buildings:
            print(f"\n🏢 {building.name} (ID: {building.id}):")
            
            # Στατιστικά κτιρίου
            apartments_count = Apartment.objects.filter(building=building).count()
            transactions_count = Transaction.objects.filter(building=building).count()
            payments_count = Payment.objects.filter(apartment__building=building).count()
            expenses_count = Expense.objects.filter(building=building).count()
            
            print(f"   🏠 Διαμερίσματα: {apartments_count}")
            print(f"   📋 Συναλλαγές: {transactions_count}")
            print(f"   💰 Πληρωμές: {payments_count}")
            print(f"   💸 Δαπάνες: {expenses_count}")
            
            # Λεπτομέρειες συναλλαγών
            if transactions_count > 0:
                print("   📋 Λεπτομέρειες συναλλαγών:")
                for transaction in Transaction.objects.filter(building=building).order_by('date'):
                    apartment_num = transaction.apartment_number or 'N/A'
                    print(f"      - {transaction.date.strftime('%Y-%m-%d %H:%M')}: {transaction.amount}€ ({transaction.type}) - Διαμέρισμα {apartment_num}")
            
            # Λεπτομέρειες πληρωμών
            if payments_count > 0:
                print("   💰 Λεπτομέρειες πληρωμών:")
                for payment in Payment.objects.filter(apartment__building=building).order_by('date'):
                    print(f"      - {payment.date}: {payment.amount}€ ({payment.get_method_display()}) - Διαμέρισμα {payment.apartment.number}")
        
        print()
        
        # 2. Επιβεβαίωση διαγραφής
        print("📊 2. ΕΠΙΒΕΒΑΙΩΣΗ ΔΙΑΓΡΑΦΗΣ")
        print("-" * 50)
        
        total_transactions = Transaction.objects.all().count()
        total_payments = Payment.objects.all().count()
        total_expenses = Expense.objects.all().count()
        
        print(f"📋 Συνολικές συναλλαγές προς διαγραφή: {total_transactions}")
        print(f"💰 Συνολικές πληρωμές προς διαγραφή: {total_payments}")
        print(f"💸 Συνολικές δαπάνες προς διαγραφή: {total_expenses}")
        
        if total_transactions == 0 and total_payments == 0 and total_expenses == 0:
            print("✅ Δεν υπάρχουν δεδομένα προς διαγραφή!")
            return
        
        print()
        print("⚠️  Θέλετε να προχωρήσετε στη διαγραφή; (y/N): ", end="")
        
        # Στο production θα ζητούσαμε επιβεβαίωση, αλλά εδώ προχωράμε
        print("y (αυτόματη επιβεβαίωση)")
        
        # 3. Διαγραφή δεδομένων
        print("\n📊 3. ΔΙΑΓΡΑΦΗ ΔΕΔΟΜΕΝΩΝ")
        print("-" * 50)
        
        # Διαγραφή συναλλαγών
        deleted_transactions = Transaction.objects.all().delete()
        print(f"🗑️ Διαγράφηκαν συναλλαγές: {deleted_transactions[0]}")
        
        # Διαγραφή πληρωμών
        deleted_payments = Payment.objects.all().delete()
        print(f"🗑️ Διαγράφηκαν πληρωμές: {deleted_payments[0]}")
        
        # Διαγραφή δαπανών
        deleted_expenses = Expense.objects.all().delete()
        print(f"🗑️ Διαγράφηκαν δαπάνες: {deleted_expenses[0]}")
        
        # 4. Επαναφορά υπολοίπων διαμερισμάτων
        print("\n📊 4. ΕΠΑΝΑΦΟΡΑ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 50)
        
        apartments = Apartment.objects.all()
        for apartment in apartments:
            old_balance = apartment.current_balance
            apartment.current_balance = Decimal('0.00')
            apartment.save()
            print(f"🏠 Διαμέρισμα {apartment.number}: {old_balance}€ → 0.00€")
        
        # 5. Επαναφορά αποθεματικού κτιρίων
        print("\n📊 5. ΕΠΑΝΑΦΟΡΑ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("-" * 50)
        
        for building in buildings:
            old_reserve = building.current_reserve
            building.current_reserve = Decimal('0.00')
            building.save()
            print(f"🏢 {building.name}: {old_reserve}€ → 0.00€")
        
        # 6. Επιβεβαίωση καθαρισμού
        print("\n📊 6. ΕΠΙΒΕΒΑΙΩΣΗ ΚΑΘΑΡΙΣΜΟΥ")
        print("-" * 50)
        
        remaining_transactions = Transaction.objects.all().count()
        remaining_payments = Payment.objects.all().count()
        remaining_expenses = Expense.objects.all().count()
        
        print(f"📋 Εναπομείναντες συναλλαγές: {remaining_transactions}")
        print(f"💰 Εναπομείναντες πληρωμές: {remaining_payments}")
        print(f"💸 Εναπομείναντες δαπάνες: {remaining_expenses}")
        
        if remaining_transactions == 0 and remaining_payments == 0 and remaining_expenses == 0:
            print("✅ Ο καθαρισμός ολοκληρώθηκε επιτυχώς!")
        else:
            print("❌ Υπάρχουν ακόμα δεδομένα!")
        
        print()
        print("=" * 60)
        print("✅ Καθαρισμός ολοκληρώθηκε!")

if __name__ == "__main__":
    clean_test_data()

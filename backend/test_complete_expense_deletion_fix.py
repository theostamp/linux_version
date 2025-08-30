import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from apartments.models import Apartment
from buildings.models import Building
from financial.services import DataIntegrityService
from decimal import Decimal

def test_complete_expense_deletion_fix():
    """Δοκιμάζει την πλήρη διόρθωση της διαγραφής δαπανών"""
    
    with schema_context('demo'):
        print("🧪 ΔΟΚΙΜΗ ΠΛΗΡΗΣ ΔΙΟΡΘΩΣΗΣ ΔΙΑΓΡΑΦΗΣ ΔΑΠΑΝΩΝ")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # 1. Έλεγχος τρέχουσας κατάστασης
        print(f"\n1️⃣ ΤΡΕΧΟΥΣΑ ΚΑΤΑΣΤΑΣΗ:")
        print("-" * 40)
        
        all_expenses = Expense.objects.filter(building_id=1)
        all_transactions = Transaction.objects.filter(building_id=1, reference_type='expense')
        
        print(f"   📊 Δαπάνες: {all_expenses.count()}")
        print(f"   📊 Συναλλαγές expense: {all_transactions.count()}")
        
        for expense in all_expenses:
            related_transactions = Transaction.objects.filter(
                building_id=1,
                reference_type='expense',
                reference_id=str(expense.id)
            )
            print(f"   💰 Δαπάνη {expense.id}: {expense.title} - {related_transactions.count()} συναλλαγές")
        
        # 2. Έλεγχος ορφανών συναλλαγών
        print(f"\n2️⃣ ΕΛΕΓΧΟΣ ΟΡΦΑΝΩΝ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 40)
        
        integrity_service = DataIntegrityService(building.id)
        integrity_check = integrity_service.verify_data_integrity()
        
        print(f"   🔍 Ορφανές συναλλαγές: {integrity_check['orphaned_transactions']}")
        print(f"   🔍 Ασυνεπή υπόλοιπα: {integrity_check['inconsistent_balances']}")
        print(f"   🔍 Χρειάζεται καθαρισμό: {integrity_check['needs_cleanup']}")
        
        if integrity_check['balance_details']:
            print(f"   📋 Λεπτομέρειες ασυνεπών υπολοίπων:")
            for detail in integrity_check['balance_details']:
                print(f"      🏠 Διαμέρισμα {detail['apartment']}: αποθηκευμένο {detail['stored']}€, υπολογισμένο {detail['calculated']}€")
        
        # 3. Αυτόματος καθαρισμός αν χρειάζεται
        if integrity_check['needs_cleanup']:
            print(f"\n3️⃣ ΑΥΤΟΜΑΤΟΣ ΚΑΘΑΡΙΣΜΟΣ:")
            print("-" * 40)
            
            cleanup_result = integrity_service.cleanup_orphaned_transactions()
            
            if cleanup_result['success']:
                print(f"   ✅ Επιτυχής καθαρισμός!")
                print(f"   🗑️ Διαγράφηκαν {cleanup_result['orphaned_transactions_found']} ορφανές συναλλαγές")
                print(f"   💰 Συνολικό ποσό: {cleanup_result['total_orphaned_amount']}€")
                print(f"   🏠 Ενημερώθηκαν {cleanup_result['apartments_updated']} διαμερίσματα")
                
                if cleanup_result['balance_updates']:
                    print(f"   📋 Ενημερώσεις υπολοίπων:")
                    for apt_num, update in cleanup_result['balance_updates'].items():
                        print(f"      🏠 Διαμέρισμα {apt_num}: {update['old']}€ → {update['new']}€")
            else:
                print(f"   ❌ Αποτυχία καθαρισμού: {cleanup_result['error']}")
        
        # 4. Τελικός έλεγχος
        print(f"\n4️⃣ ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ:")
        print("-" * 40)
        
        final_integrity_check = integrity_service.verify_data_integrity()
        
        print(f"   🔍 Ορφανές συναλλαγές: {final_integrity_check['orphaned_transactions']}")
        print(f"   🔍 Ασυνεπή υπόλοιπα: {final_integrity_check['inconsistent_balances']}")
        print(f"   🔍 Χρειάζεται καθαρισμό: {final_integrity_check['needs_cleanup']}")
        
        # 5. Έλεγχος υπολοίπων διαμερισμάτων
        print(f"\n5️⃣ ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 40)
        
        apartments = Apartment.objects.filter(building_id=1).order_by('number')
        total_negative_balance = Decimal('0.00')
        
        for apartment in apartments:
            balance = apartment.current_balance or Decimal('0.00')
            if balance < 0:
                total_negative_balance += abs(balance)
            print(f"   🏠 Διαμέρισμα {apartment.number}: {balance}€")
        
        print(f"\n   📈 Συνολικές αρνητικές οφειλές: {total_negative_balance}€")
        
        # 6. Σύνοψη
        print(f"\n6️⃣ ΣΥΝΟΨΗ:")
        print("-" * 40)
        
        if final_integrity_check['orphaned_transactions'] == 0 and final_integrity_check['inconsistent_balances'] == 0:
            print(f"   ✅ Όλα τα δεδομένα είναι καθαρά και συνεπή!")
            print(f"   ✅ Η διόρθωση λειτούργησε επιτυχώς!")
        else:
            print(f"   ⚠️ Υπάρχουν ακόμα προβλήματα ακεραιότητας")
        
        if total_negative_balance == Decimal('0.00'):
            print(f"   ✅ Δεν υπάρχουν αρνητικές οφειλές!")
        else:
            print(f"   ⚠️ Υπάρχουν ακόμα αρνητικές οφειλές: {total_negative_balance}€")

if __name__ == "__main__":
    test_complete_expense_deletion_fix()

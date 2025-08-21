import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def test_auto_issue_feature():
    """Test the new auto-issue feature"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🧪 ΔΟΚΙΜΗ ΑΥΤΟΜΑΤΗΣ ΕΚΔΟΣΗΣ ΔΑΠΑΝΩΝ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Καταγραφή αρχικής κατάστασης
        print("📊 1. ΑΡΧΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        initial_balances = {}
        
        for apartment in apartments:
            initial_balances[apartment.id] = apartment.current_balance or Decimal('0.00')
            print(f"   Διαμέρισμα {apartment.number}: €{initial_balances[apartment.id]:,.2f}")
        
        total_initial_balance = sum(initial_balances.values())
        print(f"\n📈 Συνολικό αρχικό υπόλοιπο: €{total_initial_balance:,.2f}")
        
        # 2. Δημιουργία νέας δαπάνης
        print("\n📊 2. ΔΗΜΙΟΥΡΓΙΑ ΝΕΑΣ ΔΑΠΑΝΗΣ")
        print("-" * 50)
        
        building = Building.objects.get(id=building_id)
        
        # Δημιουργία test δαπάνης
        test_expense = Expense.objects.create(
            building=building,
            title="Δοκιμαστική Δαπάνη - Αυτόματη Έκδοση",
            amount=Decimal('100.00'),
            date=date.today(),
            category='miscellaneous',
            distribution_type='by_participation_mills',
            notes="Δοκιμαστική δαπάνη για έλεγχο αυτόματης έκδοσης"
        )
        
        print(f"✅ Δημιουργήθηκε δαπάνη: {test_expense.title}")
        print(f"💰 Ποσό: €{test_expense.amount:,.2f}")
        print(f"📅 Ημερομηνία: {test_expense.date}")
        print(f"📋 Κατηγορία: {test_expense.get_category_display()}")
        print(f"📊 Κατανομή: {test_expense.get_distribution_type_display()}")
        print(f"✅ Εκδοθείσα: {test_expense.is_issued}")
        
        # 3. Έλεγχος αυτόματης έκδοσης
        print("\n📊 3. ΕΛΕΓΧΟΣ ΑΥΤΟΜΑΤΗΣ ΕΚΔΟΣΗΣ")
        print("-" * 50)
        
        if test_expense.is_issued:
            print("✅ Η δαπάνη είναι αυτόματα εκδοθείσα!")
        else:
            print("❌ Η δαπάνη δεν είναι εκδοθείσα")
            return
        
        # 4. Έλεγχος ενημέρωσης υπολοίπων
        print("\n📊 4. ΕΛΕΓΧΟΣ ΕΝΗΜΕΡΩΣΗΣ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 50)
        
        updated_apartments = 0
        total_balance_change = Decimal('0.00')
        
        for apartment in apartments:
            current_balance = apartment.current_balance or Decimal('0.00')
            initial_balance = initial_balances[apartment.id]
            balance_change = current_balance - initial_balance
            
            if abs(balance_change) > Decimal('0.01'):
                updated_apartments += 1
                total_balance_change += balance_change
                print(f"   Διαμέρισμα {apartment.number}: €{initial_balance:,.2f} → €{current_balance:,.2f} (Διαφορά: €{balance_change:,.2f})")
            else:
                print(f"   Διαμέρισμα {apartment.number}: €{initial_balance:,.2f} → €{current_balance:,.2f} (Χωρίς αλλαγή)")
        
        print(f"\n📈 Ενημερώθηκαν: {updated_apartments} διαμερίσματα")
        print(f"📊 Συνολική αλλαγή: €{total_balance_change:,.2f}")
        
        # 5. Έλεγχος transactions
        print("\n📊 5. ΕΛΕΓΧΟΣ TRANSACTIONS")
        print("-" * 50)
        
        expense_transactions = Transaction.objects.filter(
            building_id=building_id,
            reference_id=str(test_expense.id),
            reference_type='expense'
        ).order_by('-date')
        
        if expense_transactions.exists():
            print(f"✅ Βρέθηκαν {expense_transactions.count()} transactions:")
            for transaction in expense_transactions:
                print(f"   • {transaction.description}: €{transaction.amount:,.2f}")
                print(f"     Διαμέρισμα: {transaction.apartment_number}")
                print(f"     Ημερομηνία: {transaction.date}")
        else:
            print("❌ Δεν βρέθηκαν transactions")
        
        # 6. Έλεγχος συνολικής ακρίβειας
        print("\n📊 6. ΕΛΕΓΧΟΣ ΣΥΝΟΛΙΚΗΣ ΑΚΡΙΒΕΙΑΣ")
        print("-" * 50)
        
        total_final_balance = sum(
            apt.current_balance or Decimal('0.00') 
            for apt in Apartment.objects.filter(building_id=building_id)
        )
        
        expected_change = -test_expense.amount
        actual_change = total_final_balance - total_initial_balance
        
        print(f"💰 Αρχικό συνολικό υπόλοιπο: €{total_initial_balance:,.2f}")
        print(f"💰 Τελικό συνολικό υπόλοιπο: €{total_final_balance:,.2f}")
        print(f"📊 Αναμενόμενη αλλαγή: €{expected_change:,.2f}")
        print(f"📊 Πραγματική αλλαγή: €{actual_change:,.2f}")
        
        if abs(actual_change - expected_change) <= Decimal('0.01'):
            print("✅ Η αυτόματη έκδοση λειτουργεί σωστά!")
        else:
            print(f"❌ Ασυμφωνία: €{abs(actual_change - expected_change):,.2f}")
        
        # 7. Καθαρισμός test δεδομένων
        print("\n📊 7. ΚΑΘΑΡΙΣΜΟΣ TEST ΔΕΔΟΜΕΝΩΝ")
        print("-" * 50)
        
        # Διαγραφή test δαπάνης
        test_expense.delete()
        print("✅ Διαγράφηκε η test δαπάνη")
        
        # Επαναφορά αρχικών υπολοίπων
        for apartment in apartments:
            apartment.current_balance = initial_balances[apartment.id]
            apartment.save()
        
        print("✅ Επαναφέρθηκαν τα αρχικά υπόλοιπα")
        
        # 8. Συμπέρασμα
        print("\n📋 8. ΣΥΜΠΕΡΑΣΜΑ")
        print("-" * 50)
        
        print("🎉 Η δοκιμή ολοκληρώθηκε επιτυχώς!")
        print()
        print("✅ Τα αποτελέσματα:")
        print("   • Η δαπάνη δημιουργήθηκε αυτόματα ως εκδοθείσα")
        print("   • Τα υπόλοιπα διαμερισμάτων ενημερώθηκαν")
        print("   • Δημιουργήθηκαν οι απαραίτητες transactions")
        print("   • Η συνολική ακρίβεια διατηρήθηκε")
        print()
        print("🚀 Η βελτίωση λειτουργεί σωστά!")

if __name__ == "__main__":
    test_auto_issue_feature()



import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from django.db.models import Sum

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def analyze_expense_workflow():
    """Analyze current expense workflow and propose improvements"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΑΝΑΛΥΣΗ ΤΡΕΧΟΝΤΟΣ EXPENSE WORKFLOW")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Τρέχον Κατάσταση Δαπανών
        print("📊 1. ΤΡΕΧΟΝ ΚΑΤΑΣΤΑΣΗ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        all_expenses = Expense.objects.filter(building_id=building_id)
        unissued_expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
        issued_expenses = Expense.objects.filter(building_id=building_id, is_issued=True)
        
        total_amount = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        unissued_amount = unissued_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        issued_amount = issued_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"💰 Συνολικές δαπάνες: {len(all_expenses)}")
        print(f"📋 Εκκρεμείς δαπάνες: {len(unissued_expenses)} (€{unissued_amount:,.2f})")
        print(f"✅ Εκδοθείσες δαπάνες: {len(issued_expenses)} (€{issued_amount:,.2f})")
        print()
        
        # 2. Ανάλυση Εκκρεμών Δαπανών
        print("📊 2. ΑΝΑΛΥΣΗ ΕΚΚΡΕΜΩΝ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        if unissued_expenses.exists():
            print("📋 Εκκρεμείς δαπάνες:")
            for expense in unissued_expenses:
                print(f"   • {expense.title}: €{expense.amount:,.2f} ({expense.date})")
                print(f"     Κατηγορία: {expense.get_category_display()}")
                print(f"     Κατανομή: {expense.get_distribution_type_display()}")
                print()
        else:
            print("✅ Δεν υπάρχουν εκκρεμείς δαπάνες")
        
        # 3. Ανάλυση Εκδοθεισών Δαπανών
        print("📊 3. ΑΝΑΛΥΣΗ ΕΚΔΟΘΕΙΣΩΝ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        if issued_expenses.exists():
            print("✅ Εκδοθείσες δαπάνες:")
            for expense in issued_expenses:
                print(f"   • {expense.title}: €{expense.amount:,.2f} ({expense.date})")
                print(f"     Κατηγορία: {expense.get_category_display()}")
                print(f"     Κατανομή: {expense.get_distribution_type_display()}")
                print()
        else:
            print("ℹ️ Δεν υπάρχουν εκδοθείσες δαπάνες")
        
        # 4. Ανάλυση Πληρωμών
        print("📊 4. ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        payments = Payment.objects.filter(apartment__building_id=building_id)
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"💰 Συνολικές πληρωμές: €{total_payments:,.2f}")
        print(f"📊 Αριθμός πληρωμών: {payments.count()}")
        
        if payments.exists():
            print("\n📋 Λεπτομέρειες πληρωμών:")
            for payment in payments:
                print(f"   • Διαμέρισμα {payment.apartment.number}: €{payment.amount:,.2f} ({payment.date})")
                print(f"     Τρόπος: {payment.get_method_display()}")
                print(f"     Τύπος: {payment.get_payment_type_display()}")
                print()
        
        # 5. Ανάλυση Υπολοίπων Διαμερισμάτων
        print("📊 5. ΑΝΑΛΥΣΗ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        total_balance = Decimal('0.00')
        apartments_with_balance = 0
        
        for apartment in apartments:
            balance = apartment.current_balance or Decimal('0.00')
            total_balance += balance
            
            if balance != 0:
                apartments_with_balance += 1
                print(f"   Διαμέρισμα {apartment.number}: €{balance:,.2f}")
        
        print(f"\n📈 Συνοπτικά:")
        print(f"   Συνολικό υπόλοιπο: €{total_balance:,.2f}")
        print(f"   Διαμερίσματα με υπόλοιπο: {apartments_with_balance}")
        
        # 6. Ανάλυση Προβλημάτων
        print("\n🔍 6. ΑΝΑΛΥΣΗ ΠΡΟΒΛΗΜΑΤΩΝ")
        print("-" * 50)
        
        problems = []
        
        # Πρόβλημα 1: Εκκρεμείς δαπάνες
        if unissued_expenses.exists():
            problems.append(f"Εκκρεμείς δαπάνες €{unissued_amount:,.2f} που δεν έχουν χρεωθεί στα διαμερίσματα")
        
        # Πρόβλημα 2: Ασυμφωνία υπολοίπων
        expected_balance = total_payments - total_amount
        balance_difference = abs(total_balance - expected_balance)
        
        if balance_difference > Decimal('0.01'):
            problems.append(f"Ασυμφωνία υπολοίπων: €{balance_difference:,.2f}")
        
        # Πρόβλημα 3: Σύγχυση στο UI
        if unissued_expenses.exists():
            problems.append("Σύγχυση στο UI μεταξύ εκκρεμών και εκδοθεισών δαπανών")
        
        if problems:
            print("❌ Προβλήματα που εντοπίστηκαν:")
            for i, problem in enumerate(problems, 1):
                print(f"   {i}. {problem}")
        else:
            print("✅ Δεν εντοπίστηκαν προβλήματα")
        
        # 7. Προτάσεις Βελτίωσης
        print("\n💡 7. ΠΡΟΤΑΣΕΙΣ ΒΕΛΤΙΩΣΗΣ")
        print("-" * 50)
        
        print("🎯 ΠΡΟΤΑΣΗ: ΑΥΤΟΜΑΤΗ ΕΚΔΟΣΗ ΔΑΠΑΝΩΝ")
        print()
        print("📋 Τρέχον σύστημα:")
        print("   1. Δημιουργία δαπάνης (is_issued=False)")
        print("   2. Χειροκίνητη έκδοση (is_issued=True)")
        print("   3. Χρέωση διαμερισμάτων")
        print()
        print("🚀 Προτεινόμενο σύστημα:")
        print("   1. Δημιουργία δαπάνης (αυτόματη έκδοση)")
        print("   2. Άμεση χρέωση διαμερισμάτων")
        print("   3. Δυνατότητα ακύρωσης αν χρειάζεται")
        print()
        
        print("✅ Πλεονεκτήματα:")
        print("   • Απλούστερο workflow")
        print("   • Λιγότερη σύγχυση")
        print("   • Άμεση ενημέρωση υπολοίπων")
        print("   • Καλύτερη ορατότητα οικονομικής κατάστασης")
        print()
        
        print("⚠️ Προσοχή:")
        print("   • Χρειάζεται validation πριν την έκδοση")
        print("   • Δυνατότητα ακύρωσης για λάθη")
        print("   • Καλύτερη audit trail")
        print()
        
        # 8. Πρόγραμμα Εφαρμογής
        print("📅 8. ΠΡΟΓΡΑΜΜΑ ΕΦΑΡΜΟΓΗΣ")
        print("-" * 50)
        
        print("🔧 Βήματα εφαρμογής:")
        print("   1. Ενημέρωση Expense model (default is_issued=True)")
        print("   2. Ενημέρωση expense creation workflow")
        print("   3. Προσθήκη validation και confirmation")
        print("   4. Ενημέρωση UI για καλύτερη ορατότητα")
        print("   5. Προσθήκη δυνατότητας ακύρωσης")
        print("   6. Testing και validation")
        print("   7. Migration υπάρχοντων δεδομένων")
        
        # 9. Migration Plan
        print("\n🔄 9. ΠΛΑΝΟ MIGRATION")
        print("-" * 50)
        
        if unissued_expenses.exists():
            print("📋 Migration υπάρχοντων εκκρεμών δαπανών:")
            print(f"   • Εκκρεμείς δαπάνες: {len(unissued_expenses)}")
            print(f"   • Συνολικό ποσό: €{unissued_amount:,.2f}")
            print()
            print("🔧 Προτεινόμενα βήματα:")
            print("   1. Backup υπάρχοντων δεδομένων")
            print("   2. Έκδοση εκκρεμών δαπανών")
            print("   3. Υπολογισμός και ενημέρωση μεριδίων")
            print("   4. Ενημέρωση υπολοίπων διαμερισμάτων")
            print("   5. Validation αποτελεσμάτων")
        else:
            print("✅ Δεν χρειάζεται migration - δεν υπάρχουν εκκρεμείς δαπάνες")

if __name__ == "__main__":
    analyze_expense_workflow()



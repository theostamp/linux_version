import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Expense
from apartments.models import Apartment

def check_charges():
    """Έλεγχος χρεώσεων στο σύστημα"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΧΡΕΩΣΕΩΝ ΣΤΟ ΣΥΣΤΗΜΑ")
    print("=" * 50)
    
    with schema_context('demo'):
        # Έλεγχος συναλλαγών ανά τύπο
        transactions = Transaction.objects.all()
        print(f"📊 Συνολικές συναλλαγές: {transactions.count()}")
        
        # Ανάλυση ανά τύπο συναλλαγής
        transaction_types = transactions.values('type').annotate(
            count=django.db.models.Count('id'),
            total_amount=django.db.models.Sum('amount')
        ).order_by('type')
        
        print("\n📋 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ ΑΝΑ ΤΥΠΟ:")
        print("-" * 40)
        
        for tx_type in transaction_types:
            print(f"🔸 {tx_type['type']}:")
            print(f"   - Πλήθος: {tx_type['count']}")
            print(f"   - Συνολικό ποσό: {tx_type['total_amount']:.2f}€")
        
        # Έλεγχος ειδικά για χρεώσεις
        charge_types = ['common_expense_charge', 'expense_created', 'expense_issued', 
                       'interest_charge', 'penalty_charge']
        
        charges = transactions.filter(type__in=charge_types)
        print("\n💸 ΧΡΕΩΣΕΙΣ:")
        print("-" * 20)
        print(f"📊 Συνολικές χρεώσεις: {charges.count()}")
        
        if charges.exists():
            print(f"💰 Συνολικό ποσό χρεώσεων: {sum(c.amount for c in charges):.2f}€")
            print("\n📋 Λεπτομέρειες χρεώσεων:")
            for charge in charges:
                print(f"  - {charge.date}: {charge.type} - {charge.amount}€ ({charge.apartment.number})")
        else:
            print("❌ Δεν βρέθηκαν χρεώσεις!")
            print("💡 Αυτό εξηγεί γιατί τα υπόλοιπα είναι μόνο θετικά.")
        
        # Έλεγχος δαπανών
        expenses = Expense.objects.all()
        print("\n📉 ΔΑΠΑΝΕΣ:")
        print("-" * 15)
        print(f"📊 Συνολικές δαπάνες: {expenses.count()}")
        
        if expenses.exists():
            print(f"💰 Συνολικό ποσό δαπανών: {sum(e.amount for e in expenses):.2f}€")
            print("\n📋 Λεπτομέρειες δαπανών:")
            for expense in expenses:
                print(f"  - {expense.date}: {expense.title} - {expense.amount}€")
        else:
            print("❌ Δεν βρέθηκαν δαπάνες!")
            print("💡 Χρειάζεται δημιουργία δαπανών για να υπάρχουν χρεώσεις.")
        
        # Έλεγχος υπολοίπων διαμερισμάτων
        print("\n🏢 ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 30)
        
        apartments = Apartment.objects.all()
        positive_balances = 0
        negative_balances = 0
        zero_balances = 0
        
        for apartment in apartments:
            balance = apartment.current_balance
            if balance > 0:
                positive_balances += 1
            elif balance < 0:
                negative_balances += 1
            else:
                zero_balances += 1
            
            print(f"  - {apartment.number}: {balance:.2f}€")
        
        print("\n📊 ΣΥΝΟΨΗ ΥΠΟΛΟΙΠΩΝ:")
        print("-" * 25)
        print(f"✅ Θετικά υπόλοιπα: {positive_balances}")
        print(f"❌ Αρνητικά υπόλοιπα: {negative_balances}")
        print(f"⚖️  Μηδενικά υπόλοιπα: {zero_balances}")
        
        if negative_balances == 0:
            print("\n💡 ΠΑΡΑΤΗΡΗΣΗ:")
            print("   Όλα τα υπόλοιπα είναι θετικά ή μηδενικά.")
            print("   Αυτό σημαίνει ότι δεν υπάρχουν χρεώσεις κοινοχρήστων.")
            print("   Χρειάζεται δημιουργία δαπανών και χρεώσεων.")

if __name__ == "__main__":
    check_charges()

import os
import sys
import django
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Building
from decimal import Decimal

def check_july_june_expenses():
    """Έλεγχος για δαπάνες στον Ιούλιο ή Ιούνιο 2025"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΙΟΥΛΙΟΥ/ΙΟΥΝΙΟΥ 2025")
    print("=" * 60)
    
    with schema_context('demo'):
        # Έλεγχος για κτίριο Αλκμάνος 22
        try:
            building = Building.objects.get(address__icontains='Αλκμάνος 22')
            print(f"✅ Βρέθηκε κτίριο: {building.name} - {building.address}")
            print(f"   ID: {building.id}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με διεύθυνση 'Αλκμάνος 22'")
            return
        
        # Έλεγχος δαπανών Ιουλίου 2025
        print("\n📅 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΙΟΥΛΙΟΥ 2025:")
        print("-" * 40)
        
        july_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=7
        ).order_by('date')
        
        print(f"📉 Δαπάνες Ιουλίου 2025: {july_expenses.count()}")
        
        if july_expenses.exists():
            for expense in july_expenses:
                print(f"  🔸 {expense.date} - {expense.title}")
                print(f"     Ποσό: {expense.amount}€")
                print(f"     Κατηγορία: {expense.category}")
                print(f"     Τύπος: {expense.expense_type}")
                print(f"     Κατανομή: {expense.distribution_type}")
                print()
        else:
            print("  ✅ Δεν υπάρχουν δαπάνες τον Ιούλιο 2025")
        
        # Έλεγχος δαπανών Ιουνίου 2025
        print("\n📅 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΙΟΥΝΙΟΥ 2025:")
        print("-" * 40)
        
        june_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=6
        ).order_by('date')
        
        print(f"📉 Δαπάνες Ιουνίου 2025: {june_expenses.count()}")
        
        if june_expenses.exists():
            for expense in june_expenses:
                print(f"  🔸 {expense.date} - {expense.title}")
                print(f"     Ποσό: {expense.amount}€")
                print(f"     Κατηγορία: {expense.category}")
                print(f"     Τύπος: {expense.expense_type}")
                print(f"     Κατανομή: {expense.distribution_type}")
                print()
        else:
            print("  ✅ Δεν υπάρχουν δαπάνες τον Ιούνιο 2025")
        
        # Έλεγχος συναλλαγών Ιουλίου 2025
        print("\n💳 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΙΟΥΛΙΟΥ 2025:")
        print("-" * 40)
        
        july_transactions = Transaction.objects.filter(
            building=building,
            date__year=2025,
            date__month=7
        ).order_by('-date')
        
        print(f"💳 Συναλλαγές Ιουλίου 2025: {july_transactions.count()}")
        
        if july_transactions.exists():
            for transaction in july_transactions:
                print(f"  🔸 {transaction.date} - {transaction.type}")
                print(f"     Περιγραφή: {transaction.description}")
                print(f"     Ποσό: {transaction.amount}€")
                print(f"     Διαμέρισμα: {transaction.apartment_number}")
                print(f"     Reference ID: {transaction.reference_id}")
                print()
        else:
            print("  ✅ Δεν υπάρχουν συναλλαγές τον Ιούλιο 2025")
        
        # Έλεγχος συναλλαγών Ιουνίου 2025
        print("\n💳 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΙΟΥΝΙΟΥ 2025:")
        print("-" * 40)
        
        june_transactions = Transaction.objects.filter(
            building=building,
            date__year=2025,
            date__month=6
        ).order_by('-date')
        
        print(f"💳 Συναλλαγές Ιουνίου 2025: {june_transactions.count()}")
        
        if june_transactions.exists():
            for transaction in june_transactions:
                print(f"  🔸 {transaction.date} - {transaction.type}")
                print(f"     Περιγραφή: {transaction.description}")
                print(f"     Ποσό: {transaction.amount}€")
                print(f"     Διαμέρισμα: {transaction.apartment_number}")
                print(f"     Reference ID: {transaction.reference_id}")
                print()
        else:
            print("  ✅ Δεν υπάρχουν συναλλαγές τον Ιούνιο 2025")
        
        # Έλεγχος για hardcoded τιμές 150€
        print("\n🔍 ΕΛΕΓΧΟΣ ΓΙΑ HARCODED ΤΙΜΕΣ 150€:")
        print("-" * 40)
        
        # Έλεγχος δαπανών με ποσό 150€
        expenses_150 = Expense.objects.filter(
            building=building,
            amount=Decimal('150.00')
        ).order_by('date')
        
        print(f"📉 Δαπάνες με ποσό 150€: {expenses_150.count()}")
        
        if expenses_150.exists():
            for expense in expenses_150:
                print(f"  🔸 {expense.date} - {expense.title}")
                print(f"     Ποσό: {expense.amount}€")
                print(f"     Κατηγορία: {expense.category}")
                print()
        else:
            print("  ✅ Δεν υπάρχουν δαπάνες με ποσό 150€")
        
        # Έλεγχος συναλλαγών με ποσό 150€
        transactions_150 = Transaction.objects.filter(
            building=building,
            amount=Decimal('150.00')
        ).order_by('-date')
        
        print(f"💳 Συναλλαγές με ποσό 150€: {transactions_150.count()}")
        
        if transactions_150.exists():
            for transaction in transactions_150:
                print(f"  🔸 {transaction.date} - {transaction.type}")
                print(f"     Περιγραφή: {transaction.description}")
                print(f"     Ποσό: {transaction.amount}€")
                print(f"     Διαμέρισμα: {transaction.apartment_number}")
                print(f"     Reference ID: {transaction.reference_id}")
                print()
        else:
            print("  ✅ Δεν υπάρχουν συναλλαγές με ποσό 150€")
        
        # Έλεγχος συναλλαγών με ποσό -150€ (χρεώσεις)
        transactions_minus_150 = Transaction.objects.filter(
            building=building,
            amount=Decimal('-150.00')
        ).order_by('-date')
        
        print(f"💳 Συναλλαγές με ποσό -150€: {transactions_minus_150.count()}")
        
        if transactions_minus_150.exists():
            for transaction in transactions_minus_150:
                print(f"  🔸 {transaction.date} - {transaction.type}")
                print(f"     Περιγραφή: {transaction.description}")
                print(f"     Ποσό: {transaction.amount}€")
                print(f"     Διαμέρισμα: {transaction.apartment_number}")
                print(f"     Reference ID: {transaction.reference_id}")
                print()
        else:
            print("  ✅ Δεν υπάρχουν συναλλαγές με ποσό -150€")

if __name__ == "__main__":
    check_july_june_expenses()

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment, Expense
from apartments.models import Apartment
from buildings.models import Building

def check_database_data():
    """Ελέγχει τα δεδομένα στη βάση"""
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΔΕΔΟΜΕΝΩΝ ΣΤΗ ΒΑΣΗ")
        print("=" * 50)
        
        # Έλεγχος συναλλαγών
        transactions_count = Transaction.objects.count()
        print(f"📊 Συναλλαγές (Transactions): {transactions_count}")
        
        if transactions_count > 0:
            print("   Πρώτες 5 συναλλαγές:")
            for i, tx in enumerate(Transaction.objects.all()[:5]):
                print(f"   {i+1}. {tx.type} - {tx.amount}€ - {tx.date} - {tx.apartment.number}")
        
        # Έλεγχος πληρωμών
        payments_count = Payment.objects.count()
        print(f"💰 Πληρωμές (Payments): {payments_count}")
        
        if payments_count > 0:
            print("   Πρώτες 5 πληρωμές:")
            for i, payment in enumerate(Payment.objects.all()[:5]):
                print(f"   {i+1}. {payment.amount}€ - {payment.date} - {payment.apartment.number} - {payment.method}")
        
        # Έλεγχος δαπανών
        expenses_count = Expense.objects.count()
        print(f"💸 Δαπάνες (Expenses): {expenses_count}")
        
        if expenses_count > 0:
            print("   Πρώτες 5 δαπάνες:")
            for i, expense in enumerate(Expense.objects.all()[:5]):
                print(f"   {i+1}. {expense.title} - {expense.amount}€ - {expense.date} - {expense.is_issued}")
        
        # Έλεγχος διαμερισμάτων
        apartments_count = Apartment.objects.count()
        print(f"🏠 Διαμερίσματα: {apartments_count}")
        
        # Έλεγχος υπολοίπων διαμερισμάτων
        print("\n📈 ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        for apt in Apartment.objects.all():
            print(f"   {apt.number}: {apt.current_balance}€")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    check_database_data()

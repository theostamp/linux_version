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
from financial.services import FinancialDashboardService
from decimal import Decimal

def test_previous_obligations():
    """Ελέγχει αν το πρόβλημα με τις previous_obligations έχει λυθεί"""
    with schema_context('demo'):
        print("🧪 ΕΛΕΓΧΟΣ ΠΡΟΒΛΗΜΑΤΟΣ ΠΑΛΑΙΟΤΕΡΩΝ ΟΦΕΙΛΩΝ")
        print("=" * 60)
        
        # 1. Έλεγχος συναλλαγών
        transactions_count = Transaction.objects.count()
        print(f"📊 Συναλλαγές στη βάση: {transactions_count}")
        
        if transactions_count > 0:
            print("   Πρώτες 5 συναλλαγές:")
            for i, tx in enumerate(Transaction.objects.all()[:5]):
                print(f"   {i+1}. {tx.type} - {tx.amount}€ - {tx.apartment.number if tx.apartment else 'N/A'}")
        
        # 2. Έλεγχος API response
        print(f"\n🔍 ΕΛΕΓΧΟΣ API RESPONSE:")
        
        # Για τον Αύγουστο 2025
        service = FinancialDashboardService(1)  # Building ID 1
        api_response = service.get_summary(month='2025-08')
        
        print(f"   API previous_obligations: {api_response.get('previous_obligations', 'NOT FOUND'):,.2f}€")
        print(f"   API total_balance: {api_response.get('total_balance', 'NOT FOUND'):,.2f}€")
        print(f"   API current_obligations: {api_response.get('current_obligations', 'NOT FOUND'):,.2f}€")
        print(f"   API current_reserve: {api_response.get('current_reserve', 'NOT FOUND'):,.2f}€")
        
        # 3. Έλεγχος υπολοίπων διαμερισμάτων
        print(f"\n📈 ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        total_debts = Decimal('0.00')
        for apt in Apartment.objects.all():
            balance = apt.current_balance or Decimal('0.00')
            if balance < 0:
                total_debts += abs(balance)
            print(f"   {apt.number}: {balance:,.2f}€")
        
        print(f"\n💰 ΣΥΝΟΛΙΚΕΣ ΟΦΕΙΛΕΣ: {total_debts:,.2f}€")
        
        # 4. Έλεγχος αν τα δεδομένα ταιριάζουν
        api_previous = api_response.get('previous_obligations', 0)
        if abs(api_previous - float(total_debts)) < 0.01:
            print(f"\n✅ ΕΠΙΤΥΧΙΑ! Το API επιστρέφει σωστά τις previous_obligations!")
            print(f"   API: {api_previous:,.2f}€")
            print(f"   Υπολογισμός: {total_debts:,.2f}€")
        else:
            print(f"\n❌ ΠΡΟΒΛΗΜΑ! Το API δεν επιστρέφει σωστά τις previous_obligations!")
            print(f"   API: {api_previous:,.2f}€")
            print(f"   Υπολογισμός: {total_debts:,.2f}€")
        
        print("=" * 60)

if __name__ == "__main__":
    test_previous_obligations()

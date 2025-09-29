import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction

def check_financial_status():
    """
    Έλεγχος της τρέχουσας οικονομικής κατάστασης
    """
    with schema_context('demo'):
        print('🔍 Έλεγχος τρέχουσας οικονομικής κατάστασης...')
        
        # Έλεγχος δαπάνης
        expense = Expense.objects.first()
        if expense:
            print(f'💰 Δαπάνη: {expense.title} - {expense.amount}€')
            
            # Υπολογισμός χρεώσεων ανά διαμέρισμα
            try:
                from financial.services import CommonExpenseCalculator
                calculator = CommonExpenseCalculator(expense.building.id)
                shares = calculator.calculate_shares()
                
                print('\n📊 Χρεώσεις ανά διαμέρισμα:')
                for apt_id, data in shares.items():
                    apt = Apartment.objects.get(id=apt_id)
                    print(f'  Διαμέρισμα {apt.number}: {data.get("total_amount", 0):.2f}€')
            except Exception as e:
                print(f'❌ Σφάλμα στον calculator: {e}')
        else:
            print('💰 Δεν υπάρχουν δαπάνες')
        
        # Έλεγχος συναλλαγών
        print(f'\n📝 Συνολικές συναλλαγές: {Transaction.objects.count()}')
        
        # Έλεγχος πληρωμών
        print(f'💳 Συνολικές πληρωμές: {Payment.objects.count()}')
        
        # Έλεγχος διαμερισμάτων
        print('\n🏠 Κατάσταση διαμερισμάτων:')
        apartments = Apartment.objects.all().order_by('number')
        for apt in apartments:
            print(f'  {apt.number}: balance={apt.current_balance}, previous={apt.previous_balance}')
            
            # Έλεγχος αν υπάρχει αντίφαση
            if apt.current_balance == 0 and apt.current_balance != apt.previous_balance:
                print(f'    ⚠️  ΠΡΟΒΛΗΜΑ: Υπόλοιπο 0 αλλά previous_balance {apt.previous_balance}')

if __name__ == "__main__":
    check_financial_status()

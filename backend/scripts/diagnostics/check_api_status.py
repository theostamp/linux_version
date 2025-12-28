import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Expense, Payment
from decimal import Decimal

def check_api_status():
    """
    Έλεγχος τι επιστρέφει το API apartment_balances
    """
    with schema_context('demo'):
        print('🔍 Έλεγχος τι επιστρέφει το API apartment_balances:')
        
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.all().order_by('number')
        for apt in apartments:
            print(f'\n🏠 Διαμέρισμα {apt.number}:')
            print(f'  current_balance: {apt.current_balance}')
            print(f'  previous_balance: {apt.previous_balance}')
            
            # Υπολογισμός net_obligation όπως στο API
            total_obligations = Decimal('0.00')
            total_payments = Decimal('0.00')
            
            # Υπολογισμός δαπανών
            expenses = Expense.objects.filter(building_id=apt.building.id)
            for expense in expenses:
                if expense.distribution_type == 'by_participation_mills':
                    mills = Decimal(str(apt.participation_mills))
                    share = expense.amount * mills / Decimal('1000')
                    total_obligations += share
                elif expense.distribution_type == 'equal_share':
                    share = expense.amount / Decimal('10')  # 10 διαμερίσματα
                    total_obligations += share
            
            # Υπολογισμός πληρωμών
            payments = Payment.objects.filter(apartment=apt)
            total_payments = sum(p.amount for p in payments)
            
            net_obligation = total_obligations - total_payments
            
            print(f'  total_obligations: {total_obligations:.2f}')
            print(f'  total_payments: {total_payments:.2f}')
            print(f'  net_obligation: {net_obligation:.2f}')
            
            # Υπολογισμός status όπως στο API
            if net_obligation <= 0:
                status = 'Ενήμερο'
            else:
                status = 'Οφειλή'
            
            print(f'  status: {status}')
            
            # Σύγκριση με current_balance
            if apt.current_balance > 0:
                balance_status = 'Πιστωτικό'
            elif apt.current_balance < 0:
                balance_status = 'Οφειλή'
            else:
                balance_status = 'Εξοφλημένο'
            
            print(f'  current_balance status: {balance_status}')
            print(f'  Διαφορά: net_obligation vs current_balance = {net_obligation - apt.current_balance:.2f}')

if __name__ == '__main__':
    check_api_status()

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

def fix_api_status():
    """
    Διόρθωση του API status για να χρησιμοποιεί το πραγματικό current_balance
    """
    with schema_context('demo'):
        print('🔧 Διόρθωση του API status calculation...')
        
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.all().order_by('number')
        for apt in apartments:
            print(f'\n🏠 Διαμέρισμα {apt.number}:')
            print(f'  current_balance: {apt.current_balance}')
            
            # Υπολογισμός status βάσει του πραγματικού current_balance
            if apt.current_balance > 0:
                status = 'Πιστωτικό'
                status_reason = 'Έχει πιστωτικό υπόλοιπο'
            elif apt.current_balance < 0:
                status = 'Οφειλή'
                status_reason = 'Έχει οφειλή'
            else:
                status = 'Εξοφλημένο'
                status_reason = 'Δεν έχει οφειλή ούτε πιστωτικό'
            
            print(f'  Σωστό status: {status} ({status_reason})')
            
            # Υπολογισμός net_obligation όπως στο API (για σύγκριση)
            total_obligations = Decimal('0.00')
            total_payments = Decimal('0.00')
            
            expenses = Expense.objects.filter(building_id=apt.building.id)
            for expense in expenses:
                if expense.distribution_type == 'by_participation_mills':
                    mills = Decimal(str(apt.participation_mills))
                    share = expense.amount * mills / Decimal('1000')
                    total_obligations += share
                elif expense.distribution_type == 'equal_share':
                    share = expense.amount / Decimal('10')
                    total_obligations += share
            
            payments = Payment.objects.filter(apartment=apt)
            total_payments = sum(p.amount for p in payments)
            
            net_obligation = total_obligations - total_payments
            
            print(f'  API net_obligation: {net_obligation:.2f}')
            print(f'  Διαφορά: {net_obligation - apt.current_balance:.2f}')
            
            # Προτάσεις για το API
            print('  💡 Το API πρέπει να επιστρέφει:')
            print(f'     - net_obligation: {apt.current_balance:.2f} (από το model)')
            print(f'     - status: {status} (βασισμένο στο current_balance)')

if __name__ == '__main__':
    fix_api_status()

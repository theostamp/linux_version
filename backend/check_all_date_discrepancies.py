import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date, timedelta
from django.db.models import Sum, Q

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def check_all_date_discrepancies():
    """Check for all date discrepancies between payments and transactions"""
    
    building_id = 6  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΟΛΩΝ ΤΩΝ ΑΣΥΜΦΩΝΙΩΝ ΗΜΕΡΟΜΗΝΙΩΝ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # Βρες όλες τις πληρωμές
        all_payments = Payment.objects.filter(apartment__building_id=building_id)
        
        discrepancies = []
        
        for payment in all_payments:
            # Βρες την αντίστοιχη συναλλαγή
            corresponding_transaction = Transaction.objects.filter(
                building_id=building_id,
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if corresponding_transaction:
                # Υπολογισμός διαφοράς ημερομηνιών
                payment_date = payment.date
                transaction_date = corresponding_transaction.date.date()
                
                date_difference = abs((payment_date - transaction_date).days)
                
                if date_difference > 0:
                    discrepancies.append({
                        'payment': payment,
                        'transaction': corresponding_transaction,
                        'difference_days': date_difference
                    })
        
        print(f"📊 Βρέθηκαν {len(discrepancies)} ασυμφωνίες ημερομηνιών")
        
        if discrepancies:
            print("\n📋 Λεπτομερής λίστα ασυμφωνιών:")
            print("-" * 120)
            print(f"{'Διαμέρισμα':<12} {'Πληρωμή Ημ/νία':<15} {'Συναλλαγή Ημ/νία':<15} {'Διαφορά':<10} {'Ποσό':<12} {'ID'}")
            print("-" * 120)
            
            for disc in discrepancies:
                payment = disc['payment']
                transaction = disc['transaction']
                difference = disc['difference_days']
                
                print(f"{payment.apartment.number:<12} "
                      f"{payment.date.strftime('%Y-%m-%d'):<15} "
                      f"{transaction.date.strftime('%Y-%m-%d'):<15} "
                      f"{difference:<10} ημέρες "
                      f"{payment.amount:>10.2f}€ "
                      f"P:{payment.id}/T:{transaction.id}")
        
        else:
            print("✅ Δεν βρέθηκαν ασυμφωνίες ημερομηνιών!")
        
        print()
        print("=" * 60)
        print("✅ Έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    check_all_date_discrepancies()

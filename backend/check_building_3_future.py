import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Transaction

def check_building_3_future():
    """Check building 3 for future transactions and date discrepancies"""
    
    building_id = 3  # Αραχώβης 12
    today = date.today()
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΚΤΙΡΙΟΥ 3 - ΜΕΛΛΟΝΤΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αραχώβης 12 (ID: {building_id})")
        print(f"📅 Σήμερα: {today}")
        print()
        
        # 1. Εύρεση μελλοντικών συναλλαγών
        print("📊 1. ΜΕΛΛΟΝΤΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ")
        print("-" * 50)
        
        future_transactions = Transaction.objects.filter(
            building_id=building_id,
            date__date__gt=today
        ).order_by('date', 'id')
        
        print(f"📋 Μελλοντικές συναλλαγές: {future_transactions.count()}")
        
        if future_transactions.exists():
            print("\n📋 Λεπτομερής λίστα:")
            print("-" * 100)
            print(f"{'Ημερομηνία':<20} {'Τύπος':<25} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Περιγραφή':<30}")
            print("-" * 100)
            
            for transaction in future_transactions:
                apartment_num = transaction.apartment_number or 'N/A'
                print(f"{transaction.date.strftime('%Y-%m-%d %H:%M'):<20} "
                      f"{transaction.type:<25} "
                      f"{apartment_num:<12} "
                      f"{transaction.amount:>10.2f}€ "
                      f"{transaction.description[:30]:<30}")
        
        print()
        
        # 2. Εύρεση μελλοντικών πληρωμών
        print("📊 2. ΜΕΛΛΟΝΤΙΚΕΣ ΠΛΗΡΩΜΕΣ")
        print("-" * 50)
        
        future_payments = Payment.objects.filter(
            apartment__building_id=building_id,
            date__gt=today
        ).order_by('date', 'id')
        
        print(f"💰 Μελλοντικές πληρωμές: {future_payments.count()}")
        
        if future_payments.exists():
            print("\n💰 Λεπτομερής λίστα:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<20} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Μέθοδος':<15} {'ID'}")
            print("-" * 80)
            
            for payment in future_payments:
                print(f"{payment.date.strftime('%Y-%m-%d'):<20} "
                      f"{payment.apartment.number:<12} "
                      f"{payment.amount:>10.2f}€ "
                      f"{payment.get_method_display():<15} "
                      f"{payment.id}")
        
        print()
        
        # 3. Έλεγχος ασυμφωνιών ημερομηνιών
        print("📊 3. ΕΛΕΓΧΟΣ ΑΣΥΜΦΩΝΙΩΝ ΗΜΕΡΟΜΗΝΙΩΝ")
        print("-" * 50)
        
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
                        'difference_days': date_difference,
                        'is_future': payment_date > today or transaction_date > today
                    })
        
        print(f"📊 Συνολικές ασυμφωνίες ημερομηνιών: {len(discrepancies)}")
        
        future_discrepancies = [d for d in discrepancies if d['is_future']]
        print(f"📊 Ασυμφωνίες με μελλοντικές ημερομηνίες: {len(future_discrepancies)}")
        
        if discrepancies:
            print("\n⚠️ ΟΛΕΣ ΟΙ ΑΣΥΜΦΩΝΙΕΣ ΗΜΕΡΟΜΗΝΙΩΝ:")
            print("-" * 120)
            print(f"{'Διαμέρισμα':<12} {'Πληρωμή Ημ/νία':<15} {'Συναλλαγή Ημ/νία':<15} {'Διαφορά':<10} {'Ποσό':<12} {'Τύπος'}")
            print("-" * 120)
            
            for disc in discrepancies:
                payment = disc['payment']
                transaction = disc['transaction']
                difference = disc['difference_days']
                
                payment_type = "ΜΕΛΛΟΝΤΙΚΗ" if payment.date > today else "ΠΑΡΕΛΘΟΝ"
                transaction_type = "ΜΕΛΛΟΝΤΙΚΗ" if transaction.date.date() > today else "ΠΑΡΕΛΘΟΝ"
                
                print(f"{payment.apartment.number:<12} "
                      f"{payment.date.strftime('%Y-%m-%d'):<15} "
                      f"{transaction.date.strftime('%Y-%m-%d'):<15} "
                      f"{difference:<10} ημέρες "
                      f"{payment.amount:>10.2f}€ "
                      f"{payment_type}/{transaction_type}")
        
        print()
        
        # 4. Στατιστικά
        print("📊 4. ΣΤΑΤΙΣΤΙΚΑ")
        print("-" * 50)
        
        total_transactions = Transaction.objects.filter(building_id=building_id).count()
        total_payments = Payment.objects.filter(apartment__building_id=building_id).count()
        
        past_transactions = Transaction.objects.filter(
            building_id=building_id,
            date__date__lte=today
        ).count()
        
        past_payments = Payment.objects.filter(
            apartment__building_id=building_id,
            date__lte=today
        ).count()
        
        print(f"📋 Συνολικές συναλλαγές: {total_transactions}")
        print(f"   - Παρελθοντικές: {past_transactions}")
        print(f"   - Μελλοντικές: {future_transactions.count()}")
        
        print(f"💰 Συνολικές πληρωμές: {total_payments}")
        print(f"   - Παρελθοντικές: {past_payments}")
        print(f"   - Μελλοντικές: {future_payments.count()}")
        
        print()
        print("=" * 60)
        print("✅ Έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    check_building_3_future()

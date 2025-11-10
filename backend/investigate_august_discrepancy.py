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
from apartments.models import Apartment

def investigate_august_discrepancy():
    """Investigate the discrepancy between transaction history and collections for August 2025"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΑΣΥΜΦΩΝΙΑΣ ΑΥΓΟΥΣΤΟΥ 2025")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Εύρεση συναλλαγής Αυγούστου 2025
        print("📊 1. ΕΥΡΕΣΗ ΣΥΝΑΛΛΑΓΗΣ ΑΥΓΟΥΣΤΟΥ 2025")
        print("-" * 50)
        
        # Αναζήτηση συναλλαγών για Αύγουστο 2025
        august_start = date(2025, 8, 1)
        august_end = date(2025, 9, 1)
        
        august_transactions = Transaction.objects.filter(
            building_id=building_id,
            date__gte=august_start,
            date__lt=august_end
        ).order_by('date', 'id')
        
        print(f"📋 Συνολικές συναλλαγές Αυγούστου 2025: {august_transactions.count()}")
        
        if august_transactions.exists():
            print("\n📋 Λεπτομερής λίστα συναλλαγών:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<20} {'Τύπος':<25} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Περιγραφή':<30}")
            print("-" * 80)
            
            for transaction in august_transactions:
                apartment_num = transaction.apartment_number or 'N/A'
                print(f"{transaction.date.strftime('%Y-%m-%d %H:%M'):<20} "
                      f"{transaction.type:<25} "
                      f"{apartment_num:<12} "
                      f"{transaction.amount:>10.2f}€ "
                      f"{transaction.description[:30]:<30}")
        
        print()
        
        # 2. Εύρεση πληρωμών Αυγούστου 2025
        print("📊 2. ΕΥΡΕΣΗ ΠΛΗΡΩΜΩΝ ΑΥΓΟΥΣΤΟΥ 2025")
        print("-" * 50)
        
        august_payments = Payment.objects.filter(
            apartment__building_id=building_id,
            date__gte=august_start,
            date__lt=august_end
        ).order_by('date', 'id')
        
        print(f"💰 Συνολικές πληρωμές Αυγούστου 2025: {august_payments.count()}")
        
        if august_payments.exists():
            print("\n💰 Λεπτομερής λίστα πληρωμών:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<20} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Μέθοδος':<15} {'ID'}")
            print("-" * 80)
            
            for payment in august_payments:
                print(f"{payment.date.strftime('%Y-%m-%d'):<20} "
                      f"{payment.apartment.number:<12} "
                      f"{payment.amount:>10.2f}€ "
                      f"{payment.get_method_display():<15} "
                      f"{payment.id}")
        
        print()
        
        # 3. Έλεγχος συγχρονισμού συναλλαγών-πληρωμών
        print("📊 3. ΕΛΕΓΧΟΣ ΣΥΓΧΡΟΝΙΣΜΟΥ ΣΥΝΑΛΛΑΓΩΝ-ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        # Έλεγχος για πληρωμές χωρίς αντίστοιχη συναλλαγή
        payments_without_transactions = []
        for payment in august_payments:
            corresponding_transaction = Transaction.objects.filter(
                building_id=building_id,
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if not corresponding_transaction:
                payments_without_transactions.append(payment)
        
        print(f"⚠️ Πληρωμές χωρίς αντίστοιχη συναλλαγή: {len(payments_without_transactions)}")
        if payments_without_transactions:
            for payment in payments_without_transactions:
                print(f"   - Πληρωμή {payment.id}: {payment.amount}€ από διαμέρισμα {payment.apartment.number}")
        
        # Έλεγχος για συναλλαγές χωρίς αντίστοιχη πληρωμή
        transactions_without_payments = []
        for transaction in august_transactions:
            if transaction.reference_type == 'payment':
                try:
                    payment_id = int(transaction.reference_id)
                    payment = Payment.objects.get(id=payment_id)
                    # Payment exists, check if it's in August
                    if not (august_start <= payment.date < august_end):
                        transactions_without_payments.append(transaction)
                except (ValueError, Payment.DoesNotExist):
                    transactions_without_payments.append(transaction)
        
        print(f"⚠️ Συναλλαγές χωρίς αντίστοιχη πληρωμή: {len(transactions_without_payments)}")
        if transactions_without_payments:
            for transaction in transactions_without_payments:
                print(f"   - Συναλλαγή {transaction.id}: {transaction.amount}€ για διαμέρισμα {transaction.apartment_number}")
        
        print()
        
        # 4. Ειδική έρευνα για διαμέρισμα 3
        print("📊 4. ΕΙΔΙΚΗ ΕΡΕΥΝΑ ΓΙΑ ΔΙΑΜΕΡΙΣΜΑ 3")
        print("-" * 50)
        
        apartment_3 = Apartment.objects.filter(building_id=building_id, number=3).first()
        if apartment_3:
            print(f"🏠 Διαμέρισμα 3: {apartment_3.owner_name}")
            print(f"💰 Τρέχον υπόλοιπο: {apartment_3.current_balance:,.2f}€")
            
            # Πληρωμές διαμερίσματος 3
            apt3_payments = Payment.objects.filter(
                apartment=apartment_3,
                date__gte=august_start,
                date__lt=august_end
            ).order_by('date', 'id')
            
            print(f"\n💰 Πληρωμές διαμερίσματος 3 (Αύγουστος 2025): {apt3_payments.count()}")
            for payment in apt3_payments:
                print(f"   - {payment.date}: {payment.amount}€ ({payment.get_method_display()})")
            
            # Συναλλαγές διαμερίσματος 3
            apt3_transactions = Transaction.objects.filter(
                apartment=apartment_3,
                date__gte=august_start,
                date__lt=august_end
            ).order_by('date', 'id')
            
            print(f"\n📋 Συναλλαγές διαμερίσματος 3 (Αύγουστος 2025): {apt3_transactions.count()}")
            for transaction in apt3_transactions:
                print(f"   - {transaction.date}: {transaction.amount}€ ({transaction.type}) - {transaction.description}")
        
        print()
        
        # 5. Έλεγχος φιλτραρίσματος API
        print("📊 5. ΕΛΕΓΧΟΣ ΦΙΛΤΡΑΡΙΣΜΑΤΟΣ API")
        print("-" * 50)
        
        # Προσομοίωση φιλτραρίσματος collections API
        collections_queryset = Payment.objects.filter(apartment__building_id=building_id)
        collections_queryset = collections_queryset.filter(date__gte=august_start, date__lt=august_end)
        
        print(f"📊 Collections API θα επιστρέψει: {collections_queryset.count()} πληρωμές")
        
        # Προσομοίωση φιλτραρίσματος transaction history API
        history_queryset = Transaction.objects.filter(building_id=building_id)
        history_queryset = history_queryset.filter(date__gte=august_start, date__lt=august_end)
        
        print(f"📊 Transaction History API θα επιστρέψει: {history_queryset.count()} συναλλαγές")
        
        print()
        print("=" * 60)
        print("✅ Έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    investigate_august_discrepancy()

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from django.db.models import Sum, Q

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def investigate_building_6_discrepancy():
    """Investigate the specific discrepancy in building 6 for apartment 3"""
    
    building_id = 6  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΑΣΥΜΦΩΝΙΑΣ ΚΤΙΡΙΟΥ 6 - ΔΙΑΜΕΡΙΣΜΑ 3")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Εύρεση διαμερίσματος 3
        print("📊 1. ΕΥΡΕΣΗ ΔΙΑΜΕΡΙΣΜΑΤΟΣ 3")
        print("-" * 50)
        
        apartment_3 = Apartment.objects.filter(building_id=building_id, number=3).first()
        if apartment_3:
            print(f"🏠 Διαμέρισμα 3: {apartment_3.owner_name}")
            print(f"💰 Τρέχον υπόλοιπο: {apartment_3.current_balance:,.2f}€")
        else:
            print("❌ Διαμέρισμα 3 δεν βρέθηκε")
            return
        
        print()
        
        # 2. Όλες οι πληρωμές διαμερίσματος 3
        print("📊 2. ΟΛΕΣ ΟΙ ΠΛΗΡΩΜΕΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ 3")
        print("-" * 50)
        
        all_payments = Payment.objects.filter(apartment=apartment_3).order_by('date', 'id')
        print(f"💰 Συνολικές πληρωμές: {all_payments.count()}")
        
        if all_payments.exists():
            print("\n💰 Λεπτομερής λίστα πληρωμών:")
            print("-" * 100)
            print(f"{'Ημερομηνία':<20} {'Ποσό':<12} {'Μέθοδος':<15} {'ID':<5} {'Σημειώσεις':<30}")
            print("-" * 100)
            
            for payment in all_payments:
                print(f"{payment.date.strftime('%Y-%m-%d'):<20} "
                      f"{payment.amount:>10.2f}€ "
                      f"{payment.get_method_display():<15} "
                      f"{payment.id:<5} "
                      f"{payment.notes[:30]:<30}")
        
        print()
        
        # 3. Όλες οι συναλλαγές διαμερίσματος 3
        print("📊 3. ΟΛΕΣ ΟΙ ΣΥΝΑΛΛΑΓΕΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ 3")
        print("-" * 50)
        
        all_transactions = Transaction.objects.filter(apartment=apartment_3).order_by('date', 'id')
        print(f"📋 Συνολικές συναλλαγές: {all_transactions.count()}")
        
        if all_transactions.exists():
            print("\n📋 Λεπτομερής λίστα συναλλαγών:")
            print("-" * 120)
            print(f"{'Ημερομηνία':<25} {'Τύπος':<25} {'Ποσό':<12} {'Reference':<15} {'Περιγραφή':<40}")
            print("-" * 120)
            
            for transaction in all_transactions:
                reference = f"{transaction.reference_type}:{transaction.reference_id}" if transaction.reference_type and transaction.reference_id else "N/A"
                print(f"{transaction.date.strftime('%Y-%m-%d %H:%M'):<25} "
                      f"{transaction.type:<25} "
                      f"{transaction.amount:>10.2f}€ "
                      f"{reference:<15} "
                      f"{transaction.description[:40]:<40}")
        
        print()
        
        # 4. Έλεγχος συγχρονισμού
        print("📊 4. ΕΛΕΓΧΟΣ ΣΥΓΧΡΟΝΙΣΜΟΥ")
        print("-" * 50)
        
        # Έλεγχος για πληρωμές χωρίς αντίστοιχη συναλλαγή
        payments_without_transactions = []
        for payment in all_payments:
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
                print(f"   - Πληρωμή {payment.id}: {payment.amount}€ ({payment.date})")
        
        # Έλεγχος για συναλλαγές χωρίς αντίστοιχη πληρωμή
        transactions_without_payments = []
        for transaction in all_transactions:
            if transaction.reference_type == 'payment':
                try:
                    payment_id = int(transaction.reference_id)
                    payment = Payment.objects.get(id=payment_id)
                    # Payment exists, check if it's for the same apartment
                    if payment.apartment != apartment_3:
                        transactions_without_payments.append(transaction)
                except (ValueError, Payment.DoesNotExist):
                    transactions_without_payments.append(transaction)
        
        print(f"⚠️ Συναλλαγές χωρίς αντίστοιχη πληρωμή: {len(transactions_without_payments)}")
        if transactions_without_payments:
            for transaction in transactions_without_payments:
                print(f"   - Συναλλαγή {transaction.id}: {transaction.amount}€ ({transaction.date})")
        
        print()
        
        # 5. Ανάλυση ημερομηνιών
        print("📊 5. ΑΝΑΛΥΣΗ ΗΜΕΡΟΜΗΝΙΩΝ")
        print("-" * 50)
        
        # Βρες την πληρωμή 65.35€
        payment_65_35 = all_payments.filter(amount=Decimal('65.35')).first()
        if payment_65_35:
            print(f"💰 Πληρωμή 65.35€:")
            print(f"   - ID: {payment_65_35.id}")
            print(f"   - Ημερομηνία: {payment_65_35.date}")
            print(f"   - Μέθοδος: {payment_65_35.get_method_display()}")
            print(f"   - Δημιουργήθηκε: {payment_65_35.created_at}")
        
        # Βρες τη συναλλαγή 65.35€
        transaction_65_35 = all_transactions.filter(amount=Decimal('65.35')).first()
        if transaction_65_35:
            print(f"\n📋 Συναλλαγή 65.35€:")
            print(f"   - ID: {transaction_65_35.id}")
            print(f"   - Ημερομηνία: {transaction_65_35.date}")
            print(f"   - Τύπος: {transaction_65_35.type}")
            print(f"   - Reference: {transaction_65_35.reference_type}:{transaction_65_35.reference_id}")
            print(f"   - Δημιουργήθηκε: {transaction_65_35.created_at}")
        
        print()
        print("=" * 60)
        print("✅ Έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    investigate_building_6_discrepancy()

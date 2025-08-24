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

def investigate_all_transactions():
    """Investigate all transactions and payments to understand the discrepancy"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΕΡΕΥΝΑ ΟΛΩΝ ΤΩΝ ΣΥΝΑΛΛΑΓΩΝ ΚΑΙ ΠΛΗΡΩΜΩΝ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Συνολικές συναλλαγές
        print("📊 1. ΣΥΝΟΛΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ")
        print("-" * 50)
        
        all_transactions = Transaction.objects.filter(
            building_id=building_id
        ).order_by('-date', '-id')
        
        print(f"📋 Συνολικές συναλλαγές: {all_transactions.count()}")
        
        if all_transactions.exists():
            print("\n📋 Τελευταίες 10 συναλλαγές:")
            print("-" * 100)
            print(f"{'Ημερομηνία':<20} {'Τύπος':<25} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Περιγραφή':<40}")
            print("-" * 100)
            
            for transaction in all_transactions[:10]:
                apartment_num = transaction.apartment_number or 'N/A'
                print(f"{transaction.date.strftime('%Y-%m-%d %H:%M'):<20} "
                      f"{transaction.type:<25} "
                      f"{apartment_num:<12} "
                      f"{transaction.amount:>10.2f}€ "
                      f"{transaction.description[:40]:<40}")
        
        print()
        
        # 2. Συνολικές πληρωμές
        print("📊 2. ΣΥΝΟΛΙΚΕΣ ΠΛΗΡΩΜΕΣ")
        print("-" * 50)
        
        all_payments = Payment.objects.filter(
            apartment__building_id=building_id
        ).order_by('-date', '-id')
        
        print(f"💰 Συνολικές πληρωμές: {all_payments.count()}")
        
        if all_payments.exists():
            print("\n💰 Τελευταίες 10 πληρωμές:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<20} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Μέθοδος':<15} {'ID'}")
            print("-" * 80)
            
            for payment in all_payments[:10]:
                print(f"{payment.date.strftime('%Y-%m-%d'):<20} "
                      f"{payment.apartment.number:<12} "
                      f"{payment.amount:>10.2f}€ "
                      f"{payment.get_method_display():<15} "
                      f"{payment.id}")
        
        print()
        
        # 3. Έλεγχος για συναλλαγές με ημερομηνία 24/08/2025
        print("📊 3. ΕΛΕΓΧΟΣ ΓΙΑ ΣΥΝΑΛΛΑΓΕΣ 24/08/2025")
        print("-" * 50)
        
        # Αναζήτηση συναλλαγών με ημερομηνία 24/08/2025
        target_date = date(2025, 8, 24)
        transactions_24_aug = Transaction.objects.filter(
            building_id=building_id,
            date__date=target_date
        ).order_by('date', 'id')
        
        print(f"📋 Συναλλαγές 24/08/2025: {transactions_24_aug.count()}")
        
        if transactions_24_aug.exists():
            print("\n📋 Λεπτομερής λίστα:")
            print("-" * 100)
            print(f"{'Ημερομηνία':<20} {'Τύπος':<25} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Περιγραφή':<40}")
            print("-" * 100)
            
            for transaction in transactions_24_aug:
                apartment_num = transaction.apartment_number or 'N/A'
                print(f"{transaction.date.strftime('%Y-%m-%d %H:%M'):<20} "
                      f"{transaction.type:<25} "
                      f"{apartment_num:<12} "
                      f"{transaction.amount:>10.2f}€ "
                      f"{transaction.description[:40]:<40}")
        
        print()
        
        # 4. Έλεγχος για πληρωμές με ημερομηνία 24/08/2025
        print("📊 4. ΕΛΕΓΧΟΣ ΓΙΑ ΠΛΗΡΩΜΕΣ 24/08/2025")
        print("-" * 50)
        
        payments_24_aug = Payment.objects.filter(
            apartment__building_id=building_id,
            date=target_date
        ).order_by('date', 'id')
        
        print(f"💰 Πληρωμές 24/08/2025: {payments_24_aug.count()}")
        
        if payments_24_aug.exists():
            print("\n💰 Λεπτομερής λίστα:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<20} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Μέθοδος':<15} {'ID'}")
            print("-" * 80)
            
            for payment in payments_24_aug:
                print(f"{payment.date.strftime('%Y-%m-%d'):<20} "
                      f"{payment.apartment.number:<12} "
                      f"{payment.amount:>10.2f}€ "
                      f"{payment.get_method_display():<15} "
                      f"{payment.id}")
        
        print()
        
        # 5. Έλεγχος για συναλλαγές διαμερίσματος 3
        print("📊 5. ΕΛΕΓΧΟΣ ΓΙΑ ΣΥΝΑΛΛΑΓΕΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ 3")
        print("-" * 50)
        
        apartment_3 = Apartment.objects.filter(building_id=building_id, number=3).first()
        if apartment_3:
            print(f"🏠 Διαμέρισμα 3: {apartment_3.owner_name}")
            print(f"💰 Τρέχον υπόλοιπο: {apartment_3.current_balance:,.2f}€")
            
            # Όλες οι συναλλαγές διαμερίσματος 3
            apt3_all_transactions = Transaction.objects.filter(
                apartment=apartment_3
            ).order_by('-date', '-id')
            
            print(f"\n📋 Όλες οι συναλλαγές διαμερίσματος 3: {apt3_all_transactions.count()}")
            if apt3_all_transactions.exists():
                print("\n📋 Τελευταίες 5 συναλλαγές:")
                print("-" * 100)
                print(f"{'Ημερομηνία':<20} {'Τύπος':<25} {'Ποσό':<12} {'Περιγραφή':<40}")
                print("-" * 100)
                
                for transaction in apt3_all_transactions[:5]:
                    print(f"{transaction.date.strftime('%Y-%m-%d %H:%M'):<20} "
                          f"{transaction.type:<25} "
                          f"{transaction.amount:>10.2f}€ "
                          f"{transaction.description[:40]:<40}")
            
            # Όλες οι πληρωμές διαμερίσματος 3
            apt3_all_payments = Payment.objects.filter(
                apartment=apartment_3
            ).order_by('-date', '-id')
            
            print(f"\n💰 Όλες οι πληρωμές διαμερίσματος 3: {apt3_all_payments.count()}")
            if apt3_all_payments.exists():
                print("\n💰 Τελευταίες 5 πληρωμές:")
                print("-" * 80)
                print(f"{'Ημερομηνία':<20} {'Ποσό':<12} {'Μέθοδος':<15} {'ID'}")
                print("-" * 80)
                
                for payment in apt3_all_payments[:5]:
                    print(f"{payment.date.strftime('%Y-%m-%d'):<20} "
                          f"{payment.amount:>10.2f}€ "
                          f"{payment.get_method_display():<15} "
                          f"{payment.id}")
        
        print()
        
        # 6. Έλεγχος για συναλλαγές με ποσό 65.35€
        print("📊 6. ΕΛΕΓΧΟΣ ΓΙΑ ΣΥΝΑΛΛΑΓΕΣ ΜΕ ΠΟΣΟ 65.35€")
        print("-" * 50)
        
        transactions_65_35 = Transaction.objects.filter(
            building_id=building_id,
            amount=Decimal('65.35')
        ).order_by('-date', '-id')
        
        print(f"📋 Συναλλαγές με ποσό 65.35€: {transactions_65_35.count()}")
        
        if transactions_65_35.exists():
            print("\n📋 Λεπτομερής λίστα:")
            print("-" * 100)
            print(f"{'Ημερομηνία':<20} {'Τύπος':<25} {'Διαμέρισμα':<12} {'Ποσό':<12} {'Περιγραφή':<40}")
            print("-" * 100)
            
            for transaction in transactions_65_35:
                apartment_num = transaction.apartment_number or 'N/A'
                print(f"{transaction.date.strftime('%Y-%m-%d %H:%M'):<20} "
                      f"{transaction.type:<25} "
                      f"{apartment_num:<12} "
                      f"{transaction.amount:>10.2f}€ "
                      f"{transaction.description[:40]:<40}")
        
        print()
        print("=" * 60)
        print("✅ Έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    investigate_all_transactions()

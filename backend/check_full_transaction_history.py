import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Building
from decimal import Decimal

def check_full_transaction_history():
    """Έλεγχος πλήρους ιστορικού συναλλαγών"""
    
    print("📊 ΠΛΗΡΕΣ ΙΣΤΟΡΙΚΟ ΣΥΝΑΛΛΑΓΩΝ")
    print("=" * 60)
    
    with schema_context('demo'):
        # Έλεγχος για κτίριο Αλκμάνος 22
        try:
            building = Building.objects.get(address__icontains='Αλκμάνος 22')
            print(f"✅ Βρέθηκε κτίριο: {building.name} - {building.address}")
            print(f"   ID: {building.id}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με διεύθυνση 'Αλκμάνος 22'")
            return
        
        # Έλεγχος όλων των συναλλαγών
        all_transactions = Transaction.objects.filter(
            building=building
        ).order_by('date')
        
        print(f"\n📈 ΣΥΝΟΛΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ: {all_transactions.count()}")
        print("-" * 50)
        
        if not all_transactions.exists():
            print("❌ Δεν υπάρχουν συναλλαγές")
            return
        
        # Ανάλυση ανά έτος
        print("\n📅 ΑΝΑΛΥΣΗ ΑΝΑ ΕΤΟΣ:")
        print("-" * 30)
        
        years = {}
        running_balance = Decimal('0.00')
        
        for transaction in all_transactions:
            year = transaction.date.year
            if year not in years:
                years[year] = {
                    'transactions': [],
                    'total_amount': Decimal('0.00'),
                    'count': 0
                }
            
            years[year]['transactions'].append(transaction)
            years[year]['total_amount'] += transaction.amount
            years[year]['count'] += 1
            running_balance += transaction.amount
        
        # Εμφάνιση ανά έτος
        for year in sorted(years.keys()):
            year_data = years[year]
            print(f"\n🔸 {year}:")
            print(f"   📊 Συναλλαγές: {year_data['count']}")
            print(f"   💰 Συνολικό ποσό: {year_data['total_amount']:.2f}€")
            
            # Ανάλυση ανά μήνα
            months = {}
            for transaction in year_data['transactions']:
                month = transaction.date.month
                if month not in months:
                    months[month] = {
                        'transactions': [],
                        'total_amount': Decimal('0.00'),
                        'count': 0
                    }
                
                months[month]['transactions'].append(transaction)
                months[month]['total_amount'] += transaction.amount
                months[month]['count'] += 1
            
            # Εμφάνιση ανά μήνα
            for month in sorted(months.keys()):
                month_data = months[month]
                month_name = datetime(2024, month, 1).strftime('%B')
                print(f"     📅 {month_name}: {month_data['count']} συναλλαγές, {month_data['total_amount']:.2f}€")
        
        print(f"\n💰 ΤΕΛΙΚΟ ΥΠΟΛΟΙΠΟ: {running_balance:.2f}€")
        
        # Λεπτομερής ανάλυση συναλλαγών
        print("\n📋 ΛΕΠΤΟΜΕΡΗΣ ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 50)
        
        current_balance = Decimal('0.00')
        
        for i, transaction in enumerate(all_transactions, 1):
            current_balance += transaction.amount
            
            # Εμφάνιση μόνο σημαντικών συναλλαγών (μεγάλα ποσά ή συγκεκριμένες ημερομηνίες)
            if (abs(transaction.amount) >= Decimal('50.00') or 
                transaction.date.year == 2024 or 
                transaction.date.year == 2025):
                
                print(f"\n{i:3d}. {transaction.date.strftime('%Y-%m-%d %H:%M')}")
                print(f"     🔸 Τύπος: {transaction.type}")
                print(f"     📝 Περιγραφή: {transaction.description}")
                print(f"     💰 Ποσό: {transaction.amount:.2f}€")
                print(f"     🏠 Διαμέρισμα: {transaction.apartment_number}")
                print(f"     🆔 Reference: {transaction.reference_id}")
                print(f"     💳 Υπόλοιπο μετά: {current_balance:.2f}€")
                
                # Ειδική ένδειξη για συναλλαγές 150€
                if transaction.amount == Decimal('150.00'):
                    print("     ⚠️  ΑΥΤΗ ΕΙΝΑΙ Η ΣΥΝΑΛΛΑΓΗ 150€!")
                elif transaction.amount == Decimal('-150.00'):
                    print("     ⚠️  ΑΥΤΗ ΕΙΝΑΙ Η ΧΡΕΩΣΗ -150€!")
        
        # Ανάλυση ανά τύπο συναλλαγής
        print("\n📊 ΑΝΑΛΥΣΗ ΑΝΑ ΤΥΠΟ ΣΥΝΑΛΛΑΓΗΣ:")
        print("-" * 40)
        
        transaction_types = {}
        for transaction in all_transactions:
            tx_type = transaction.type
            if tx_type not in transaction_types:
                transaction_types[tx_type] = {
                    'count': 0,
                    'total_amount': Decimal('0.00')
                }
            
            transaction_types[tx_type]['count'] += 1
            transaction_types[tx_type]['total_amount'] += transaction.amount
        
        for tx_type, data in transaction_types.items():
            print(f"🔸 {tx_type}:")
            print(f"   📊 Πλήθος: {data['count']}")
            print(f"   💰 Συνολικό: {data['total_amount']:.2f}€")
            print(f"   📈 Μέσος όρος: {(data['total_amount'] / data['count']):.2f}€")
        
        # Έλεγχος για test συναλλαγές
        print("\n🧪 ΕΛΕΓΧΟΣ TEST ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 35)
        
        test_transactions = all_transactions.filter(
            reference_id__startswith='TEST_'
        )
        
        print(f"🔍 Test συναλλαγές: {test_transactions.count()}")
        
        if test_transactions.exists():
            for transaction in test_transactions:
                print(f"  🔸 {transaction.date} - {transaction.description}")
                print(f"     Ποσό: {transaction.amount}€")
                print(f"     Reference: {transaction.reference_id}")
        
        # Έλεγχος για συναλλαγές με ποσό 150€
        print("\n🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ 150€:")
        print("-" * 35)
        
        transactions_150 = all_transactions.filter(
            amount=Decimal('150.00')
        )
        
        print(f"🔍 Συναλλαγές με ποσό 150€: {transactions_150.count()}")
        
        if transactions_150.exists():
            for transaction in transactions_150:
                print(f"  🔸 {transaction.date} - {transaction.type}")
                print(f"     Περιγραφή: {transaction.description}")
                print(f"     Διαμέρισμα: {transaction.apartment_number}")
                print(f"     Reference: {transaction.reference_id}")
                print(f"     Created by: {transaction.created_by}")

if __name__ == "__main__":
    check_full_transaction_history()

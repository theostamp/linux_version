import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Building, Apartment
from decimal import Decimal

def delete_and_create_transaction():
    print("🔧 Διαγράφουμε και δημιουργούμε νέα κίνηση για τον Ιούλιο 2025...")
    print("=" * 60)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        try:
            building = Building.objects.get(address__icontains='Αλκμάνος 22')
            print(f"✅ Βρέθηκε κτίριο: {building.name} - {building.address}")
            print(f"   ID: {building.id}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με διεύθυνση 'Αλκμάνος 22'")
            return
        
        # Διαγράφουμε την προηγούμενη test κίνηση
        try:
            test_transaction = Transaction.objects.filter(
                building=building,
                reference_id='TEST_JULY_2025'
            ).first()
            
            if test_transaction:
                test_transaction.delete()
                print("✅ Διαγράφηκε η προηγούμενη test κίνηση")
            else:
                print("ℹ️  Δεν βρέθηκε προηγούμενη test κίνηση")
        except Exception as e:
            print(f"⚠️  Σφάλμα διαγραφής: {e}")
        
        # Βρίσκουμε ένα διαμέρισμα
        try:
            apartment = Apartment.objects.filter(building=building).first()
            if not apartment:
                print("❌ Δεν βρέθηκε διαμέρισμα")
                return
            print(f"✅ Βρέθηκε διαμέρισμα: {apartment.number}")
        except Exception as e:
            print(f"❌ Σφάλμα εύρεσης διαμερίσματος: {e}")
            return
        
        # Δημιουργούμε κίνηση για τον Ιούλιο 2025
        try:
            july_date = datetime(2025, 7, 15, 10, 30, 0)  # 15 Ιουλίου 2025
            
            transaction = Transaction(
                building=building,
                apartment=apartment,
                date=july_date,
                type='common_expense_payment',
                status='completed',
                description='Δοκιμαστική κίνηση Ιουλίου 2025 - Είσπραξη κοινοχρήστων',
                apartment_number=apartment.number,
                amount=Decimal('150.00'),
                balance_before=Decimal('0.00'),
                balance_after=Decimal('150.00'),
                reference_id='TEST_JULY_2025',
                reference_type='test',
                created_by='System Test'
            )
            transaction.save()
            
            print("✅ Δημιουργήθηκε νέα κίνηση:")
            print(f"   ID: {transaction.id}")
            print(f"   Ημερομηνία: {transaction.date}")
            print(f"   Περιγραφή: {transaction.description}")
            print(f"   Ποσό: {transaction.amount}€")
            print(f"   Διαμέρισμα: {transaction.apartment_number}")
            
        except Exception as e:
            print(f"❌ Σφάλμα δημιουργίας κίνησης: {e}")
            import traceback
            traceback.print_exc()
        
        # Ελέγχουμε τις κινήσεις μετά τη δημιουργία
        print("\n📊 Ελέγχουμε κινήσεις μετά τη δημιουργία:")
        all_transactions = Transaction.objects.filter(building=building).order_by('-date')
        print(f"   Συνολικές κινήσεις: {all_transactions.count()}")
        
        for i, transaction in enumerate(all_transactions):
            print(f"   {i+1}. {transaction.date} - {transaction.description} - {transaction.amount}€")
        
        # Ελέγχουμε κινήσεις για τον Ιούλιο 2025
        print("\n🔍 Ελέγχουμε κινήσεις για τον Ιούλιο 2025:")
        from datetime import date
        july_transactions = Transaction.objects.filter(
            building=building,
            date__date__gte=date(2025, 7, 1),
            date__date__lt=date(2025, 8, 1)
        ).order_by('-date')
        print(f"   Κινήσεις Ιουλίου 2025: {july_transactions.count()}")
        
        for i, transaction in enumerate(july_transactions):
            print(f"   {i+1}. {transaction.date} - {transaction.description} - {transaction.amount}€")

if __name__ == "__main__":
    delete_and_create_transaction()

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Building
from financial.services import ReportService

def test_transaction_api():
    print("🧪 Ελέγχουμε το API endpoint για ιστορικό κινήσεων...")
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
        
        # Ελέγχουμε το ReportService
        print("\n🔍 Ελέγχουμε το ReportService:")
        try:
            service = ReportService(building.id)
            print("✅ ReportService δημιουργήθηκε επιτυχώς")
            
            # Ελέγχουμε τη μέθοδο generate_transaction_history_report
            print("\n📊 Ελέγχουμε generate_transaction_history_report:")
            result = service.generate_transaction_history_report()
            print(f"   Τύπος αποτελέσματος: {type(result)}")
            print(f"   Αριθμός κινήσεων: {result.count() if hasattr(result, 'count') else len(result)}")
            
            if hasattr(result, 'count') and result.count() > 0:
                print("\n📋 Πρώτες κινήσεις:")
                for i, transaction in enumerate(result[:5]):
                    print(f"   {i+1}. {transaction.date} - {transaction.description} - {transaction.amount}€")
            
        except Exception as e:
            print(f"❌ Σφάλμα στο ReportService: {e}")
            import traceback
            traceback.print_exc()
        
        # Ελέγχουμε άμεσα το queryset
        print("\n🔍 Ελέγχουμε άμεσα το Transaction queryset:")
        transactions = Transaction.objects.filter(building=building)
        print(f"   Αριθμός κινήσεων: {transactions.count()}")
        
        if transactions.exists():
            print("\n📋 Πρώτες κινήσεις:")
            for i, transaction in enumerate(transactions.order_by('-date')[:5]):
                print(f"   {i+1}. {transaction.date} - {transaction.description} - {transaction.amount}€")
        
        # Ελέγχουμε με φίλτρο μήνα (Ιούλιος 2025)
        print("\n🔍 Ελέγχουμε με φίλτρο μήνα (Ιούλιος 2025):")
        from datetime import date
        start_date = date(2025, 7, 1)
        end_date = date(2025, 8, 1)
        
        july_transactions = Transaction.objects.filter(
            building=building,
            date__date__gte=start_date,
            date__date__lt=end_date
        )
        print(f"   Κινήσεις Ιουλίου 2025: {july_transactions.count()}")
        
        if july_transactions.exists():
            print("\n📋 Κινήσεις Ιουλίου:")
            for i, transaction in enumerate(july_transactions.order_by('-date')):
                print(f"   {i+1}. {transaction.date} - {transaction.description} - {transaction.amount}€")

if __name__ == "__main__":
    test_transaction_api()

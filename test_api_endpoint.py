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
from financial.serializers import TransactionSerializer

def test_api_endpoint():
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
        
        # Ελέγχουμε το ReportService με το διορθωμένο κώδικα
        print("\n🔍 Ελέγχουμε το ReportService με serialization:")
        try:
            service = ReportService(building.id)
            print("✅ ReportService δημιουργήθηκε επιτυχώς")
            
            # Ελέγχουμε τη μέθοδο generate_transaction_history_report
            print("\n📊 Ελέγχουμε generate_transaction_history_report:")
            result = service.generate_transaction_history_report()
            print(f"   Τύπος αποτελέσματος: {type(result)}")
            print(f"   Αριθμός κινήσεων: {len(result)}")
            
            if result:
                print("\n📋 Πρώτες κινήσεις:")
                for i, transaction in enumerate(result[:5]):
                    print(f"   {i+1}. {transaction.get('date', 'N/A')} - {transaction.get('description', 'N/A')} - {transaction.get('amount', 'N/A')}€")
            
        except Exception as e:
            print(f"❌ Σφάλμα στο ReportService: {e}")
            import traceback
            traceback.print_exc()
        
        # Ελέγχουμε με φίλτρο μήνα (Αύγουστος 2025)
        print("\n🔍 Ελέγχουμε με φίλτρο μήνα (Αύγουστος 2025):")
        try:
            result_august = service.generate_transaction_history_report(
                start_date='2025-08-01',
                end_date='2025-09-01'
            )
            print(f"   Κινήσεις Αυγούστου 2025: {len(result_august)}")
            
            if result_august:
                print("\n📋 Κινήσεις Αυγούστου:")
                for i, transaction in enumerate(result_august):
                    print(f"   {i+1}. {transaction.get('date', 'N/A')} - {transaction.get('description', 'N/A')} - {transaction.get('amount', 'N/A')}€")
        except Exception as e:
            print(f"❌ Σφάλμα με φίλτρο μήνα: {e}")
        
        # Ελέγχουμε με φίλτρο μήνα (Ιούλιος 2025)
        print("\n🔍 Ελέγχουμε με φίλτρο μήνα (Ιούλιος 2025):")
        try:
            result_july = service.generate_transaction_history_report(
                start_date='2025-07-01',
                end_date='2025-08-01'
            )
            print(f"   Κινήσεις Ιουλίου 2025: {len(result_july)}")
            
            if result_july:
                print("\n📋 Κινήσεις Ιουλίου:")
                for i, transaction in enumerate(result_july):
                    print(f"   {i+1}. {transaction.get('date', 'N/A')} - {transaction.get('description', 'N/A')} - {transaction.get('amount', 'N/A')}€")
        except Exception as e:
            print(f"❌ Σφάλμα με φίλτρο μήνα: {e}")

if __name__ == "__main__":
    test_api_endpoint()

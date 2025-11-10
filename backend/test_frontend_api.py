import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService

def test_frontend_api():
    """Ελέγχει το API endpoint που χρησιμοποιεί το frontend"""
    with schema_context('demo'):
        print("🌐 ΕΛΕΓΧΟΣ FRONTEND API ENDPOINT")
        print("=" * 50)
        
        # Test για τον Αύγουστο 2025 (όπως στο frontend)
        service = FinancialDashboardService(1)  # Building ID 1
        
        # API call όπως το frontend
        api_response = service.get_summary(month='2025-08')
        
        print("📊 API Response για Αύγουστο 2025:")
        print(f"   previous_obligations: {api_response.get('previous_obligations', 'NOT FOUND'):,.2f}€")
        print(f"   total_balance: {api_response.get('total_balance', 'NOT FOUND'):,.2f}€")
        print(f"   current_obligations: {api_response.get('current_obligations', 'NOT FOUND'):,.2f}€")
        print(f"   current_reserve: {api_response.get('current_reserve', 'NOT FOUND'):,.2f}€")
        print(f"   average_monthly_expenses: {api_response.get('average_monthly_expenses', 'NOT FOUND'):,.2f}€")
        print(f"   total_expenses_month: {api_response.get('total_expenses_month', 'NOT FOUND'):,.2f}€")
        print(f"   total_payments_month: {api_response.get('total_payments_month', 'NOT FOUND'):,.2f}€")
        
        # Έλεγχος αν το previous_obligations είναι διαθέσιμο
        if 'previous_obligations' in api_response:
            print("\n✅ ΕΠΙΤΥΧΙΑ! Το previous_obligations είναι διαθέσιμο στο API!")
            print(f"   Τιμή: {api_response['previous_obligations']:,.2f}€")
        else:
            print("\n❌ ΠΡΟΒΛΗΜΑ! Το previous_obligations δεν είναι διαθέσιμο στο API!")
        
        print("=" * 50)

if __name__ == "__main__":
    test_frontend_api()

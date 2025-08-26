import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from buildings.models import Building
from financial.services import AdvancedCommonExpenseCalculator

def test_payment_modal_fix():
    """Test the payment modal fix for apartment A3"""
    
    with schema_context('demo'):
        # Get building and apartment A3
        building = Building.objects.get(id=1)  # Αραχώβης 12
        apartment = Apartment.objects.get(number='Α3')
        
        print(f"🔍 Testing Payment Modal Fix for Apartment A3")
        print(f"🏠 Building: {building.name}")
        print(f"🏢 Apartment: {apartment.number}")
        print(f"👤 Owner: {apartment.owner_name}")
        print(f"👤 Tenant: {apartment.tenant_name}")
        print(f"📊 Participation Mills: {apartment.participation_mills}")
        
        # Calculate August 2025 obligations using Advanced Calculator
        print(f"\n📅 August 2025 Calculation:")
        calculator = AdvancedCommonExpenseCalculator(
            building_id=1,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31'
        )
        
        result = calculator.calculate_advanced_shares()
        apartment_share = result['shares'].get(apartment.id, {})
        
        print(f"\n📊 Full Calculation Result:")
        print(f"   - Total Amount: {apartment_share.get('total_amount', 0):.2f}€")
        print(f"   - Breakdown:")
        breakdown = apartment_share.get('breakdown', {})
        for key, value in breakdown.items():
            if value and value > 0:
                print(f"     * {key}: {value:.2f}€")
        
        # Check reserve fund information
        print(f"\n💰 Reserve Fund Information:")
        print(f"   - Reserve Contribution: {result.get('reserve_contribution', 0):.2f}€")
        print(f"   - Reserve Fund Goal: {result.get('reserve_fund_goal', 0):.2f}€")
        print(f"   - Reserve Fund Duration: {result.get('reserve_fund_duration', 0)} months")
        print(f"   - Current Reserve: {result.get('current_reserve', 0):.2f}€")
        print(f"   - Actual Reserve Collected: {result.get('actual_reserve_collected', 0):.2f}€")
        
        # Check what the payment modal should show
        print(f"\n🎯 Payment Modal Should Show:")
        actual_reserve_contribution = breakdown.get('reserve_fund_contribution', 0)
        total_amount = apartment_share.get('total_amount', 0)
        
        print(f"   - Amount to collect: {total_amount:.2f}€")
        print(f"   - Reserve fund included: {actual_reserve_contribution:.2f}€")
        print(f"   - Common expenses: {total_amount - actual_reserve_contribution:.2f}€")
        
        if actual_reserve_contribution > 0:
            print(f"   - Message: 💡 Το ποσό περιλαμβάνει και αποθεματικό {actual_reserve_contribution:.2f}€")
        else:
            print(f"   - Message: ⚠️ Αποθεματικό δεν συλλέγεται λόγω εκκρεμοτήτων")

if __name__ == "__main__":
    test_payment_modal_fix()







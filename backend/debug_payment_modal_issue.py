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
from financial.models import Expense, Payment
from financial.services import AdvancedCommonExpenseCalculator

def debug_payment_modal_issue():
    """Debug the payment modal issue for apartment A3"""
    
    with schema_context('demo'):
        # Get building and list all apartments first
        building = Building.objects.get(id=1)  # Αραχώβης 12
        
        print(f"🔍 Debugging Payment Modal Issue")
        print(f"🏠 Building: {building.name}")
        
        # List all apartments to see what's available
        print(f"\n📋 All Apartments in Building:")
        all_apartments = Apartment.objects.filter(building=building).order_by('number')
        for apt in all_apartments:
            print(f"  {apt.number}: {apt.owner_name} (mills: {apt.participation_mills})")
        
        # Try to find apartment A3 (might be different format)
        apartment = None
        for apt in all_apartments:
            if apt.number == 'A3' or apt.number == 'Α3':
                apartment = apt
                break
        
        if not apartment:
            print(f"\n❌ Apartment A3 not found!")
            return
        
        print(f"\n🏢 Found Apartment: {apartment.number}")
        print(f"👤 Owner: {apartment.owner_name}")
        print(f"👤 Tenant: {apartment.tenant_name}")
        print(f"📊 Participation Mills: {apartment.participation_mills}")
        
        # Check building reserve fund settings
        print(f"\n💰 Building Reserve Fund Settings:")
        print(f"   - Reserve Fund Goal: {building.reserve_fund_goal}€")
        print(f"   - Reserve Fund Duration: {building.reserve_fund_duration_months} months")
        print(f"   - Reserve Contribution per Apartment: {building.reserve_contribution_per_apartment}€")
        print(f"   - Reserve Fund Start Date: {building.reserve_fund_start_date}")
        
        # Calculate expected reserve fund amount for A3
        if apartment.participation_mills and building.reserve_contribution_per_apartment:
            expected_reserve = float(apartment.participation_mills / 1000) * float(building.reserve_contribution_per_apartment)
            print(f"\n🧮 Expected Reserve Fund for A3:")
            print(f"   - Formula: ({apartment.participation_mills} / 1000) × {building.reserve_contribution_per_apartment}€")
            print(f"   - Result: {expected_reserve:.2f}€")
        
        # Check current balance
        print(f"\n💳 Current Financial Status:")
        print(f"   - Current Balance: {apartment.current_balance}€")
        
        # Calculate August 2025 obligations using Advanced Calculator
        print(f"\n📅 August 2025 Calculation:")
        calculator = AdvancedCommonExpenseCalculator(
            building_id=1,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31'
        )
        
        result = calculator.calculate_advanced_shares()
        apartment_share = result['shares'].get(apartment.id, {})
        
        if apartment_share:
            print(f"   - Total Amount: {apartment_share.get('total_amount', 0):.2f}€")
            print(f"   - Breakdown:")
            breakdown = apartment_share.get('breakdown', {})
            for key, value in breakdown.items():
                if value and value > 0:
                    print(f"     * {key}: {value:.2f}€")
        
        # Check what the payment modal should show
        print(f"\n🎯 Payment Modal Should Show:")
        print(f"   - Amount to collect: {apartment_share.get('total_amount', 0):.2f}€")
        print(f"   - Reserve fund included: {breakdown.get('reserve_fund_contribution', 0):.2f}€")
        print(f"   - Common expenses: {apartment_share.get('total_amount', 0) - breakdown.get('reserve_fund_contribution', 0):.2f}€")
        
        # Check all apartments for comparison
        print(f"\n📋 All Apartments Reserve Fund Calculation:")
        total_mills = 0
        
        for apt in all_apartments:
            mills = apt.participation_mills or 0
            total_mills += mills
            reserve_amount = float(mills / 1000) * float(building.reserve_contribution_per_apartment) if building.reserve_contribution_per_apartment else 0
            print(f"  {apt.number}: {mills} mills → {reserve_amount:.2f}€")
        
        print(f"\n📊 Total Mills: {total_mills} (should be 1000)")
        print(f"✅ Mills validation: {'✅ Correct' if total_mills == 1000 else '❌ Incorrect'}")

if __name__ == "__main__":
    debug_payment_modal_issue()

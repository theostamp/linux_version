#!/usr/bin/env python3
"""
Test Circular Dependency Fix for Reserve Fund
Create a scenario with real obligations to test the fix.
"""

import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction
from financial.services import CommonExpenseCalculator
from django.utils import timezone

def test_circular_dependency_fix():
    """Test that Reserve Fund works after fixing circular dependency"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=1)
            month = '2025-08'  # Within collection period
            
            print(f"🏢 Building: {building.name}")
            print(f"🗓️  Testing month: {month}")
            print()
            
            # Get apartments
            apartments = Apartment.objects.filter(building=building)
            
            # Step 1: Clear existing transactions
            print("🧹 Clearing existing transactions...")
            Transaction.objects.filter(apartment__building=building).delete()
            print("   ✅ Cleared")
            print()
            
            # Step 2: Create some real obligations (non-reserve fund)
            print("💰 Creating real obligations (utilities, management fees)...")
            test_date = timezone.make_aware(datetime(2025, 7, 15))
            
            for i, apartment in enumerate(apartments[:3]):  # Test with first 3 apartments
                # Add utility bill obligation
                Transaction.objects.create(
                    apartment=apartment,
                    amount=Decimal('50.00'),
                    date=test_date,
                    type='expense_created',
                    description=f'Λογαριασμός ΔΕΗ Ιούλιος 2025 - Διαμέρισμα {apartment.number}'
                )
                
                # Add management fee obligation  
                Transaction.objects.create(
                    apartment=apartment,
                    amount=Decimal('1.00'),
                    date=test_date,
                    type='expense_created',
                    description=f'Αμοιβή διαχείρισης Ιούλιος 2025 - Διαμέρισμα {apartment.number}'
                )
                
                print(f"   Apartment {apartment.number}: €51.00 in obligations")
            
            print()
            
            # Step 3: Test Reserve Fund calculation with real obligations
            print("🧮 Testing Reserve Fund with real obligations:")
            calculator = CommonExpenseCalculator(building.id, month=month)
            shares = calculator.calculate_shares()
            
            # Check Reserve Fund contributions
            reserve_fund_total = 0
            for apt_id, share_data in shares.items():
                reserve_contribution = share_data.get('reserve_fund_contribution', 0)
                reserve_fund_total += reserve_contribution
                if reserve_contribution > 0:
                    apartment = apartments.get(id=apt_id)
                    print(f"   Apartment {apartment.number}: €{reserve_contribution}")
            
            print(f"   Total Reserve Fund Contribution: €{reserve_fund_total}")
            
            if reserve_fund_total == 0:
                print("❌ Reserve Fund still blocked - fix didn't work")
                
                # Debug why
                print("\n🔍 Debugging why Reserve Fund is still blocked:")
                for apt in apartments[:3]:
                    historical_balance = calculator._get_historical_balance(apt, calculator.period_end_date)
                    print(f"   Apartment {apt.number}: Historical balance = €{historical_balance}")
                    
                    if historical_balance < 0:
                        print(f"      Has pending obligations: €{abs(historical_balance)}")
                        print("      This is expected - Reserve Fund should be blocked")
            else:
                print("✅ SUCCESS: Reserve Fund collection working with real obligations!")
            
            print()
            
            # Step 4: Now add some Reserve Fund charges and test circular dependency fix
            print("🔄 Testing circular dependency fix:")
            print("   Adding Reserve Fund charges to see if they're excluded from obligations check...")
            
            for apartment in apartments[:3]:
                Transaction.objects.create(
                    apartment=apartment,
                    amount=Decimal('33.33'),
                    date=test_date,
                    type='expense_created',
                    description=f'Εισφορά Αποθεματικού Ιούλιος 2025 - Διαμέρισμα {apartment.number}'
                )
            
            # Test again
            calculator = CommonExpenseCalculator(building.id, month=month)
            shares = calculator.calculate_shares()
            
            reserve_fund_total = sum(share_data.get('reserve_fund_contribution', 0) 
                                   for share_data in shares.values())
            
            print(f"   Reserve Fund after adding reserve charges: €{reserve_fund_total}")
            
            if reserve_fund_total > 0:
                print("✅ EXCELLENT: Circular dependency fix working!")
                print("   Reserve Fund charges are excluded from obligations check")
            else:
                print("❌ Circular dependency still exists")
                
        except Exception as e:
            print(f"❌ Error during test: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_circular_dependency_fix()

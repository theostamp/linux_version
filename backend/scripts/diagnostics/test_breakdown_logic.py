#!/usr/bin/env python3
"""
Test το breakdown logic χωρίς API call
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db.models import Sum

def test_breakdown_logic():
    """Test τη λογική του breakdown"""
    
    with schema_context('demo'):
        print("=" * 60)
        print(" 🧪 TESTING BREAKDOWN LOGIC ")
        print("=" * 60)
        
        try:
            from apartments.models import Apartment
            from financial.models import Expense
            from buildings.models import Building
            
            building_id = 3  # Αραχώβης 12
            building = Building.objects.get(id=building_id)
            
            print(f"🏢 Building: {building.name}")
            
            # Get apartments with debts (negative balance)
            apartments_with_debts = Apartment.objects.filter(
                building_id=building_id,
                current_balance__lt=0
            ).order_by('number')
            
            apartment_debts = []
            total_apartment_debts = Decimal('0.00')
            
            print("\n📊 APARTMENTS WITH DEBTS:")
            for apt in apartments_with_debts:
                debt_amount = abs(apt.current_balance or Decimal('0.00'))
                total_apartment_debts += debt_amount
                
                apartment_debt = {
                    'apartment_number': apt.number,
                    'owner_name': apt.owner_name or '',
                    'debt_amount': float(debt_amount),
                    'balance': float(apt.current_balance or Decimal('0.00'))
                }
                apartment_debts.append(apartment_debt)
                
                print(f"   🏠 {apt.number}: {apt.owner_name} - Debt: {debt_amount}€ (Balance: {apt.current_balance}€)")
            
            # Get total expenses for building
            total_expenses = Expense.objects.filter(
                building_id=building_id
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Get management fees
            management_fee_per_apartment = getattr(building, 'management_fee_per_apartment', Decimal('0.00')) or Decimal('0.00')
            apartments_count = Apartment.objects.filter(building_id=building_id).count()
            total_management_fees = management_fee_per_apartment * apartments_count
            
            # Calculate total obligations
            total_obligations = total_apartment_debts + total_expenses + total_management_fees
            
            breakdown_data = {
                'building_name': building.name,
                'apartment_debts': apartment_debts,
                'total_apartment_debts': float(total_apartment_debts),
                'total_expenses': float(total_expenses),
                'total_management_fees': float(total_management_fees),
                'total_obligations': float(total_obligations),
                'apartments_with_debt': len(apartment_debts),
                'apartments_count': apartments_count
            }
            
            print("\n📋 BREAKDOWN SUMMARY:")
            print(f"   Building: {breakdown_data['building_name']}")
            print(f"   Apartments with debt: {breakdown_data['apartments_with_debt']}")
            print(f"   Total apartment debts: {breakdown_data['total_apartment_debts']}€")
            print(f"   Total expenses: {breakdown_data['total_expenses']}€")
            print(f"   Total management fees: {breakdown_data['total_management_fees']}€")
            print(f"   TOTAL OBLIGATIONS: {breakdown_data['total_obligations']}€")
            
            # Compare with expected
            expected = 334.85
            actual = breakdown_data['total_obligations']
            print("\n🎯 COMPARISON:")
            print(f"   Expected: {expected}€")
            print(f"   Actual: {actual}€")
            print(f"   Match: {'✅' if abs(actual - expected) < 0.01 else '❌'}")
            
            if abs(actual - expected) < 0.01:
                print("\n🎉 SUCCESS! The breakdown logic works perfectly!")
                print("   The frontend component will be able to show detailed breakdown to users.")
            else:
                print("\n⚠️ Mismatch found - need to investigate")
                
            # Show JSON format
            import json
            print("\n📄 JSON RESPONSE FORMAT:")
            print(json.dumps(breakdown_data, indent=2, ensure_ascii=False))
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_breakdown_logic()

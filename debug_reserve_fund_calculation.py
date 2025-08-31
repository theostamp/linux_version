#!/usr/bin/env python3
"""
Debug Reserve Fund Calculation Logic
Investigate why Reserve Fund contributions are 0 even during collection period.
"""

import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import CommonExpenseCalculator

def debug_reserve_fund_calculation():
    """Debug Reserve Fund calculation for August 2025"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=1)
            month = '2025-08'  # Should be within collection period
            
            print(f"🏢 Building: {building.name}")
            print(f"🗓️  Testing month: {month}")
            print(f"📅 Reserve Fund Start Date: {building.reserve_fund_start_date}")
            print(f"🎯 Reserve Fund Target Date: {building.reserve_fund_target_date}")
            print(f"💰 Reserve Fund Goal: {building.reserve_fund_goal}")
            print()
            
            # Create calculator
            calculator = CommonExpenseCalculator(building.id, month=month)
            
            # Check timeline logic manually
            year, mon = map(int, month.split('-'))
            selected_month_date = date(year, mon, 1)
            
            print(f"📊 Timeline Check:")
            print(f"   Selected month date: {selected_month_date}")
            print(f"   Start date: {building.reserve_fund_start_date}")
            print(f"   Target date: {building.reserve_fund_target_date}")
            print(f"   Is after start: {selected_month_date >= building.reserve_fund_start_date}")
            print(f"   Is before end: {selected_month_date <= building.reserve_fund_target_date}")
            print()
            
            # Check if there are pending obligations
            from apartments.models import Apartment
            apartments = Apartment.objects.filter(building=building)
            
            print(f"🏠 Checking apartments for pending obligations:")
            for apartment in apartments:
                # Check if apartment has pending obligations
                from financial.models import Transaction
                
                # Get all transactions for this apartment up to the selected month
                transactions = Transaction.objects.filter(
                    apartment=apartment,
                    date__lt=selected_month_date
                ).order_by('date')
                
                total_obligations = sum(t.amount for t in transactions if t.amount > 0)
                total_payments = sum(abs(t.amount) for t in transactions if t.amount < 0)
                balance = total_obligations - total_payments
                
                print(f"   {apartment.number}: Balance = €{balance}")
                if balance > 0:
                    print(f"      ⚠️  Has pending obligations: €{balance}")
            
            print()
            
            # Now run the actual calculation
            print(f"🧮 Running Reserve Fund calculation:")
            shares = calculator.calculate_shares()
            
            # Check Reserve Fund contributions
            reserve_fund_total = 0
            for apt_id, share_data in shares.items():
                reserve_contribution = share_data.get('reserve_fund_contribution', 0)
                reserve_fund_total += reserve_contribution
                if reserve_contribution > 0:
                    print(f"   Apartment {apt_id}: €{reserve_contribution}")
            
            print(f"   Total Reserve Fund Contribution: €{reserve_fund_total}")
            
            if reserve_fund_total == 0:
                print(f"❌ No Reserve Fund contributions calculated")
                print(f"   This might be due to:")
                print(f"   1. Pending obligations blocking collection")
                print(f"   2. Timeline check failing")
                print(f"   3. Reserve Fund goal not set properly")
            else:
                print(f"✅ Reserve Fund contributions calculated successfully")
                
        except Exception as e:
            print(f"❌ Error during debug: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    debug_reserve_fund_calculation()

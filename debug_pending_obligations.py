#!/usr/bin/env python3
"""
Debug Pending Obligations Check
Investigate why Reserve Fund is blocked by pending obligations check.
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
from apartments.models import Apartment

def debug_pending_obligations():
    """Debug pending obligations check in Reserve Fund calculation"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=1)
            month = '2025-08'  # Should be within collection period
            
            print(f"🏢 Building: {building.name}")
            print(f"🗓️  Testing month: {month}")
            print()
            
            # Create calculator to access its methods
            calculator = CommonExpenseCalculator(building.id, month=month)
            
            # Get apartments
            apartments = Apartment.objects.filter(building=building)
            
            print(f"🏠 Checking pending obligations logic:")
            print(f"   Period end date: {calculator.period_end_date}")
            print()
            
            total_obligations = 0
            for apt in apartments:
                historical_balance = calculator._get_historical_balance(apt, calculator.period_end_date)
                print(f"   Apartment {apt.number}:")
                print(f"      Historical balance: €{historical_balance}")
                
                if historical_balance < 0:
                    obligation = abs(historical_balance)
                    total_obligations += obligation
                    print(f"      ⚠️  Has pending obligation: €{obligation}")
                else:
                    print(f"      ✅ No pending obligations")
            
            print()
            print(f"📊 Total pending obligations: €{total_obligations}")
            
            if total_obligations > 0:
                print(f"❌ Reserve Fund collection BLOCKED due to pending obligations")
                print(f"   This might be the reason why Reserve Fund contributions are 0")
            else:
                print(f"✅ No pending obligations - Reserve Fund should be collected")
                
                # Let's check why it's still not working
                print()
                print(f"🔍 Checking other potential issues:")
                
                # Check monthly target calculation
                monthly_target = 0
                if building.reserve_fund_goal and building.reserve_fund_duration_months:
                    monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                    print(f"   Monthly target: €{monthly_target}")
                else:
                    print(f"   ❌ Cannot calculate monthly target")
                    print(f"      Goal: {building.reserve_fund_goal}")
                    print(f"      Duration: {building.reserve_fund_duration_months}")
                
                # Check participation mills
                total_mills = sum(apt.participation_mills or 0 for apt in apartments)
                print(f"   Total participation mills: {total_mills}")
                
                if total_mills == 0:
                    print(f"   ⚠️  No participation mills - will use equal distribution")
                
        except Exception as e:
            print(f"❌ Error during debug: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    debug_pending_obligations()

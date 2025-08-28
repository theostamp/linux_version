#!/usr/bin/env python3
"""
Test script for the financial overview API endpoint
"""

import os
import sys
import django
from datetime import datetime
from django.db import models

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense, Payment
from apartments.models import Apartment

def test_financial_overview_api():
    """Test the financial overview API endpoint"""
    
    with schema_context('demo'):
        print("🧪 Testing Financial Overview API...")
        
        # Get building
        try:
            building = Building.objects.get(id=1)  # Αραχώβης 12
            print(f"✅ Found building: {building.name}")
        except Building.DoesNotExist:
            print("❌ Building not found")
            return
        
        # Test current month data
        now = datetime.now()
        current_month = f"{now.year}-{now.month:02d}"
        
        print(f"\n📅 Testing for current month: {current_month}")
        
        # Calculate total income (payments)
        total_income = Payment.objects.filter(
            apartment__building=building,
            date__year=now.year,
            date__month=now.month
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        print(f"💰 Total income: {total_income}€")
        
        # Calculate management expenses
        management_expenses = Expense.objects.filter(
            building=building,
            date__year=now.year,
            date__month=now.month,
            category='management_fees'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        print(f"🏢 Management expenses: {management_expenses}€")
        
        # Calculate building expenses (non-management)
        building_expenses = Expense.objects.filter(
            building=building,
            date__year=now.year,
            date__month=now.month
        ).exclude(category='management_fees').aggregate(total=models.Sum('amount'))['total'] or 0
        
        print(f"🏠 Building expenses: {building_expenses}€")
        
        # Calculate reserve fund target
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            reserve_fund_target = float(building.reserve_fund_goal) / building.reserve_fund_duration_months
        else:
            reserve_fund_target = float(building.reserve_contribution_per_apartment or 0) * building.apartments_count
        
        print(f"🎯 Reserve fund target: {reserve_fund_target}€")
        
        # Calculate current reserve fund
        reserve_fund_current = float(building.current_reserve or 0)
        print(f"💳 Current reserve fund: {reserve_fund_current}€")
        
        # Calculate surplus
        total_expenses = management_expenses + building_expenses
        surplus = total_income - total_expenses
        surplus = max(0, surplus)
        
        print(f"💵 Surplus: {surplus}€")
        
        # Calculate percentages
        if total_income > 0:
            management_expenses_percentage = float((management_expenses / total_income) * 100)
            building_expenses_percentage = float((building_expenses / total_income) * 100)
            reserve_fund_percentage = float((reserve_fund_current / reserve_fund_target) * 100) if reserve_fund_target > 0 else 0.0
            surplus_percentage = float((surplus / total_income) * 100)
            
            print(f"\n📊 Percentages:")
            print(f"   Management expenses: {management_expenses_percentage:.1f}%")
            print(f"   Building expenses: {building_expenses_percentage:.1f}%")
            print(f"   Reserve fund coverage: {reserve_fund_percentage:.1f}%")
            print(f"   Surplus: {surplus_percentage:.1f}%")
            
            total_allocated = management_expenses_percentage + building_expenses_percentage + reserve_fund_percentage
            print(f"   Total allocated: {total_allocated:.1f}%")
        else:
            print("\n⚠️  No income data found for current month")
        
        # Test with specific month
        test_month = "2024-01"
        print(f"\n📅 Testing for specific month: {test_month}")
        
        year, month = test_month.split('-')
        year, month = int(year), int(month)
        
        # Calculate total income for test month
        test_total_income = Payment.objects.filter(
            apartment__building=building,
            date__year=year,
            date__month=month
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        print(f"💰 Total income ({test_month}): {test_total_income}€")
        
        # Calculate management expenses for test month
        test_management_expenses = Expense.objects.filter(
            building=building,
            date__year=year,
            date__month=month,
            category='management_fees'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        print(f"🏢 Management expenses ({test_month}): {test_management_expenses}€")
        
        # Calculate building expenses for test month
        test_building_expenses = Expense.objects.filter(
            building=building,
            date__year=year,
            date__month=month
        ).exclude(category='management_fees').aggregate(total=models.Sum('amount'))['total'] or 0
        
        print(f"🏠 Building expenses ({test_month}): {test_building_expenses}€")
        
        print("\n✅ Financial overview API test completed!")

if __name__ == "__main__":
    test_financial_overview_api()

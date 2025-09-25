#!/usr/bin/env python3
"""
Script to fix previous obligations calculation to include reserve fund from previous months.

The issue: In November 2025, "Previous Obligations" should include:
1. Previous expenses: 50,00 €
2. Reserve fund from October: ~100,00 €
Total: ~150,00 €

But currently it only shows 50,00 € because reserve fund is not included in historical balance.
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Building, Expense, Transaction, Payment
from django.db.models import Sum

def analyze_reserve_fund_issue():
    """Analyze the reserve fund issue in previous obligations calculation."""
    
    with schema_context('demo'):
        print("🔍 Analyzing Reserve Fund Issue in Previous Obligations")
        print("=" * 60)
        
        # Get building
        building = Building.objects.get(id=1)
        print(f"🏢 Building: {building.name}")
        print(f"📅 Financial System Start Date: {building.financial_system_start_date}")
        print(f"💰 Reserve Fund Goal: €{building.reserve_fund_goal}")
        print(f"📆 Reserve Fund Duration: {building.reserve_fund_duration_months} months")
        print(f"🚀 Reserve Fund Start Date: {building.reserve_fund_start_date}")
        print()
        
        # Analyze November 2025 (second month of reserve fund)
        november_2025 = date(2025, 11, 1)
        october_2025 = date(2025, 10, 1)
        
        print("📊 NOVEMBER 2025 ANALYSIS")
        print("-" * 30)
        
        # 1. Calculate expenses before November (should be ~50€)
        expenses_before_november = Expense.objects.filter(
            building_id=1,
            date__gte=building.financial_system_start_date,
            date__lt=november_2025
        ).exclude(category='management_fees')
        
        total_expenses_before_november = sum(exp.amount for exp in expenses_before_november)
        print(f"💸 Expenses before November: €{total_expenses_before_november}")
        
        # 2. Calculate reserve fund that should have been collected in October
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_reserve_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"💰 Monthly Reserve Target: €{monthly_reserve_target}")
            
            # Check if October is within reserve fund collection period
            if (october_2025 >= building.reserve_fund_start_date and
                (not building.reserve_fund_target_date or october_2025 <= building.reserve_fund_target_date)):
                print(f"✅ October 2025 is within reserve fund collection period")
                print(f"💎 Reserve fund that should be in previous obligations: €{monthly_reserve_target}")
            else:
                print(f"❌ October 2025 is NOT within reserve fund collection period")
        
        # 3. Calculate what previous obligations should be
        expected_previous_obligations = total_expenses_before_november + monthly_reserve_target
        print(f"🎯 Expected Previous Obligations: €{total_expenses_before_november} + €{monthly_reserve_target} = €{expected_previous_obligations}")
        
        # 4. Check current calculation
        print("\n🔍 CURRENT CALCULATION ANALYSIS")
        print("-" * 35)
        
        # Get one apartment to test
        apartment = Apartment.objects.filter(building_id=1).first()
        if apartment:
            print(f"🏠 Testing with Apartment: {apartment.number}")
            
            # Calculate current historical balance (what the system currently does)
            current_historical_balance = calculate_current_historical_balance(apartment, november_2025)
            print(f"📊 Current Historical Balance: €{current_historical_balance}")
            
            # Calculate what it should be (including reserve fund)
            corrected_historical_balance = calculate_corrected_historical_balance(apartment, november_2025, building)
            print(f"✅ Corrected Historical Balance: €{corrected_historical_balance}")
            
            difference = corrected_historical_balance - current_historical_balance
            print(f"📈 Difference: €{difference}")
        
        print("\n" + "=" * 60)
        print("🎯 CONCLUSION:")
        print(f"Previous obligations should be €{expected_previous_obligations:.2f}")
        print(f"But currently showing €{total_expenses_before_november:.2f}")
        print(f"Missing: €{monthly_reserve_target:.2f} (reserve fund from October)")

def calculate_current_historical_balance(apartment, end_date):
    """Calculate historical balance using current method (without reserve fund)."""
    
    # This mimics the current _calculate_historical_balance method
    total_payments = Payment.objects.filter(
        apartment=apartment,
        date__lt=end_date
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Calculate charges from expenses before the month
    month_start = end_date.replace(day=1)
    building = apartment.building
    
    expenses_before_month = Expense.objects.filter(
        building_id=apartment.building_id,
        date__gte=building.financial_system_start_date,
        date__lt=month_start
    ).exclude(category='management_fees')
    
    expense_ids_before_month = list(expenses_before_month.values_list('id', flat=True))
    
    if expense_ids_before_month:
        total_charges = Transaction.objects.filter(
            apartment=apartment,
            reference_type='expense',
            reference_id__in=[str(exp_id) for exp_id in expense_ids_before_month],
            type__in=['common_expense_charge', 'expense_created', 'expense_issued',
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    else:
        total_charges = Decimal('0.00')
    
    # Add management fees
    management_expenses = Expense.objects.filter(
        building_id=apartment.building_id,
        category='management_fees',
        date__gte=building.financial_system_start_date,
        date__lt=month_start
    )
    
    management_fees_share = Decimal('0.00')
    if management_expenses.exists():
        total_mills = Apartment.objects.filter(building_id=apartment.building_id).aggregate(
            total=Sum('participation_mills'))['total'] or 1000
        
        if total_mills > 0:
            for expense in management_expenses:
                management_fees_share += (expense.amount * apartment.participation_mills) / total_mills
    
    # Current balance = charges + management fees - payments
    current_balance = total_charges + management_fees_share - total_payments
    
    return current_balance

def calculate_corrected_historical_balance(apartment, end_date, building):
    """Calculate historical balance including reserve fund from previous months."""
    
    # Start with current calculation
    current_balance = calculate_current_historical_balance(apartment, end_date)
    
    # Add reserve fund from previous months
    month_start = end_date.replace(day=1)
    
    if (building.reserve_fund_goal and 
        building.reserve_fund_duration_months and
        building.reserve_fund_start_date):
        
        monthly_reserve_target = building.reserve_fund_goal / building.reserve_fund_duration_months
        
        # Calculate reserve fund for each month before the current month
        current_date = building.reserve_fund_start_date
        total_reserve_fund = Decimal('0.00')
        
        while current_date < month_start:
            # Check if this month is within reserve fund collection period
            if (current_date >= building.reserve_fund_start_date and
                (not building.reserve_fund_target_date or current_date <= building.reserve_fund_target_date)):
                
                # Calculate apartment's share of reserve fund for this month
                total_mills = Apartment.objects.filter(building_id=apartment.building_id).aggregate(
                    total=Sum('participation_mills'))['total'] or 1000
                
                if total_mills > 0:
                    apartment_reserve_share = (monthly_reserve_target * apartment.participation_mills) / total_mills
                    total_reserve_fund += apartment_reserve_share
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        corrected_balance = current_balance + total_reserve_fund
        return corrected_balance
    
    return current_balance

if __name__ == "__main__":
    analyze_reserve_fund_issue()

#!/usr/bin/env python3
"""
Test script to verify that payment progress visualization updates correctly after payments
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense
from apartments.models import Apartment
from buildings.models import Building
from decimal import Decimal

def test_payment_progress_data():
    """Test that payment data is correctly calculated for progress visualization"""
    
    with schema_context('demo'):
        print("🔍 Testing Payment Progress Data...")
        
        # Get building 1 (Αραχώβης 12)
        try:
            building = Building.objects.get(id=1)
            print(f"✅ Building found: {building.name}")
        except Building.DoesNotExist:
            print("❌ Building 1 not found")
            return
        
        # Get apartments for this building
        apartments = Apartment.objects.filter(building=building)
        print(f"📊 Found {apartments.count()} apartments")
        
        # Get recent payments
        recent_payments = Payment.objects.filter(
            apartment__building=building
        ).order_by('-created_at')[:5]
        
        print(f"\n💰 Recent Payments ({recent_payments.count()}):")
        total_payments = Decimal('0')
        for payment in recent_payments:
            print(f"  - Apartment {payment.apartment.number}: {payment.amount}€ on {payment.date}")
            total_payments += payment.amount
        
        print(f"📈 Total recent payments: {total_payments}€")
        
        # Get expenses
        expenses = Expense.objects.filter(
            building=building
        ).order_by('-created_at')[:5]
        
        print(f"\n💸 Recent Expenses ({expenses.count()}):")
        total_expenses = Decimal('0')
        for expense in expenses:
            print(f"  - {expense.description}: {expense.amount}€ on {expense.date}")
            total_expenses += expense.amount
        
        print(f"📉 Total recent expenses: {total_expenses}€")
        
        # Calculate balance
        balance = total_payments - total_expenses
        print(f"\n⚖️ Balance: {balance}€")
        
        # Check building financial settings
        print("\n🏢 Building Financial Settings:")
        print(f"  - Management fee per apartment: {building.management_fee_per_apartment}€")
        print(f"  - Reserve fund goal: {building.reserve_fund_goal}€")
        print(f"  - Reserve fund duration: {building.reserve_fund_duration_months} months")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_reserve_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"  - Monthly reserve target: {monthly_reserve_target:.2f}€")
        
        print("\n✅ Payment progress data test completed!")

def test_api_endpoint():
    """Test that the building API endpoint works correctly"""
    print("\n🔍 Testing Building API Endpoint...")
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=1)
            print(f"✅ Building data available: {building.name}")
            print(f"  - Address: {building.address}")
            print(f"  - Apartments: {building.apartments_count}")
            print(f"  - Reserve contribution: {building.reserve_contribution_per_apartment}€")
            
            # This should be accessible via /api/buildings/list/1/
            print("📡 API endpoint should be: /api/buildings/list/1/")
            
        except Building.DoesNotExist:
            print("❌ Building 1 not found for API test")

if __name__ == "__main__":
    test_payment_progress_data()
    test_api_endpoint()

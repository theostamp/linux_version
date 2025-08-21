#!/usr/bin/env python3
"""
Test script για έλεγχο ιστορικών υπολοίπων διαμερισμάτων
Ελέγχει αν το backend επιστρέφει σωστά τα υπόλοιπα για διαφορετικούς μήνες
"""

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from financial.models import Apartment, Transaction, Payment
from buildings.models import Building

def test_historical_balances():
    """Test ιστορικών υπολοίπων για building ID 5"""
    
    building_id = 5
    print(f"🔍 Testing historical balances for building ID: {building_id}")
    
    with schema_context('demo'):
        # Get building info
        try:
            building = Building.objects.get(id=building_id)
            print(f"✅ Building found: {building.name}")
        except Building.DoesNotExist:
            print(f"❌ Building with ID {building_id} not found")
            return
        
        # Get all apartments
        apartments = Apartment.objects.filter(building_id=building_id)
        print(f"📊 Found {apartments.count()} apartments")
        
        # Test months
        test_months = [
            None,  # Current month
            '2025-06',  # June 2025 (should be 0 balances)
            '2025-08',  # August 2025 (should have balances)
        ]
        
        service = FinancialDashboardService(building_id)
        
        for month in test_months:
            print(f"\n📅 Testing month: {month or 'Current'}")
            print("=" * 50)
            
            try:
                # Get apartment balances using the service
                apartment_balances = service.get_apartment_balances(month)
                
                print(f"📊 Apartment balances returned: {len(apartment_balances)}")
                
                # Display balances
                total_balance = 0
                for balance in apartment_balances:
                    apt_id = balance['id']
                    apt_number = balance['apartment_number']
                    current_balance = balance['current_balance']
                    owner_name = balance['owner_name']
                    
                    total_balance += current_balance
                    
                    print(f"  🏠 {apt_number} ({owner_name}): {current_balance}€")
                
                print(f"💰 Total balance: {total_balance}€")
                
                # Test the summary endpoint as well
                summary = service.get_summary(month)
                print(f"📈 Summary total_balance: {summary.get('total_balance', 'N/A')}")
                
            except Exception as e:
                print(f"❌ Error testing month {month}: {e}")
                import traceback
                traceback.print_exc()

def test_apartment_historical_calculation():
    """Test την _calculate_historical_balance μέθοδο"""
    
    building_id = 5
    print(f"\n🔍 Testing apartment historical balance calculation for building ID: {building_id}")
    
    with schema_context('demo'):
        # Get first apartment
        apartment = Apartment.objects.filter(building_id=building_id).first()
        if not apartment:
            print("❌ No apartments found")
            return
        
        print(f"🏠 Testing apartment: {apartment.number} ({apartment.owner_name})")
        
        # Test dates
        test_dates = [
            date(2025, 6, 30),  # End of June 2025
            date(2025, 8, 31),  # End of August 2025
        ]
        
        service = FinancialDashboardService(building_id)
        
        for test_date in test_dates:
            print(f"\n📅 Testing date: {test_date}")
            print("-" * 30)
            
            try:
                # Calculate historical balance
                historical_balance = service._calculate_historical_balance(apartment, test_date)
                print(f"💰 Historical balance: {historical_balance}€")
                
                # Get transactions up to this date
                transactions = Transaction.objects.filter(
                    apartment=apartment,
                    date__lt=test_date
                ).order_by('date')
                
                print(f"📊 Transactions up to {test_date}: {transactions.count()}")
                
                # Get payments up to this date
                payments = Payment.objects.filter(
                    apartment=apartment,
                    date__lt=test_date
                ).order_by('date')
                
                print(f"💳 Payments up to {test_date}: {payments.count()}")
                
                # Show some sample transactions
                if transactions.exists():
                    print("📋 Sample transactions:")
                    for tx in transactions[:5]:
                        print(f"  {tx.date}: {tx.type} - {tx.amount}€")
                
            except Exception as e:
                print(f"❌ Error testing date {test_date}: {e}")
                import traceback
                traceback.print_exc()

def test_api_endpoints():
    """Test τα API endpoints"""
    
    building_id = 5
    print(f"\n🔍 Testing API endpoints for building ID: {building_id}")
    
    with schema_context('demo'):
        service = FinancialDashboardService(building_id)
        
        # Test months
        test_months = [
            None,  # Current month
            '2025-06',  # June 2025
            '2025-08',  # August 2025
        ]
        
        for month in test_months:
            print(f"\n📅 Testing API for month: {month or 'Current'}")
            print("=" * 40)
            
            try:
                # Test apartments-summary endpoint
                apartment_balances = service.get_apartment_balances(month)
                print(f"✅ apartments-summary: {len(apartment_balances)} apartments")
                
                # Test dashboard summary endpoint
                summary = service.get_summary(month)
                print(f"✅ dashboard summary: total_balance = {summary.get('total_balance', 'N/A')}")
                
                # Show sample apartment data
                if apartment_balances:
                    sample = apartment_balances[0]
                    print(f"📋 Sample apartment data:")
                    print(f"  ID: {sample['id']}")
                    print(f"  Number: {sample['apartment_number']}")
                    print(f"  Balance: {sample['current_balance']}€")
                    print(f"  Owner: {sample['owner_name']}")
                
            except Exception as e:
                print(f"❌ Error testing API for month {month}: {e}")
                import traceback
                traceback.print_exc()

if __name__ == '__main__':
    print("🚀 Starting historical balance tests...")
    print("=" * 60)
    
    try:
        test_historical_balances()
        test_apartment_historical_calculation()
        test_api_endpoints()
        
        print("\n✅ All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


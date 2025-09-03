#!/usr/bin/env python3
"""
Test script για έλεγχο ιστορικού αποθεματικού κεφαλαίου ανά μήνα
Ελέγχει αν το backend υπολογίζει σωστά το current_reserve για διαφορετικούς μήνες
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
from financial.models import Payment, Expense
from buildings.models import Building

def test_historical_reserve_fund():
    """Test ιστορικού αποθεματικού για building ID 5"""
    
    building_id = 4
    print(f"🔍 Testing historical reserve fund for building ID: {building_id}")
    print("=" * 70)
    
    with schema_context('demo'):
        # Get building info
        try:
            building = Building.objects.get(id=building_id)
            print(f"✅ Building found: {building.name}")
            print(f"🏦 Current reserve in DB: {building.current_reserve}€")
        except Building.DoesNotExist:
            print(f"❌ Building with ID {building_id} not found")
            return
        
        # Test months
        test_months = [
            None,  # Current month  
            '2025-06',  # June 2025 (should be different reserve)
            '2025-08',  # August 2025 (should be different reserve)
        ]
        
        service = FinancialDashboardService(building_id)
        
        print("\n📊 Reserve Fund Analysis:")
        print("-" * 50)
        
        for month in test_months:
            print(f"\n📅 Month: {month or 'Current'}")
            print("=" * 30)
            
            try:
                # Get dashboard summary for this month
                summary = service.get_summary(month)
                
                current_reserve = summary.get('current_reserve', 0)
                total_balance = summary.get('total_balance', 0)
                reserve_fund_contribution = summary.get('reserve_fund_contribution', 0)
                
                print(f"💰 Current Reserve: {current_reserve}€")
                print(f"💳 Total Balance: {total_balance}€") 
                print(f"📈 Reserve Fund Contribution: {reserve_fund_contribution}€")
                
                # Show calculation details
                if month:
                    # For specific month, calculate breakdown
                    year, mon = map(int, month.split('-'))
                    end_date = date(year, mon + 1, 1) if mon < 12 else date(year + 1, 1, 1)
                    
                    # Payments up to end of month
                    total_payments = Payment.objects.filter(
                        apartment__building_id=building_id,
                        date__lt=end_date
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    # Expenses up to end of month  
                    total_expenses = Expense.objects.filter(
                        building_id=building_id,
                        date__lt=end_date
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    # Calculate expected reserve
                    expected_reserve = total_payments - total_expenses
                    
                    print("🔢 Calculation breakdown:")
                    print(f"   📥 Total Payments (up to {end_date}): {total_payments}€")
                    print(f"   📤 Total Expenses (up to {end_date}): {total_expenses}€")
                    print(f"   🧮 Expected Reserve: {expected_reserve}€")
                    
                    if abs(float(expected_reserve) - current_reserve) > 0.01:
                        print(f"   ⚠️  DIFFERENCE: {abs(float(expected_reserve) - current_reserve)}€")
                    else:
                        print("   ✅ CALCULATION MATCHES!")
                        
            except Exception as e:
                print(f"❌ Error testing month {month}: {e}")
                import traceback
                traceback.print_exc()

def test_month_comparison():
    """Compare reserve fund across months"""
    
    building_id = 4
    print("\n🔍 Month-to-Month Reserve Fund Comparison")
    print("=" * 50)
    
    with schema_context('demo'):
        service = FinancialDashboardService(building_id)
        
        months = ['2025-05', '2025-06', '2025-07', '2025-08', None]
        reserves = {}
        
        for month in months:
            try:
                summary = service.get_summary(month)
                reserves[month or 'current'] = summary.get('current_reserve', 0)
            except Exception as e:
                print(f"❌ Error for month {month}: {e}")
                reserves[month or 'current'] = 'ERROR'
        
        print("\n📊 Reserve Fund by Month:")
        print("-" * 30)
        
        for month, reserve in reserves.items():
            month_name = month if month == 'current' else f"{month} ({datetime.strptime(month, '%Y-%m').strftime('%B %Y')})" if month != 'current' else month
            if reserve == 'ERROR':
                print(f"❌ {month_name}: ERROR")
            else:
                print(f"💰 {month_name}: {reserve}€")
        
        # Check if all values are the same (indicating a problem)
        valid_reserves = [v for v in reserves.values() if v != 'ERROR']
        if len(set(valid_reserves)) == 1:
            print(f"\n⚠️  WARNING: All reserves are the same ({valid_reserves[0]}€)")
            print("   This indicates the month filtering might not be working correctly!")
        else:
            print("\n✅ Reserve fund values differ across months (this is expected)")

def analyze_transactions_by_month():
    """Analyze actual transactions by month to understand the data"""
    
    building_id = 4
    print("\n📋 Transaction Analysis by Month")
    print("=" * 40)
    
    with schema_context('demo'):
        
        # Get all payments
        payments = Payment.objects.filter(
            apartment__building_id=building_id
        ).order_by('date')
        
        # Get all expenses  
        expenses = Expense.objects.filter(
            building_id=building_id
        ).order_by('date')
        
        print(f"\n💳 Payments ({payments.count()} total):")
        for payment in payments[:10]:  # Show first 10
            print(f"   {payment.date}: {payment.amount}€ (Apt {payment.apartment.number})")
        if payments.count() > 10:
            print(f"   ... and {payments.count() - 10} more")
            
        print(f"\n📤 Expenses ({expenses.count()} total):")
        for expense in expenses[:10]:  # Show first 10  
            print(f"   {expense.date}: {expense.amount}€ ({expense.category})")
        if expenses.count() > 10:
            print(f"   ... and {expenses.count() - 10} more")
            
        # Calculate running total by month
        print("\n📊 Running Reserve by Month:")
        
        months_data = {}
        running_total = Decimal('0.00')
        
        # Combine all transactions
        all_transactions = []
        
        for payment in payments:
            all_transactions.append({
                'date': payment.date,
                'amount': payment.amount,
                'type': 'payment'
            })
            
        for expense in expenses:
            all_transactions.append({
                'date': expense.date, 
                'amount': -expense.amount,  # Negative for expenses
                'type': 'expense'
            })
        
        # Sort by date
        all_transactions.sort(key=lambda x: x['date'])
        
        current_month = None
        for transaction in all_transactions:
            month_key = transaction['date'].strftime('%Y-%m')
            
            if month_key != current_month:
                if current_month:
                    months_data[current_month] = running_total
                current_month = month_key
                
            running_total += transaction['amount']
            
        # Add the last month
        if current_month:
            months_data[current_month] = running_total
            
        for month, total in months_data.items():
            month_name = datetime.strptime(month, '%Y-%m').strftime('%B %Y')
            print(f"   💰 {month_name}: {total}€")

if __name__ == '__main__':
    print("🚀 Starting Reserve Fund Isolation Tests...")
    print("=" * 70)
    
    try:
        test_historical_reserve_fund()
        test_month_comparison()
        analyze_transactions_by_month()
        
        print("\n✅ All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

#!/usr/bin/env python3
"""
Simple Financial Data Check for Alkmanos 22 Building
Basic analysis to test database connection and identify issues
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
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment
from django.db.models import Sum

def main():
    """Main analysis function"""
    building_id = 4  # Alkmanos 22
    
    print("🔍 Starting simple financial analysis for Alkmanos 22 building")
    print("=" * 60)
    
    try:
        with schema_context('demo'):
            # Check if building exists
            try:
                building = Building.objects.get(id=building_id)
                print(f"✅ Building found: {building.name}")
                print(f"📍 Address: {building.address}")
                print(f"💰 Reserve Fund Goal: €{building.reserve_fund_goal or 0:,.2f}")
                print(f"⏱️ Reserve Fund Duration: {building.reserve_fund_duration_months or 0} months")
            except Building.DoesNotExist:
                print(f"❌ Building with ID {building_id} not found")
                return
            
            # Check apartments
            apartments = Apartment.objects.filter(building_id=building_id)
            print(f"\n🏠 Apartments: {apartments.count()}")
            
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            print(f"📊 Total Participation Mills: {total_mills}")
            
            if total_mills != 1000:
                print(f"⚠️ WARNING: Total mills ({total_mills}) should be 1000")
            
            # Check expenses
            expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"\n💸 Unissued Expenses: {expenses.count()}")
            print(f"💰 Total Amount: €{total_expenses:,.2f}")
            
            # Check transactions
            transactions = Transaction.objects.filter(building_id=building_id)
            total_transactions = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"\n💳 Transactions: {transactions.count()}")
            print(f"💰 Total Amount: €{total_transactions:,.2f}")
            
            # Check payments
            payments = Payment.objects.filter(apartment__building_id=building_id)
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"\n💵 Payments: {payments.count()}")
            print(f"💰 Total Amount: €{total_payments:,.2f}")
            
            # Check reserve fund payments
            reserve_payments = Payment.objects.filter(
                apartment__building_id=building_id,
                payment_type='reserve_fund'
            )
            total_reserve = reserve_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"\n🏦 Reserve Fund Payments: {reserve_payments.count()}")
            print(f"💰 Total Collected: €{total_reserve:,.2f}")
            
            # Calculate reserve fund progress
            if building.reserve_fund_goal:
                progress = (float(total_reserve) / float(building.reserve_fund_goal)) * 100
                print(f"📊 Reserve Fund Progress: {progress:.1f}%")
            
            print("\n✅ Analysis completed successfully!")
            
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

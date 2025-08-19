#!/usr/bin/env python3
"""
Detailed Financial Analysis for Alkmanos 22 Building
Comprehensive analysis of expenses, apartments, and calculations
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
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
from django.db.models import Sum, Count
from collections import defaultdict

def analyze_expenses_detailed(building_id):
    """Detailed analysis of expenses by category and distribution type"""
    print("\n💸 DETAILED EXPENSES ANALYSIS")
    print("=" * 60)
    
    with schema_context('demo'):
        expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
        
        if not expenses.exists():
            print("❌ No unissued expenses found")
            return
        
        # Group by category
        categories = defaultdict(lambda: {'count': 0, 'amount': Decimal('0.00')})
        distribution_types = defaultdict(lambda: {'count': 0, 'amount': Decimal('0.00')})
        
        print(f"📋 Found {expenses.count()} unissued expenses:")
        print("-" * 60)
        
        for expense in expenses:
            category = expense.get_category_display()
            dist_type = expense.get_distribution_type_display()
            
            categories[category]['count'] += 1
            categories[category]['amount'] += expense.amount
            
            distribution_types[dist_type]['count'] += 1
            distribution_types[dist_type]['amount'] += expense.amount
            
            print(f"  • {expense.title}: €{expense.amount:,.2f}")
            print(f"    Category: {category}")
            print(f"    Distribution: {dist_type}")
            print(f"    Date: {expense.date}")
            if expense.supplier:
                print(f"    Supplier: {expense.supplier.name}")
            print()
        
        print("📊 EXPENSE CATEGORIES BREAKDOWN:")
        print("-" * 40)
        total_amount = sum(cat['amount'] for cat in categories.values())
        
        for category, data in categories.items():
            percentage = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
            print(f"  {category}: {data['count']} expenses, €{data['amount']:,.2f} ({percentage:.1f}%)")
        
        print("\n📈 DISTRIBUTION TYPES BREAKDOWN:")
        print("-" * 40)
        for dist_type, data in distribution_types.items():
            percentage = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
            print(f"  {dist_type}: {data['count']} expenses, €{data['amount']:,.2f} ({percentage:.1f}%)")

def analyze_apartments_detailed(building_id):
    """Detailed analysis of apartments and their data"""
    print("\n🏠 DETAILED APARTMENTS ANALYSIS")
    print("=" * 60)
    
    with schema_context('demo'):
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        print(f"📋 Found {apartments.count()} apartments:")
        print("-" * 60)
        
        total_mills = 0
        apartments_with_balance = 0
        total_balance = Decimal('0.00')
        
        for apt in apartments:
            total_mills += apt.participation_mills or 0
            if apt.current_balance:
                apartments_with_balance += 1
                total_balance += apt.current_balance
            
            print(f"  Apartment {apt.number}:")
            print(f"    Owner: {apt.owner_name or 'Not specified'}")
            print(f"    Tenant: {apt.tenant_name or 'Not specified'}")
            print(f"    Participation Mills: {apt.participation_mills or 0}")
            print(f"    Heating Mills: {apt.heating_mills or 0}")
            print(f"    Elevator Mills: {apt.elevator_mills or 0}")
            print(f"    Square Meters: {apt.square_meters or 0}")
            print(f"    Current Balance: €{apt.current_balance or 0:,.2f}")
            print()
        
        print("📊 APARTMENTS SUMMARY:")
        print("-" * 40)
        print(f"  Total Participation Mills: {total_mills}")
        print(f"  Apartments with Balance: {apartments_with_balance}")
        print(f"  Total Balance: €{total_balance:,.2f}")
        print(f"  Average Balance: €{total_balance/len(apartments):,.2f}")
        
        if total_mills != 1000:
            print(f"  ⚠️ WARNING: Total mills should be 1000, found {total_mills}")

def analyze_transactions_detailed(building_id):
    """Detailed analysis of transactions"""
    print("\n💳 DETAILED TRANSACTIONS ANALYSIS")
    print("=" * 60)
    
    with schema_context('demo'):
        transactions = Transaction.objects.filter(building_id=building_id).order_by('-date')
        
        if not transactions.exists():
            print("❌ No transactions found")
            return
        
        print(f"📋 Found {transactions.count()} transactions:")
        print("-" * 60)
        
        transaction_types = defaultdict(lambda: {'count': 0, 'amount': Decimal('0.00')})
        total_amount = Decimal('0.00')
        
        for transaction in transactions:
            trans_type = transaction.get_type_display()
            transaction_types[trans_type]['count'] += 1
            transaction_types[trans_type]['amount'] += transaction.amount
            total_amount += transaction.amount
            
            print(f"  • {transaction.get_type_display()}: €{transaction.amount:,.2f}")
            print(f"    Date: {transaction.date}")
            print(f"    Description: {transaction.description}")
            if transaction.apartment:
                print(f"    Apartment: {transaction.apartment.number}")
            print(f"    Balance Before: €{transaction.balance_before or 0:,.2f}")
            print(f"    Balance After: €{transaction.balance_after:,.2f}")
            print()
        
        print("📊 TRANSACTION TYPES BREAKDOWN:")
        print("-" * 40)
        for trans_type, data in transaction_types.items():
            percentage = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
            print(f"  {trans_type}: {data['count']} transactions, €{data['amount']:,.2f} ({percentage:.1f}%)")

def analyze_payments_detailed(building_id):
    """Detailed analysis of payments"""
    print("\n💵 DETAILED PAYMENTS ANALYSIS")
    print("=" * 60)
    
    with schema_context('demo'):
        payments = Payment.objects.filter(apartment__building_id=building_id).order_by('-date')
        
        if not payments.exists():
            print("❌ No payments found")
            return
        
        print(f"📋 Found {payments.count()} payments:")
        print("-" * 60)
        
        payment_types = defaultdict(lambda: {'count': 0, 'amount': Decimal('0.00')})
        payment_methods = defaultdict(lambda: {'count': 0, 'amount': Decimal('0.00')})
        total_amount = Decimal('0.00')
        
        for payment in payments:
            pay_type = payment.get_payment_type_display()
            pay_method = payment.get_method_display()
            
            payment_types[pay_type]['count'] += 1
            payment_types[pay_type]['amount'] += payment.amount
            
            payment_methods[pay_method]['count'] += 1
            payment_methods[pay_method]['amount'] += payment.amount
            
            total_amount += payment.amount
            
            print(f"  • {payment.get_payment_type_display()}: €{payment.amount:,.2f}")
            print(f"    Date: {payment.date}")
            print(f"    Method: {payment.get_method_display()}")
            print(f"    Apartment: {payment.apartment.number}")
            print(f"    Payer: {payment.payer_name or 'Not specified'}")
            if payment.reference_number:
                print(f"    Reference: {payment.reference_number}")
            print()
        
        print("📊 PAYMENT TYPES BREAKDOWN:")
        print("-" * 40)
        for pay_type, data in payment_types.items():
            percentage = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
            print(f"  {pay_type}: {data['count']} payments, €{data['amount']:,.2f} ({percentage:.1f}%)")
        
        print("\n💳 PAYMENT METHODS BREAKDOWN:")
        print("-" * 40)
        for pay_method, data in payment_methods.items():
            percentage = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
            print(f"  {pay_method}: {data['count']} payments, €{data['amount']:,.2f} ({percentage:.1f}%)")

def test_calculations(building_id):
    """Test calculation accuracy"""
    print("\n🧮 CALCULATION ACCURACY TEST")
    print("=" * 60)
    
    try:
        with schema_context('demo'):
            # Test basic calculation
            print("Testing basic calculation...")
            basic_calculator = CommonExpenseCalculator(building_id)
            basic_shares = basic_calculator.calculate_shares()
            
            total_basic = sum(share['total_amount'] for share in basic_shares.values())
            print(f"✅ Basic calculation total: €{total_basic:,.2f}")
            
            # Test advanced calculation
            print("Testing advanced calculation...")
            building = Building.objects.get(id=building_id)
            monthly_reserve = float(building.reserve_contribution_per_apartment or 0) * 10  # 10 apartments
            
            advanced_calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                reserve_fund_monthly_total=monthly_reserve
            )
            advanced_shares = advanced_calculator.calculate_advanced_shares()
            
            total_advanced = sum(share['total_amount'] for share in advanced_shares['shares'].values())
            print(f"✅ Advanced calculation total: €{total_advanced:,.2f}")
            
            # Compare results
            difference = abs(total_basic - total_advanced)
            print(f"📊 Calculation difference: €{difference:,.2f}")
            
            if difference > Decimal('0.01'):
                print("⚠️ WARNING: Calculation discrepancy detected!")
            else:
                print("✅ Calculations are consistent")
            
            # Show apartment breakdown
            print("\n📋 APARTMENT BREAKDOWN (Basic Calculation):")
            print("-" * 50)
            for apt_id, share in basic_shares.items():
                print(f"  Apartment {share['apartment_number']}: €{share['total_amount']:,.2f}")
                print(f"    Previous Balance: €{share['previous_balance']:,.2f}")
                print(f"    Total Due: €{share['total_due']:,.2f}")
                print()
            
    except Exception as e:
        print(f"❌ Calculation test failed: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    """Main analysis function"""
    building_id = 4  # Alkmanos 22
    
    print("🔍 DETAILED FINANCIAL ANALYSIS - ALKMANOS 22")
    print("=" * 80)
    
    try:
        with schema_context('demo'):
            building = Building.objects.get(id=building_id)
            print(f"🏢 Building: {building.name}")
            print(f"📍 Address: {building.address}")
            print(f"💰 Reserve Fund Goal: €{building.reserve_fund_goal or 0:,.2f}")
            print(f"⏱️ Reserve Fund Duration: {building.reserve_fund_duration_months or 0} months")
            print(f"💵 Reserve Contribution per Apartment: €{building.reserve_contribution_per_apartment or 0:,.2f}")
            print(f"🏛️ Management Fee per Apartment: €{building.management_fee_per_apartment or 0:,.2f}")
        
        # Run detailed analyses
        analyze_expenses_detailed(building_id)
        analyze_apartments_detailed(building_id)
        analyze_transactions_detailed(building_id)
        analyze_payments_detailed(building_id)
        test_calculations(building_id)
        
        print("\n" + "=" * 80)
        print("✅ DETAILED ANALYSIS COMPLETED")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from apartments.models import Apartment
from buildings.models import Building
from decimal import Decimal
from datetime import date
from django.db.models import Sum

def debug_previous_obligations_issue():
    """Debug why August 2025 expenses appear in July 2025 previous obligations"""
    
    with schema_context('demo'):
        print("🔍 DEBUGGING PREVIOUS OBLIGATIONS ISSUE")
        print("=" * 60)
        
        # Get Araxovis building
        building = Building.objects.get(id=1)
        print(f"🏢 Building: {building.name}")
        
        # Test apartment (first one)
        apartment = Apartment.objects.filter(building_id=1).first()
        print(f"🏠 Testing apartment: {apartment.number}")
        
        # Define July 2025 end date
        july_end_date = date(2025, 8, 1)  # August 1st (exclusive end)
        print(f"📅 July 2025 end date: {july_end_date}")
        
        print("\n1️⃣ CHECKING EXPENSES:")
        print("-" * 40)
        
        # Check all expenses for this building
        all_expenses = Expense.objects.filter(building_id=1).order_by('date')
        for expense in all_expenses:
            print(f"   💰 {expense.date}: {expense.title} - {expense.amount}€")
        
        print("\n2️⃣ CHECKING TRANSACTIONS:")
        print("-" * 40)
        
        # Check transactions for this apartment
        transactions = Transaction.objects.filter(
            apartment=apartment,
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).order_by('date')
        
        for transaction in transactions:
            in_july = transaction.date.date() < july_end_date
            print(f"   📋 {transaction.date}: {transaction.description} - {transaction.amount}€ [July: {in_july}]")
        
        print("\n3️⃣ CURRENT CALCULATION LOGIC:")
        print("-" * 40)
        
        # Current logic (problematic)
        total_charges_current = Transaction.objects.filter(
            apartment=apartment,
            date__lt=july_end_date,  # This is the problem!
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"   🔴 Current logic result: {total_charges_current}€")
        
        print("\n4️⃣ PROPOSED FIX:")
        print("-" * 40)
        
        # Fixed logic - only include transactions from expenses created BEFORE the month
        # For July view, we should only include expenses created before July 1st
        july_start_date = date(2025, 7, 1)
        
        # Get expenses created before July
        expenses_before_july = Expense.objects.filter(
            building_id=1,
            date__lt=july_start_date
        )
        
        print("   📊 Expenses created before July 1st:")
        for expense in expenses_before_july:
            print(f"      💰 {expense.date}: {expense.title} - {expense.amount}€")
        
        # Calculate charges from those expenses only
        expense_ids_before_july = list(expenses_before_july.values_list('id', flat=True))
        
        total_charges_fixed = Transaction.objects.filter(
            apartment=apartment,
            reference_type='expense',
            reference_id__in=[str(exp_id) for exp_id in expense_ids_before_july],
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"   🟢 Fixed logic result: {total_charges_fixed}€")
        
        print("\n5️⃣ PAYMENTS:")
        print("-" * 40)
        
        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=july_end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"   💳 Total payments before July end: {total_payments}€")
        
        print("\n6️⃣ FINAL BALANCES:")
        print("-" * 40)
        
        current_balance = total_payments - total_charges_current
        fixed_balance = total_payments - total_charges_fixed
        
        print(f"   🔴 Current logic balance: {current_balance}€")
        print(f"   🟢 Fixed logic balance: {fixed_balance}€")
        print(f"   📊 Difference: {current_balance - fixed_balance}€")

if __name__ == "__main__":
    debug_previous_obligations_issue()

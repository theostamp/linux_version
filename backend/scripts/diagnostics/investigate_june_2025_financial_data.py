import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from datetime import datetime
from decimal import Decimal

with schema_context('demo'):
    from apartments.models import Apartment
    from financial.models import Expense, Transaction, CommonExpensePeriod, ApartmentShare
    from buildings.models import Building
    
    print("=== JUNE 2025 FINANCIAL DATA INVESTIGATION ===")
    print(f"Investigation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Get building info
    building = Building.objects.get(id=1)  # Αλκμάνος 22
    print(f"Building: {building.name} - {building.address}")
    print(f"Management Fee per apartment: {building.management_fee_per_apartment}€")
    print()
    
    # Check apartments count
    apartments = Apartment.objects.filter(building=building)
    print(f"Total apartments: {apartments.count()}")
    expected_management_fees = apartments.count() * building.management_fee_per_apartment
    print(f"Expected total management fees: {expected_management_fees}€")
    print()
    
    # Check June 2025 Expenses
    print("=== JUNE 2025 EXPENSES ===")
    june_expenses = Expense.objects.filter(
        building=building,
        date__year=2025,
        date__month=6
    )
    
    total_june_expenses = Decimal('0.00')
    if june_expenses.exists():
        for expense in june_expenses:
            total_june_expenses += expense.amount
            print(f"Expense ID: {expense.id}")
            print(f"Title: {expense.title}")
            print(f"Amount: {expense.amount}€")
            print(f"Date: {expense.date}")
            print(f"Category: {expense.get_category_display()}")
            print(f"Type: {expense.get_expense_type_display()}")
            print(f"Distribution: {expense.get_distribution_type_display()}")
            print("---")
    else:
        print("No expenses found for June 2025")
    
    print(f"Total June 2025 expenses: {total_june_expenses}€")
    print()
    
    # Check Common Expense Periods for June 2025
    print("=== JUNE 2025 COMMON EXPENSE PERIODS ===")
    june_periods = CommonExpensePeriod.objects.filter(
        building=building,
        start_date__year=2025,
        start_date__month=6
    )
    
    for period in june_periods:
        print(f"Period: {period.period_name}")
        print(f"Start: {period.start_date}, End: {period.end_date}")
        print(f"Active: {period.is_active}")
        
        # Check apartment shares for this period
        shares = ApartmentShare.objects.filter(period=period)
        total_shares = Decimal('0.00')
        for share in shares:
            total_shares += share.total_amount
            print(f"  Apartment {share.apartment.number}: {share.total_amount}€")
        print(f"  Total shares: {total_shares}€")
        print("---")
    print()
    
    # Check for any expenses from other months that might affect June
    print("=== OTHER MONTHS EXPENSES (2025) ===")
    other_expenses = Expense.objects.filter(
        building=building,
        date__year=2025
    ).exclude(date__month=6).order_by('date__month')
    
    for expense in other_expenses:
        print(f"{expense.date.month}/{expense.date.year}: {expense.title} - {expense.amount}€ (Type: {expense.expense_type})")
    print()
    
    # Check Transactions for June 2025
    print("=== JUNE 2025 TRANSACTIONS ===")
    june_transactions = Transaction.objects.filter(
        apartment__building=building,
        date__year=2025,
        date__month=6
    )
    
    total_june_transactions = Decimal('0.00')
    for transaction in june_transactions:
        total_june_transactions += transaction.amount
        print(f"Apartment {transaction.apartment.number}: {transaction.amount}€ ({transaction.type}) - {transaction.description}")
    
    print(f"Total June 2025 transactions: {total_june_transactions}€")
    print()
    
    # Check current balances for all apartments
    print("=== CURRENT APARTMENT BALANCES ===")
    total_current_balance = Decimal('0.00')
    for apartment in apartments:
        # Get current balance from transactions
        apartment_transactions = Transaction.objects.filter(apartment=apartment)
        balance = sum(t.amount for t in apartment_transactions)
        total_current_balance += balance
        print(f"Apartment {apartment.number}: {balance}€")
    
    print(f"Total current balance across all apartments: {total_current_balance}€")
    print()
    
    # Summary
    print("=== SUMMARY ===")
    print(f"Expected June management fees: {expected_management_fees}€")
    print(f"Actual June expenses: {total_june_expenses}€")
    print(f"Difference: {total_june_expenses - expected_management_fees}€")
    print(f"Total current balance: {total_current_balance}€")
    print()
    
    # Check what's showing 343€ in the UI - let's look at all periods and shares
    print("=== ALL COMMON EXPENSE PERIODS (2025) ===")
    all_periods = CommonExpensePeriod.objects.filter(building=building, start_date__year=2025)
    
    for period in all_periods:
        print(f"Period: {period.period_name}")
        print(f"Start: {period.start_date}, End: {period.end_date}")
        print(f"Active: {period.is_active}")
        
        shares = ApartmentShare.objects.filter(period=period)
        total_period_amount = Decimal('0.00')
        for share in shares:
            total_period_amount += share.total_amount
        
        if total_period_amount > 0:
            print(f"  Total period amount: {total_period_amount}€")
            print(f"  Number of apartments: {shares.count()}")
            if shares.exists():
                first_share = shares.first()
                print(f"  Sample breakdown: {first_share.breakdown}")
        print("---")

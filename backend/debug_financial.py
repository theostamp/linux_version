import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Expense, CommonExpensePeriod, ApartmentShare
from apartments.models import Apartment
from datetime import datetime

with schema_context('demo'):
    print("=== DEBUGGING FINANCIAL DATA FOR SEPT 2025 ===\n")
    
    # Check for expenses in September 2025
    expenses = Expense.objects.filter(
        date__year=2025, 
        date__month=9
    )
    print(f'Expenses in Sept 2025: {expenses.count()}')
    for exp in expenses:
        print(f'  - {exp.title}: {exp.amount}€ ({exp.date})')
    
    # Check for common expense periods
    common_periods = CommonExpensePeriod.objects.filter(
        start_date__year=2025,
        start_date__month=9
    )
    print(f'\nCommon Expense Periods in Sept 2025: {common_periods.count()}')
    for period in common_periods:
        print(f'  - Period: {period.period_name}, Active: {period.is_active}')
        
        # Check apartment shares for this period
        shares = ApartmentShare.objects.filter(period=period)
        print(f'    - Apartment Shares: {shares.count()}')
        for share in shares[:3]:  # Show first 3
            print(f'      * Apt {share.apartment.number}: {share.total_amount}€ (Due: {share.total_due}€)')
    
    # Check for transactions in September 2025
    transactions = Transaction.objects.filter(
        date__year=2025,
        date__month=9
    )
    print(f'\nTransactions in Sept 2025: {transactions.count()}')
    
    # Check apartment balances for all apartments
    apartments = Apartment.objects.all()
    print(f'\n=== APARTMENT BALANCES ===')
    for apt in apartments:
        # Get all transactions for this apartment
        apt_transactions = Transaction.objects.filter(apartment=apt)
        total_balance = sum(t.amount for t in apt_transactions)
        
        # Get current month transactions
        current_month_transactions = apt_transactions.filter(
            date__year=2025,
            date__month=9
        )
        current_month_balance = sum(t.amount for t in current_month_transactions)
        
        print(f'Apartment {apt.number}:')
        print(f'  - Total Balance: {total_balance}€')
        print(f'  - Sept 2025 Balance: {current_month_balance}€')
        print(f'  - Total Transactions: {apt_transactions.count()}')
        
        # Show recent transactions
        recent_transactions = apt_transactions.order_by('-date')[:3]
        if recent_transactions:
            print(f'  - Recent transactions:')
            for t in recent_transactions:
                print(f'    * {t.date}: {t.amount}€ ({t.transaction_type}) - {t.description}')
        print()
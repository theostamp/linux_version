import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from datetime import date
from financial.models import Transaction, Expense, ApartmentShare, CommonExpensePeriod
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    # Check September 2025 transactions
    september_2025 = date(2025, 9, 1)
    
    print("=== SEPTEMBER 2025 BALANCE DISCREPANCY INVESTIGATION ===\n")
    
    # Get all apartments
    apartments = Apartment.objects.all().order_by('number')
    
    print("Individual Apartment Balances:")
    total_individual_charges = Decimal('0')
    
    for apt in apartments:
        # Get September 2025 transactions for this apartment
        sept_transactions = Transaction.objects.filter(
            apartment=apt,
            date__year=2025,
            date__month=9
        )
        
        sept_balance = sum(t.amount for t in sept_transactions)
        total_individual_charges += abs(sept_balance) if sept_balance < 0 else Decimal('0')
        
        # Get owner name (assuming it's in apartment model or related)
        owner_name = getattr(apt, 'owner_name', 'Unknown')
        mills = getattr(apt, 'participation_mills', 0)
        
        print(f"Apartment {apt.number}: {owner_name}")
        print(f"  Mills: {mills}")
        print(f"  September Balance: {sept_balance:.2f} €")
        print(f"  Charge Amount: {abs(sept_balance):.2f} €" if sept_balance < 0 else "  No charge")
        print()
    
    print(f"TOTAL INDIVIDUAL CHARGES: {total_individual_charges:.2f} €")
    print()
    
    # Check Expenses for September 2025
    print("Expenses for September 2025:")
    expenses = Expense.objects.filter(
        date__year=2025,
        date__month=9
    )
    
    total_expenses = Decimal('0')
    for exp in expenses:
        total_expenses += exp.amount
        print(f"Expense ID {exp.id}: {exp.amount:.2f} €")
        print(f"  Title: {exp.title}")
        print(f"  Distribution: {exp.distribution_type}")
        print(f"  Category: {exp.category}")
    
    print(f"TOTAL EXPENSES: {total_expenses:.2f} €")
    print()
    
    # Check all September transactions
    print("All September 2025 Transactions:")
    all_sept_transactions = Transaction.objects.filter(
        date__year=2025,
        date__month=9
    ).order_by('apartment__number')
    
    total_transaction_amount = Decimal('0')
    for trans in all_sept_transactions:
        total_transaction_amount += trans.amount
        print(f"Apartment {trans.apartment.number}: {trans.amount:.2f} € ({trans.type})")
    
    print(f"TOTAL TRANSACTION AMOUNT: {total_transaction_amount:.2f} €")
    print()
    
    print("=== SUMMARY ===")
    print(f"Individual apartment charges sum: {total_individual_charges:.2f} €")
    print(f"Total expenses: {total_expenses:.2f} €")
    print(f"All transactions total: {total_transaction_amount:.2f} €")
    
    if total_individual_charges != total_expenses:
        print(f"DISCREPANCY FOUND: {total_individual_charges:.2f} € != {total_expenses:.2f} €")
        print(f"Difference: {abs(total_individual_charges - total_expenses):.2f} €")
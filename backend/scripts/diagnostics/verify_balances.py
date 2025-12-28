import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Expense
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== VERIFYING APARTMENT BALANCES ===\n")
    
    apartments = Apartment.objects.all().order_by('number')
    
    total_expected = Decimal('0')
    total_from_db = Decimal('0')
    total_from_transactions = Decimal('0')
    
    print("Detailed apartment analysis:")
    print("Apt | Current Balance (DB) | Transactions Sum | Expected Debt | Match?")
    print("----|---------------------|------------------|---------------|--------")
    
    for apt in apartments:
        # Get current balance from database
        current_balance = apt.current_balance or Decimal('0')
        total_from_db += abs(current_balance) if current_balance < 0 else Decimal('0')
        
        # Calculate balance from all transactions
        all_transactions = Transaction.objects.filter(apartment=apt)
        transaction_balance = sum(t.amount for t in all_transactions)
        total_from_transactions += transaction_balance
        
        # Get September transactions specifically
        sept_transactions = Transaction.objects.filter(
            apartment=apt,
            date__year=2025,
            date__month=9,
            type='expense_created'
        )
        
        sept_balance = sum(t.amount for t in sept_transactions)
        expected_debt = abs(sept_balance) if sept_balance > 0 else Decimal('0')
        total_expected += expected_debt
        
        # Check if they match
        match = "✅" if abs(abs(current_balance) - expected_debt) < Decimal('0.01') else "❌"
        
        print(f"{apt.number:3} | {current_balance:18.2f} | {transaction_balance:15.2f} | {expected_debt:12.2f} | {match}")
        
        if match == "❌":
            print(f"    September transactions: {sept_balance:.2f} €")
            for trans in sept_transactions:
                print(f"      - {trans.description}: {trans.amount:.2f} € ({trans.date.date()})")
    
    print("\n" + "="*70)
    print("SUMMARY:")
    print(f"Expected total debt (from Sept transactions): {total_expected:.2f} €")
    print(f"Current total debt (from apartment balances): {total_from_db:.2f} €")
    print(f"Total from all transactions: {total_from_transactions:.2f} €")
    
    # Check September expenses
    print(f"\nSeptember 2025 expenses:")
    sept_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=9
    )
    
    total_sept_expenses = Decimal('0')
    for expense in sept_expenses:
        total_sept_expenses += expense.amount
        print(f"  - {expense.title}: {expense.amount:.2f} €")
    
    print(f"Total September expenses: {total_sept_expenses:.2f} €")
    
    # The expected debt should match the total September expenses
    if abs(total_expected - total_sept_expenses) < Decimal('0.10'):
        print("✅ Transaction-based debts match September expenses")
    else:
        print("❌ Transaction-based debts don't match September expenses")
        print(f"   Difference: {abs(total_expected - total_sept_expenses):.2f} €")
    
    # Check if apartment balances need to be recalculated
    if abs(total_from_db - total_expected) > Decimal('1.00'):
        print("\n⚠️  APARTMENT BALANCES NEED RECALCULATION")
        print("The current_balance fields don't match the transaction totals")
    else:
        print("\n✅ APARTMENT BALANCES ARE CORRECT")
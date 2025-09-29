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
    print("=== FINDING NEW 100€ EXPENSE ===\n")
    
    # Get all expenses for September 2025
    expenses = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=9
    ).order_by('created_at')
    
    print(f"September 2025 expenses ({expenses.count()}):")
    total_amount = Decimal('0')
    
    for expense in expenses:
        total_amount += expense.amount
        print(f"ID {expense.id}: {expense.title}")
        print(f"  Amount: {expense.amount:.2f} €")
        print(f"  Date: {expense.date}")
        print(f"  Created: {expense.created_at}")
        
        # Check if this expense has transactions
        transactions = Transaction.objects.filter(
            reference_id=str(expense.id),
            reference_type='expense'
        )
        
        if transactions.exists():
            print(f"  ✅ Has {transactions.count()} transactions")
            transaction_total = sum(t.amount for t in transactions)
            print(f"  Transaction total: {transaction_total:.2f} €")
        else:
            print(f"  ❌ NO TRANSACTIONS - needs to be processed!")
        print()
    
    print(f"Total September expenses: {total_amount:.2f} €")
    
    if total_amount == Decimal('175.00'):
        print("✅ Total matches UI display (175€)")
    else:
        print(f"⚠️  Total doesn't match UI display (expected 175€)")
    
    # Find expenses without transactions
    print("\n=== EXPENSES WITHOUT TRANSACTIONS ===")
    expenses_without_transactions = []
    
    for expense in expenses:
        transactions = Transaction.objects.filter(
            reference_id=str(expense.id),
            reference_type='expense'
        )
        
        if not transactions.exists():
            expenses_without_transactions.append(expense)
            print(f"❌ Expense ID {expense.id}: {expense.title} ({expense.amount:.2f} €)")
    
    if expenses_without_transactions:
        print(f"\n🔧 Found {len(expenses_without_transactions)} expense(s) that need transaction creation")
    else:
        print("\n✅ All expenses have transactions")
    
    # Show current apartment balances for verification
    print("\n=== CURRENT APARTMENT BALANCES ===")
    apartments = Apartment.objects.all().order_by('number')
    total_debt = Decimal('0')
    
    for apt in apartments[:3]:  # Show first 3 apartments
        current_balance = apt.current_balance or Decimal('0')
        debt = abs(current_balance) if current_balance < 0 else Decimal('0')
        total_debt += debt
        print(f"Apartment {apt.number}: {current_balance:.2f} € (debt: {debt:.2f} €)")
    
    print("...")
    
    # Calculate expected debt if all transactions existed
    expected_individual_debt = total_amount / 10  # Rough estimate for equal distribution
    print(f"\nExpected debt per apartment (rough): ~{expected_individual_debt:.2f} €")
    print("This should be around 17.50€ per apartment if all expenses had transactions")
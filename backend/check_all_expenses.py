import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction

# All database operations within tenant context
with schema_context('demo'):
    print("=== Checking ALL Expenses ===")
    
    all_expenses = Expense.objects.filter(building_id=1).order_by('date')
    
    print(f"Total expenses in building: {all_expenses.count()}")
    
    for expense in all_expenses:
        print(f"\n📋 Expense ID: {expense.id}")
        print(f"   Title: {expense.title}")
        print(f"   Amount: €{expense.amount}")
        print(f"   Date: {expense.date} ({expense.date.month}/{expense.date.year})")
        print(f"   Created at: {expense.created_at}")
        
        # Check related transactions
        transactions = Transaction.objects.filter(
            reference_type='expense',
            reference_id=str(expense.id)
        )
        print(f"   Transactions: {transactions.count()}")
        
        # Check transactions by title (as we did in the fix)
        transactions_by_title = Transaction.objects.filter(
            description__icontains=expense.title
        )
        print(f"   Transactions by title: {transactions_by_title.count()}")
        
        if transactions_by_title.exists():
            total_amount = sum(tx.amount for tx in transactions_by_title)
            print(f"   Total transaction amount: €{total_amount}")
            
            # Show sample transactions
            for tx in transactions_by_title[:3]:
                print(f"     - {tx.apartment}: €{tx.amount} on {tx.date} ({tx.type})")
    
    print(f"\n🗓️ Date Analysis:")
    print(f"   August 2025 expenses: {all_expenses.filter(date__year=2025, date__month=8).count()}")
    print(f"   September 2025 expenses: {all_expenses.filter(date__year=2025, date__month=9).count()}")
    print(f"   July 2025 expenses: {all_expenses.filter(date__year=2025, date__month=7).count()}")
    
    print(f"\n📊 Transaction Types for reference_type='expense':")
    expense_transactions = Transaction.objects.filter(reference_type='expense')
    print(f"   Total: {expense_transactions.count()}")
    
    for tx_type in ['expense_created', 'common_expense_charge', 'expense_issued']:
        count = expense_transactions.filter(type=tx_type).count()
        print(f"   {tx_type}: {count}")
    
    print(f"\n🔍 Previous Obligation Transactions:")
    prev_obligation_transactions = Transaction.objects.filter(
        description__icontains='Παλαιότερη οφειλή'
    )
    print(f"   Count: {prev_obligation_transactions.count()}")
    
    for tx in prev_obligation_transactions[:5]:
        print(f"   - {tx.apartment}: €{tx.amount} on {tx.date}")
        print(f"     Description: {tx.description}")
        print(f"     Type: {tx.type}, Reference: {tx.reference_type}/{tx.reference_id}")
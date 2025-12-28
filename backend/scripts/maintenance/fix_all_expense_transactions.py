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
    print("=== FIXING ALL EXPENSE TRANSACTIONS ===\n")
    
    # Get all expenses without transactions
    expenses = Expense.objects.filter(building_id=1).order_by('date')
    
    for expense in expenses:
        print(f"Processing expense ID {expense.id}: {expense.title}")
        print(f"  Amount: {expense.amount:.2f} €")
        print(f"  Date: {expense.date}")
        
        # Check if transactions already exist
        existing_transactions = Transaction.objects.filter(
            reference_id=str(expense.id),
            reference_type='expense'
        )
        
        if existing_transactions.exists():
            print(f"  ✓ Already has {existing_transactions.count()} transactions")
        else:
            print(f"  ❌ No transactions found - creating...")
            
            # Create transactions for this expense
            expense._create_apartment_transactions()
            
            # Verify creation
            new_transactions = Transaction.objects.filter(
                reference_id=str(expense.id),
                reference_type='expense'
            )
            
            total_distributed = sum(t.amount for t in new_transactions)
            print(f"  ✅ Created {new_transactions.count()} transactions, total: {total_distributed:.2f} €")
        
        print()
    
    # Final verification
    print("=== FINAL VERIFICATION ===")
    
    apartments = Apartment.objects.all().order_by('number')
    
    print("Updated apartment balances:")
    total_debt = Decimal('0')
    
    for apt in apartments:
        current_balance = apt.current_balance or Decimal('0')
        debt = abs(current_balance) if current_balance < 0 else Decimal('0')
        total_debt += debt
        
        print(f"  Apartment {apt.number}: {current_balance:.2f} € (debt: {debt:.2f} €)")
    
    print(f"\nTotal debt across all apartments: {total_debt:.2f} €")
    print(f"Expected total from expenses: 249.99 €")
    
    if abs(total_debt - Decimal('249.99')) < Decimal('0.50'):
        print("✅ SUCCESS: Total debt matches expected amount!")
    else:
        print("⚠️  Mismatch between total debt and expected amount")
    
    # Check transaction totals
    print("\n=== TRANSACTION VERIFICATION ===")
    all_transactions = Transaction.objects.filter(
        reference_type='expense'
    ).order_by('date')
    
    by_expense = {}
    for trans in all_transactions:
        expense_id = trans.reference_id
        if expense_id not in by_expense:
            by_expense[expense_id] = {'count': 0, 'total': Decimal('0')}
        by_expense[expense_id]['count'] += 1
        by_expense[expense_id]['total'] += trans.amount
    
    for expense_id, data in by_expense.items():
        expense = Expense.objects.get(id=expense_id)
        print(f"Expense {expense_id}: {data['count']} transactions, total: {data['total']:.2f} € (original: {expense.amount:.2f} €)")
    
    total_from_transactions = sum(data['total'] for data in by_expense.values())
    print(f"Total from all transactions: {total_from_transactions:.2f} €")
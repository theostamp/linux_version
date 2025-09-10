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
    # Get the problematic expense
    expense = Expense.objects.get(id=2)
    
    print(f"=== FIXING EXPENSE ID {expense.id} ===")
    print(f"Title: {expense.title}")
    print(f"Amount: {expense.amount:.2f} €")
    print(f"Distribution: {expense.distribution_type}")
    print()
    
    # Check if transactions already exist (safety check)
    existing_transactions = Transaction.objects.filter(
        reference_id=str(expense.id),
        reference_type='expense'
    )
    
    if existing_transactions.exists():
        print(f"⚠️  {existing_transactions.count()} transactions already exist!")
        print("Delete them first before recreating:")
        for trans in existing_transactions:
            print(f"  {trans.apartment.number}: {trans.amount:.2f} €")
        sys.exit(1)
    
    # Create transactions for this expense
    print("Creating apartment transactions...")
    expense._create_apartment_transactions()
    
    # Verify the creation
    print()
    print("=== VERIFICATION ===")
    new_transactions = Transaction.objects.filter(
        reference_id=str(expense.id),
        reference_type='expense'
    ).order_by('apartment__number')
    
    total_distributed = Decimal('0')
    print("Created transactions:")
    for trans in new_transactions:
        total_distributed += trans.amount
        print(f"  Apartment {trans.apartment.number}: {trans.amount:.2f} €")
        print(f"    Balance: {trans.balance_before:.2f} € → {trans.balance_after:.2f} €")
    
    print(f"Total distributed: {total_distributed:.2f} €")
    print(f"Original expense: {expense.amount:.2f} €")
    
    if abs(total_distributed - expense.amount) < Decimal('0.01'):
        print("✓ Distribution successful!")
    else:
        print("⚠️  Distribution error!")
    
    # Check apartment balances
    print()
    print("=== UPDATED APARTMENT BALANCES ===")
    apartments = Apartment.objects.all().order_by('number')
    for apt in apartments:
        # Get current balance from database
        balance_from_transactions = sum(
            t.amount for t in Transaction.objects.filter(apartment=apt)
        )
        
        print(f"Apartment {apt.number} ({apt.owner_name}):")
        print(f"  Current balance: {apt.current_balance:.2f} €")
        print(f"  From transactions: {balance_from_transactions:.2f} €")
        
        if abs(apt.current_balance - balance_from_transactions) > Decimal('0.01'):
            print(f"  ⚠️  BALANCE MISMATCH!")
        else:
            print(f"  ✓ Balance consistent")
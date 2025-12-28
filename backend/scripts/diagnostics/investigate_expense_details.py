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
    # Get the September 2025 expense
    expense = Expense.objects.get(id=2)
    
    print(f"=== EXPENSE DETAILS ===")
    print(f"ID: {expense.id}")
    print(f"Title: {expense.title}")
    print(f"Amount: {expense.amount:.2f} €")
    print(f"Date: {expense.date}")
    print(f"Distribution: {expense.distribution_type}")
    print(f"Category: {expense.category}")
    print(f"Created: {expense.created_at}")
    print()
    
    # Check if this expense has created transactions
    print("=== RELATED TRANSACTIONS ===")
    related_transactions = Transaction.objects.filter(
        reference_id=str(expense.id),
        reference_type='expense'
    )
    
    if related_transactions.exists():
        print(f"Found {related_transactions.count()} transactions:")
        for trans in related_transactions:
            print(f"  Apartment {trans.apartment.number}: {trans.amount:.2f} €")
    else:
        print("NO TRANSACTIONS FOUND for this expense!")
        print()
        
        # Calculate what the transactions should be
        print("=== EXPECTED APARTMENT DISTRIBUTIONS ===")
        apartments = Apartment.objects.all().order_by('number')
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        
        print(f"Total participation mills: {total_mills}")
        print(f"Expected distributions:")
        
        calculated_total = Decimal('0')
        for apt in apartments:
            if expense.distribution_type == 'by_participation_mills':
                apartment_mills = apt.participation_mills or 0
                share = (expense.amount * apartment_mills) / total_mills
                calculated_total += share
                print(f"  Apartment {apt.number} ({apt.owner_name}): {share:.2f} € ({apartment_mills} mills)")
        
        print(f"Calculated total: {calculated_total:.2f} €")
        print(f"Original expense: {expense.amount:.2f} €")
        
        if abs(calculated_total - expense.amount) < Decimal('0.01'):
            print("✓ Distribution calculations are correct")
        else:
            print("⚠️  Distribution calculations have rounding error")
    
    # Check the apartment balances from transactions
    print()
    print("=== CURRENT APARTMENT BALANCES ===")
    apartments = Apartment.objects.all().order_by('number')
    for apt in apartments:
        # Get all transactions for this apartment
        all_transactions = Transaction.objects.filter(apartment=apt).order_by('date')
        
        balance = Decimal('0')
        for trans in all_transactions:
            balance += trans.amount
        
        print(f"Apartment {apt.number}: {balance:.2f} €")
        
        # Compare with current_balance field if it exists
        if hasattr(apt, 'current_balance') and apt.current_balance is not None:
            print(f"  (Stored balance: {apt.current_balance:.2f} €)")
            if abs(balance - apt.current_balance) > Decimal('0.01'):
                print(f"  ⚠️  BALANCE MISMATCH!")
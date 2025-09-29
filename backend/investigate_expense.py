import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction

# All database operations within tenant context
with schema_context('demo'):
    print("=== Investigating August 2025 Expense Carryover ===")
    
    # Find August 2025 expenses (specifically €300)
    august_expenses = Expense.objects.filter(
        date__year=2025,
        date__month=8
    ).order_by('date')
    
    print(f"\n📋 August 2025 Expenses ({august_expenses.count()} found):")
    for exp in august_expenses:
        print(f"  - ID: {exp.id}, Amount: €{exp.amount}, Date: {exp.date}, Title: {exp.title}")
        
        # Check if transactions were generated for this expense  
        transactions = Transaction.objects.filter(
            description__icontains=exp.title
        )
        print(f"    Related Transactions: {transactions.count()}")
        
        if transactions.exists():
            print("    Transaction details:")
            for tx in transactions[:3]:  # Show first 3 transactions
                print(f"      - Apartment {tx.apartment}: €{tx.amount} on {tx.date}")
    
    print("\n" + "="*50)
    
    # Check September 2025 transactions for previous obligations
    september_transactions = Transaction.objects.filter(
        date__year=2025,
        date__month=9,
        description__icontains="previous"
    ).order_by('date')
    
    print(f"\n📋 September 2025 Previous Obligation Transactions ({september_transactions.count()} found):")
    for tx in september_transactions:
        print(f"  - ID: {tx.id}, Amount: €{tx.amount}, Date: {tx.date}")
        print(f"    Description: {tx.description}")
        print(f"    Apartment: {tx.apartment}")
    
    print("\n" + "="*50)
    
    # Look specifically for €300 expense
    print("\n🔍 Looking for €300 expense:")
    expense_300 = august_expenses.filter(amount=300).first()
    if expense_300:
        print(f"Found €300 expense: ID {expense_300.id}, Date: {expense_300.date}")
        print(f"Title: {expense_300.title}")
        
        # Check transactions generated for this expense
        expense_transactions = Transaction.objects.filter(
            description__icontains=expense_300.title
        )
        print(f"Transactions for this expense: {expense_transactions.count()}")
        
        apartment_amounts = {}
        for tx in expense_transactions:
            print(f"  - Apartment {tx.apartment}: €{tx.amount} on {tx.date}")
            apartment_amounts[tx.apartment] = tx.amount
            
        # Check if these amounts appear in September as previous obligations
        print("\n🔄 Checking September carryover for this expense:")
        for apartment, amount in apartment_amounts.items():
            sept_prev_tx = Transaction.objects.filter(
                apartment=apartment,
                date__year=2025,
                date__month=9,
                amount=amount,
                description__icontains="previous"
            )
            if sept_prev_tx.exists():
                print(f"  ✅ Apartment {apartment}: Found previous obligation of €{amount}")
            else:
                print(f"  ❌ Apartment {apartment}: Missing previous obligation of €{amount}")
                
                # Check if there are ANY previous obligation transactions for this apartment in Sept
                any_sept_prev = Transaction.objects.filter(
                    apartment=apartment,
                    date__year=2025,
                    date__month=9,
                    description__icontains="previous"
                )
                if any_sept_prev.exists():
                    print(f"    But found other previous obligations: {[f'€{tx.amount}' for tx in any_sept_prev]}")
                else:
                    print(f"    No previous obligations found for apartment {apartment} in September")
    else:
        print("No €300 expense found in August 2025")
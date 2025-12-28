import os
import sys
import django
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from apartments.models import Apartment
from django.utils import timezone
from decimal import Decimal

# All database operations within tenant context
with schema_context('demo'):
    print("=== Creating Previous Obligation Transactions for September 2025 ===")
    
    # Find the August 2025 ΔΕΗ Κοινοχρήστων expense
    august_expense = Expense.objects.filter(
        date__year=2025,
        date__month=8,
        amount=300,
        title="ΔΕΗ Κοινοχρήστων"
    ).first()
    
    if not august_expense:
        print("❌ August ΔΕΗ Κοινοχρήστων expense not found!")
        exit(1)
    
    print(f"✅ Found August expense: ID {august_expense.id}, Amount: €{august_expense.amount}")
    
    # Get all the transactions created by this expense
    expense_transactions = Transaction.objects.filter(
        description__icontains=august_expense.title,
        date__year=2025,
        date__month=8
    )
    
    print(f"✅ Found {expense_transactions.count()} expense transactions from August")
    
    # Create previous obligation transactions for September 2025
    september_date = datetime(2025, 9, 1)
    if timezone.is_naive(september_date):
        september_date = timezone.make_aware(september_date)
    
    created_count = 0
    
    for tx in expense_transactions:
        if tx.apartment:
            # Get the apartment's current balance before creating the previous obligation
            current_balance = tx.apartment.current_balance or Decimal('0.00')
            new_balance = current_balance + tx.amount  # Adding debt
            
            # Create previous obligation transaction
            previous_obligation_tx = Transaction.objects.create(
                apartment=tx.apartment,
                building=tx.building,
                amount=tx.amount,
                type='common_expense_charge',
                description=f"Παλαιότερη οφειλή: {august_expense.title} (Αύγουστος 2025)",
                date=september_date,
                reference_id=str(august_expense.id),
                reference_type='previous_obligation',
                balance_before=current_balance,
                balance_after=new_balance
            )
            
            # Update apartment balance
            tx.apartment.current_balance = new_balance
            tx.apartment.save()
            
            created_count += 1
            print(f"  ✅ Created previous obligation for {tx.apartment}: €{tx.amount}")
    
    print(f"\n🎉 Successfully created {created_count} previous obligation transactions for September 2025")
    
    # Verify the results
    print("\n=== Verification ===")
    sept_prev_obligations = Transaction.objects.filter(
        date__year=2025,
        date__month=9,
        description__icontains="Παλαιότερη οφειλή"
    )
    
    print(f"Total September previous obligations: {sept_prev_obligations.count()}")
    total_amount = sum(tx.amount for tx in sept_prev_obligations)
    print(f"Total amount: €{total_amount}")
    
    if total_amount == august_expense.amount:
        print("✅ Total matches original August expense amount!")
    else:
        print(f"❌ Total mismatch! Expected €{august_expense.amount}, got €{total_amount}")
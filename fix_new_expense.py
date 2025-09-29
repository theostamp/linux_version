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
    print("=== FIXING NEW EXPENSE TRANSACTIONS ===\n")
    
    # Get the new expense
    try:
        expense = Expense.objects.get(id=6, title="Συντήρηση: Έλεγχος Στέγης")
        print(f"Found expense: {expense.title}")
        print(f"Amount: {expense.amount:.2f} €")
        print(f"Date: {expense.date}")
        print(f"Distribution: {expense.distribution_type}")
        
        # Check if transactions already exist
        existing_transactions = Transaction.objects.filter(
            reference_id=str(expense.id),
            reference_type='expense'
        )
        
        if existing_transactions.exists():
            print(f"⚠️  {existing_transactions.count()} transactions already exist!")
            for trans in existing_transactions[:3]:
                print(f"  - Apartment {trans.apartment.number}: {trans.amount:.2f} €")
            print("  ...")
        else:
            print("❌ No transactions found - creating them...")
            
            # Create transactions for this expense
            expense._create_apartment_transactions()
            
            # Verify creation
            new_transactions = Transaction.objects.filter(
                reference_id=str(expense.id),
                reference_type='expense'
            ).order_by('apartment__number')
            
            if new_transactions.exists():
                print(f"✅ Created {new_transactions.count()} transactions!")
                
                total_distributed = Decimal('0')
                print("\nNew transactions:")
                for trans in new_transactions:
                    total_distributed += trans.amount
                    print(f"  - Apartment {trans.apartment.number}: {trans.amount:.2f} €")
                
                print(f"\nTotal distributed: {total_distributed:.2f} €")
                print(f"Original expense: {expense.amount:.2f} €")
                
                if abs(total_distributed - expense.amount) < Decimal('0.10'):
                    print("✅ Distribution successful!")
                else:
                    print("⚠️  Distribution has rounding differences")
            else:
                print("❌ Failed to create transactions!")
        
    except Expense.DoesNotExist:
        print("❌ Expense not found! Let me check what expenses exist...")
        
        september_expenses = Expense.objects.filter(
            building_id=1,
            date__year=2025,
            date__month=9
        ).order_by('created_at')
        
        for exp in september_expenses:
            print(f"ID {exp.id}: {exp.title} - {exp.amount:.2f} €")
        
    # Show updated apartment balances
    print("\n=== UPDATED APARTMENT BALANCES ===")
    apartments = Apartment.objects.all().order_by('number')
    total_debt = Decimal('0')
    
    for apt in apartments:
        current_balance = apt.current_balance or Decimal('0')
        debt = abs(current_balance) if current_balance < 0 else Decimal('0')
        total_debt += debt
        
        if apt.number in ['1', '2', '8']:  # Show sample apartments
            print(f"Apartment {apt.number}: {current_balance:.2f} € (debt: {debt:.2f} €)")
    
    print(f"...")
    print(f"Total debt across all apartments: {total_debt:.2f} €")
    
    expected_total = Decimal('175.00')  # 75€ + 100€
    if abs(total_debt - expected_total) < Decimal('1.00'):
        print(f"✅ SUCCESS: Total debt {total_debt:.2f} € matches expected {expected_total:.2f} €")
    else:
        print(f"⚠️  Total debt {total_debt:.2f} € != expected {expected_total:.2f} €")
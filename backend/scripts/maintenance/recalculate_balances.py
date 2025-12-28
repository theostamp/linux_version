import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== RECALCULATING APARTMENT BALANCES ===\n")
    
    apartments = Apartment.objects.all().order_by('number')
    
    print("Recalculating balances based on transactions...")
    print("Apt | Old Balance | New Balance | Difference")
    print("----|-------------|-------------|----------")
    
    for apt in apartments:
        # Get old balance
        old_balance = apt.current_balance or Decimal('0')
        
        # Calculate new balance from all transactions
        all_transactions = Transaction.objects.filter(apartment=apt)
        
        # For expenses: positive transaction amounts become negative balance (debt)
        # For payments: positive transaction amounts become positive balance (credit)
        new_balance = Decimal('0')
        
        for trans in all_transactions:
            if trans.type == 'expense_created':
                # Expenses create negative balance (debt)
                new_balance -= trans.amount
            elif trans.type == 'payment_received':
                # Payments create positive balance (credit)
                new_balance += trans.amount
            else:
                # Other transaction types - keep current logic
                new_balance += trans.amount
        
        # Update the apartment balance
        apt.current_balance = new_balance
        apt.save()
        
        difference = new_balance - old_balance
        print(f"{apt.number:3} | {old_balance:10.2f} | {new_balance:10.2f} | {difference:9.2f}")
    
    print("\n" + "="*50)
    
    # Verify the new totals
    print("VERIFICATION:")
    total_debt = Decimal('0')
    
    apartments = Apartment.objects.all().order_by('number')
    for apt in apartments:
        current_balance = apt.current_balance or Decimal('0')
        debt = abs(current_balance) if current_balance < 0 else Decimal('0')
        total_debt += debt
    
    print(f"New total debt: {total_debt:.2f} €")
    print(f"Expected (September expenses): 175.00 €")
    
    if abs(total_debt - Decimal('175.00')) < Decimal('1.00'):
        print("✅ SUCCESS: Balances now match expected totals!")
    else:
        print("❌ Still some discrepancy - need further investigation")
    
    # Show sample apartment balances for UI
    print(f"\nSample apartment balances (for UI display):")
    for apt in apartments[:5]:
        current_balance = apt.current_balance
        debt = abs(current_balance) if current_balance < 0 else Decimal('0')
        print(f"Apartment {apt.number}: {debt:.2f} € debt")
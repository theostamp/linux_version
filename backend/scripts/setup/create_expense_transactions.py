import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Expense
from apartments.models import Apartment
from datetime import datetime
from decimal import Decimal
from django.utils import timezone

with schema_context('demo'):
    print("=== CREATING TRANSACTIONS FOR EXISTING EXPENSE ===\n")
    
    # Find the heating expense
    expense = Expense.objects.filter(
        date__year=2025, 
        date__month=9,
        title="Πετρέλαιο Θέρμανσης"
    ).first()
    
    if not expense:
        print("❌ No heating expense found for September 2025")
        exit()
    
    print(f"✅ Found expense: {expense.title} - {expense.amount}€")
    print(f"   Date: {expense.date}")
    print(f"   Distribution type: {expense.distribution_type}")
    
    # Get all apartments
    apartments = Apartment.objects.filter(building=expense.building)
    print(f"   Building has {apartments.count()} apartments")
    
    # Check if transactions already exist
    existing_transactions = Transaction.objects.filter(
        reference_id=str(expense.id),
        reference_type='expense'
    )
    
    if existing_transactions.exists():
        print(f"⚠️  {existing_transactions.count()} transactions already exist for this expense")
        print("   Deleting existing transactions first...")
        existing_transactions.delete()
    
    # Calculate total mills for distribution
    total_mills = sum(apt.participation_mills or 0 for apt in apartments)
    print(f"   Total participation mills: {total_mills}")
    
    if total_mills == 0:
        print("❌ No participation mills found - cannot distribute expense")
        exit()
    
    # Create transactions for each apartment
    created_count = 0
    total_distributed = Decimal('0.00')
    
    for apartment in apartments:
        # Calculate apartment share based on participation mills
        apartment_mills = apartment.participation_mills or 0
        if apartment_mills > 0:
            share_amount = (expense.amount * apartment_mills) / total_mills
            share_amount = share_amount.quantize(Decimal('0.01'))  # Round to 2 decimal places
            
            # Get current balance
            current_balance = apartment.current_balance or Decimal('0.00')
            new_balance = current_balance + share_amount  # Positive = debt to apartment
            
            # Convert expense date to datetime
            expense_datetime = datetime.combine(expense.date, datetime.min.time())
            if timezone.is_naive(expense_datetime):
                expense_datetime = timezone.make_aware(expense_datetime)
            
            # Create transaction
            transaction = Transaction.objects.create(
                apartment=apartment,
                building=expense.building,
                amount=share_amount,
                type='expense_created',
                description=f"Δαπάνη: {expense.title}",
                date=expense_datetime,
                reference_id=str(expense.id),
                reference_type='expense',
                balance_before=current_balance,
                balance_after=new_balance
            )
            
            # Update apartment balance
            apartment.current_balance = new_balance
            apartment.save()
            
            print(f"   ✅ Apt {apartment.number}: {share_amount}€ (mills: {apartment_mills}, balance: {current_balance}€ → {new_balance}€)")
            created_count += 1
            total_distributed += share_amount
    
    print(f"\n🎉 Created {created_count} transactions")
    print(f"   Total distributed: {total_distributed}€")
    print(f"   Original expense: {expense.amount}€")
    print(f"   Difference: {expense.amount - total_distributed}€")
    
    # Verify apartment balances
    print(f"\n=== VERIFICATION: APARTMENT BALANCES ===")
    apartments = Apartment.objects.filter(building=expense.building).order_by('number')
    total_balance = Decimal('0.00')
    
    for apartment in apartments:
        balance = apartment.current_balance or Decimal('0.00')
        total_balance += balance
        print(f"   Apt {apartment.number}: {balance}€")
    
    print(f"   Total apartment balances: {total_balance}€")
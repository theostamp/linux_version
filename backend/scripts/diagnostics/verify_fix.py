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
    print("=== FINAL VERIFICATION ===\n")
    
    # Get the expense
    expense = Expense.objects.get(id=2)
    print(f"Expense: {expense.title}")
    print(f"Amount: {expense.amount:.2f} €")
    print(f"Date: {expense.date}")
    print()
    
    # Get all transactions for this expense
    transactions = Transaction.objects.filter(
        reference_id=str(expense.id),
        reference_type='expense'
    ).order_by('apartment__number')
    
    print("Apartment charges from transactions:")
    total_charges = Decimal('0')
    
    for trans in transactions:
        total_charges += trans.amount
        apartment = trans.apartment
        
        # This is the amount to show in UI - the absolute value of current balance if negative
        ui_charge = abs(apartment.current_balance) if apartment.current_balance < 0 else Decimal('0')
        
        print(f"  Apartment {apartment.number} ({apartment.owner_name})")
        print(f"    Mills: {apartment.participation_mills}")
        print(f"    Transaction amount: {trans.amount:.2f} €")
        print(f"    Current balance: {apartment.current_balance:.2f} €")
        print(f"    UI charge (what user sees): {ui_charge:.2f} €")
        print()
    
    print(f"Total expense amount: {expense.amount:.2f} €")
    print(f"Total transaction amounts: {total_charges:.2f} €") 
    print(f"Difference: {abs(expense.amount - total_charges):.2f} €")
    
    if abs(expense.amount - total_charges) < Decimal('0.05'):
        print("✓ Expense correctly distributed to apartments!")
    else:
        print("⚠️  Significant distribution error!")
    
    print()
    print("=== UI EXPECTED VALUES ===")
    print("The UI should now show:")
    
    total_ui_charges = Decimal('0')
    for trans in transactions:
        apartment = trans.apartment
        ui_charge = abs(apartment.current_balance) if apartment.current_balance < 0 else Decimal('0')
        total_ui_charges += ui_charge
        mills_ratio = apartment.participation_mills / 1000
        print(f"Apartment {apartment.number}: {ui_charge:.2f} € (Mills: {apartment.participation_mills}, Ratio: {mills_ratio:.1%})")
    
    print(f"Total UI charges: {total_ui_charges:.2f} €")
    
    # Calculate what the manual calculation shows
    print()
    print("Manual calculation (75.00 € * mills / 1000):")
    manual_total = Decimal('0')
    apartments = Apartment.objects.all().order_by('number')
    for apt in apartments:
        manual_charge = (expense.amount * apt.participation_mills) / 1000
        manual_total += manual_charge
        print(f"Apartment {apt.number}: {manual_charge:.2f} €")
    
    print(f"Manual total: {manual_total:.2f} €")
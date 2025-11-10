import os
import sys
import django
from datetime import date, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== DEBUGGING TRANSACTION DATES ===\n")
    
    # Get apartment 1
    apartment = Apartment.objects.get(id=1)
    print(f"Apartment: {apartment.number} ({apartment.owner_name})")
    
    # Get all transactions for this apartment
    all_transactions = Transaction.objects.filter(apartment=apartment).order_by('-date')
    
    print(f"\nAll transactions for apartment {apartment.number}:")
    for trans in all_transactions:
        print(f"  ID {trans.id}: {trans.description}")
        print(f"    Amount: {trans.amount:.2f} €")
        print(f"    Type: {trans.type}")
        print(f"    Date: {trans.date} (date part: {trans.date.date()})")
        print(f"    Reference: {trans.reference_type}/{trans.reference_id}")
        print()
    
    # Check date filtering logic
    today = date.today()
    months_back = 6
    start_date = today - timedelta(days=30 * months_back)
    end_date = today
    
    print(f"Date filtering:")
    print(f"  Today: {today}")
    print(f"  Start date: {start_date}")
    print(f"  End date: {end_date}")
    print()
    
    # Apply the same filter as the API
    filtered_transactions = Transaction.objects.filter(
        apartment=apartment,
        date__date__gte=start_date,
        date__date__lte=end_date
    ).order_by('-date')
    
    print(f"Filtered transactions ({filtered_transactions.count()}):")
    for trans in filtered_transactions:
        print(f"  {trans.date.date()}: {trans.description} ({trans.amount:.2f} €)")
    
    # Check September 2025 specifically
    september_transactions = Transaction.objects.filter(
        apartment=apartment,
        date__year=2025,
        date__month=9
    ).order_by('date')
    
    print(f"\nSeptember 2025 transactions ({september_transactions.count()}):")
    for trans in september_transactions:
        print(f"  {trans.date.date()}: {trans.description}")
        print(f"    Amount: {trans.amount:.2f} €, Type: {trans.type}")
        print(f"    Reference: {trans.reference_id} ({trans.reference_type})")
    
    # Check if new expense transactions exist
    print(f"\n=== CHECKING FOR NEW EXPENSE (ID 6) ===")
    new_expense_transactions = Transaction.objects.filter(
        reference_id='6',
        reference_type='expense'
    )
    
    print(f"Transactions for expense ID 6: {new_expense_transactions.count()}")
    for trans in new_expense_transactions:
        print(f"  Apartment {trans.apartment.number}: {trans.amount:.2f} € ({trans.date.date()})")
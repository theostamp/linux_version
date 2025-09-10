import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense

# All database operations within tenant context
with schema_context('demo'):
    print("=== ALL EXPENSES IN DATABASE ===\n")
    
    expenses = Expense.objects.filter(building_id=1).order_by('date')
    
    total_amount = 0
    print(f"Total expenses: {expenses.count()}")
    
    for expense in expenses:
        total_amount += expense.amount
        print(f"ID {expense.id}: {expense.title}")
        print(f"  Amount: {expense.amount:.2f} €")
        print(f"  Date: {expense.date}")
        print(f"  Distribution: {expense.distribution_type}")
        print(f"  Created: {expense.created_at}")
        print()
    
    print(f"Total amount from expenses: {total_amount:.2f} €")
    
    # Check September 2025 specifically
    print("\n=== SEPTEMBER 2025 EXPENSES ===")
    sept_expenses = expenses.filter(date__year=2025, date__month=9)
    
    sept_total = 0
    for expense in sept_expenses:
        sept_total += expense.amount
        print(f"ID {expense.id}: {expense.title} - {expense.amount:.2f} €")
    
    print(f"September total: {sept_total:.2f} €")
    
    # This explains where the 249.99 comes from!
    print(f"\nThe API calculates {total_amount:.2f} € because it sums ALL expenses.")
    print(f"But we only want the September expenses: {sept_total:.2f} €")
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from datetime import datetime

# All database operations within tenant context
with schema_context('demo'):
    # Get Building 1 (Αλκμάνος 22)
    building = Building.objects.get(id=1)
    print(f"Building: {building.name}")
    print(f"Management fee per apartment: €{building.management_fee_per_apartment}")

    # Get September 2025 management expenses
    expenses = Expense.objects.filter(
        building=building,
        date__year=2025,
        date__month=9,
        title__icontains='Διαχείρισης'
    ).order_by('date')

    print(f"\nFound {expenses.count()} management expenses for September 2025:")
    for expense in expenses:
        print(f"- ID: {expense.id}")
        print(f"  Title: {expense.title}")
        print(f"  Amount: €{expense.amount}")
        print(f"  Category: {expense.category}")
        print(f"  Date: {expense.date}")
        print(f"  Distribution Type: {expense.distribution_type}")
        print()
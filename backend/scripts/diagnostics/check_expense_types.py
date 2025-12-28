import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense

with schema_context('demo'):
    # Όλες οι δαπάνες 2025-2026
    expenses = Expense.objects.filter(
        building_id=1,
        date__gte='2025-10-01'
    ).order_by('date')

    print('\n' + '='*70)
    print('ΑΝΑΛΥΣΗ ΤΥΠΩΝ ΔΑΠΑΝΩΝ')
    print('='*70 + '\n')

    for exp in expenses:
        print(f'{exp.date} | {exp.category:30} | {exp.expense_type:20} | {exp.amount:>10}€')
        print(f'           Distribution: {exp.distribution_type}')
        print(f'           Title: {exp.title}')
        print()

    print('='*70)

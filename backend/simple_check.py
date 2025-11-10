import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment, Expense

with schema_context('demo'):
    print(f"Transactions: {Transaction.objects.count()}")
    print(f"Payments: {Payment.objects.count()}")
    print(f"Expenses: {Expense.objects.count()}")

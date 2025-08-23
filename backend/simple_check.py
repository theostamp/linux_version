import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment

with schema_context('demo'):
    print('Δαπάνες:', Expense.objects.count())
    print('Εισπράξεις:', Payment.objects.count())

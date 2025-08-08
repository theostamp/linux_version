#!/usr/bin/env python3
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client
from django_tenants.utils import tenant_context
from financial.models import Expense
from django.db.models import Sum

def check_expenses():
    # Get the demo client specifically
    client = Client.objects.filter(schema_name='demo').first()
    if not client:
        print("Demo client not found")
        # List all available clients
        clients = Client.objects.all()
        print(f"Available clients: {[c.schema_name for c in clients]}")
        return
    
    print(f"Checking expenses for client: {client.schema_name}")
    
    with tenant_context(client):
        total_expenses = Expense.objects.count()
        unissued_expenses = Expense.objects.filter(is_issued=False).count()
        issued_expenses = Expense.objects.filter(is_issued=True).count()
        total_unissued_amount = Expense.objects.filter(is_issued=False).aggregate(total=Sum('amount'))['total'] or 0
        
        print(f"Total expenses: {total_expenses}")
        print(f"Unissued expenses: {unissued_expenses}")
        print(f"Issued expenses: {issued_expenses}")
        print(f"Total unissued amount: {total_unissued_amount}")
        
        if unissued_expenses > 0:
            print("\nUnissued expenses:")
            for expense in Expense.objects.filter(is_issued=False)[:5]:
                print(f"  - {expense.title}: {expense.amount}€ ({expense.date})")
        
        if issued_expenses > 0:
            print("\nIssued expenses:")
            for expense in Expense.objects.filter(is_issued=True)[:5]:
                print(f"  - {expense.title}: {expense.amount}€ ({expense.date})")

if __name__ == "__main__":
    check_expenses()

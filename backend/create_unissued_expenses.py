#!/usr/bin/env python3
import os
import django
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client
from django_tenants.utils import tenant_context
from financial.models import Expense
from buildings.models import Building

def create_unissued_expenses():
    # Get the demo client
    client = Client.objects.filter(schema_name='demo').first()
    if not client:
        print("Demo client not found")
        return
    
    print(f"Creating unissued expenses for client: {client.schema_name}")
    
    with tenant_context(client):
        # Get the first building
        building = Building.objects.first()
        if not building:
            print("No building found")
            return
        
        print(f"Using building: {building.name}")
        
        # Create some unissued expenses
        expenses_data = [
            {
                'title': 'Ηλεκτρικό ρεύμα κοινοχρήστων - Φεβρουάριος 2024',
                'amount': 150.00,
                'category': 'electricity_common',
                'distribution_type': 'by_participation_mills',
                'date': date(2024, 2, 15),
                'notes': 'Λογαριασμός ηλεκτρικού ρεύματος κοινοχρήστων'
            },
            {
                'title': 'Νερό κοινοχρήστων - Φεβρουάριος 2024',
                'amount': 95.00,
                'category': 'water_common',
                'distribution_type': 'by_participation_mills',
                'date': date(2024, 2, 10),
                'notes': 'Λογαριασμός νερού κοινοχρήστων'
            },
            {
                'title': 'Καθαρισμός κτιρίου - Φεβρουάριος 2024',
                'amount': 200.00,
                'category': 'cleaning',
                'distribution_type': 'equal_share',
                'date': date(2024, 2, 5),
                'notes': 'Υπηρεσίες καθαρισμού κτιρίου'
            },
            {
                'title': 'Συντήρηση ανελκυστήρα - Φεβρουάριος 2024',
                'amount': 300.00,
                'category': 'building_maintenance',
                'distribution_type': 'by_participation_mills',
                'date': date(2024, 2, 20),
                'notes': 'Συντήρηση ανελκυστήρα'
            }
        ]
        
        created_expenses = []
        for expense_data in expenses_data:
            expense = Expense.objects.create(
                building=building,
                **expense_data
            )
            created_expenses.append(expense)
            print(f"Created expense: {expense.title} - {expense.amount}€")
        
        print(f"\nCreated {len(created_expenses)} unissued expenses")
        
        # Verify the count
        unissued_count = Expense.objects.filter(is_issued=False).count()
        print(f"Total unissued expenses now: {unissued_count}")

if __name__ == "__main__":
    create_unissued_expenses()

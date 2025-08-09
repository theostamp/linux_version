#!/usr/bin/env python3
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client
from django_tenants.utils import tenant_context
from financial.models import Expense, Building
from datetime import date

def create_august_expenses():
    # Get the demo client specifically
    client = Client.objects.filter(schema_name='demo').first()
    if not client:
        print("Demo client not found")
        return
    
    print(f"Creating August 2025 expenses for client: {client.schema_name}")
    
    with tenant_context(client):
        # Get building
        building = Building.objects.first()
        if not building:
            print("No building found")
            return
        
        print(f"Using building: {building.name}")
        
        # August 2025 expenses data
        august_expenses = [
            {
                'title': 'ΔΕΗ Κοινοχρήστων - Αύγουστος 2025',
                'amount': 280.00,
                'date': date(2025, 8, 5),
                'category': 'electricity_common',
                'distribution_type': 'by_participation_mills',
                'notes': 'Ηλεκτρικό ρεύμα κοινοχρήστων χώρων'
            },
            {
                'title': 'Καθαρισμός Κοινοχρήστων - Αύγουστος 2025',
                'amount': 320.00,
                'date': date(2025, 8, 10),
                'category': 'cleaning',
                'distribution_type': 'by_participation_mills',
                'notes': 'Καθαρισμός κοινοχρήστων χώρων'
            },
            {
                'title': 'Συντήρηση Ανελκυστήρα - Αύγουστος 2025',
                'amount': 180.00,
                'date': date(2025, 8, 15),
                'category': 'elevator_maintenance',
                'distribution_type': 'by_participation_mills',
                'notes': 'Μηνιαία συντήρηση ανελκυστήρα'
            },
            {
                'title': 'Νερό Κοινοχρήστων - Αύγουστος 2025',
                'amount': 150.00,
                'date': date(2025, 8, 20),
                'category': 'water_common',
                'distribution_type': 'by_participation_mills',
                'notes': 'Νερό κοινοχρήστων χώρων'
            },
            {
                'title': 'Ασφάλεια Κτιρίου - Αύγουστος 2025',
                'amount': 120.00,
                'date': date(2025, 8, 25),
                'category': 'building_insurance',
                'distribution_type': 'by_participation_mills',
                'notes': 'Μηνιαία ασφάλεια κτιρίου'
            }
        ]
        
        created_expenses = []
        
        for expense_data in august_expenses:
            expense = Expense.objects.create(
                building=building,
                **expense_data
            )
            created_expenses.append(expense)
            print(f"Created expense: {expense.title} - {expense.amount}€")
        
        print(f"\nCreated {len(created_expenses)} unissued expenses for August 2025")
        
        # Verify the count
        unissued_count = Expense.objects.filter(is_issued=False).count()
        total_amount = sum(exp.amount for exp in Expense.objects.filter(is_issued=False))
        print(f"Total unissued expenses now: {unissued_count}")
        print(f"Total unissued amount: {total_amount}€")

if __name__ == "__main__":
    create_august_expenses()


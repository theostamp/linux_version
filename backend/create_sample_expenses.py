import os
import sys
import django
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense

def create_sample_expenses():
    with schema_context('demo'):
        # Get current month and year
        current_date = datetime.now()
        year = current_date.year
        month = current_date.month
        
        print("=== ΔΗΜΙΟΥΡΓΙΑ ΔΕΙΓΜΑΤΩΝ ΔΑΠΑΝΩΝ ===")
        print(f"Περίοδος: {month}/{year}")
        print()
        
        # Get building ID 1 (Αραχώβης 12)
        building = Building.objects.get(id=1)
        print(f"Πολυκατοικία: {building.address}")
        
        # Create sample expenses
        expenses_data = [
            {
                'title': 'Δαπάνες διαχείρισης - Αύγουστος 2025',
                'amount': 150.00,
                'category': 'management_fees',
                'description': 'Μηνιαίες δαπάνες διαχείρισης πολυκατοικίας'
            },
            {
                'title': 'Ηλεκτρικά κοινόχρηστων',
                'amount': 200.00,
                'category': 'utilities',
                'description': 'Ηλεκτρική ενέργεια για κοινόχρηστους χώρους'
            },
            {
                'title': 'Καθαρισμός πολυκατοικίας',
                'amount': 120.00,
                'category': 'maintenance',
                'description': 'Μηνιαίος καθαρισμός κοινόχρηστων χώρων'
            },
            {
                'title': 'Συντήρηση ανελκυστήρα',
                'amount': 80.00,
                'category': 'maintenance',
                'description': 'Συντήρηση και έλεγχος ανελκυστήρα'
            }
        ]
        
        created_expenses = []
        for expense_data in expenses_data:
            expense = Expense.objects.create(
                building=building,
                title=expense_data['title'],
                amount=expense_data['amount'],
                category=expense_data['category'],
                notes=expense_data['description'],
                date=date(year, month, 15),  # Middle of the month
                distribution_type='equal_share'
            )
            created_expenses.append(expense)
            print(f"✅ Δημιουργήθηκε: {expense.title} - €{expense.amount}")
        
        # Calculate totals
        total_expenses = sum(exp.amount for exp in created_expenses)
        management_expenses = sum(exp.amount for exp in created_expenses if exp.category == 'management_fees')
        building_expenses = sum(exp.amount for exp in created_expenses if exp.category != 'management_fees')
        
        print("\n📊 Σύνοψη:")
        print(f"Συνολικές δαπάνες: €{total_expenses}")
        print(f"Δαπάνες διαχείρισης: €{management_expenses}")
        print(f"Δαπάνες πολυκατοικίας: €{building_expenses}")
        
        return created_expenses

if __name__ == "__main__":
    create_sample_expenses()

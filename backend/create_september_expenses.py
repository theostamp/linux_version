#!/usr/bin/env python3
"""
Script για τη δημιουργία κοινόχρηστων για Σεπτέμβριο 2025
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def create_september_expenses():
    """Δημιουργία κοινόχρηστων για Σεπτέμβριο 2025"""
    
    with schema_context('demo'):
        from financial.models import Expense
        from buildings.models import Building
        
        print("🔧 CREATING SEPTEMBER 2025 EXPENSES")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Building: {building.name}")
        
        # Create common expenses for September 2025
        september_date = date(2025, 9, 1)
        
        # 1. Management fee
        management_expense = Expense.objects.create(
            building=building,
            title="Δαπάνες Διαχείρισης - Σεπτέμβριος 2025",
            amount=Decimal('10.00'),  # €1 per apartment * 10 apartments
            date=september_date,
            category='management_fees',
            expense_type='management_fee',
            distribution_type='equal_share',
            notes="Μηνιαίες δαπάνες διαχείρισης κτιρίου"
        )
        print(f"✅ Created: {management_expense.title} - €{management_expense.amount}")
        
        # 2. Garbage collection
        garbage_expense = Expense.objects.create(
            building=building,
            title="Συλλογή Απορριμμάτων - Σεπτέμβριος 2025",
            amount=Decimal('150.00'),
            date=september_date,
            category='garbage_collection',
            expense_type='regular',
            distribution_type='by_participation_mills',
            notes="Μηνιαία χρέωση συλλογής απορριμμάτων"
        )
        print(f"✅ Created: {garbage_expense.title} - €{garbage_expense.amount}")
        
        # 3. Electricity (common areas)
        electricity_expense = Expense.objects.create(
            building=building,
            title="Ηλεκτρικά Κοινοχρήστων - Σεπτέμβριος 2025",
            amount=Decimal('200.00'),
            date=september_date,
            category='electricity_common',
            expense_type='regular',
            distribution_type='by_participation_mills',
            notes="Ηλεκτρική ενέργεια για κοινοχρηστώμενους χώρους"
        )
        print(f"✅ Created: {electricity_expense.title} - €{electricity_expense.amount}")
        
        # 4. Water (common areas)
        water_expense = Expense.objects.create(
            building=building,
            title="Νερό Κοινοχρήστων - Σεπτέμβριος 2025",
            amount=Decimal('80.00'),
            date=september_date,
            category='water_common',
            expense_type='regular',
            distribution_type='by_participation_mills',
            notes="Νερό για κοινοχρηστώμενους χώρους"
        )
        print(f"✅ Created: {water_expense.title} - €{water_expense.amount}")
        
        # 5. Cleaning
        cleaning_expense = Expense.objects.create(
            building=building,
            title="Καθαρισμός Κοινοχρήστων - Σεπτέμβριος 2025",
            amount=Decimal('120.00'),
            date=september_date,
            category='cleaning',
            expense_type='regular',
            distribution_type='by_participation_mills',
            notes="Μηνιαίος καθαρισμός κοινοχρηστώμενων χώρων"
        )
        print(f"✅ Created: {cleaning_expense.title} - €{cleaning_expense.amount}")
        
        # 6. Reserve fund contribution
        reserve_expense = Expense.objects.create(
            building=building,
            title="Αποθεματικό Ταμείο - Σεπτέμβριος 2025",
            amount=Decimal('200.00'),  # €1000 goal / 5 months
            date=september_date,
            category='reserve_fund',
            expense_type='reserve_fund',
            distribution_type='by_participation_mills',
            notes="Μηνιαία εισφορά στο αποθεματικό ταμείο"
        )
        print(f"✅ Created: {reserve_expense.title} - €{reserve_expense.amount}")
        
        # Calculate total
        total_amount = sum([
            management_expense.amount,
            garbage_expense.amount,
            electricity_expense.amount,
            water_expense.amount,
            cleaning_expense.amount,
            reserve_expense.amount
        ])
        
        print(f"\n💰 Total September 2025 expenses: €{total_amount}")
        print(f"📊 Average per apartment: €{total_amount / 10:.2f}")
        
        # Verify the expenses were created
        september_expenses = Expense.objects.filter(
            building_id=1,
            date__year=2025,
            date__month=9
        )
        
        print(f"\n✅ Verification: {september_expenses.count()} expenses created for September 2025")
        
        print("\n" + "=" * 60)
        print("🎉 September 2025 expenses created successfully!")
        print("💡 The date validation warning should now be resolved.")
        print("=" * 60)

if __name__ == "__main__":
    create_september_expenses()

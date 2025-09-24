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
from datetime import date
from decimal import Decimal

# All database operations within tenant context
with schema_context('demo'):
    building = Building.objects.get(id=1)

    print(f"ΔΗΜΙΟΥΡΓΙΑ ΒΑΣΙΚΩΝ MANAGEMENT FEES")
    print(f"Κτίριο: {building.name}")
    print(f"Management Fee per Apartment: {building.management_fee_per_apartment}€")
    print("="*80)

    # Create management fees for 3 months: Sep, Oct, Nov 2025
    months = [
        (2025, 9, "Σεπτέμβριος 2025"),
        (2025, 10, "Οκτώβριος 2025"),
        (2025, 11, "Νοέμβριος 2025")
    ]

    total_monthly_cost = building.management_fee_per_apartment * 10  # 10 apartments

    for year, month, month_name in months:
        expense_date = date(year, month, 1)

        # Check if expense already exists
        existing = Expense.objects.filter(
            building=building,
            date=expense_date,
            category='management_fees'
        ).exists()

        if not existing:
            expense = Expense.objects.create(
                building=building,
                date=expense_date,
                title=f"Δαπάνες Διαχείρισης - {month_name}",
                amount=total_monthly_cost,
                category='management_fees',
                expense_type='management',
                distribution_type='equal_share',
                notes=f"Μηνιαίες δαπάνες διαχείρισης για {month_name}"
            )
            print(f"✅ Δημιουργήθηκε: {expense.title} - {expense.amount}€")
        else:
            print(f"⏭️ Υπάρχει ήδη: {month_name}")

    print("\n" + "="*80)
    print("ΕΛΕΓΧΟΣ ΑΠΟΤΕΛΕΣΜΑΤΩΝ:")

    all_expenses = Expense.objects.filter(building=building)
    print(f"Σύνολο expenses: {all_expenses.count()}")

    for exp in all_expenses:
        print(f"  • {exp.date}: {exp.title} - {exp.amount}€ ({exp.category})")
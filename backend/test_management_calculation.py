import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import CommonExpenseCalculator
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from datetime import datetime
from decimal import Decimal

# All database operations within tenant context
with schema_context('demo'):
    # Get Building 1 (Αλκμάνος 22)
    building = Building.objects.get(id=1)
    apartments = list(Apartment.objects.filter(building=building).order_by('id'))

    # Get September 2025 management expense
    expenses = list(Expense.objects.filter(
        building=building,
        date__year=2025,
        date__month=9,
        title__icontains='Διαχείρισης'
    ))

    print(f"Building: {building.name}")
    print(f"Management fee per apartment: €{building.management_fee_per_apartment}")
    print(f"Number of apartments: {len(apartments)}")
    print(f"Number of management expenses: {len(expenses)}")

    # Test calculation
    calculator = CommonExpenseCalculator(building.id, '2025-09')
    result = calculator.calculate_shares()

    print(f"\nCalculation Results:")
    print(f"Available keys: {list(result.keys())}")

    if 'apartments' in result:
        # Check first apartment
        first_apartment = apartments[0]
        apartment_result = result['apartments'][first_apartment.id]

        print(f"\nApartment {first_apartment.number} breakdown:")
        print(f"Total amount: €{apartment_result['total_amount']}")

        for item in apartment_result['breakdown']:
            print(f"- {item['expense_title']}: €{item['apartment_share']} (ID: {item['expense_id']})")
    else:
        print("Result structure:", result)

    # Check if management fee logic detects existing expenses
    management_expenses_exist = any(
        expense.category == 'management_fees' for expense in expenses
    )
    print(f"\nManagement expenses detected: {management_expenses_exist}")
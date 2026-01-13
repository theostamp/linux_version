import os
import django
from decimal import Decimal
from datetime import date
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from financial.services import FinancialDashboardService

def run_test():
    print("🧪 Starting Expense Balance Fix Test...")

    # 1. Setup Test Data
    # Create a temporary building and apartment
    building = Building.objects.create(
        name="Test Building Balance Fix",
        address="Test Address",
        management_fee_per_apartment=Decimal('10.00')
    )

    apartment = Apartment.objects.create(
        building=building,
        number="A1",
        participation_mills=1000,
        owner_name="Test Owner"
    )

    print(f"✅ Created Building: {building.name}")
    print(f"✅ Created Apartment: {apartment.number} (Mgmt Fee: €10.00)")

    try:
        # 2. Scenario: Month N (e.g., November 2025)
        # Create an expense for Month N
        month_n = "2025-11"
        expense_date_n = date(2025, 11, 15)

        Expense.objects.create(
            building=building,
            title="Test Expense Nov",
            amount=Decimal('40.00'),
            date=expense_date_n,
            category='cleaning',
            distribution_type='by_participation_mills'
        )

        print(f"\n📅 Month N ({month_n}): Created Expense €40.00")

        # Check Balance for Month N
        service = FinancialDashboardService(building.id)
        balances_n = service.get_apartment_balances(month_n)
        apt_balance_n = balances_n[0]

        print(f"   Previous Balance: €{apt_balance_n['previous_balance']}")
        print(f"   Resident Expenses: €{apt_balance_n['resident_expenses']}")
        print(f"   Owner Expenses: €{apt_balance_n['owner_expenses']}")
        print(f"   Net Obligation: €{apt_balance_n['net_obligation']}")

        # 3. Scenario: Month N+1 (e.g., December 2025)
        # No new expenses, just management fee
        month_n_plus_1 = "2025-12"

        print(f"\n📅 Month N+1 ({month_n_plus_1}): No new expenses")

        balances_next = service.get_apartment_balances(month_n_plus_1)
        apt_balance_next = balances_next[0]

        print(f"   Previous Balance: €{apt_balance_next['previous_balance']}")
        print(f"   Resident Expenses: €{apt_balance_next['resident_expenses']}")
        print(f"   Owner Expenses: €{apt_balance_next['owner_expenses']}")
        print(f"   Net Obligation: €{apt_balance_next['net_obligation']}")

        # Verification
        # Resident Expenses should be ONLY Management Fee (10.00)
        if apt_balance_next['resident_expenses'] == Decimal('10.00'):
            print("\n✅ SUCCESS: Resident Expenses for Month N+1 contain ONLY Management Fee (€10.00)")
        else:
            print(f"\n❌ FAILURE: Resident Expenses for Month N+1 are €{apt_balance_next['resident_expenses']} (Expected €10.00)")

        # Previous Balance should be carried forward
        if apt_balance_next['previous_balance'] > 0:
            print(f"✅ SUCCESS: Previous Balance is carried forward: €{apt_balance_next['previous_balance']}")
        else:
            print(f"❌ FAILURE: Previous Balance is NOT carried forward")

    finally:
        # Cleanup
        print("\n🧹 Cleaning up...")
        apartment.delete()
        building.delete()

if __name__ == "__main__":
    run_test()

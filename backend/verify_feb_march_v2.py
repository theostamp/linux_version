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
from financial.models import Expense, Transaction
from apartments.models import Apartment
from financial.services import get_monthly_common_expenses

with schema_context('demo'):
    print("=" * 80)
    print("ΕΠΑΛΗΘΕΥΣΗ: Μεταφορά Δαπανών Φεβρουάριος → Μάρτιος 2026")
    print("=" * 80)

    # Έλεγχος διαμερίσματος 1
    apartment = Apartment.objects.get(building_id=1, number='1')

    print(f"\n🏠 Διαμέρισμα: {apartment.number}")
    print(f"   Participation Mills: {apartment.participation_mills}")

    # Έλεγχος δαπανών διαχείρισης
    print(f"\n📊 ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ:")
    mgmt_expenses = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee'
    ).order_by('date')

    for exp in mgmt_expenses:
        print(f"   • {exp.date} - {exp.title} - €{exp.amount}")

    # Έλεγχος Φεβρουαρίου 2026
    print(f"\n📅 ΦΕΒΡΟΥΑΡΙΟΣ 2026:")

    feb_result = get_monthly_common_expenses(
        building_id=1,
        apartment_id=apartment.id,
        year=2026,
        month=2
    )

    print(f"   Previous Balance: €{feb_result.get('previous_balance', 0)}")
    print(f"   Current Expenses: €{feb_result.get('expense_share', 0)}")
    print(f"   Total Obligation: €{feb_result.get('total_obligation', 0)}")
    print(f"   Payments: €{feb_result.get('payments', 0)}")
    print(f"   Balance: €{feb_result.get('balance', 0)}")

    # Έλεγχος Μαρτίου 2026
    print(f"\n📅 ΜΑΡΤΙΟΣ 2026:")

    march_result = get_monthly_common_expenses(
        building_id=1,
        apartment_id=apartment.id,
        year=2026,
        month=3
    )

    print(f"   Previous Balance: €{march_result.get('previous_balance', 0)}")
    print(f"   Current Expenses: €{march_result.get('expense_share', 0)}")
    print(f"   Total Obligation: €{march_result.get('total_obligation', 0)}")
    print(f"   Payments: €{march_result.get('payments', 0)}")
    print(f"   Balance: €{march_result.get('balance', 0)}")

    # Έλεγχος ότι η δαπάνη Φεβρουαρίου συμπεριλαμβάνεται στο previous_balance Μαρτίου
    print(f"\n🔍 ΑΝΑΛΥΣΗ:")

    # Δαπάνη διαχείρισης Φεβρουαρίου
    feb_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee',
        date__year=2026,
        date__month=2
    ).first()

    if feb_mgmt:
        print(f"   ✅ Δαπάνη Διαχείρισης Φεβρουαρίου: {feb_mgmt.date} - €{feb_mgmt.amount}")

        # Υπολογισμός μεριδίου διαμερίσματος
        if feb_mgmt.distribution_type == 'equal_share':
            num_apartments = Apartment.objects.filter(building_id=1).count()
            per_apartment = feb_mgmt.amount / num_apartments
            print(f"   ✅ Μερίδιο ανά διαμέρισμα (equal_share): €{per_apartment:.2f}")

        # Έλεγχος ότι αυτό το ποσό συμπεριλαμβάνεται στο previous_balance Μαρτίου
        march_prev = Decimal(str(march_result.get('previous_balance', 0)))
        feb_prev = Decimal(str(feb_result.get('previous_balance', 0)))
        feb_expense = Decimal(str(feb_result.get('expense_share', 0)))

        expected_march_prev = feb_prev + feb_expense

        print(f"\n   🧮 ΥΠΟΛΟΓΙΣΜΟΣ:")
        print(f"      Φεβρουάριος Previous Balance: €{feb_prev}")
        print(f"      Φεβρουάριος Expense Share: €{feb_expense}")
        print(f"      Αναμενόμενο Μάρτιος Previous Balance: €{expected_march_prev}")
        print(f"      Πραγματικό Μάρτιος Previous Balance: €{march_prev}")

        if abs(march_prev - expected_march_prev) < Decimal('0.01'):
            print(f"\n   ✅ SUCCESS: Το previous_balance Μαρτίου είναι σωστό!")
        else:
            print(f"\n   ❌ ERROR: Διαφορά €{march_prev - expected_march_prev}")

    # Έλεγχος historical balance query
    print(f"\n🔍 HISTORICAL BALANCE QUERY:")
    march_start = date(2026, 3, 1)
    year_start = date(2026, 1, 1)

    expenses_before_march = Expense.objects.filter(
        building_id=1,
        date__gte=year_start,
        date__lt=march_start
    )

    print(f"   Query: date__gte={year_start} AND date__lt={march_start}")
    print(f"   Βρέθηκαν {expenses_before_march.count()} δαπάνες")

    mgmt_before_march = expenses_before_march.filter(expense_type='management_fee')
    print(f"   Δαπάνες Διαχείρισης: {mgmt_before_march.count()}")
    for exp in mgmt_before_march:
        print(f"      • {exp.date} - {exp.title}")

    print("\n" + "=" * 80)

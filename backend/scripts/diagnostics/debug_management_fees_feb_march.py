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

with schema_context('demo'):
    print("=" * 80)
    print("ΔΙΕΡΕΥΝΗΣΗ: Μεταφορά Δαπανών Διαχείρισης Φεβρουάριος → Μάρτιος 2026")
    print("=" * 80)

    # Βρες όλες τις δαπάνες διαχείρισης
    mgmt_expenses = Expense.objects.filter(
        expense_type='management_fee',
        building_id=1
    ).order_by('date')

    print(f"\n📊 Βρέθηκαν {mgmt_expenses.count()} δαπάνες διαχείρισης:")
    for exp in mgmt_expenses:
        print(f"   • {exp.date} - {exp.title} - €{exp.amount} - Distribution: {exp.distribution_type}")

    # Επιλογή ενός διαμερίσματος για έλεγχο
    apartment = Apartment.objects.filter(building_id=1).first()
    print(f"\n🏠 Έλεγχος διαμερίσματος: {apartment.number}")

    # Έλεγχος Φεβρουαρίου 2026
    feb_start = date(2026, 2, 1)
    feb_end = date(2026, 2, 28)

    print(f"\n📅 ΦΕΒΡΟΥΑΡΙΟΣ 2026 ({feb_start} έως {feb_end}):")

    # Δαπάνες διαχείρισης Φεβρουαρίου
    feb_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee',
        date__gte=feb_start,
        date__lte=feb_end
    )
    print(f"   Δαπάνες διαχείρισης: {feb_mgmt.count()}")
    for exp in feb_mgmt:
        print(f"      • {exp.date} - {exp.title} - €{exp.amount}")

        # Transactions για αυτή την δαπάνη
        trans = Transaction.objects.filter(
            apartment=apartment,
            expense=exp
        )
        print(f"        Transactions: {trans.count()}")
        for t in trans:
            print(f"          - {t.transaction_type}: €{t.amount} (date: {t.date})")

    # Όλες οι δαπάνες πριν τον Μάρτιο
    march_start = date(2026, 3, 1)
    print(f"\n📅 ΔΑΠΑΝΕΣ ΠΡΙΝ ΤΟΝ ΜΑΡΤΙΟ ({march_start}):")

    expenses_before_march = Expense.objects.filter(
        building_id=1,
        date__lt=march_start
    ).order_by('date')

    print(f"   Βρέθηκαν {expenses_before_march.count()} δαπάνες:")
    for exp in expenses_before_march[-10:]:  # Τελευταίες 10
        print(f"      • {exp.date} - {exp.title} - €{exp.amount} - Type: {exp.expense_type}")

    # Transactions διαμερίσματος για Φεβρουάριο
    print(f"\n💰 TRANSACTIONS ΔΙΑΜΕΡΙΣΜΑΤΟΣ ΓΙΑ ΦΕΒΡΟΥΑΡΙΟ:")
    feb_trans = Transaction.objects.filter(
        apartment=apartment,
        date__gte=feb_start,
        date__lte=feb_end
    ).order_by('date')

    print(f"   Βρέθηκαν {feb_trans.count()} transactions:")
    for t in feb_trans:
        expense_title = t.expense.title if t.expense else "N/A"
        print(f"      • {t.date} - {t.transaction_type} - €{t.amount} - Expense: {expense_title}")

    # Έλεγχος historical balance για Μάρτιο
    print(f"\n🔍 ΕΛΕΓΧΟΣ HISTORICAL BALANCE ΓΙΑ ΜΑΡΤΙΟ:")
    print(f"   Filtering: date__lt={march_start}")

    # Δαπάνες διαχείρισης που θα πρέπει να συμπεριληφθούν
    mgmt_before_march = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee',
        date__lt=march_start
    ).order_by('date')

    print(f"   Δαπάνες διαχείρισης πριν {march_start}: {mgmt_before_march.count()}")
    for exp in mgmt_before_march:
        print(f"      • {exp.date} - {exp.title}")

        # Έλεγχος αν υπάρχει transaction
        trans = Transaction.objects.filter(
            apartment=apartment,
            expense=exp
        )
        if trans.exists():
            print(f"        ✅ Transaction exists: €{trans.first().amount}")
        else:
            print(f"        ❌ NO TRANSACTION!")

    # Έλεγχος year_start
    from buildings.models import Building
    building = Building.objects.get(id=1)

    print(f"\n🏢 BUILDING CONFIGURATION:")
    print(f"   financial_system_start_date: {building.financial_system_start_date}")

    if building.financial_system_start_date:
        year_start = date(march_start.year, 1, 1)
        print(f"   year_start για Μάρτιο: {year_start}")

        # Αυτό είναι το query που τρέχει το σύστημα
        historical_expenses = Expense.objects.filter(
            building_id=1,
            date__gte=year_start,
            date__lt=march_start
        ).order_by('date')

        print(f"\n   Query: date__gte={year_start} AND date__lt={march_start}")
        print(f"   Αποτελέσματα: {historical_expenses.count()} δαπάνες")

        # Δαπάνες διαχείρισης στο query
        historical_mgmt = historical_expenses.filter(expense_type='management_fee')
        print(f"   Από αυτές, management fees: {historical_mgmt.count()}")
        for exp in historical_mgmt:
            print(f"      • {exp.date} - {exp.title}")

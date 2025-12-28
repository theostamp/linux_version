import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from apartments.models import Apartment

with schema_context('demo'):
    print("=" * 80)
    print("ΕΠΑΛΗΘΕΥΣΗ: Μεταφορά Δαπανών Διαχείρισης Φεβρουάριος → Μάρτιος 2026")
    print("=" * 80)

    # Έλεγχος διαμερίσματος 1
    apartment = Apartment.objects.get(building_id=1, number='1')

    # Δαπάνη διαχείρισης Φεβρουαρίου
    feb_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee',
        date__year=2026,
        date__month=2
    ).first()

    if feb_mgmt:
        print(f"\n✅ Δαπάνη Διαχείρισης Φεβρουαρίου:")
        print(f"   Date: {feb_mgmt.date}")
        print(f"   Title: {feb_mgmt.title}")
        print(f"   Amount: €{feb_mgmt.amount}")
        print(f"   Distribution: {feb_mgmt.distribution_type}")

        # Transaction για διαμέρισμα 1
        feb_trans = Transaction.objects.filter(
            apartment=apartment,
            expense=feb_mgmt
        ).first()

        if feb_trans:
            print(f"\n   Transaction για Διαμέρισμα {apartment.number}:")
            print(f"   Type: {feb_trans.transaction_type}")
            print(f"   Amount: €{feb_trans.amount}")
            print(f"   Date: {feb_trans.date}")
        else:
            print(f"\n   ❌ ΔΕΝ ΒΡΕΘΗΚΕ Transaction για διαμέρισμα {apartment.number}!")

    # Έλεγχος ότι η δαπάνη Φεβρουαρίου φαίνεται στο historical balance Μαρτίου
    march_start = date(2026, 3, 1)
    year_start = date(2026, 1, 1)

    print(f"\n📊 HISTORICAL BALANCE CHECK για Μάρτιο 2026:")
    print(f"   Query: date__gte={year_start} AND date__lt={march_start}")

    expenses_before_march = Expense.objects.filter(
        building_id=1,
        date__gte=year_start,
        date__lt=march_start
    ).order_by('date')

    print(f"   Βρέθηκαν {expenses_before_march.count()} δαπάνες πριν τον Μάρτιο")

    # Δαπάνες διαχείρισης πριν τον Μάρτιο
    mgmt_before_march = expenses_before_march.filter(expense_type='management_fee')
    print(f"\n   Δαπάνες Διαχείρισης πριν {march_start}: {mgmt_before_march.count()}")
    for exp in mgmt_before_march:
        print(f"      • {exp.date} - {exp.title} - €{exp.amount}")

        # Έλεγχος transaction
        trans = Transaction.objects.filter(
            apartment=apartment,
            expense=exp
        ).first()

        if trans:
            print(f"        ✅ Transaction: €{trans.amount}")
        else:
            print(f"        ❌ NO TRANSACTION!")

    # Υπολογισμός historical balance για Μάρτιο
    historical_trans = Transaction.objects.filter(
        apartment=apartment,
        expense__date__gte=year_start,
        expense__date__lt=march_start
    )

    total_obligations = sum(
        t.amount for t in historical_trans if t.transaction_type == 'obligation'
    )
    total_payments = sum(
        t.amount for t in historical_trans if t.transaction_type == 'payment'
    )

    historical_balance = total_obligations - total_payments

    print(f"\n💰 ΥΠΟΛΟΓΙΣΜΟΣ HISTORICAL BALANCE για Μάρτιο:")
    print(f"   Total Obligations: €{total_obligations}")
    print(f"   Total Payments: €{total_payments}")
    print(f"   Historical Balance: €{historical_balance}")

    # Δαπάνες Μαρτίου
    march_expenses = Expense.objects.filter(
        building_id=1,
        date__year=2026,
        date__month=3
    )

    print(f"\n📅 ΔΑΠΑΝΕΣ ΜΑΡΤΙΟΥ:")
    for exp in march_expenses:
        print(f"   • {exp.date} - {exp.title} - €{exp.amount}")

        trans = Transaction.objects.filter(
            apartment=apartment,
            expense=exp
        ).first()

        if trans:
            print(f"     Transaction: €{trans.amount}")

    # Συνολικό υπόλοιπο Μαρτίου (historical + current)
    march_trans = Transaction.objects.filter(
        apartment=apartment,
        expense__date__year=2026,
        expense__date__month=3
    )

    march_obligations = sum(
        t.amount for t in march_trans if t.transaction_type == 'obligation'
    )

    total_march_balance = historical_balance + march_obligations

    print(f"\n🎯 ΤΕΛΙΚΟ ΥΠΟΛΟΙΠΟ ΜΑΡΤΙΟΥ:")
    print(f"   Historical Balance: €{historical_balance}")
    print(f"   March Obligations: €{march_obligations}")
    print(f"   Total Balance: €{total_march_balance}")

    print("\n" + "=" * 80)

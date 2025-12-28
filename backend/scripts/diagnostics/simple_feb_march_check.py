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
from financial.models import Expense
from apartments.models import Apartment

with schema_context('demo'):
    print("=" * 80)
    print("ΕΛΕΓΧΟΣ: Μεταφορά Δαπανών Διαχείρισης Φεβρουάριος → Μάρτιος 2026")
    print("=" * 80)

    # Βρες διαμέρισμα 1
    apartment = Apartment.objects.get(building_id=1, number='1')
    num_apartments = Apartment.objects.filter(building_id=1).count()

    print(f"\n🏠 Διαμέρισμα: {apartment.number}")
    print(f"📊 Συνολικά διαμερίσματα: {num_apartments}")

    # Όλες οι δαπάνες διαχείρισης
    print(f"\n📋 ΟΛΕΣ ΟΙ ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ:")
    all_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee'
    ).order_by('date')

    for exp in all_mgmt:
        per_apt = exp.amount / num_apartments
        print(f"   {exp.date} - {exp.title} - €{exp.amount} (€{per_apt:.2f}/apt)")

    # Δαπάνες πριν τον Μάρτιο
    print(f"\n📅 ΔΑΠΑΝΕΣ ΠΡΙΝ ΤΟΝ ΜΑΡΤΙΟ 2026:")
    march_start = date(2026, 3, 1)
    year_start = date(2026, 1, 1)

    expenses_before_march = Expense.objects.filter(
        building_id=1,
        date__gte=year_start,
        date__lt=march_start
    ).order_by('date')

    print(f"   Query: date >= {year_start} AND date < {march_start}")
    print(f"   Αποτελέσματα: {expenses_before_march.count()} δαπάνες")

    mgmt_before_march = expenses_before_march.filter(expense_type='management_fee')
    print(f"\n   Δαπάνες Διαχείρησης πριν Μάρτιο: {mgmt_before_march.count()}")

    total_mgmt_before_march = Decimal('0')
    for exp in mgmt_before_march:
        per_apt = exp.amount / num_apartments
        total_mgmt_before_march += per_apt
        print(f"      • {exp.date} - €{exp.amount} (€{per_apt:.2f}/apt)")

    print(f"\n   🧮 Σύνολο δαπανών διαχείρισης για διαμ. 1: €{total_mgmt_before_march:.2f}")

    # Δαπάνη Φεβρουαρίου 2026
    print(f"\n🔍 ΔΑΠΑΝΗ ΦΕΒΡΟΥΑΡΙΟΥ 2026:")
    feb_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee',
        date__year=2026,
        date__month=2
    ).first()

    if feb_mgmt:
        feb_per_apt = feb_mgmt.amount / num_apartments
        print(f"   ✅ Δαπάνη: {feb_mgmt.date} - €{feb_mgmt.amount}")
        print(f"   ✅ Μερίδιο διαμ. 1: €{feb_per_apt:.2f}")
        print(f"   ✅ Distribution Type: {feb_mgmt.distribution_type}")

        # Έλεγχος αν συμπεριλαμβάνεται στο query
        if feb_mgmt in mgmt_before_march:
            print(f"   ✅ Συμπεριλαμβάνεται στο historical balance query!")
        else:
            print(f"   ❌ ΔΕΝ συμπεριλαμβάνεται στο historical balance query!")
            print(f"      Λόγος: date={feb_mgmt.date}, query uses date__lt={march_start}")
    else:
        print(f"   ❌ ΔΕΝ ΒΡΕΘΗΚΕ δαπάνη Φεβρουαρίου!")

    # Δαπάνη Μαρτίου 2026
    print(f"\n📅 ΔΑΠΑΝΗ ΜΑΡΤΙΟΥ 2026:")
    march_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee',
        date__year=2026,
        date__month=3
    ).first()

    if march_mgmt:
        march_per_apt = march_mgmt.amount / num_apartments
        print(f"   ✅ Δαπάνη: {march_mgmt.date} - €{march_mgmt.amount}")
        print(f"   ✅ Μερίδιο διαμ. 1: €{march_per_apt:.2f}")
    else:
        print(f"   ❌ ΔΕΝ ΒΡΕΘΗΚΕ δαπάνη Μαρτίου!")

    print("\n" + "=" * 80)

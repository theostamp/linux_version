import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from apartments.models import Apartment
from collections import defaultdict

with schema_context('demo'):
    print("=" * 80)
    print("ΚΑΘΟΛΙΚΟΣ ΕΛΕΓΧΟΣ: Διπλές Δαπάνες & Transactions")
    print("=" * 80)

    num_apartments = Apartment.objects.filter(building_id=1).count()
    print(f"\n📊 Διαμερίσματα: {num_apartments}")

    # Έλεγχος όλων των μηνών
    all_mgmt_expenses = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee'
    ).order_by('date')

    print(f"\n📋 Βρέθηκαν {all_mgmt_expenses.count()} δαπάνες διαχείρισης")

    # Group by month
    by_month = defaultdict(list)
    for exp in all_mgmt_expenses:
        month_key = f"{exp.date.year}-{exp.date.month:02d}"
        by_month[month_key].append(exp)

    print(f"\n{'='*80}")
    print("ΕΛΕΓΧΟΣ ΑΝΑ ΜΗΝΑ")
    print(f"{'='*80}")

    issues_found = False
    duplicate_expenses = []
    duplicate_transactions_months = []

    for month_key in sorted(by_month.keys()):
        expenses = by_month[month_key]

        print(f"\n📅 {month_key}:")

        # Check for duplicate expenses
        if len(expenses) > 1:
            issues_found = True
            print(f"   ❌ ΠΡΟΒΛΗΜΑ: {len(expenses)} δαπάνες (αναμένονται 1)")
            for exp in expenses:
                print(f"      • ID {exp.id}: {exp.title} (type: {exp.expense_type})")
            duplicate_expenses.extend(expenses)
        else:
            exp = expenses[0]
            print(f"   ✅ Δαπάνη: {exp.title}")

            # Check transactions for this expense
            trans = Transaction.objects.filter(
                building_id=1,
                description__icontains=exp.title.split()[0]  # "Διαχειριστικά"
            )

            expected = num_apartments
            actual = trans.count()

            if actual != expected:
                issues_found = True
                print(f"   ❌ ΠΡΟΒΛΗΜΑ: {actual} transactions (αναμένονται {expected})")
                duplicate_transactions_months.append((month_key, exp, trans))

                # Show duplicates per apartment
                by_apt = defaultdict(list)
                for t in trans:
                    by_apt[t.apartment_id].append(t)

                for apt_id, apt_trans in by_apt.items():
                    if len(apt_trans) > 1:
                        apt = Apartment.objects.get(id=apt_id)
                        print(f"      • Διαμ. {apt.number}: {len(apt_trans)} transactions")
            else:
                print(f"   ✅ Transactions: {actual}")

    # Summary
    print(f"\n{'='*80}")
    print("ΣΥΝΟΨΗ")
    print(f"{'='*80}")

    if issues_found:
        print(f"\n❌ ΒΡΕΘΗΚΑΝ ΠΡΟΒΛΗΜΑΤΑ:")

        if duplicate_expenses:
            print(f"\n   📋 Διπλές Δαπάνες: {len(duplicate_expenses)} σε {len([k for k, v in by_month.items() if len(v) > 1])} μήνες")

        if duplicate_transactions_months:
            print(f"   💳 Διπλές Transactions: {len(duplicate_transactions_months)} μήνες")
            for month_key, exp, trans in duplicate_transactions_months:
                print(f"      • {month_key}: {trans.count()} transactions (αναμένονται {num_apartments})")
    else:
        print(f"\n✅ ΟΛΑ ΟΚ! Δεν βρέθηκαν προβλήματα")

    # Προτεινόμενη διόρθωση
    if issues_found:
        print(f"\n{'='*80}")
        print("ΠΡΟΤΕΙΝΟΜΕΝΗ ΔΙΟΡΘΩΣΗ")
        print(f"{'='*80}")

        print(f"""
Για καθολική διόρθωση, τρέξτε:

1. Διαγραφή ΟΛΩΝ των δαπανών διαχείρισης:
   python /app/delete_all_management_fees.py

2. Δημιουργία ξανά με το σωστό σύστημα:
   docker exec linux_version-backend-1 python manage.py generate_recurring_expenses \\
       --building_id 1 \\
       --from 2025-10 \\
       --to 2026-03

Αυτό θα διασφαλίσει ότι ΟΛΑ τα data είναι καθαρά και σωστά.
        """)

    print(f"\n{'='*80}")

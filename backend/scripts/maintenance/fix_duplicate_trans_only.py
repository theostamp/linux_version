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
    print("ΔΙΟΡΘΩΣΗ: Διαγραφή ΜΟΝΟ Διπλών Transactions (όχι Expenses)")
    print("=" * 80)

    num_apartments = Apartment.objects.filter(building_id=1).count()

    # Βρες όλες τις δαπάνες διαχείρισης
    all_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee'
    ).order_by('date')

    print(f"\n📋 Βρέθηκαν {all_mgmt.count()} δαπάνες διαχείρισης")
    print(f"📊 Διαμερίσματα: {num_apartments}")
    print(f"✅ Αναμενόμενες transactions: {num_apartments} ανά δαπάνη")

    total_fixed = 0

    for exp in all_mgmt:
        month = f"{exp.date.year}-{exp.date.month:02d}"
        print(f"\n📅 {month}: {exp.title}")

        # Βρες transactions για αυτή τη δαπάνη
        trans = Transaction.objects.filter(
            building_id=1,
            description__icontains=exp.title.split()[0]  # "Διαχειριστικά"
        ).filter(
            date__year=exp.date.year,
            date__month=exp.date.month
        ).order_by('apartment_id', 'id')

        print(f"   Βρέθηκαν {trans.count()} transactions")

        # Group by apartment
        by_apt = defaultdict(list)
        for t in trans:
            by_apt[t.apartment_id].append(t)

        # Διαγραφή duplicates
        for apt_id, apt_trans in by_apt.items():
            if len(apt_trans) > 1:
                apt = Apartment.objects.get(id=apt_id)

                # Κράτα την πρώτη
                keep = apt_trans[0]
                duplicates = apt_trans[1:]

                for dup in duplicates:
                    dup.delete()
                    total_fixed += 1

                print(f"      Διαμ. {apt.number}: Διαγράφηκαν {len(duplicates)} διπλές")

    print(f"\n{'='*80}")
    print(f"✅ Διαγράφηκαν {total_fixed} διπλές transactions")
    print(f"{'='*80}")

    # Τελικός έλεγχος
    print(f"\nΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ:")

    all_trans = Transaction.objects.filter(
        building_id=1,
        description__icontains='Διαχειριστικά'
    )

    expected = num_apartments * all_mgmt.count()
    actual = all_trans.count()

    print(f"   Αναμενόμενες transactions: {expected}")
    print(f"   Πραγματικές transactions: {actual}")

    if actual == expected:
        print(f"\n   ✅ ΟΚ! Σωστός αριθμός transactions")
    else:
        print(f"\n   ❌ Ακόμη υπάρχει πρόβλημα!")

    print(f"\n{'='*80}")

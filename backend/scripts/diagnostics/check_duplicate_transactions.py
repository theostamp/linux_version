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

with schema_context('demo'):
    print("=" * 80)
    print("ΕΛΕΓΧΟΣ: Διπλές Transactions")
    print("=" * 80)

    # Βρες τη δαπάνη διαχείρισης Οκτωβρίου
    mgmt_exp = Expense.objects.get(
        building_id=1,
        date__year=2025,
        date__month=10,
        expense_type='management_fee'
    )

    print(f"\n📋 Δαπάνη: {mgmt_exp.title}")
    print(f"   Date: {mgmt_exp.date}")
    print(f"   Amount: €{mgmt_exp.amount}")

    # Βρες όλες τις transactions για αυτή τη δαπάνη
    print(f"\n🔍 Transactions για αυτή τη δαπάνη:")

    mgmt_trans = Transaction.objects.filter(
        building_id=1,
        description__icontains='Διαχειριστικά Έξοδα October'
    ).order_by('apartment_id', 'date', 'id')

    num_apartments = Apartment.objects.filter(building_id=1).count()

    print(f"   Αναμενόμενες: {num_apartments} (1 ανά διαμέρισμα)")
    print(f"   Πραγματικές: {mgmt_trans.count()}")

    # Group by apartment
    from collections import defaultdict
    by_apartment = defaultdict(list)

    for trans in mgmt_trans:
        by_apartment[trans.apartment_id].append(trans)

    print(f"\n📊 Ανά Διαμέρισμα:")
    duplicates_found = False

    for apt_id, trans_list in sorted(by_apartment.items()):
        apt = Apartment.objects.get(id=apt_id)
        if len(trans_list) > 1:
            duplicates_found = True
            print(f"\n   ❌ Διαμέρισμα {apt.number}: {len(trans_list)} transactions (ΔΙΠΛΟ!)")
            for trans in trans_list:
                print(f"      • ID {trans.id}: {trans.date} - €{trans.amount} - {trans.type}")
        else:
            trans = trans_list[0]
            print(f"   ✅ Διαμέρισμα {apt.number}: 1 transaction (€{trans.amount})")

    if duplicates_found:
        print(f"\n{'='*80}")
        print("ΔΙΟΡΘΩΣΗ ΔΙΠΛΩΝ TRANSACTIONS")
        print(f"{'='*80}")

        for apt_id, trans_list in by_apartment.items():
            if len(trans_list) > 1:
                apt = Apartment.objects.get(id=apt_id)

                # Κράτησε την πρώτη (χρονολογικά)
                keep = trans_list[0]
                duplicates = trans_list[1:]

                print(f"\n🏠 Διαμέρισμα {apt.number}:")
                print(f"   ✅ Κρατάμε: ID {keep.id} ({keep.date})")
                print(f"   🗑️  Διαγραφή:")

                for dup in duplicates:
                    print(f"      • ID {dup.id} ({dup.date})")
                    dup.delete()

                print(f"   ✅ Διαγράφηκαν {len(duplicates)} διπλές transactions")

        print(f"\n✅ Διόρθωση ολοκληρώθηκε!")

    else:
        print(f"\n✅ Δεν βρέθηκαν διπλές transactions")

    # Τελικός έλεγχος
    print(f"\n{'='*80}")
    print("ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ")
    print(f"{'='*80}")

    final_trans = Transaction.objects.filter(
        building_id=1,
        description__icontains='Διαχειριστικά Έξοδα October'
    )

    print(f"\n📊 Τελικές Transactions: {final_trans.count()}")
    print(f"   Αναμενόμενες: {num_apartments}")

    if final_trans.count() == num_apartments:
        print(f"\n✅ ΟΚ! Σωστός αριθμός transactions")
    else:
        print(f"\n❌ ΠΡΟΒΛΗΜΑ! Λάθος αριθμός transactions")

    print(f"\n{'='*80}")

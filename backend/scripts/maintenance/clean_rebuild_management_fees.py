import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction

with schema_context('demo'):
    print("=" * 80)
    print("ΚΑΘΟΛΙΚΗ ΔΙΟΡΘΩΣΗ: Clean & Rebuild Management Fees")
    print("=" * 80)

    # ΒΗΜΑ 1: Διαγραφή ΟΛΩΝ των δαπανών διαχείρισης
    print(f"\n{'='*80}")
    print("ΒΗΜΑ 1: Διαγραφή όλων των δαπανών διαχείρισης")
    print(f"{'='*80}")

    all_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee'
    )

    print(f"\n🔍 Βρέθηκαν {all_mgmt.count()} δαπάνες διαχείρισης")

    for exp in all_mgmt:
        month = f"{exp.date.year}-{exp.date.month:02d}"
        print(f"   🗑️  {month}: {exp.title}")

        # Διαγραφή transactions
        trans = Transaction.objects.filter(
            building_id=1,
            description__icontains=exp.title.split()[0]  # "Διαχειριστικά"
        )
        trans_count = trans.count()
        trans.delete()
        print(f"       Deleted {trans_count} transactions")

    # Διαγραφή των expenses
    deleted_count = all_mgmt.count()
    all_mgmt.delete()

    print(f"\n✅ Διαγράφηκαν {deleted_count} δαπάνες και οι transactions τους")

    # ΒΗΜΑ 2: Επαλήθευση
    print(f"\n{'='*80}")
    print("ΒΗΜΑ 2: Επαλήθευση καθαρισμού")
    print(f"{'='*80}")

    remaining_mgmt = Expense.objects.filter(
        building_id=1,
        expense_type='management_fee'
    ).count()

    remaining_trans = Transaction.objects.filter(
        building_id=1,
        description__icontains='Διαχειριστικά'
    ).count()

    print(f"\n   Υπόλοιπες δαπάνες διαχείρισης: {remaining_mgmt}")
    print(f"   Υπόλοιπες transactions: {remaining_trans}")

    if remaining_mgmt == 0 and remaining_trans == 0:
        print(f"\n   ✅ Καθαρισμός επιτυχής!")
    else:
        print(f"\n   ❌ ΠΡΟΒΛΗΜΑ: Υπάρχουν ακόμη υπόλοιπα!")

    # ΒΗΜΑ 3: Οδηγίες για rebuild
    print(f"\n{'='*80}")
    print("ΒΗΜΑ 3: Rebuild με το σωστό σύστημα")
    print(f"{'='*80}")

    print(f"""
Τώρα τρέξτε το command για να δημιουργήσετε ξανά τα data:

docker exec linux_version-backend-1 python manage.py generate_recurring_expenses \\
    --building_id 1 \\
    --from 2025-10 \\
    --to 2026-03

Αυτό θα δημιουργήσει:
- 6 δαπάνες διαχείρισης (μία ανά μήνα)
- 60 transactions (10 ανά μήνα, μία ανά διαμέρισμα)
- Όλα με σωστά ποσά και ημερομηνίες
    """)

    print(f"\n{'='*80}")

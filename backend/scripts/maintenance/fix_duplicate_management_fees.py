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
    print("ΔΙΟΡΘΩΣΗ: Διπλές Δαπάνες Διαχείρισης")
    print("=" * 80)

    # Βρες όλες τις δαπάνες διαχείρισης Οκτωβρίου
    print("\n🔍 Έλεγχος δαπανών διαχείρισης Οκτωβρίου 2025:")

    oct_mgmt = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=10
    ).filter(
        title__icontains='Διαχειριστικά'
    ).order_by('date', 'id')

    print(f"   Βρέθηκαν {oct_mgmt.count()} δαπάνες:")
    for exp in oct_mgmt:
        trans_count = Transaction.objects.filter(
            building_id=1,
            description__icontains=exp.title
        ).count()
        print(f"   • ID {exp.id}: {exp.date} - {exp.title}")
        print(f"     Type: {exp.expense_type}, Amount: €{exp.amount}")
        print(f"     Transactions: {trans_count}")

    if oct_mgmt.count() > 1:
        print(f"\n❌ Βρέθηκαν διπλές δαπάνες!")

        # Κράτησε τη σωστή (management_fee)
        correct = oct_mgmt.filter(expense_type='management_fee').first()
        duplicates = oct_mgmt.exclude(id=correct.id)

        print(f"\n✅ Σωστή δαπάνη (θα κρατηθεί):")
        print(f"   ID {correct.id}: {correct.title} (type: {correct.expense_type})")

        print(f"\n🗑️  Διπλές δαπάνες (θα διαγραφούν):")
        for dup in duplicates:
            print(f"   ID {dup.id}: {dup.title} (type: {dup.expense_type})")

            # Διαγραφή σχετικών transactions
            dup_trans = Transaction.objects.filter(
                building_id=1,
                description__icontains=dup.title,
                date__year=2025,
                date__month=10
            )
            print(f"      Transactions to delete: {dup_trans.count()}")

            # DELETE
            trans_deleted = dup_trans.delete()
            print(f"      ✅ Deleted {trans_deleted[0]} transactions")

            dup.delete()
            print(f"      ✅ Deleted expense ID {dup.id}")

        print(f"\n✅ Διόρθωση ολοκληρώθηκε!")

    else:
        print(f"\n✅ Δεν βρέθηκαν διπλές δαπάνες")

    # Τελικός έλεγχος
    print(f"\n{'='*80}")
    print("ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ")
    print(f"{'='*80}")

    final_mgmt = Expense.objects.filter(
        building_id=1,
        date__year=2025,
        date__month=10,
        expense_type='management_fee'
    )

    print(f"\n📊 Δαπάνες διαχείρισης Οκτωβρίου:")
    for exp in final_mgmt:
        trans_count = Transaction.objects.filter(
            building_id=1,
            description__icontains=exp.title
        ).count()
        print(f"   • {exp.date} - {exp.title} - €{exp.amount}")
        print(f"     Transactions: {trans_count}")

    print(f"\n{'='*80}")

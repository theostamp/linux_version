import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Transaction
from apartments.models import Apartment

with schema_context('demo'):
    print("=== ΚΑΘΑΡΙΣΜΟΣ ΣΥΣΤΗΜΑΤΟΣ ΠΛΗΡΩΜΩΝ ===")

    # 1. Διέγραψε όλα τα Payment records
    payment_count = Payment.objects.count()
    Payment.objects.all().delete()
    print(f"✅ Διαγράφηκαν {payment_count} Payment records")

    # 2. Διέγραψε όλα τα Transaction records που σχετίζονται με πληρωμές
    payment_transaction_count = Transaction.objects.filter(
        type__in=['payment_received', 'common_expense_payment']
    ).count()

    Transaction.objects.filter(
        type__in=['payment_received', 'common_expense_payment']
    ).delete()
    print(f"✅ Διαγράφηκαν {payment_transaction_count} Payment Transaction records")

    # 3. Επανέφερε τα υπόλοιπα διαμερισμάτων στο 0
    apartments = Apartment.objects.all()
    reset_count = 0
    for apartment in apartments:
        if apartment.current_balance != 0:
            print(f"  Επαναφορά υπολοίπου διαμ. {apartment.number}: {apartment.current_balance}€ → 0€")
            apartment.current_balance = 0
            apartment.save()
            reset_count += 1

    print(f"✅ Επαναφέρθηκαν {reset_count} υπόλοιπα διαμερισμάτων")

    # 4. Έλεγχος καθαρότητας
    print(f"\n=== ΕΛΕΓΧΟΣ ΚΑΘΑΡΟΤΗΤΑΣ ===")
    print(f"Payment records: {Payment.objects.count()}")
    print(f"Payment Transaction records: {Transaction.objects.filter(type__in=['payment_received', 'common_expense_payment']).count()}")
    print(f"Apartments με υπόλοιπο ≠ 0: {Apartment.objects.exclude(current_balance=0).count()}")

    # 5. Έλεγχος expense transactions (πρέπει να παραμείνουν)
    expense_transactions = Transaction.objects.exclude(
        type__in=['payment_received', 'common_expense_payment']
    )
    print(f"Expense Transaction records (να παραμείνουν): {expense_transactions.count()}")

    print(f"\n🧹 Το σύστημα πληρωμών καθαρίστηκε επιτυχώς!")
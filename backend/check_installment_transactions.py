#!/usr/bin/env python
"""
Έλεγχος για transactions που αντιστοιχούν σε δόσεις έργων
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from buildings.models import Building

def check_installment_transactions():
    """Ελέγχει αν υπάρχουν transactions για τις δόσεις"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ TRANSACTIONS ΓΙΑ ΔΟΣΕΙΣ ΕΡΓΩΝ")
        print("="*80 + "\n")

        # Βρίσκουμε τις δόσεις
        installments = Expense.objects.filter(
            title__icontains='Δόση'
        ).order_by('date')

        if not installments:
            print("❌ Δεν βρέθηκαν δόσεις")
            return

        print(f"Βρέθηκαν {installments.count()} δόσεις\n")

        for expense in installments:
            print(f"📋 {expense.title}")
            print(f"   ID: {expense.id}")
            print(f"   Date: {expense.date}")
            print(f"   Amount: €{expense.amount}")
            print(f"   Category: {expense.category}")

            # Ψάχνουμε για transactions που αναφέρονται σε αυτή τη δαπάνη
            transactions = Transaction.objects.filter(
                reference_type='expense',
                reference_id=str(expense.id)
            )

            print(f"   Transactions: {transactions.count()}")

            if transactions.exists():
                for trans in transactions:
                    print(f"      • {trans.type} | {trans.apartment.number if trans.apartment else 'N/A'} | €{trans.amount}")
            else:
                print(f"      ⚠️  ΔΕΝ ΥΠΑΡΧΟΥΝ TRANSACTIONS!")

            print()

        print("\n" + "="*80)
        print("ΣΥΝΟΨΗ")
        print("="*80 + "\n")

        total_installments = installments.count()
        installments_with_transactions = sum(1 for exp in installments
                                             if Transaction.objects.filter(
                                                 reference_type='expense',
                                                 reference_id=str(exp.id)
                                             ).exists())

        print(f"Σύνολο δόσεων: {total_installments}")
        print(f"Δόσεις με transactions: {installments_with_transactions}")
        print(f"Δόσεις χωρίς transactions: {total_installments - installments_with_transactions}")

        if installments_with_transactions == 0:
            print("\n⚠️  ΠΡΟΒΛΗΜΑ: Καμία δόση δεν έχει transactions!")
            print("   Αυτό εξηγεί γιατί δεν εμφανίζονται οι παλιές οφειλές.")

if __name__ == '__main__':
    check_installment_transactions()

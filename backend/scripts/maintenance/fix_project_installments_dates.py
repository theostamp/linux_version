#!/usr/bin/env python
"""
Διόρθωση ημερομηνιών δόσεων έργων

Πρόβλημα: Οι δόσεις δημιουργούνται με date=πρώτη του μήνα πληρωμής,
αλλά πρέπει να είναι με date=τελευταία του προηγούμενου μήνα για να
εμφανίζονται ως παλιές οφειλές.

Λύση: Αλλάζουμε το date κάθε δόσης να είναι 1 ημέρα πριν (τελευταία του προηγούμενου μήνα)
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building

def fix_installment_dates():
    """Διορθώνει τις ημερομηνίες δόσεων έργων"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΔΙΟΡΘΩΣΗ ΗΜΕΡΟΜΗΝΙΩΝ ΔΟΣΕΩΝ ΕΡΓΩΝ")
        print("="*80 + "\n")

        # Βρίσκουμε όλες τις δαπάνες που είναι δόσεις
        installment_expenses = Expense.objects.filter(
            title__icontains='Δόση'
        ).order_by('date')

        if not installment_expenses:
            print("❌ Δεν βρέθηκαν δόσεις έργων")
            return

        print(f"Βρέθηκαν {installment_expenses.count()} δόσεις έργων\n")

        fixed_count = 0
        for expense in installment_expenses:
            print(f"\n📋 Δόση: {expense.title}")
            print(f"   Τρέχουσα ημερομηνία: {expense.date}")
            print(f"   Due date: {expense.due_date}")

            # Ελέγχουμε αν η ημερομηνία είναι η πρώτη του μήνα
            if expense.date.day == 1:
                # Η νέα ημερομηνία θα είναι 1 ημέρα πριν (τελευταία του προηγούμενου μήνα)
                new_date = expense.date - timedelta(days=1)

                print(f"   ✅ Διόρθωση: {expense.date} → {new_date}")

                expense.date = new_date
                expense.save(update_fields=['date'])

                fixed_count += 1
            else:
                print(f"   ℹ️  Η ημερομηνία δεν χρειάζεται διόρθωση")

        print("\n" + "="*80)
        print(f"ΟΛΟΚΛΗΡΩΣΗ: Διορθώθηκαν {fixed_count} δόσεις")
        print("="*80 + "\n")

        # Εμφάνιση τελικής κατάστασης
        print("\nΤΕΛΙΚΗ ΚΑΤΑΣΤΑΣΗ ΔΟΣΕΩΝ:\n")
        for expense in installment_expenses:
            print(f"• {expense.title}")
            print(f"  Date: {expense.date} | Due: {expense.due_date}")
            print(f"  Ποσό: €{expense.amount}")
            print()

if __name__ == '__main__':
    fix_installment_dates()

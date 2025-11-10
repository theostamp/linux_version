#!/usr/bin/env python
"""
Διόρθωση V2: Οι δόσεις πρέπει να έχουν date = τελευταία του μήνα πληρωμής,
όχι του προηγούμενου μήνα!

Λογική:
- Προκαταβολή: 03/10 (Οκτώβριος) → εμφανίζεται στις παλιές οφειλές Νοεμβρίου
- Δόση 1 για πληρωμή Νοεμβρίου: date=30/11 → εμφανίζεται στις παλιές οφειλές Δεκεμβρίου
- Δόση 2 για πληρωμή Δεκεμβρίου: date=31/12 → εμφανίζεται στις παλιές οφειλές Ιανουαρίου
"""
import os
import sys
import django
from datetime import timedelta
import calendar

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense

def fix_installment_dates_v2():
    """Διορθώνει τις ημερομηνίες δόσεων - V2"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΔΙΟΡΘΩΣΗ ΗΜΕΡΟΜΗΝΙΩΝ ΔΟΣΕΩΝ - V2")
        print("="*80 + "\n")

        # Βρίσκουμε όλες τις δόσεις
        installments = Expense.objects.filter(
            title__icontains='Δόση'
        ).order_by('date')

        if not installments:
            print("❌ Δεν βρέθηκαν δόσεις")
            return

        print(f"Βρέθηκαν {installments.count()} δόσεις\n")

        for installment in installments:
            print(f"📋 {installment.title}")
            print(f"   Τρέχουσα date: {installment.date}")
            print(f"   Τρέχουσα due_date: {installment.due_date}")

            # Η due_date είναι η τελευταία του μήνα πληρωμής
            # Η date πρέπει να είναι ΕΠΙΣΗΣ η τελευταία του μήνα πληρωμής
            # Έτσι η δόση εμφανίζεται ως παλιά οφειλή τον ΕΠΟΜΕΝΟ μήνα

            if installment.due_date:
                new_date = installment.due_date

                if installment.date != new_date:
                    print(f"   ✅ Διόρθωση: {installment.date} → {new_date}")

                    installment.date = new_date
                    installment.save(update_fields=['date'])
                else:
                    print(f"   ℹ️  Η ημερομηνία είναι ήδη σωστή")
            else:
                print(f"   ⚠️  Δεν υπάρχει due_date!")

            print()

        print("\n" + "="*80)
        print("ΤΕΛΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("="*80 + "\n")

        # Εμφάνιση όλων των δαπανών έργων (προκαταβολές + δόσεις)
        project_expenses = Expense.objects.filter(
            category='project'
        ).order_by('date')

        for exp in project_expenses:
            print(f"• {exp.title}")
            print(f"  Date: {exp.date} | Due: {exp.due_date}")
            print(f"  Ποσό: €{exp.amount}")
            print()

if __name__ == '__main__':
    fix_installment_dates_v2()

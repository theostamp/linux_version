#!/usr/bin/env python
"""
Διόρθωση υπαρχουσών δόσεων έργων που επικαλύπτονται με την προκαταβολή
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building

def fix_existing_installments():
    """Διορθώνει τις υπάρχουσες δόσεις για να μην επικαλύπτονται με την προκαταβολή"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΔΙΟΡΘΩΣΗ ΔΟΣΕΩΝ ΕΡΓΩΝ")
        print("="*80 + "\n")

        # Βρίσκουμε όλα τα έργα με προκαταβολή
        projects_with_advance = Expense.objects.filter(
            title__icontains='Προκαταβολή'
        ).order_by('date')

        if not projects_with_advance:
            print("❌ Δεν βρέθηκαν έργα με προκαταβολή")
            return

        for advance in projects_with_advance:
            # Βρίσκουμε το όνομα του έργου (χωρίς το "- Προκαταβολή")
            project_name = advance.title.split(' - Προκαταβολή')[0]

            print(f"\n{'='*80}")
            print(f"📋 Έργο: {project_name}")
            print(f"{'='*80}\n")

            print(f"Προκαταβολή:")
            print(f"   Date: {advance.date}")
            print(f"   Amount: €{advance.amount}\n")

            # Βρίσκουμε τις δόσεις του έργου
            installments = Expense.objects.filter(
                building=advance.building,
                title__icontains=project_name
            ).filter(
                title__icontains='Δόση'
            ).order_by('date')

            if not installments:
                print("   ℹ️  Δεν βρέθηκαν δόσεις για αυτό το έργο")
                continue

            print(f"Βρέθηκαν {installments.count()} δόσεις:\n")

            # Υπολογισμός του μήνα της προκαταβολής
            advance_month = advance.date.replace(day=1)

            # Οι δόσεις πρέπει να ξεκινούν από τον ΕΠΟΜΕΝΟ μήνα
            first_installment_month = advance_month + relativedelta(months=1)

            print(f"Μήνας προκαταβολής: {advance_month.strftime('%Y-%m')}")
            print(f"Πρώτη δόση πρέπει να είναι στον: {first_installment_month.strftime('%Y-%m')}\n")

            # Διόρθωση κάθε δόσης
            for idx, installment in enumerate(installments, start=1):
                print(f"Δόση {idx}:")
                print(f"   Τρέχουσα date: {installment.date}")
                print(f"   Τρέχουσα due_date: {installment.due_date}")

                # Υπολογισμός νέας ημερομηνίας
                # Δόση 1 → Επόμενος μήνας μετά την προκαταβολή
                # Δόση 2 → +2 μήνες, κλπ.
                target_month = advance_month + relativedelta(months=idx)

                # Η ημερομηνία δημιουργίας είναι η τελευταία του ΠΡΟΗΓΟΥΜΕΝΟΥ μήνα
                new_date = target_month - timedelta(days=1)

                # Η due_date είναι η τελευταία του μήνα πληρωμής
                import calendar
                last_day = calendar.monthrange(target_month.year, target_month.month)[1]
                new_due_date = target_month.replace(day=last_day)

                if installment.date != new_date or installment.due_date != new_due_date:
                    print(f"   ✅ Διόρθωση:")
                    print(f"      date: {installment.date} → {new_date}")
                    print(f"      due_date: {installment.due_date} → {new_due_date}")

                    installment.date = new_date
                    installment.due_date = new_due_date
                    installment.save(update_fields=['date', 'due_date'])
                else:
                    print(f"   ℹ️  Οι ημερομηνίες είναι ήδη σωστές")

                print()

        print("\n" + "="*80)
        print("ΟΛΟΚΛΗΡΩΣΗ")
        print("="*80 + "\n")

        # Τελική κατάσταση
        print("ΤΕΛΙΚΗ ΚΑΤΑΣΤΑΣΗ:\n")

        for advance in projects_with_advance:
            project_name = advance.title.split(' - Προκαταβολή')[0]

            print(f"📋 {project_name}:")
            print(f"   Προκαταβολή: {advance.date} (Due: {advance.due_date})")

            installments = Expense.objects.filter(
                building=advance.building,
                title__icontains=project_name
            ).filter(
                title__icontains='Δόση'
            ).order_by('date')

            for inst in installments:
                print(f"   {inst.title}: {inst.date} (Due: {inst.due_date})")

            print()

if __name__ == '__main__':
    fix_existing_installments()

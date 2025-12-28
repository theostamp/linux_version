#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from maintenance.models import ScheduledMaintenance

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΕΛΕΓΧΟΣ ΣΥΝΔΕΣΗΣ ΔΑΠΑΝΗΣ ΜΕ SCHEDULED MAINTENANCE")
    print("="*70)

    # Βρες τη δαπάνη του έργου
    expense = Expense.objects.filter(title__contains='Στεγανοποίηση Ταράτσας').first()

    if expense:
        print(f"\n✅ Δαπάνη:")
        print(f"   ID: {expense.id}")
        print(f"   Τίτλος: {expense.title}")
        print(f"   Ποσό: €{expense.amount}")

        # Έλεγχος linked maintenance projects
        linked_projects = expense.scheduled_maintenance_tasks.all()
        if linked_projects:
            print(f"\n✅ Συνδεδεμένα Scheduled Maintenance:")
            for sm in linked_projects:
                print(f"   • ID: {sm.id}, Τίτλος: {sm.title}")
                print(f"     Κόστος: €{sm.total_cost}")
                print(f"     Δόσεις: {sm.installments}")
                print(f"     Προκαταβολή: €{sm.advance_payment or 0}")

                # Έλεγχος για payment schedule
                if hasattr(sm, 'payment_schedule'):
                    ps = sm.payment_schedule
                    print(f"     ✅ Payment Schedule ID: {ps.id}")
                    print(f"        Σύνολο: €{ps.total_amount}")
                    print(f"        Δόσεις: {ps.installment_count}")

                    # Έλεγχος δόσεων
                    installments = ps.installments.all()
                    if installments:
                        print(f"        ✅ {installments.count()} δόσεις καταχωρημένες")
                else:
                    print(f"     ❌ Δεν έχει Payment Schedule")
        else:
            print("\n❌ Η δαπάνη ΔΕΝ έχει συνδεδεμένα Scheduled Maintenance")
    else:
        print("\n❌ Δεν βρέθηκε η δαπάνη")

    # Έλεγχος από την άλλη πλευρά - από το ScheduledMaintenance
    print("\n" + "-"*70)
    print("ΕΛΕΓΧΟΣ ΑΠΟ SCHEDULED MAINTENANCE")
    print("-"*70)

    sm = ScheduledMaintenance.objects.filter(title='Στεγανοποίηση Ταράτσας').first()
    if sm:
        print(f"\n✅ ScheduledMaintenance:")
        print(f"   ID: {sm.id}")
        print(f"   Τίτλος: {sm.title}")

        if sm.linked_expense:
            print(f"   ✅ Linked Expense ID: {sm.linked_expense.id}")
            print(f"      Τίτλος: {sm.linked_expense.title}")
        else:
            print(f"   ❌ ΔΕΝ έχει linked expense")

    print("\n" + "="*70)
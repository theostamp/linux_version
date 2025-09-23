#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from financial.models import Expense, Transaction
from maintenance.models import ScheduledMaintenance, PaymentSchedule, PaymentInstallment
from decimal import Decimal

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΤΕΛΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ ΠΛΗΡΟΥΣ ΡΟΗΣ ΕΡΓΟΥ")
    print("="*70)

    # 1. ΠΡΟΣΦΟΡΑ
    offer = Offer.objects.filter(status='accepted', contractor_name='αβφγ').first()
    if offer:
        print(f"\n✅ 1. ΕΓΚΕΚΡΙΜΕΝΗ ΠΡΟΣΦΟΡΑ")
        print(f"   Συνεργείο: {offer.contractor_name}")
        print(f"   Ποσό: €{offer.amount:,.2f}")
        print(f"   Δόσεις: {offer.installments}")
        print(f"   Προκαταβολή: €{offer.advance_payment or 0:,.2f}")
    else:
        print("\n❌ 1. Δεν βρέθηκε εγκεκριμένη προσφορά")

    # 2. ΕΡΓΟ
    project = Project.objects.filter(title='Στεγανοποίηση Ταράτσας').first()
    if project:
        print(f"\n✅ 2. ΕΡΓΟ")
        print(f"   ID: {project.id}")
        print(f"   Τίτλος: {project.title}")
        print(f"   Κατάσταση: {project.status}")
        print(f"   Τελικό Κόστος: €{project.final_cost or 0:,.2f}")
        print(f"   Επιλεγμένος Ανάδοχος: {project.selected_contractor}")
        if project.linked_expense:
            print(f"   ✅ Έχει συνδεδεμένη δαπάνη (ID: {project.linked_expense.id})")
        else:
            print(f"   ❌ ΔΕΝ έχει συνδεδεμένη δαπάνη")
    else:
        print("\n❌ 2. Δεν βρέθηκε το έργο")

    # 3. ΔΑΠΑΝΗ
    expense = Expense.objects.filter(title__contains='Στεγανοποίηση Ταράτσας').first()
    if expense:
        print(f"\n✅ 3. ΔΑΠΑΝΗ")
        print(f"   ID: {expense.id}")
        print(f"   Τίτλος: {expense.title}")
        print(f"   Ποσό: €{expense.amount:,.2f}")
        print(f"   Κατηγορία: {expense.category}")
        print(f"   Τύπος Κατανομής: {expense.distribution_type}")

        # Έλεγχος κατανομής
        transactions = Transaction.objects.filter(
            reference_id=str(expense.id),
            reference_type='expense',
            type='debit'
        )
        if transactions.exists():
            print(f"   ✅ Έχει {transactions.count()} κατανομές σε διαμερίσματα")
            total_distributed = sum(t.amount for t in transactions)
            print(f"      Συνολικό ποσό κατανομής: €{total_distributed:,.2f}")
        else:
            print(f"   ❌ ΔΕΝ έχει κατανομές")
    else:
        print("\n❌ 3. Δεν βρέθηκε η δαπάνη")

    # 4. ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗ ΣΥΝΤΗΡΗΣΗ
    scheduled = ScheduledMaintenance.objects.filter(title='Στεγανοποίηση Ταράτσας').first()
    if scheduled:
        print(f"\n✅ 4. ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗ ΣΥΝΤΗΡΗΣΗ")
        print(f"   ID: {scheduled.id}")
        print(f"   Τίτλος: {scheduled.title}")
        print(f"   Συνολικό Κόστος: €{scheduled.total_cost:,.2f}")
        print(f"   Κατάσταση: {scheduled.status}")
        print(f"   Προγραμματισμένη Ημερομηνία: {scheduled.scheduled_date}")
        print(f"   Δόσεις: {scheduled.installments}")
        print(f"   Προκαταβολή: €{scheduled.advance_payment or 0:,.2f}")

        if scheduled.linked_expense:
            print(f"   ✅ Έχει συνδεδεμένη δαπάνη (ID: {scheduled.linked_expense.id})")
        else:
            print(f"   ❌ ΔΕΝ έχει συνδεδεμένη δαπάνη")
    else:
        print("\n❌ 4. Δεν βρέθηκε προγραμματισμένη συντήρηση")

    # 5. ΠΡΟΓΡΑΜΜΑ ΠΛΗΡΩΜΩΝ
    if scheduled:
        payment_schedule = PaymentSchedule.objects.filter(scheduled_maintenance=scheduled).first()
        if payment_schedule:
            print(f"\n✅ 5. ΠΡΟΓΡΑΜΜΑ ΠΛΗΡΩΜΩΝ")
            print(f"   ID: {payment_schedule.id}")
            print(f"   Τύπος: {payment_schedule.payment_type}")
            print(f"   Συνολικό Ποσό: €{payment_schedule.total_amount:,.2f}")
            print(f"   Αριθμός Δόσεων: {payment_schedule.installment_count}")
            print(f"   Ποσοστό Προκαταβολής: {payment_schedule.advance_percentage}%")

            # Έλεγχος δόσεων
            installments = PaymentInstallment.objects.filter(payment_schedule=payment_schedule).order_by('installment_number')
            if installments:
                print(f"\n   ✅ ΔΟΣΕΙΣ ({installments.count()} καταχωρήσεις):")
                for inst in installments:
                    status_icon = "✅" if inst.status == 'paid' else "⏳"
                    print(f"      {status_icon} {inst.description}: €{inst.amount:,.2f} - {inst.due_date}")

                total_installments = sum(inst.amount for inst in installments)
                print(f"\n      Σύνολο δόσεων: €{total_installments:,.2f}")

                if abs(total_installments - payment_schedule.total_amount) < Decimal('0.01'):
                    print(f"      ✅ Το σύνολο των δόσεων ισούται με το συνολικό ποσό")
                else:
                    print(f"      ❌ Διαφορά: €{total_installments:,.2f} ≠ €{payment_schedule.total_amount:,.2f}")
            else:
                print(f"   ❌ ΔΕΝ υπάρχουν καταχωρημένες δόσεις")
        else:
            print("\n❌ 5. Δεν βρέθηκε πρόγραμμα πληρωμών")

    # ΣΥΝΟΨΗ
    print("\n" + "="*70)
    print("ΣΥΝΟΨΗ ΕΠΙΒΕΒΑΙΩΣΗΣ")
    print("="*70)

    checks = []

    # Έλεγχος 1: Προσφορά → Έργο
    if offer and project and project.selected_contractor == offer.contractor_name:
        checks.append("✅ Προσφορά → Έργο: Σωστή σύνδεση")
    else:
        checks.append("❌ Προσφορά → Έργο: Πρόβλημα σύνδεσης")

    # Έλεγχος 2: Έργο → Δαπάνη
    if project and expense and project.linked_expense == expense:
        checks.append("✅ Έργο → Δαπάνη: Σωστή σύνδεση")
    else:
        checks.append("❌ Έργο → Δαπάνη: Πρόβλημα σύνδεσης")

    # Έλεγχος 3: Δαπάνη → Κατανομή
    if expense and Transaction.objects.filter(reference_id=str(expense.id), reference_type='expense', type='debit').exists():
        checks.append("✅ Δαπάνη → Κατανομή: Έχει κατανομές")
    else:
        checks.append("❌ Δαπάνη → Κατανομή: Δεν έχει κατανομές")

    # Έλεγχος 4: Scheduled Maintenance
    if scheduled and scheduled.linked_expense == expense:
        checks.append("✅ Scheduled Maintenance: Σωστή σύνδεση με δαπάνη")
    else:
        checks.append("❌ Scheduled Maintenance: Πρόβλημα σύνδεσης με δαπάνη")

    # Έλεγχος 5: Payment Schedule
    if scheduled and PaymentSchedule.objects.filter(scheduled_maintenance=scheduled).exists():
        checks.append("✅ Payment Schedule: Υπάρχει με δόσεις")
    else:
        checks.append("❌ Payment Schedule: Δεν υπάρχει")

    for check in checks:
        print(f"   {check}")

    success_count = sum(1 for c in checks if c.startswith("✅"))
    total_checks = len(checks)

    print(f"\n📊 Αποτέλεσμα: {success_count}/{total_checks} επιτυχείς έλεγχοι")

    if success_count == total_checks:
        print("\n🎉 Η ΡΟΗ ΛΕΙΤΟΥΡΓΕΙ ΤΕΛΕΙΑ!")
        print("   Προσφορά → Έργο → Δαπάνη → Κατανομή → Πρόγραμμα Πληρωμών")
    else:
        print("\n⚠️ Υπάρχουν προβλήματα που χρειάζονται διόρθωση")

    print("="*70)
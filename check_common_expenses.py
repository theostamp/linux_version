#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import CommonExpensePeriod, Expense, Transaction
from apartments.models import Apartment
from datetime import datetime
from decimal import Decimal

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΕΛΕΓΧΟΣ ΚΟΙΝΟΧΡΗΣΤΩΝ ΚΑΙ ΚΑΤΑΝΟΜΗΣ ΔΑΠΑΝΗΣ ΕΡΓΟΥ")
    print("="*70)

    # 1. Έλεγχος υπάρχοντων κοινοχρήστων
    current_month = datetime.now().strftime('%Y-%m')
    common_expenses = CommonExpensePeriod.objects.filter(
        period_name__contains=current_month
    ).order_by('-created_at')

    print(f"\n📅 Τρέχων μήνας: {current_month}")

    if common_expenses:
        print(f"\n✅ Βρέθηκαν {common_expenses.count()} κοινόχρηστα για τον μήνα:")
        for ce in common_expenses:
            print(f"   • ID: {ce.id}, Building: {ce.building.name}")
            print(f"     Period: {ce.period_name}")
            print(f"     Start: {ce.start_date}, End: {ce.end_date}")
            print(f"     Status: {ce.status if hasattr(ce, 'status') else 'N/A'}")
    else:
        print(f"\n❌ Δεν υπάρχουν κοινόχρηστα για τον μήνα {current_month}")

    # 2. Έλεγχος δαπάνης έργου
    expense = Expense.objects.filter(title__contains='Στεγανοποίηση Ταράτσας').first()

    print(f"\n{'='*70}")
    print("ΔΑΠΑΝΗ ΕΡΓΟΥ ΜΟΝΩΣΗΣ")
    print("="*70)

    if expense:
        print(f"\n✅ Δαπάνη Έργου:")
        print(f"   ID: {expense.id}")
        print(f"   Τίτλος: {expense.title}")
        print(f"   Ποσό: €{expense.amount:,.2f}")
        print(f"   Κατηγορία: {expense.category}")
        print(f"   Τύπος κατανομής: {expense.distribution_type}")
        print(f"   Ημερομηνία: {expense.date}")
        print(f"   Ημερομηνία λήξης: {expense.due_date}")

        # Έλεγχος αν έχει γίνει κατανομή
        transactions = Transaction.objects.filter(
            reference_id=str(expense.id),
            reference_type='expense',
            type='debit'
        )

        if transactions.exists():
            print(f"\n✅ Έχει γίνει κατανομή σε {transactions.count()} διαμερίσματα")
            total = sum(t.amount for t in transactions)
            print(f"   Συνολικό ποσό κατανομής: €{total:,.2f}")

            # Δείγμα transactions
            print("\n   Δείγμα κατανομών:")
            for t in transactions[:3]:
                apt = Apartment.objects.filter(id=t.apartment_id).first()
                if apt:
                    print(f"   • {apt.number}: €{t.amount:.2f}")
        else:
            print(f"\n❌ ΔΕΝ έχει γίνει κατανομή στα διαμερίσματα")
            print("   Η δαπάνη πρέπει να συμπεριληφθεί στα κοινόχρηστα")

        # 3. Έλεγχος διαμερισμάτων και χιλιοστών
        print(f"\n{'='*70}")
        print("ΔΙΑΜΕΡΙΣΜΑΤΑ ΚΑΙ ΧΙΛΙΟΣΤΑ")
        print("="*70)

        apartments = Apartment.objects.filter(
            building_id=1  # Demo building
        ).order_by('number')

        if apartments:
            print(f"\n✅ Βρέθηκαν {apartments.count()} διαμερίσματα:")
            total_mills = sum(apt.participation_mills for apt in apartments)
            print(f"   Σύνολο χιλιοστών: {total_mills}/1000")

            print("\n   Διαμέρισμα    Χιλιοστά    Αναμενόμενο ποσό")
            print("   " + "-"*50)

            for apt in apartments:
                expected_amount = Decimal(str(apt.participation_mills / 1000)) * expense.amount
                print(f"   {apt.number:12s} {apt.participation_mills:8d}    €{expected_amount:8.2f}")

            print("   " + "-"*50)
            total_expected = sum(Decimal(str(apt.participation_mills / 1000)) * expense.amount for apt in apartments)
            print(f"   {'ΣΥΝΟΛΟ':12s} {total_mills:8d}    €{total_expected:8.2f}")

            if abs(total_expected - expense.amount) < Decimal('0.01'):
                print(f"\n   ✅ Η κατανομή θα είναι ακριβής")
            else:
                print(f"\n   ⚠️ Διαφορά: €{abs(total_expected - expense.amount):.2f}")
    else:
        print("\n❌ Δεν βρέθηκε η δαπάνη του έργου")

    print("\n" + "="*70)
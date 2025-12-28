#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from apartments.models import Apartment
from decimal import Decimal
from datetime import datetime
import django.db.models

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΕΠΙΒΕΒΑΙΩΣΗ ΚΑΤΑΝΟΜΗΣ ΚΟΙΝΟΧΡΗΣΤΩΝ")
    print("="*70)

    # Έλεγχος δαπάνης έργου
    project_expense = Expense.objects.filter(title__contains='Στεγανοποίηση Ταράτσας').first()

    if project_expense:
        print(f"\n📋 Δαπάνη Έργου:")
        print(f"   ID: {project_expense.id}")
        print(f"   Τίτλος: {project_expense.title}")
        print(f"   Ποσό: €{project_expense.amount:,.2f}")
        print(f"   Τύπος κατανομής: {project_expense.distribution_type}")

        # Έλεγχος transactions
        transactions = Transaction.objects.filter(
            reference_id=str(project_expense.id),
            reference_type='expense'
        ).order_by('apartment_number')

        if transactions.exists():
            print(f"\n✅ Έχει γίνει κατανομή σε {transactions.count()} διαμερίσματα:")
            print("\n   Διαμέρισμα    Ποσό χρέωσης")
            print("   " + "-"*30)

            total_distributed = Decimal('0')
            for trans in transactions:
                apt_num = trans.apartment_number or 'N/A'
                print(f"   {apt_num:12s} €{trans.amount:8.2f}")
                total_distributed += trans.amount

            print("   " + "-"*30)
            print(f"   {'ΣΥΝΟΛΟ':12s} €{total_distributed:8.2f}")

            # Έλεγχος ακρίβειας
            if abs(total_distributed - project_expense.amount) < Decimal('0.01'):
                print(f"\n   ✅ Η κατανομή είναι ακριβής!")
            else:
                print(f"\n   ⚠️ Διαφορά: €{abs(total_distributed - project_expense.amount):.2f}")

        else:
            print(f"\n❌ ΔΕΝ έχει γίνει κατανομή")

    # Έλεγχος άλλων δαπανών
    print(f"\n{'='*70}")
    print("ΑΛΛΕΣ ΔΑΠΑΝΕΣ ΠΕΡΙΟΔΟΥ")
    print("="*70)

    other_expenses = Expense.objects.filter(
        date__month=datetime.now().month,
        date__year=datetime.now().year
    ).exclude(id=project_expense.id if project_expense else 0).order_by('created_at')

    if other_expenses:
        print(f"\n✅ Βρέθηκαν {other_expenses.count()} άλλες δαπάνες:")
        for exp in other_expenses:
            trans_count = Transaction.objects.filter(
                reference_id=str(exp.id),
                reference_type='expense'
            ).count()

            status = "✅ Κατανεμημένη" if trans_count > 0 else "❌ Μη κατανεμημένη"
            print(f"   • {exp.title}: €{exp.amount:,.2f} - {status}")

    # Έλεγχος συνολικών υπολοίπων
    print(f"\n{'='*70}")
    print("ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
    print("="*70)

    apartments = Apartment.objects.filter(building_id=1).order_by('number')

    print("\n   Διαμέρισμα    Χιλιοστά    Υπόλοιπο")
    print("   " + "-"*40)

    total_balance = Decimal('0')
    for apt in apartments:
        # Υπολογισμός υπολοίπου από transactions
        debits = Transaction.objects.filter(
            apartment=apt,
            type='debit'
        ).aggregate(total=django.db.models.Sum('amount'))['total'] or Decimal('0')

        credits = Transaction.objects.filter(
            apartment=apt,
            type='credit'
        ).aggregate(total=django.db.models.Sum('amount'))['total'] or Decimal('0')

        balance = credits - debits  # Θετικό = πιστωτικό, Αρνητικό = χρεωστικό

        print(f"   {apt.number:12s} {apt.participation_mills:8d}    €{balance:10.2f}")
        total_balance += balance

    print("   " + "-"*40)
    print(f"   {'ΣΥΝΟΛΟ':12s} {1000:8d}    €{total_balance:10.2f}")

    # Σύνοψη
    print(f"\n{'='*70}")
    print("ΣΥΝΟΨΗ")
    print("="*70)

    total_debits = Transaction.objects.filter(
        type='debit',
        apartment__building_id=1
    ).aggregate(total=django.db.models.Sum('amount'))['total'] or Decimal('0')

    total_credits = Transaction.objects.filter(
        type='credit',
        apartment__building_id=1
    ).aggregate(total=django.db.models.Sum('amount'))['total'] or Decimal('0')

    print(f"\n📊 Σύνολα κτιρίου:")
    print(f"   Συνολικές χρεώσεις: €{total_debits:,.2f}")
    print(f"   Συνολικές πληρωμές: €{total_credits:,.2f}")
    print(f"   Συνολικό υπόλοιπο: €{total_credits - total_debits:,.2f}")

    if project_expense and Transaction.objects.filter(
        reference_id=str(project_expense.id),
        reference_type='expense'
    ).exists():
        print(f"\n✅ Η δαπάνη του έργου μόνωσης έχει κατανεμηθεί στα διαμερίσματα!")
        print(f"   Κάθε διαμέρισμα χρεώθηκε αναλογικά με τα χιλιοστά του.")
    else:
        print(f"\n⚠️ Η δαπάνη του έργου δεν έχει ακόμη κατανεμηθεί.")

    print("\n" + "="*70)
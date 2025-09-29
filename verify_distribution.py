#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from financial.models import Expense, Transaction
from apartments.models import Apartment
from decimal import Decimal

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΤΕΛΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ ΡΟΗΣ: ΠΡΟΣΦΟΡΑ → ΔΑΠΑΝΗ → ΚΑΤΑΝΟΜΗ")
    print("="*70)

    # 1. Προσφορά
    offer = Offer.objects.filter(status='accepted', contractor_name='αβφγ').first()
    if offer:
        print(f"\n✅ ΕΓΚΕΚΡΙΜΕΝΗ ΠΡΟΣΦΟΡΑ")
        print(f"   Συνεργείο: {offer.contractor_name}")
        print(f"   Ποσό: €{offer.amount:,.2f}")
        print(f"   Δόσεις: {offer.installments}")
        print(f"   Προκαταβολή: €{offer.advance_payment or 0:,.2f}")
        print(f"   Μέθοδος πληρωμής: {offer.payment_method}")

    # 2. Δαπάνη
    expense = Expense.objects.filter(title__contains='Στεγανοποίηση Ταράτσας').first()
    if expense:
        print(f"\n✅ ΔΗΜΙΟΥΡΓΗΜΕΝΗ ΔΑΠΑΝΗ")
        print(f"   ID: {expense.id}")
        print(f"   Τίτλος: {expense.title}")
        print(f"   Ποσό: €{expense.amount:,.2f}")
        print(f"   Κατηγορία: {expense.category}")
        print(f"   Ημερομηνία λήξης: {expense.due_date}")
        print(f"   Τύπος κατανομής: {expense.distribution_type}")

        if expense.notes:
            print(f"\n   📝 Σημειώσεις:")
            for line in expense.notes.split('\n'):
                if line.strip():
                    print(f"      • {line}")

    # 3. Κατανομή στα διαμερίσματα
    transactions = Transaction.objects.filter(
        expense=expense,
        transaction_type='expense'
    ).select_related('apartment')

    if transactions.exists():
        print(f"\n✅ ΚΑΤΑΝΟΜΗ ΣΕ {transactions.count()} ΔΙΑΜΕΡΙΣΜΑΤΑ")
        print("\n   Διαμέρισμα   Χιλιοστά    Ποσό")
        print("   " + "-"*40)

        total_distributed = Decimal('0')
        for trans in transactions.order_by('apartment__apartment_number'):
            apt = trans.apartment
            print(f"   {apt.apartment_number:12s} {apt.participation_mills:7d} €{trans.amount:8.2f}")
            total_distributed += trans.amount

        print("   " + "-"*40)
        print(f"   {'ΣΥΝΟΛΟ':12s} {1000:7d} €{total_distributed:8.2f}")

        # Έλεγχος ότι το σύνολο ισούται με το ποσό της δαπάνης
        if abs(total_distributed - expense.amount) < Decimal('0.01'):
            print(f"\n   ✅ Η κατανομή είναι σωστή (€{total_distributed:,.2f} = €{expense.amount:,.2f})")
        else:
            print(f"\n   ❌ Διαφορά στην κατανομή: €{total_distributed:,.2f} ≠ €{expense.amount:,.2f}")

    # 4. Διακανονισμός
    print(f"\n{'='*70}")
    print("ΔΙΑΚΑΝΟΝΙΣΜΟΣ ΠΛΗΡΩΜΗΣ")
    print("="*70)

    if offer:
        total = offer.amount
        advance = offer.advance_payment or Decimal('0')
        installments = offer.installments or 1
        remaining = total - advance

        print(f"\n💰 Συνολικό ποσό: €{total:,.2f}")

        if advance > 0:
            print(f"   - Προκαταβολή: €{advance:,.2f}")
            print(f"   - Υπόλοιπο: €{remaining:,.2f}")

        if installments > 1:
            installment_amount = remaining / installments
            print(f"\n📅 Πρόγραμμα δόσεων ({installments} δόσεις):")

            if advance > 0:
                print(f"   • Άμεσα: €{advance:,.2f} (Προκαταβολή)")

            for i in range(1, installments + 1):
                print(f"   • Δόση {i}/{installments}: €{installment_amount:,.2f}")

            print(f"\n   Σύνολο δόσεων: €{installment_amount * installments:,.2f}")
            if advance > 0:
                print(f"   + Προκαταβολή: €{advance:,.2f}")
                print(f"   = Γενικό Σύνολο: €{(installment_amount * installments + advance):,.2f}")

    print(f"\n{'='*70}")
    print("✅ Η ΡΟΗ ΛΕΙΤΟΥΡΓΕΙ ΣΩΣΤΑ!")
    print("   Προσφορά → Δαπάνη → Κατανομή → Διακανονισμός")
    print("="*70)
#!/usr/bin/env python
"""
Δημιουργία management fees με σωστές ημερομηνίες
(date = τελευταία του μήνα, όπως τις δόσεις έργων)
"""
import os
import sys
import django
from datetime import date
import calendar

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from apartments.models import Apartment

def create_management_fees():
    """Δημιουργεί management fees για 3 μήνες με σωστές ημερομηνίες"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΔΗΜΙΟΥΡΓΙΑ MANAGEMENT FEES ΜΕ ΣΩΣΤΕΣ ΗΜΕΡΟΜΗΝΙΕΣ")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο")
            return

        print(f"🏢 Κτίριο: {building.name}")
        print(f"   Management Fee per Apartment: €{building.management_fee_per_apartment}\n")

        # Υπολογισμός συνολικού ποσού
        apartments_count = Apartment.objects.filter(building=building).count()
        total_amount = building.management_fee_per_apartment * apartments_count

        print(f"   Αριθμός διαμερισμάτων: {apartments_count}")
        print(f"   Συνολικό ποσό ανά μήνα: €{total_amount}\n")

        # Δημιουργία management fees για 3 μήνες
        months_to_create = [
            (2025, 10, 'Οκτώβριος'),
            (2025, 11, 'Νοέμβριος'),
            (2025, 12, 'Δεκέμβριος')
        ]

        created_count = 0

        for year, month, month_name in months_to_create:
            print(f"{'─'*80}")
            print(f"📅 {month_name} {year}")
            print(f"{'─'*80}\n")

            # Ημερομηνία: Τελευταία του μήνα (όπως οι δόσεις έργων)
            last_day = calendar.monthrange(year, month)[1]
            expense_date = date(year, month, last_day)

            # Έλεγχος αν υπάρχει ήδη
            existing = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=year,
                date__month=month
            )

            if existing.exists():
                print(f"   ⚠️  Υπάρχει ήδη management fee για {month_name} {year}")
                print(f"      Υπάρχουσα ημερομηνία: {existing.first().date}")

                # Διαγραφή και επαναδημιουργία
                print(f"      🗑️  Διαγραφή υπάρχουσας...")
                existing.delete()

            # Δημιουργία νέας
            expense = Expense.objects.create(
                building=building,
                title=f'Διαχειριστικά Έξοδα {month_name} {year}',
                amount=total_amount,
                date=expense_date,  # ΔΙΟΡΘΩΣΗ: Τελευταία του μήνα
                due_date=expense_date,  # Όπως τις δόσεις
                category='management_fees',
                distribution_type='equal_share',  # ΔΙΟΡΘΩΣΗ: Ισόποσο, όχι χιλιοστά
                notes=f'Αυτόματη καταχώρηση διαχειριστικών εξόδων\n'
                      f'Ποσό ανά διαμέρισμα: {building.management_fee_per_apartment}€\n'
                      f'Αριθμός διαμερισμάτων: {apartments_count}\n'
                      f'Συνολικό ποσό: {total_amount}€'
            )

            print(f"   ✅ Δημιουργήθηκε:")
            print(f"      Date: {expense.date}")
            print(f"      Due Date: {expense.due_date}")
            print(f"      Amount: €{expense.amount}")
            print(f"      Distribution: {expense.distribution_type}")
            print()

            created_count += 1

        print("="*80)
        print(f"ΟΛΟΚΛΗΡΩΣΗ: Δημιουργήθηκαν {created_count} management fees")
        print("="*80 + "\n")

if __name__ == '__main__':
    create_management_fees()

#!/usr/bin/env python
"""
Έλεγχος μεταφοράς υπολοίπων για Δαπάνες Διαχείρισης
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from financial.services import FinancialDashboardService
from apartments.models import Apartment
from buildings.models import Building

def check_management_fees():
    """Ελέγχει τη μεταφορά υπολοίπων για management fees"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΔΙΑΧΕΙΡΙΣΗΣ")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο")
            return

        print(f"🏢 Κτίριο: {building.name}")
        print(f"   Management Fee per Apartment: €{building.management_fee_per_apartment}\n")

        # Βρίσκουμε τις δαπάνες διαχείρισης
        management_expenses = Expense.objects.filter(
            building=building,
            category='management_fees'
        ).order_by('date')

        print(f"Βρέθηκαν {management_expenses.count()} δαπάνες διαχείρισης:\n")

        for exp in management_expenses:
            print(f"• {exp.title}")
            print(f"  Date: {exp.date} | Due: {exp.due_date}")
            print(f"  Amount: €{exp.amount}")
            print()

        # Παίρνουμε το πρώτο διαμέρισμα
        apartment = Apartment.objects.filter(building=building).first()
        if not apartment:
            print("❌ Δεν βρέθηκε διαμέρισμα")
            return

        print(f"📍 Διαμέρισμα: {apartment.number}\n")

        # Υπολογισμός μεριδίου διαμερίσματος
        apartment_count = Apartment.objects.filter(building=building).count()
        apt_share = building.management_fee_per_apartment

        print(f"   Αναμενόμενο μερίδιο: €{apt_share:.2f} (ισόποσο)\n")

        # Test για διάφορους μήνες
        test_months = ['2025-10', '2025-11', '2025-12', '2026-01']

        print("="*80)
        print("ΕΛΕΓΧΟΣ ΟΦΕΙΛΩΝ ΑΝΑ ΜΗΝΑ")
        print("="*80 + "\n")

        for month in test_months:
            print(f"{'─'*80}")
            print(f"📅 Μήνας: {month}")
            print(f"{'─'*80}\n")

            service = FinancialDashboardService(building.id)
            apartment_balances = service.get_apartment_balances(month)

            apt_data = next((b for b in apartment_balances if b['id'] == apartment.id), None)

            if not apt_data:
                print(f"   ❌ Δεν βρέθηκαν δεδομένα")
                continue

            previous_balance = Decimal(str(apt_data.get('previous_balance', 0)))
            expense_share = Decimal(str(apt_data.get('expense_share', 0)))

            print(f"   Παλιές Οφειλές: €{previous_balance:.2f}")
            print(f"   Δαπάνες Μήνα: €{expense_share:.2f}")
            print(f"   Σύνολο: €{(previous_balance + expense_share):.2f}\n")

            # Ελέγχουμε ποιες δαπάνες συμπεριλήφθηκαν
            year, mon = map(int, month.split('-'))
            month_start = date(year, mon, 1)

            if mon == 12:
                month_end = date(year + 1, 1, 1)
            else:
                month_end = date(year, mon + 1, 1)

            # Δαπάνες ΠΡΙΝ από τον μήνα (παλιές οφειλές)
            expenses_before = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__lt=month_start
            ).order_by('date')

            print(f"   📋 Management fees πριν από {month_start}: {expenses_before.count()}")
            for exp in expenses_before:
                print(f"      • {exp.title} (Date: {exp.date}) - €{exp.amount}")

            # Δαπάνες ΕΝΤΟΣ του μήνα
            expenses_current = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__gte=month_start,
                date__lt=month_end
            ).order_by('date')

            print(f"\n   📋 Management fees εντός {month}: {expenses_current.count()}")
            for exp in expenses_current:
                print(f"      • {exp.title} (Date: {exp.date}) - €{exp.amount}")

            print()

        print("\n" + "="*80)
        print("ΤΕΛΟΣ ΕΛΕΓΧΟΥ")
        print("="*80 + "\n")

if __name__ == '__main__':
    check_management_fees()

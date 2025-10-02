#!/usr/bin/env python
"""
Test script για να επαληθεύσουμε ότι οι δόσεις έργων εμφανίζονται σωστά
ως παλιές οφειλές στον επόμενο μήνα
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
from financial.services import FinancialDashboardService, CommonExpenseCalculator
from apartments.models import Apartment
from buildings.models import Building

def test_installment_previous_obligations():
    """Test για να επαληθεύσουμε τις παλιές οφειλές από δόσεις"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("TEST: ΠΑΛΙΕΣ ΟΦΕΙΛΕΣ ΑΠΟ ΔΟΣΕΙΣ ΕΡΓΩΝ")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος")
            return

        print(f"🏢 Κτίριο: {building.name}\n")

        # Βρίσκουμε τις δόσεις
        installments = Expense.objects.filter(
            building=building,
            title__icontains='Δόση'
        ).order_by('date')

        if not installments:
            print("❌ Δεν βρέθηκαν δόσεις")
            return

        print(f"Βρέθηκαν {installments.count()} δόσεις:\n")
        for inst in installments:
            print(f"• {inst.title}")
            print(f"  Date: {inst.date} (ημερομηνία δημιουργίας)")
            print(f"  Due: {inst.due_date} (προθεσμία πληρωμής)")
            print(f"  Ποσό: €{inst.amount}\n")

        # Test για κάθε μήνα που έχει δόση
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΠΑΛΙΩΝ ΟΦΕΙΛΩΝ ΑΝΑ ΜΗΝΑ")
        print("="*80 + "\n")

        # Παίρνουμε το πρώτο διαμέρισμα για testing
        apartment = Apartment.objects.filter(building=building).first()
        if not apartment:
            print("❌ Δεν βρέθηκε διαμέρισμα")
            return

        print(f"📍 Διαμέρισμα: {apartment.number}\n")

        # Test για Νοέμβριο 2025 (θα πρέπει να δει τη δόση του Οκτωβρίου ως παλιά οφειλή)
        test_months = ['2025-11', '2025-12', '2026-01', '2026-02']

        for month in test_months:
            print(f"\n{'─'*80}")
            print(f"📅 Μήνας: {month}")
            print(f"{'─'*80}\n")

            # Παίρνουμε τα financial data για τον μήνα
            service = FinancialDashboardService(building.id)
            apartment_balances = service.get_apartment_balances(month)

            # Βρίσκουμε το συγκεκριμένο διαμέρισμα
            apt_data = next((b for b in apartment_balances if b['id'] == apartment.id), None)

            if not apt_data:
                print(f"   ❌ Δεν βρέθηκαν δεδομένα για το διαμέρισμα")
                continue

            print(f"   Παλιές Οφειλές: €{apt_data.get('previous_balance', 0):.2f}")
            print(f"   Δαπάνες Μήνα: €{apt_data.get('expense_share', 0):.2f}")
            print(f"   Αποθεματικό: €{apt_data.get('reserve_fund_share', 0):.2f}")
            print(f"   Σύνολο Οφειλής: €{apt_data.get('net_obligation', 0):.2f}")

            # Ελέγχουμε ποιες δαπάνες συμπεριλήφθηκαν
            year, mon = map(int, month.split('-'))
            month_start = date(year, mon, 1)

            # Δαπάνες που ΠΡΙΝ από τον μήνα (παλιές οφειλές)
            expenses_before = Expense.objects.filter(
                building=building,
                date__lt=month_start
            ).order_by('date')

            print(f"\n   📋 Δαπάνες πριν από {month_start}:")
            for exp in expenses_before:
                # Υπολογισμός μεριδίου διαμερίσματος
                if exp.distribution_type == 'by_participation_mills':
                    total_mills = Apartment.objects.filter(building=building).aggregate(
                        total=django.db.models.Sum('participation_mills'))['total'] or 1000
                    apt_share = Decimal(apartment.participation_mills) / Decimal(total_mills) * exp.amount
                elif exp.distribution_type == 'equal_share':
                    apt_count = Apartment.objects.filter(building=building).count()
                    apt_share = exp.amount / apt_count
                else:
                    apt_share = Decimal('0.00')

                print(f"      • {exp.title[:50]} (Date: {exp.date})")
                print(f"        Ποσό: €{exp.amount} | Μερίδιο: €{apt_share:.2f}")

            # Δαπάνες ΕΝΤΟΣ του μήνα (τρέχουσες)
            if mon == 12:
                month_end = date(year + 1, 1, 1)
            else:
                month_end = date(year, mon + 1, 1)

            expenses_current = Expense.objects.filter(
                building=building,
                date__gte=month_start,
                date__lt=month_end
            ).order_by('date')

            print(f"\n   📋 Δαπάνες εντός {month}:")
            for exp in expenses_current:
                # Υπολογισμός μεριδίου διαμερίσματος
                if exp.distribution_type == 'by_participation_mills':
                    total_mills = Apartment.objects.filter(building=building).aggregate(
                        total=django.db.models.Sum('participation_mills'))['total'] or 1000
                    apt_share = Decimal(apartment.participation_mills) / Decimal(total_mills) * exp.amount
                elif exp.distribution_type == 'equal_share':
                    apt_count = Apartment.objects.filter(building=building).count()
                    apt_share = exp.amount / apt_count
                else:
                    apt_share = Decimal('0.00')

                print(f"      • {exp.title[:50]} (Date: {exp.date})")
                print(f"        Ποσό: €{exp.amount} | Μερίδιο: €{apt_share:.2f}")

        print("\n" + "="*80)
        print("ΤΕΛΟΣ TEST")
        print("="*80 + "\n")

if __name__ == '__main__':
    import django.db.models
    test_installment_previous_obligations()

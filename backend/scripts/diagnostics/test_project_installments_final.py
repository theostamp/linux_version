#!/usr/bin/env python
"""
Final test: Επαλήθευση ότι οι δόσεις εμφανίζονται σωστά ως παλιές οφειλές
χωρίς να επικαλύπτονται με την προκαταβολή
"""
import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from financial.services import FinancialDashboardService
from apartments.models import Apartment
from buildings.models import Building

def test_project_installments():
    """Test για να επαληθεύσουμε ότι δεν υπάρχει διπλή χρέωση"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("TEST: ΕΛΕΓΧΟΣ ΔΟΣΕΩΝ ΚΑΙ ΠΡΟΚΑΤΑΒΟΛΗΣ")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο")
            return

        print(f"🏢 Κτίριο: {building.name}\n")

        # Βρίσκουμε το έργο "Αντικατάσταση Πλακιδίων"
        project_expenses = Expense.objects.filter(
            building=building,
            title__icontains='Αντικατάσταση Πλακιδίων'
        ).order_by('date')

        if not project_expenses:
            print("❌ Δεν βρέθηκε το έργο")
            return

        print(f"Βρέθηκαν {project_expenses.count()} δαπάνες για το έργο:\n")

        for exp in project_expenses:
            print(f"• {exp.title}")
            print(f"  Date: {exp.date} | Due: {exp.due_date} | Amount: €{exp.amount}\n")

        # Παίρνουμε το πρώτο διαμέρισμα
        apartment = Apartment.objects.filter(building=building).first()
        if not apartment:
            print("❌ Δεν βρέθηκε διαμέρισμα")
            return

        print(f"📍 Διαμέρισμα: {apartment.number}")
        print(f"   Participation Mills: {apartment.participation_mills}\n")

        # Υπολογισμός μεριδίου διαμερίσματος
        total_mills = Apartment.objects.filter(building=building).aggregate(
            total=django.db.models.Sum('participation_mills'))['total'] or 1000

        apt_percentage = apartment.participation_mills / total_mills

        print(f"   Ποσοστό συμμετοχής: {apt_percentage*100:.1f}%\n")

        # Test για κάθε μήνα
        test_months = [
            ('2025-10', 'Οκτώβριος 2025 (Μήνας προκαταβολής)'),
            ('2025-11', 'Νοέμβριος 2025 (Δόση 1)'),
            ('2025-12', 'Δεκέμβριος 2025 (Δόση 2)'),
            ('2026-01', 'Ιανουάριος 2026 (Δόση 3)'),
            ('2026-02', 'Φεβρουάριος 2026 (Δόση 4)')
        ]

        print("="*80)
        print("ΕΛΕΓΧΟΣ ΟΦΕΙΛΩΝ ΑΝΑ ΜΗΝΑ")
        print("="*80 + "\n")

        expected_installment_amount = Decimal('1000.00') * Decimal(str(apt_percentage))

        for month, description in test_months:
            print(f"{'─'*80}")
            print(f"📅 {description}")
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

            # Έλεγχος για διπλή χρέωση
            if month == '2025-10':
                # Οκτώβριος: Μόνο προκαταβολή
                if expense_share > expected_installment_amount * Decimal('1.1'):
                    print(f"   ⚠️  ΠΡΟΣΟΧΗ: Οι δαπάνες του μήνα είναι υψηλότερες από το αναμενόμενο!")
                    print(f"      Αναμενόμενο: €{expected_installment_amount:.2f}")
                    print(f"      Πραγματικό: €{expense_share:.2f}")
                else:
                    print(f"   ✅ OK: Μόνο προκαταβολή στον Οκτώβριο")

            elif month == '2025-11':
                # Νοέμβριος: Προκαταβολή στις παλιές + Δόση 1 στις τρέχουσες
                if previous_balance < expected_installment_amount * Decimal('0.9'):
                    print(f"   ⚠️  ΠΡΟΣΟΧΗ: Οι παλιές οφειλές είναι χαμηλότερες από το αναμενόμενο!")
                    print(f"      Αναμενόμενο: €{expected_installment_amount:.2f}")
                    print(f"      Πραγματικό: €{previous_balance:.2f}")
                elif previous_balance > expected_installment_amount * Decimal('1.5'):
                    print(f"   ❌ ΣΦΑΛΜΑ: Διπλή χρέωση! Και η προκαταβολή και η Δόση 1 στις παλιές οφειλές!")
                    print(f"      Αναμενόμενο: €{expected_installment_amount:.2f}")
                    print(f"      Πραγματικό: €{previous_balance:.2f}")
                else:
                    print(f"   ✅ OK: Προκαταβολή στις παλιές, Δόση 1 στις τρέχουσες")

            print()

        print("="*80)
        print("ΤΕΛΟΣ TEST")
        print("="*80 + "\n")

if __name__ == '__main__':
    import django.db.models
    test_project_installments()

#!/usr/bin/env python3
"""
Final verification script για τις διορθώσεις των παλαιών οφειλών
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def main():
    """Final verification of previous obligations fixes"""
    print("🚀 ΤΕΛΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ ΔΙΟΡΘΩΣΕΩΝ ΠΑΛΑΙΩΝ ΟΦΕΙΛΩΝ")
    print("=" * 80)

    with schema_context('demo'):
        service = FinancialDashboardService(building_id=1)
        apartments = Apartment.objects.filter(building_id=1)
        apartment = apartments.first()

        print(f"\n🏠 Δοκιμή για διαμέρισμα: {apartment.number}")

        # Test 1: Manual calculation vs service calculation
        print(f"\n📊 Test 1: Σύγκριση μανουλή vs service υπολογισμό")
        october_start = date(2025, 10, 1)

        # Manual calculation
        transactions = Transaction.objects.filter(
            apartment=apartment,
            date__lt=october_start
        ).order_by('date')

        manual_balance = Decimal('0.00')
        for transaction in transactions:
            if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                manual_balance += transaction.amount
            elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued',
                                    'interest_charge', 'penalty_charge']:
                manual_balance -= transaction.amount

        service_balance = service._calculate_historical_balance(apartment, october_start)

        print(f"   Μανουλή υπολογισμός: {format_currency(manual_balance)}")
        print(f"   Service υπολογισμός: {format_currency(service_balance)}")

        if abs(manual_balance - service_balance) < Decimal('0.01'):
            print("   ✅ ΕΠΙΤΥΧΙΑ: Οι υπολογισμοί ταιριάζουν!")
            test1_pass = True
        else:
            print("   ❌ ΑΠΟΤΥΧΙΑ: Διαφορά στους υπολογισμούς")
            test1_pass = False

        # Test 2: Previous obligations calculation
        print(f"\n📊 Test 2: Υπολογισμός παλαιών οφειλών")
        september_data = service.get_summary('2025-09')
        october_data = service.get_summary('2025-10')

        sep_balance = Decimal(str(september_data.get('total_balance', 0)))
        oct_previous = Decimal(str(october_data.get('previous_obligations', 0)))

        print(f"   Σεπτέμβριος total_balance: {format_currency(sep_balance)}")
        print(f"   Οκτώβριος previous_obligations: {format_currency(oct_previous)}")

        # Expected logic: if sep_balance < 0, then oct_previous should be abs(sep_balance)
        expected_previous = abs(sep_balance) if sep_balance < 0 else Decimal('0.00')
        print(f"   Αναμενόμενο previous_obligations: {format_currency(expected_previous)}")

        if abs(oct_previous - expected_previous) < Decimal('0.10'):  # Allow 10 cent tolerance
            print("   ✅ ΕΠΙΤΥΧΙΑ: Η μεταφορά είναι σωστή!")
            test2_pass = True
        else:
            print("   ❌ ΑΠΟΤΥΧΙΑ: Πρόβλημα στη μεταφορά")
            test2_pass = False

        # Test 3: All apartments previous obligations sum
        print(f"\n📊 Test 3: Άθροισμα παλαιών οφειλών όλων των διαμερισμάτων")

        total_manual = Decimal('0.00')
        for apt in apartments:
            apt_balance = service._calculate_historical_balance(apt, october_start)
            if apt_balance > 0:  # Only positive (debt) balances
                total_manual += apt_balance

        service_total = Decimal(str(october_data.get('previous_obligations', 0)))

        print(f"   Μανουλή άθροισμα: {format_currency(total_manual)}")
        print(f"   Service total: {format_currency(service_total)}")

        if abs(total_manual - service_total) < Decimal('0.10'):
            print("   ✅ ΕΠΙΤΥΧΙΑ: Τα αθροίσματα ταιριάζουν!")
            test3_pass = True
        else:
            print("   ❌ ΑΠΟΤΥΧΙΑ: Διαφορά στα αθροίσματα")
            test3_pass = False

        # Final results
        print("\n" + "=" * 80)
        print("📊 ΤΕΛΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
        print("=" * 80)

        total_tests = 3
        passed_tests = sum([test1_pass, test2_pass, test3_pass])

        print(f"✅ Επιτυχημένα tests: {passed_tests}/{total_tests}")

        if passed_tests == total_tests:
            print("🎉 ΟΛΕΣ ΟΙ ΔΙΟΡΘΩΣΕΙΣ ΛΕΙΤΟΥΡΓΟΥΝ ΣΩΣΤΑ!")
            print("✅ Οι παλαιές οφειλές υπολογίζονται και μεταφέρονται σωστά")
            print("✅ Το σύστημα είναι έτοιμο για παραγωγή")
        else:
            print("⚠️  Κάποιες διορθώσεις χρειάζονται ακόμα δουλειά")

        if not test1_pass:
            print("🔧 Χρειάζεται διόρθωση στη συνάρτηση _calculate_historical_balance")
        if not test2_pass:
            print("🔧 Χρειάζεται διόρθωση στη λογική μεταφοράς μηνιαίων οφειλών")
        if not test3_pass:
            print("🔧 Χρειάζεται διόρθωση στον υπολογισμό συνολικών παλαιών οφειλών")

        print("\n💡 ΠΡΟΣΤΑΣΙΑ ΑΠΟ ΜΕΛΛΟΝΤΙΚΕΣ ΑΛΛΑΓΕΣ:")
        print("   1. Προσθέστε αυτό το script ως automated test")
        print("   2. Εκτελέστε το κάθε φορά που αλλάζετε financial logic")
        print("   3. Προσθέστε validation στην παραγωγή")

if __name__ == "__main__":
    main()
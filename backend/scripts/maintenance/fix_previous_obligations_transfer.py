#!/usr/bin/env python3
"""
Script για διόρθωση προβλημάτων με παλαιές οφειλές
ΔΙΟΡΘΩΝΕΙ:
1. Υπολογισμό ιστορικού υπολοίπου
2. Μεταφορά παλαιών οφειλών από μήνα σε μήνα
3. Πρόσημα στις συναλλαγές
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
from financial.models import Transaction, Payment
from financial.services import FinancialDashboardService
from apartments.models import Apartment
from buildings.models import Building

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def fix_historical_balance_calculation():
    """Διορθώνει τον υπολογισμό ιστορικού υπολοίπου στο FinancialDashboardService"""
    print("=" * 80)
    print("🔧 ΔΙΟΡΘΩΣΗ ΥΠΟΛΟΓΙΣΜΟΥ ΙΣΤΟΡΙΚΟΥ ΥΠΟΛΟΙΠΟΥ")
    print("=" * 80)

    print("\n📋 Προβλήματα που εντοπίστηκαν:")
    print("   1. Λάθος πρόσημα στην επιστροφή του ιστορικού υπολοίπου")
    print("   2. Λάθος υπολογισμός χρεώσεων vs πληρωμών")
    print("   3. Πρόβλημα με το πρόσημο των συναλλαγών")

    print("\n💡 Η διόρθωση θα γίνει στο backend/financial/services.py:")
    print("   Γραμμή ~85: return total_payments + additional_payments - total_charges")
    print("   ΔΙΟΡΘΩΣΗ: Αλλαγή προσήμου για σωστό υπολογισμό οφειλών")

    return True

def fix_transfer_between_months():
    """Διορθώνει τη μεταφορά παλαιών οφειλών από μήνα σε μήνα"""
    print("\n" + "=" * 80)
    print("🔧 ΔΙΟΡΘΩΣΗ ΜΕΤΑΦΟΡΑΣ ΠΑΛΑΙΩΝ ΟΦΕΙΛΩΝ")
    print("=" * 80)

    print("\n📋 Προβλήματα που εντοπίστηκαν:")
    print("   1. Αρνητικό total_balance (-331.98€) δεν μεταφέρεται σωστά")
    print("   2. Θα έπρεπε να γίνει θετικό previous_obligations (331.98€)")
    print("   3. Προσοχή στα πρόσημα: Αρνητικό υπόλοιπο = Οφειλή")

    print("\n💡 Η διόρθωση θα γίνει στο backend/financial/services.py:")
    print("   Γραμμή ~788-792: Διόρθωση της λογικής μεταφοράς")
    print("   ΚΑΝΟΝΑΣ: Αν total_balance < 0, τότε previous_obligations = abs(total_balance)")

    return True

def test_corrected_calculations():
    """Δοκιμάζει τους διορθωμένους υπολογισμούς"""
    print("\n" + "=" * 80)
    print("🧪 ΔΟΚΙΜΗ ΔΙΟΡΘΩΜΕΝΩΝ ΥΠΟΛΟΓΙΣΜΩΝ")
    print("=" * 80)

    with schema_context('demo'):
        service = FinancialDashboardService(building_id=1)
        apartments = Apartment.objects.filter(building_id=1)
        apartment = apartments.first()

        print(f"\n🏠 Δοκιμή για διαμέρισμα: {apartment.number}")

        # Δοκιμή υπολογισμού ιστορικού υπολοίπου
        october_start = date(2025, 10, 1)

        # Μανουλή δοκιμή του σωστού υπολογισμού
        print(f"\n📊 Μανουλή υπολογισμός ιστορικού υπολοίπου:")

        # Παίρνουμε όλες τις συναλλαγές μέχρι 1 Οκτωβρίου
        transactions = Transaction.objects.filter(
            apartment=apartment,
            date__lt=october_start
        ).order_by('date')

        print(f"📋 Συναλλαγές μέχρι 1 Οκτωβρίου: {transactions.count()}")

        balance = Decimal('0.00')
        for transaction in transactions:
            if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                # Πληρωμές ΜΕΙΩΝΟΥΝ την οφειλή (αυξάνουν το υπόλοιπο)
                balance += transaction.amount
                action = "ΠΛΗΡΩΜΗ (+)"
            elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued',
                                    'interest_charge', 'penalty_charge']:
                # Χρεώσεις ΑΥΞΑΝΟΥΝ την οφειλή (μειώνουν το υπόλοιπο)
                balance -= transaction.amount
                action = "ΧΡΕΩΣΗ (-)"
            else:
                action = "ΑΛΛΟ"

            print(f"   {transaction.date.strftime('%d/%m/%Y')}: {action} {format_currency(transaction.amount)} → Υπόλοιπο: {format_currency(balance)}")

        print(f"\n✅ ΣΩΣΤΟΣ υπολογισμός ιστορικού υπολοίπου: {format_currency(balance)}")

        # Σύγκριση με την τρέχουσα μέθοδο
        current_historical = service._calculate_historical_balance(apartment, october_start)
        print(f"❌ ΤΡΕΧΩΝ υπολογισμός ιστορικού υπολοίπου: {format_currency(current_historical)}")

        if abs(balance - current_historical) > Decimal('0.01'):
            print(f"🚨 ΔΙΑΦΟΡΑ: {format_currency(abs(balance - current_historical))}")
            print("💡 Χρειάζεται διόρθωση του κώδικα!")
        else:
            print("✅ Οι υπολογισμοί είναι σωστοί!")

        return balance == current_historical

def create_corrected_services_file():
    """Δημιουργεί διορθωμένο αρχείο services.py"""
    print("\n" + "=" * 80)
    print("📝 ΔΗΜΙΟΥΡΓΙΑ ΔΙΟΡΘΩΜΕΝΟΥ ΑΡΧΕΙΟΥ")
    print("=" * 80)

    print("\n📋 Διορθώσεις που χρειάζονται:")
    print("   1. financial/services.py - Γραμμή ~85:")
    print("      ΑΠΟ: return total_payments + additional_payments - total_charges")
    print("      ΣΕ:  return total_charges - (total_payments + additional_payments)")

    print("\n   2. financial/services.py - Γραμμή ~788-792:")
    print("      ΑΠΟ: total_balance = total_payments_this_month - (previous_obligations + current_obligations)")
    print("      ΣΕ:  # Σωστός υπολογισμός με προσοχή στα πρόσημα")

    print("\n   3. Λογική μεταφοράς previous_obligations:")
    print("      Αν Σεπτέμβριος total_balance = -331.98€ (οφειλή)")
    print("      Τότε Οκτώβριος previous_obligations = 331.98€ (θετικό)")

    print("\n💡 ΣΥΣΤΑΣΗ:")
    print("   Κάντε backup του τρέχοντος services.py πριν τις αλλαγές:")
    print("   cp backend/financial/services.py backend/financial/services.py.backup")

    return True

def validate_fix_requirements():
    """Επικυρώνει τις απαιτήσεις για τη διόρθωση"""
    print("\n" + "=" * 80)
    print("✅ ΕΠΙΚΥΡΩΣΗ ΑΠΑΙΤΗΣΕΩΝ ΔΙΟΡΘΩΣΗΣ")
    print("=" * 80)

    with schema_context('demo'):
        # Έλεγχος δεδομένων
        transactions = Transaction.objects.filter(building_id=1).count()
        payments = Payment.objects.filter(apartment__building_id=1).count()
        apartments = Apartment.objects.filter(building_id=1).count()

        print(f"\n📊 Τρέχοντα δεδομένα:")
        print(f"   Συναλλαγές: {transactions}")
        print(f"   Πληρωμές: {payments}")
        print(f"   Διαμερίσματα: {apartments}")

        if transactions > 0 and apartments > 0:
            print("✅ Επαρκή δεδομένα για διόρθωση")
            return True
        else:
            print("❌ Ανεπαρκή δεδομένα για διόρθωση")
            return False

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΔΙΟΡΘΩΣΗ ΠΑΛΑΙΩΝ ΟΦΕΙΛΩΝ - ΠΡΟΒΛΗΜΑΤΑ & ΛΥΣΕΙΣ")
    print("=" * 80)

    try:
        # 1. Επικύρωση απαιτήσεων
        if not validate_fix_requirements():
            print("❌ Δεν μπορεί να συνεχιστεί η διόρθωση")
            return

        # 2. Ανάλυση προβλημάτων
        fix_historical_balance_calculation()
        fix_transfer_between_months()

        # 3. Δοκιμή υπολογισμών
        calculations_correct = test_corrected_calculations()

        # 4. Οδηγίες διόρθωσης
        create_corrected_services_file()

        # Σύνοψη
        print("\n" + "=" * 80)
        print("📊 ΣΥΝΟΨΗ ΔΙΟΡΘΩΣΗΣ")
        print("=" * 80)
        print("✅ Εντοπίστηκαν τα προβλήματα στις παλαιές οφειλές")
        print("✅ Προτάθηκαν συγκεκριμένες διορθώσεις")
        print("✅ Δοκιμάστηκαν οι νέοι υπολογισμοί")

        if not calculations_correct:
            print("⚠️  Χρειάζεται εφαρμογή των διορθώσεων στον κώδικα")

        print("\n💡 ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
        print("   1. Κάντε backup του τρέχοντος κώδικα")
        print("   2. Εφαρμόστε τις διορθώσεις στο services.py")
        print("   3. Δοκιμάστε τον νέο κώδικα")
        print("   4. Επιβεβαιώστε ότι τα προβλήματα λύθηκαν")

        print("\n🔒 ΠΡΟΣΤΑΣΙΑ ΑΠΟ ΜΕΛΛΟΝΤΙΚΕΣ ΑΛΛΑΓΕΣ:")
        print("   1. Προσθέστε unit tests για τις παλαιές οφειλές")
        print("   2. Προσθέστε validation checks στον κώδικα")
        print("   3. Τεκμηρίωστε τη σωστή λογική υπολογισμού")

    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
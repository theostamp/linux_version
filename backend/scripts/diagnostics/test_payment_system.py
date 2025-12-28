#!/usr/bin/env python
"""
Test script για το νέο σύστημα πληρωμών
Εκτελέστε με: docker cp test_payment_system.py linux_version-backend-1:/app/ && docker exec -it linux_version-backend-1 python /app/test_payment_system.py
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db import transaction as db_transaction
from financial.payment_service import PaymentService, BalanceCalculator, PaymentValidator
from financial.models import Payment, Transaction
from apartments.models import Apartment
from buildings.models import Building


def test_payment_system():
    """Comprehensive test του νέου συστήματος πληρωμών"""

    with schema_context('demo'):
        print("\n" + "="*60)
        print("ΤΕΣΤ ΝΕΟΥ ΣΥΣΤΗΜΑΤΟΣ ΠΛΗΡΩΜΩΝ")
        print("="*60)

        # 1. Λήψη demo building
        building = Building.objects.get(id=1)
        print(f"\n✓ Building: {building.name}")

        # 2. Λήψη test apartment
        apartment = Apartment.objects.filter(building=building).first()
        print(f"✓ Test Apartment: {apartment.number} - {apartment.owner_name}")

        # 3. Δημιουργία PaymentService
        payment_service = PaymentService(building.id)
        print("✓ PaymentService initialized")

        # 4. Test δημιουργίας πληρωμής
        print("\n" + "-"*40)
        print("TEST 1: Δημιουργία Πληρωμής")
        print("-"*40)

        try:
            with db_transaction.atomic():
                # Υπολογισμός υπολοίπου πριν
                calc = BalanceCalculator(building.id)
                balance_before = calc.calculate_apartment_balance(apartment.id)
                print(f"Υπόλοιπο πριν: {balance_before['balance']:.2f}€")

                # Δημιουργία πληρωμής
                payment = payment_service.create_payment(
                    apartment_id=apartment.id,
                    amount=Decimal('150.00'),
                    payment_date=date.today(),
                    method='bank_transfer',
                    reference_number='TEST-001',
                    notes='Test payment από νέο σύστημα'
                )
                print(f"✓ Δημιουργήθηκε πληρωμή #{payment.id}: {payment.amount}€")

                # Έλεγχος transactions
                trans_count = Transaction.objects.filter(
                    reference_id=str(payment.id)
                ).count()
                print(f"✓ Δημιουργήθηκαν {trans_count} transactions")

                # Υπολογισμός υπολοίπου μετά
                balance_after = calc.calculate_apartment_balance(apartment.id)
                print(f"Υπόλοιπο μετά: {balance_after['balance']:.2f}€")

                diff = balance_after['balance'] - balance_before['balance']
                print(f"Διαφορά: {diff:.2f}€")

                if abs(diff - Decimal('150.00')) < Decimal('0.01'):
                    print("✓ Το υπόλοιπο ενημερώθηκε σωστά!")
                else:
                    print("✗ ΠΡΟΒΛΗΜΑ: Το υπόλοιπο δεν ενημερώθηκε σωστά")

                # Rollback για να μην αλλάξουμε τα πραγματικά δεδομένα
                raise Exception("Rollback test transaction")

        except Exception as e:
            if "Rollback" not in str(e):
                print(f"✗ Σφάλμα: {e}")

        # 5. Test επικύρωσης υπολοίπων
        print("\n" + "-"*40)
        print("TEST 2: Επικύρωση Υπολοίπων")
        print("-"*40)

        apartments = Apartment.objects.filter(building=building)[:3]

        for apt in apartments:
            is_valid, data = PaymentValidator.validate_apartment_balance(apt.id)

            if is_valid:
                print(f"✓ {apt.number}: Υπόλοιπο OK ({data['stored_balance']:.2f}€)")
            else:
                print(f"✗ {apt.number}: Ασυμφωνία!")
                print(f"  - Αποθηκευμένο: {data['stored_balance']:.2f}€")
                print(f"  - Υπολογισμένο: {data['calculated_balance']:.2f}€")
                print(f"  - Διαφορά: {data['difference']:.2f}€")

        # 6. Test μηνιαίων υπολοίπων με carry-over
        print("\n" + "-"*40)
        print("TEST 3: Μηνιαία Υπόλοιπα με Carry-Over")
        print("-"*40)

        calc = BalanceCalculator(building.id)
        test_apt = apartments.first()

        current_month = date.today().month
        current_year = date.today().year

        monthly = calc.calculate_monthly_balance(
            test_apt.id,
            current_year,
            current_month
        )

        print(f"Διαμέρισμα: {test_apt.number}")
        print(f"Μήνας: {monthly['month']}/{monthly['year']}")
        print(f"Προηγούμενο υπόλοιπο: {monthly['previous_balance']:.2f}€")
        print(f"Χρεώσεις μήνα: {monthly['month_charges']:.2f}€")
        print(f"Πληρωμές μήνα: {monthly['month_payments']:.2f}€")
        print(f"Τελικό υπόλοιπο: {monthly['ending_balance']:.2f}€")
        print(f"Μεταφορά σε επόμενο: {monthly['carry_over_to_next']:.2f}€")

        # 7. Test ιστορικού υπολοίπων
        print("\n" + "-"*40)
        print("TEST 4: Ιστορικό Υπολοίπων")
        print("-"*40)

        history = calc.get_balance_history(test_apt.id, months=3)

        print(f"Ιστορικό για {test_apt.number} (τελευταίοι 3 μήνες):")
        for month_data in history:
            print(f"\n{month_data['month']}/{month_data['year']}:")
            print(f"  Αρχικό: {month_data['previous_balance']:.2f}€")
            print(f"  Χρεώσεις: {month_data['month_charges']:.2f}€")
            print(f"  Πληρωμές: {month_data['month_payments']:.2f}€")
            print(f"  Τελικό: {month_data['ending_balance']:.2f}€")

        # 8. Σύνοψη
        print("\n" + "="*60)
        print("ΣΥΝΟΨΗ ΤΕΣΤ")
        print("="*60)

        # Έλεγχος όλων των διαμερισμάτων
        all_apartments = Apartment.objects.filter(building=building)
        valid_count = 0
        invalid_count = 0

        for apt in all_apartments:
            is_valid, _ = PaymentValidator.validate_apartment_balance(apt.id)
            if is_valid:
                valid_count += 1
            else:
                invalid_count += 1

        print(f"✓ Διαμερίσματα με σωστά υπόλοιπα: {valid_count}")
        if invalid_count > 0:
            print(f"✗ Διαμερίσματα με ασυμφωνίες: {invalid_count}")

        # Έλεγχος πληρωμών χωρίς transactions
        payments_without_trans = Payment.objects.filter(
            apartment__building=building
        ).exclude(
            id__in=Transaction.objects.filter(
                reference_id__isnull=False
            ).values_list('reference_id', flat=True)
        ).count()

        if payments_without_trans > 0:
            print(f"⚠️ Πληρωμές χωρίς transactions: {payments_without_trans}")
        else:
            print("✓ Όλες οι πληρωμές έχουν transactions")

        print("\n" + "="*60)
        print("ΤΕΣΤ ΟΛΟΚΛΗΡΩΘΗΚΕ")
        print("="*60)


if __name__ == '__main__':
    test_payment_system()
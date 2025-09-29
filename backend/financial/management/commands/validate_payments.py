"""
Management command για επικύρωση και διόρθωση δεδομένων πληρωμών
"""

from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from django.db.models import Sum, Q
from django_tenants.utils import schema_context
from decimal import Decimal
from datetime import datetime
from django.utils import timezone

from financial.models import Payment, Transaction
from financial.payment_service import PaymentValidator, BalanceCalculator
from apartments.models import Apartment
from buildings.models import Building


class Command(BaseCommand):
    help = 'Επικύρωση και διόρθωση δεδομένων πληρωμών'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            help='ID κτιρίου για επικύρωση'
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Αυτόματη διόρθωση προβλημάτων'
        )
        parser.add_argument(
            '--create-missing-transactions',
            action='store_true',
            help='Δημιουργία transactions που λείπουν'
        )

    def handle(self, *args, **options):
        with schema_context('demo'):
            building_id = options.get('building_id')
            fix_issues = options.get('fix', False)
            create_missing = options.get('create_missing_transactions', False)

            if building_id:
                buildings = Building.objects.filter(id=building_id)
            else:
                buildings = Building.objects.all()

            for building in buildings:
                self.stdout.write(f"\n{'='*60}")
                self.stdout.write(f"Έλεγχος κτιρίου: {building.name}")
                self.stdout.write(f"{'='*60}")

                self._validate_building_payments(building, fix_issues, create_missing)

    def _validate_building_payments(self, building, fix_issues, create_missing):
        """Επικύρωση πληρωμών κτιρίου"""

        # 1. Έλεγχος πληρωμών χωρίς transactions
        self.stdout.write("\n1. Έλεγχος πληρωμών χωρίς transactions...")
        payments_without_trans = self._check_payments_without_transactions(building)

        if payments_without_trans:
            self.stdout.write(
                self.style.WARNING(
                    f"   Βρέθηκαν {len(payments_without_trans)} πληρωμές χωρίς transactions"
                )
            )

            if create_missing:
                self._create_missing_transactions(payments_without_trans)
                self.stdout.write(
                    self.style.SUCCESS("   ✓ Δημιουργήθηκαν τα transactions που έλειπαν")
                )
        else:
            self.stdout.write(self.style.SUCCESS("   ✓ Όλες οι πληρωμές έχουν transactions"))

        # 2. Έλεγχος ακεραιότητας ποσών
        self.stdout.write("\n2. Έλεγχος ακεραιότητας ποσών...")
        invalid_payments = self._check_payment_amounts(building)

        if invalid_payments:
            self.stdout.write(
                self.style.WARNING(
                    f"   Βρέθηκαν {len(invalid_payments)} πληρωμές με ασυμφωνία ποσών"
                )
            )

            if fix_issues:
                self._fix_payment_amounts(invalid_payments)
                self.stdout.write(
                    self.style.SUCCESS("   ✓ Διορθώθηκαν οι ασυμφωνίες ποσών")
                )
        else:
            self.stdout.write(self.style.SUCCESS("   ✓ Όλα τα ποσά είναι συνεπή"))

        # 3. Έλεγχος υπολοίπων διαμερισμάτων
        self.stdout.write("\n3. Έλεγχος υπολοίπων διαμερισμάτων...")
        apartments = Apartment.objects.filter(building=building)
        invalid_balances = []

        for apartment in apartments:
            is_valid, validation_data = PaymentValidator.validate_apartment_balance(apartment.id)
            if not is_valid:
                invalid_balances.append((apartment, validation_data))

        if invalid_balances:
            self.stdout.write(
                self.style.WARNING(
                    f"   Βρέθηκαν {len(invalid_balances)} διαμερίσματα με λάθος υπόλοιπα"
                )
            )

            for apartment, data in invalid_balances:
                self.stdout.write(
                    f"   - {apartment.number}: "
                    f"Αποθηκευμένο={data['stored_balance']:.2f}, "
                    f"Υπολογισμένο={data['calculated_balance']:.2f}, "
                    f"Διαφορά={data['difference']:.2f}"
                )

            if fix_issues:
                self._fix_apartment_balances(invalid_balances)
                self.stdout.write(
                    self.style.SUCCESS("   ✓ Διορθώθηκαν τα υπόλοιπα")
                )
        else:
            self.stdout.write(self.style.SUCCESS("   ✓ Όλα τα υπόλοιπα είναι σωστά"))

        # 4. Έλεγχος διπλών transactions
        self.stdout.write("\n4. Έλεγχος διπλών transactions...")
        duplicate_trans = self._check_duplicate_transactions(building)

        if duplicate_trans:
            self.stdout.write(
                self.style.WARNING(
                    f"   Βρέθηκαν {len(duplicate_trans)} πιθανά διπλά transactions"
                )
            )

            if fix_issues:
                self._remove_duplicate_transactions(duplicate_trans)
                self.stdout.write(
                    self.style.SUCCESS("   ✓ Αφαιρέθηκαν τα διπλά transactions")
                )
        else:
            self.stdout.write(self.style.SUCCESS("   ✓ Δεν βρέθηκαν διπλά transactions"))

        # 5. Σύνοψη
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"Ολοκληρώθηκε ο έλεγχος για: {building.name}"))

    def _check_payments_without_transactions(self, building):
        """Εύρεση πληρωμών χωρίς transactions"""
        payments = Payment.objects.filter(apartment__building=building)
        payments_without_trans = []

        for payment in payments:
            trans_count = Transaction.objects.filter(
                reference_id=str(payment.id)
            ).count()

            if trans_count == 0:
                payments_without_trans.append(payment)

        return payments_without_trans

    def _create_missing_transactions(self, payments):
        """Δημιουργία transactions που λείπουν"""
        for payment in payments:
            with db_transaction.atomic():
                # Δημιουργία transaction για την πληρωμή
                Transaction.objects.create(
                    apartment_number=payment.apartment.number,
                    type='payment_received',
                    amount=payment.amount,
                    date=timezone.make_aware(
                        datetime.combine(payment.date, datetime.min.time())
                    ),
                    description=f"Πληρωμή - {payment.reference_number or 'N/A'}",
                    reference_id=str(payment.id)
                )

    def _check_payment_amounts(self, building):
        """Έλεγχος ακεραιότητας ποσών"""
        payments = Payment.objects.filter(apartment__building=building)
        invalid_payments = []

        for payment in payments:
            trans_total = Transaction.objects.filter(
                reference_id=str(payment.id)
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            if abs(trans_total - payment.amount) > Decimal('0.01'):
                invalid_payments.append((payment, trans_total))

        return invalid_payments

    def _fix_payment_amounts(self, invalid_payments):
        """Διόρθωση ασυμφωνιών ποσών"""
        for payment, trans_total in invalid_payments:
            with db_transaction.atomic():
                if trans_total == Decimal('0'):
                    # Δεν υπάρχουν transactions, δημιουργία νέου
                    Transaction.objects.create(
                        apartment_number=payment.apartment.number,
                        type='payment_received',
                        amount=payment.amount,
                        date=timezone.make_aware(
                            datetime.combine(payment.date, datetime.min.time())
                        ),
                        description=f"Διόρθωση - Πληρωμή {payment.reference_number or ''}",
                        reference_id=str(payment.id)
                    )
                else:
                    # Ενημέρωση payment amount για να ταιριάζει με transactions
                    payment.amount = trans_total
                    payment.save(update_fields=['amount'])

    def _fix_apartment_balances(self, invalid_balances):
        """Διόρθωση υπολοίπων διαμερισμάτων"""
        for apartment, validation_data in invalid_balances:
            with db_transaction.atomic():
                apartment.current_balance = validation_data['calculated_balance']
                apartment.save(update_fields=['current_balance'])

    def _check_duplicate_transactions(self, building):
        """Έλεγχος για διπλά transactions"""
        apartments = Apartment.objects.filter(building=building)
        duplicates = []

        for apartment in apartments:
            # Εύρεση transactions με ίδια ποσά και ημερομηνίες
            trans = Transaction.objects.filter(
                apartment_number=apartment.number
            ).values('amount', 'date', 'type').annotate(
                count=Sum('id')
            ).filter(count__gt=1)

            for dup in trans:
                duplicate_trans = Transaction.objects.filter(
                    apartment_number=apartment.number,
                    amount=dup['amount'],
                    date=dup['date'],
                    type=dup['type']
                )
                if duplicate_trans.count() > 1:
                    duplicates.append(list(duplicate_trans))

        return duplicates

    def _remove_duplicate_transactions(self, duplicates):
        """Αφαίρεση διπλών transactions"""
        for dup_group in duplicates:
            # Κρατάμε το πρώτο, διαγράφουμε τα υπόλοιπα
            with db_transaction.atomic():
                for trans in dup_group[1:]:
                    trans.delete()
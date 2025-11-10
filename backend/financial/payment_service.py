"""
Payment Service - Κεντρική υπηρεσία διαχείρισης πληρωμών
Αξιόπιστη, καθαρή αρχιτεκτονική με πλήρη transaction tracking
"""

from decimal import Decimal
from typing import Dict, Any, Optional, List, Tuple
from datetime import date, datetime
from django.db import transaction as db_transaction
from django.db.models import Sum, Q, F
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Payment, Transaction, CommonExpensePeriod, ApartmentShare
from apartments.models import Apartment
from buildings.models import Building


class PaymentService:
    """
    Κεντρική υπηρεσία διαχείρισης πληρωμών με αξιόπιστο transaction tracking
    """

    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)

    @db_transaction.atomic
    def create_payment(self,
                      apartment_id: int,
                      amount: Decimal,
                      payment_date: date,
                      method: str,
                      reference_number: Optional[str] = None,
                      notes: Optional[str] = None,
                      allocations: Optional[Dict[str, Decimal]] = None) -> Payment:
        """
        Δημιουργία πληρωμής με αυτόματη δημιουργία transactions

        Args:
            apartment_id: ID διαμερίσματος
            amount: Ποσό πληρωμής
            payment_date: Ημερομηνία πληρωμής
            method: Μέθοδος πληρωμής
            reference_number: Αριθμός αναφοράς
            notes: Σημειώσεις
            allocations: Κατανομή πληρωμής (π.χ. {'common_expenses': 100, 'reserve_fund': 20})

        Returns:
            Payment instance
        """
        apartment = Apartment.objects.select_for_update().get(id=apartment_id)

        # Δημιουργία payment
        payment = Payment.objects.create(
            apartment=apartment,
            amount=amount,
            date=payment_date,
            method=method,
            reference_number=reference_number,
            notes=notes
        )

        # Αυτόματος επιμερισμός πληρωμής αν δεν δόθηκε
        if not allocations:
            allocations = self._auto_allocate_payment(apartment, amount, payment_date)

        # Δημιουργία transactions για κάθε κατηγορία
        for category, allocated_amount in allocations.items():
            if allocated_amount > 0:
                self._create_payment_transaction(
                    payment=payment,
                    apartment=apartment,
                    amount=allocated_amount,
                    category=category,
                    payment_date=payment_date
                )

        # Ενημέρωση υπολοίπου διαμερίσματος
        self._update_apartment_balance(apartment)

        return payment

    def _auto_allocate_payment(self,
                               apartment: Apartment,
                               amount: Decimal,
                               payment_date: date) -> Dict[str, Decimal]:
        """
        Αυτόματος επιμερισμός πληρωμής βάσει οφειλών (FIFO)
        """
        allocations = {}
        remaining = amount

        # 1. Πρώτα καλύπτουμε παλιές οφειλές
        previous_debt = self._get_previous_obligations(apartment, payment_date)
        if previous_debt > 0 and remaining > 0:
            allocated = min(remaining, previous_debt)
            allocations['previous_obligations'] = allocated
            remaining -= allocated

        # 2. Μετά τρέχοντα κοινόχρηστα
        current_common_expenses = self._get_current_month_charges(apartment, payment_date)
        if current_common_expenses > 0 and remaining > 0:
            allocated = min(remaining, current_common_expenses)
            allocations['common_expenses'] = allocated
            remaining -= allocated

        # 3. Τέλος αποθεματικό
        if remaining > 0:
            allocations['reserve_fund'] = remaining

        return allocations

    def _create_payment_transaction(self,
                                   payment: Payment,
                                   apartment: Apartment,
                                   amount: Decimal,
                                   category: str,
                                   payment_date: date):
        """
        Δημιουργία transaction για πληρωμή
        """
        transaction_type_map = {
            'common_expenses': 'common_expense_payment',
            'previous_obligations': 'payment_received',
            'reserve_fund': 'reserve_fund_payment',
            'other': 'payment_received'
        }

        transaction_type = transaction_type_map.get(category, 'payment_received')

        Transaction.objects.create(
            apartment_number=apartment.number,
            type=transaction_type,
            amount=amount,
            date=timezone.make_aware(datetime.combine(payment_date, datetime.min.time())),
            description=f"Πληρωμή {category.replace('_', ' ')} - {payment.reference_number or ''}",
            reference_id=str(payment.id)
        )

    def _update_apartment_balance(self, apartment: Apartment):
        """
        Ενημέρωση υπολοίπου διαμερίσματος από transactions

        ΣΗΜΕΙΩΣΗ: Αυτή η μέθοδος χρησιμοποιεί το BalanceCalculationService
        για να διασφαλίσει consistency σε όλο το σύστημα.
        """
        from .balance_service import BalanceCalculationService

        # Χρήση του κεντρικού service για consistency
        # use_locking=False γιατί ήδη είμαστε μέσα σε atomic transaction
        BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)

    def _get_previous_obligations(self, apartment: Apartment, reference_date: date) -> Decimal:
        """
        Υπολογισμός παλαιότερων οφειλών
        """
        # Χρεώσεις πριν την ημερομηνία αναφοράς
        charges = Transaction.objects.filter(
            apartment_number=apartment.number,
            date__lt=timezone.make_aware(datetime.combine(reference_date, datetime.min.time())),
            type__in=['common_expense_charge', 'expense_created', 'expense_issued']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Πληρωμές πριν την ημερομηνία αναφοράς
        payments = Transaction.objects.filter(
            apartment_number=apartment.number,
            date__lt=timezone.make_aware(datetime.combine(reference_date, datetime.min.time())),
            type__in=['common_expense_payment', 'payment_received']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        debt = charges - payments
        return max(debt, Decimal('0'))

    def _get_current_month_charges(self, apartment: Apartment, reference_date: date) -> Decimal:
        """
        Υπολογισμός χρεώσεων τρέχοντος μήνα
        """
        month_start = reference_date.replace(day=1)
        if reference_date.month == 12:
            month_end = reference_date.replace(year=reference_date.year + 1, month=1, day=1)
        else:
            month_end = reference_date.replace(month=reference_date.month + 1, day=1)

        charges = Transaction.objects.filter(
            apartment_number=apartment.number,
            date__gte=timezone.make_aware(datetime.combine(month_start, datetime.min.time())),
            date__lt=timezone.make_aware(datetime.combine(month_end, datetime.min.time())),
            type='common_expense_charge'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        return charges

    @db_transaction.atomic
    def update_payment(self,
                       payment_id: int,
                       amount: Optional[Decimal] = None,
                       method: Optional[str] = None,
                       reference_number: Optional[str] = None,
                       notes: Optional[str] = None) -> Payment:
        """
        Ενημέρωση πληρωμής με αυτόματη ενημέρωση transactions
        """
        payment = Payment.objects.select_for_update().get(id=payment_id)
        old_amount = payment.amount

        # Ενημέρωση πεδίων
        if amount is not None:
            payment.amount = amount
        if method is not None:
            payment.method = method
        if reference_number is not None:
            payment.reference_number = reference_number
        if notes is not None:
            payment.notes = notes

        payment.save()

        # Αν άλλαξε το ποσό, ενημέρωση transactions
        if amount and amount != old_amount:
            # Διαγραφή παλιών transactions
            Transaction.objects.filter(reference_id=str(payment_id)).delete()

            # Δημιουργία νέων με νέο επιμερισμό
            allocations = self._auto_allocate_payment(
                payment.apartment,
                amount,
                payment.date
            )

            for category, allocated_amount in allocations.items():
                if allocated_amount > 0:
                    self._create_payment_transaction(
                        payment=payment,
                        apartment=payment.apartment,
                        amount=allocated_amount,
                        category=category,
                        payment_date=payment.date
                    )

            # Ενημέρωση υπολοίπου
            self._update_apartment_balance(payment.apartment)

        return payment

    @db_transaction.atomic
    def delete_payment(self, payment_id: int):
        """
        Διαγραφή πληρωμής με αυτόματη διαγραφή transactions
        """
        payment = Payment.objects.get(id=payment_id)
        apartment = payment.apartment

        # Διαγραφή σχετικών transactions
        Transaction.objects.filter(reference_id=str(payment_id)).delete()

        # Διαγραφή payment
        payment.delete()

        # Ενημέρωση υπολοίπου
        self._update_apartment_balance(apartment)

    def get_payment_history(self,
                           apartment_id: int,
                           start_date: Optional[date] = None,
                           end_date: Optional[date] = None) -> List[Dict[str, Any]]:
        """
        Λήψη ιστορικού πληρωμών με πλήρη ανάλυση
        """
        filters = Q(apartment_id=apartment_id)

        if start_date:
            filters &= Q(date__gte=start_date)
        if end_date:
            filters &= Q(date__lte=end_date)

        payments = Payment.objects.filter(filters).order_by('-date')

        history = []
        for payment in payments:
            # Εύρεση σχετικών transactions
            transactions = Transaction.objects.filter(
                reference_id=str(payment.id)
            ).values('category', 'amount')

            allocations = {t['category']: t['amount'] for t in transactions}

            history.append({
                'id': payment.id,
                'date': payment.date,
                'amount': payment.amount,
                'method': payment.method,
                'reference_number': payment.reference_number,
                'notes': payment.notes,
                'allocations': allocations
            })

        return history


class BalanceCalculator:
    """
    Υπολογιστής υπολοίπων με πλήρη carry-over υποστήριξη
    """

    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)

    def calculate_apartment_balance(self,
                                   apartment_id: int,
                                   reference_date: Optional[date] = None) -> Dict[str, Decimal]:
        """
        Υπολογισμός αναλυτικού υπολοίπου διαμερίσματος

        ΣΗΜΕΙΩΣΗ: Αυτή η μέθοδος χρησιμοποιεί το BalanceCalculationService
        για να διασφαλίσει consistency και σωστό sign convention.
        """
        from .balance_service import BalanceCalculationService
        from .transaction_types import TransactionType

        apartment = Apartment.objects.get(id=apartment_id)

        if not reference_date:
            reference_date = date.today()

        # Χρήση BalanceCalculationService για σωστό υπολογισμό
        if reference_date == date.today():
            # Τρέχον balance
            balance = BalanceCalculationService.calculate_current_balance(apartment)
        else:
            # Ιστορικό balance
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment,
                reference_date,
                include_management_fees=True
            )

        # Υπολογισμός breakdown για αναλυτική αναφορά
        total_charges = Transaction.objects.filter(
            apartment=apartment,
            date__lte=timezone.make_aware(datetime.combine(reference_date, datetime.max.time())),
            type__in=TransactionType.get_charge_types()
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_payments = Transaction.objects.filter(
            apartment=apartment,
            date__lte=timezone.make_aware(datetime.combine(reference_date, datetime.max.time())),
            type__in=TransactionType.get_payment_types()
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # ΣΗΜΕΙΩΣΗ: balance = charges - payments (θετικό = χρέος)
        return {
            'total_charges': total_charges,
            'total_payments': total_payments,
            'balance': balance,
            'has_debt': balance > 0,  # ✅ Σωστό: θετικό = χρέος
            'debt_amount': balance if balance > 0 else Decimal('0'),
            'credit_amount': abs(balance) if balance < 0 else Decimal('0')
        }

    def calculate_monthly_balance(self,
                                 apartment_id: int,
                                 year: int,
                                 month: int) -> Dict[str, Any]:
        """
        Υπολογισμός μηνιαίου υπολοίπου με carry-over
        """
        apartment = Apartment.objects.get(id=apartment_id)

        # Ημερομηνίες περιόδου
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        # Υπόλοιπο προηγούμενου μήνα (carry-over)
        previous_balance = self.calculate_apartment_balance(
            apartment_id,
            month_start - timezone.timedelta(days=1)
        )['balance']

        # Χρεώσεις τρέχοντος μήνα
        month_charges = Transaction.objects.filter(
            apartment_number=apartment.number,
            date__gte=timezone.make_aware(datetime.combine(month_start, datetime.min.time())),
            date__lt=timezone.make_aware(datetime.combine(month_end, datetime.min.time())),
            type__in=['common_expense_charge', 'expense_created']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Πληρωμές τρέχοντος μήνα
        month_payments = Transaction.objects.filter(
            apartment_number=apartment.number,
            date__gte=timezone.make_aware(datetime.combine(month_start, datetime.min.time())),
            date__lt=timezone.make_aware(datetime.combine(month_end, datetime.min.time())),
            type__in=['common_expense_payment', 'payment_received']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Τελικό υπόλοιπο μήνα
        ending_balance = previous_balance + month_payments - month_charges

        return {
            'year': year,
            'month': month,
            'previous_balance': previous_balance,
            'month_charges': month_charges,
            'month_payments': month_payments,
            'ending_balance': ending_balance,
            'carry_over_to_next': ending_balance
        }

    def get_balance_history(self,
                           apartment_id: int,
                           months: int = 12) -> List[Dict[str, Any]]:
        """
        Ιστορικό υπολοίπων με πλήρη carry-over tracking
        """
        history = []
        current = date.today()

        for i in range(months):
            # Υπολογισμός για κάθε μήνα
            year = current.year
            month = current.month - i

            if month <= 0:
                month += 12
                year -= 1

            month_balance = self.calculate_monthly_balance(apartment_id, year, month)
            history.append(month_balance)

        return list(reversed(history))


class PaymentValidator:
    """
    Επικύρωση και διασταύρωση δεδομένων πληρωμών
    """

    @staticmethod
    def validate_payment_integrity(payment_id: int) -> Tuple[bool, List[str]]:
        """
        Έλεγχος ακεραιότητας πληρωμής
        """
        errors = []

        try:
            payment = Payment.objects.get(id=payment_id)

            # Έλεγχος ύπαρξης transactions
            transactions = Transaction.objects.filter(reference_id=str(payment_id))
            if not transactions.exists():
                errors.append("Δεν βρέθηκαν transactions για την πληρωμή")

            # Έλεγχος συνολικού ποσού
            total_transaction_amount = transactions.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')

            if total_transaction_amount != payment.amount:
                errors.append(
                    f"Ασυμφωνία ποσών: Payment={payment.amount}, "
                    f"Transactions={total_transaction_amount}"
                )

            # Έλεγχος ημερομηνιών
            for trans in transactions:
                if trans.date.date() != payment.date:
                    errors.append(
                        f"Ασυμφωνία ημερομηνιών στο transaction {trans.id}"
                    )

        except Payment.DoesNotExist:
            errors.append("Η πληρωμή δεν υπάρχει")

        return len(errors) == 0, errors

    @staticmethod
    def validate_apartment_balance(apartment_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Διασταύρωση υπολοίπου διαμερίσματος
        """
        apartment = Apartment.objects.get(id=apartment_id)

        # Υπολογισμός από transactions
        total_charges = Transaction.objects.filter(
            apartment_number=apartment.number,
            type__in=['common_expense_charge', 'expense_created', 'expense_issued',
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_payments = Transaction.objects.filter(
            apartment_number=apartment.number,
            type__in=['common_expense_payment', 'payment_received', 'reserve_fund_payment',
                     'refund']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        calculated_balance = total_payments - total_charges
        stored_balance = apartment.current_balance or Decimal('0')

        is_valid = abs(calculated_balance - stored_balance) < Decimal('0.01')

        return is_valid, {
            'calculated_balance': calculated_balance,
            'stored_balance': stored_balance,
            'difference': calculated_balance - stored_balance,
            'total_charges': total_charges,
            'total_payments': total_payments
        }
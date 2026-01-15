"""
Balance Calculation Service - Single Source of Truth

This service provides centralized balance calculation logic for all apartments.
It replaces multiple duplicate implementations across the codebase.

Created: 2025-10-03
Updated: 2025-10-03 - Added performance monitoring
Purpose: Eliminate balance calculation bugs and code duplication
"""

import logging
import time
from decimal import Decimal
from datetime import date, datetime
from typing import Optional

from django.db.models import Sum
from django.utils import timezone

from apartments.models import Apartment
from .models import Expense, Transaction, Payment
from .transaction_types import TransactionType

# Setup logging
logger = logging.getLogger(__name__)


class BalanceCalculationService:
    """
    Κεντρικό service για ΟΛΟΥΣ τους υπολογισμούς υπολοίπων.

    ΚΑΝΟΝΕΣ:
    1. Όλα τα άλλα components χρησιμοποιούν ΑΥΤΟ το service
    2. ΔΕΝ υπάρχουν άλλες balance calculation functions
    3. Apartment.current_balance είναι το Single Source of Truth

    Αντικαθιστά:
    - CommonExpenseCalculator._get_historical_balance() (Line 53)
    - CommonExpenseDistributor._get_historical_balance() (Line 2207)
    - BalanceTransferService._calculate_historical_balance() (Line 1142)
    - _calculate_apartment_balance() (Line 2817)
    """

    @staticmethod
    def calculate_historical_balance(
        apartment: Apartment,
        end_date: date,
        include_management_fees: bool = True,
        include_reserve_fund: bool = False
    ) -> Decimal:
        """
        Υπολογισμός ιστορικού υπολοίπου διαμερίσματος μέχρι συγκεκριμένη ημερομηνία

        ΣΗΜΑΝΤΙΚΟ: Για "Previous Months' Obligations", πρέπει να υπολογίζουμε μόνο
        τις οφειλές από δαπάνες που δημιουργήθηκαν ΠΡΙΝ από τον επιλεγμένο μήνα.

        Βασισμένο στην BalanceTransferService._calculate_historical_balance()
        που είναι η ΣΩΣΤΗ implementation.

        Args:
            apartment: Το διαμέρισμα για το οποίο υπολογίζουμε το υπόλοιπο
            end_date: Η ημερομηνία μέχρι την οποία υπολογίζουμε (exclusive)
            include_management_fees: Αν θα συμπεριλαμβάνονται τα management fees
            include_reserve_fund: Αν θα συμπεριλαμβάνεται η εισφορά αποθεματικού

        Returns:
            Decimal: Το υπόλοιπο του διαμερίσματος μέχρι την δοθείσα ημερομηνία
                    (θετικό = χρέος, αρνητικό = πίστωση)

        Example:
            >>> apartment = Apartment.objects.get(number="Α1")
            >>> balance = BalanceCalculationService.calculate_historical_balance(
            ...     apartment, date(2025, 11, 1)
            ... )
            >>> print(f"Balance: {balance}")
            Balance: 150.00
        """
        # Type checking and normalization
        if isinstance(end_date, datetime):
            end_date = end_date.date()

        # Υπολογισμός αρχής του μήνα
        month_start = end_date.replace(day=1)

        # Έλεγχος financial_system_start_date
        building = apartment.building
        system_start_date = building.financial_system_start_date

        # Infer/repair start date from earliest expense when missing or too recent.
        oldest_expense = Expense.objects.filter(
            building_id=apartment.building_id
        ).order_by('date').first()
        earliest_month = oldest_expense.date.replace(day=1) if oldest_expense and oldest_expense.date else None

        if system_start_date is None or (earliest_month and system_start_date > earliest_month):
            if earliest_month:
                system_start_date = earliest_month
                building.financial_system_start_date = system_start_date
                building.save(update_fields=['financial_system_start_date'])
                logger.info(
                    "✅ Set financial_system_start_date for building %s to %s based on earliest expense.",
                    building.id,
                    system_start_date
                )
            else:
                # No expenses, keep safe zero balance.
                logger.warning(
                    "⚠️ Building %s has no financial_system_start_date and no expenses. Returning 0.",
                    building.id
                )
                return Decimal('0.00')

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # ⚠️ ΚΡΙΣΙΜΟ: BALANCE TRANSFER LOGIC - ΜΗΝ ΑΛΛΑΞΕΤΕ ΧΩΡΙΣ TESTING!
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        #
        # Βρίσκουμε δαπάνες που δημιουργήθηκαν ΠΡΙΝ από τον επιλεγμένο μήνα
        #
        # ΠΑΡΑΔΕΙΓΜΑ:
        # - Αν month_start = 2025-11-01 (Νοέμβριος)
        # - Θα βρούμε δαπάνες με date < 2025-11-01
        # - Δηλαδή: 2025-10-31 ✅, 2025-11-01 ❌
        #
        # ΠΡΟΣΟΧΗ: Το date__lt (όχι date__lte) είναι ΣΚΟΠΙΜΟ!
        # Αν αλλάξει σε date__lte, θα υπάρχει διπλή χρέωση!
        #
        # Βλέπε: BALANCE_TRANSFER_ARCHITECTURE.md
        # Tests: financial/tests/test_balance_transfer_logic.py
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        expenses_before_month = Expense.objects.filter(
            building_id=apartment.building_id,
            date__gte=system_start_date,  # Από την ημερομηνία έναρξης συστήματος
            date__lt=month_start  # ⚠️ ΚΡΙΣΙΜΟ: < όχι <= !!!
        )

        expense_ids_before_month = list(expenses_before_month.values_list('id', flat=True))

        # Υπολογισμός χρεώσεων μόνο από αυτές τις δαπάνες
        # ΔΙΟΡΘΩΣΗ: Αφαιρούμε τα management_fees expenses από τα transactions
        # γιατί θα τα υπολογίσουμε ξεχωριστά παρακάτω
        total_charges = Decimal('0.00')

        if expense_ids_before_month:
            # Βρίσκουμε τα management_fees και reserve_fund expense IDs για να τα αφαιρέσουμε
            # γιατί θα τα υπολογίσουμε ξεχωριστά παρακάτω
            special_category_expense_ids = list(Expense.objects.filter(
                id__in=expense_ids_before_month,
                category__in=['management_fees', 'reserve_fund']  # ✅ ΚΡΙΣΙΜΟ: Και τα δύο!
            ).values_list('id', flat=True))

            # Αφαιρούμε τα management_fees και reserve_fund από τα expense_ids
            regular_expense_ids = [
                exp_id for exp_id in expense_ids_before_month
                if exp_id not in special_category_expense_ids
            ]

            if regular_expense_ids:
                # ✅ ΔΙΟΡΘΩΣΗ: Χρήση apartment object (FK) αντί για apartment_number
                # ✅ ΒΕΛΤΙΩΣΗ: Χρήση TransactionType.get_charge_types() για validation
                expense_transactions = Transaction.objects.filter(
                    apartment=apartment,  # ✅ ΣΩΣΤΟ! (όχι apartment_number)
                    reference_type='expense',
                    reference_id__in=[str(exp_id) for exp_id in regular_expense_ids],  # ✅ ΔΙΟΡΘΩΣΗ: Όχι mgmt/reserve!
                    type__in=TransactionType.get_charge_types()  # ✅ VALIDATED!
                )
                transactions_by_ref = {
                    int(item['reference_id']): item['total']
                    for item in expense_transactions.values('reference_id').annotate(total=Sum('amount'))
                    if str(item['reference_id']).isdigit()
                }
                # Merge transactions and fallback shares per expense to avoid gaps.
                fallback_expenses = Expense.objects.filter(id__in=regular_expense_ids)
                for expense in fallback_expenses:
                    tx_total = transactions_by_ref.get(expense.id)
                    if tx_total is not None:
                        total_charges += tx_total
                        continue
                    try:
                        share_amount = expense._calculate_apartment_share(apartment)
                    except Exception:
                        share_amount = Decimal('0.00')
                    if share_amount:
                        total_charges += share_amount

        # Υπολογισμός πληρωμών μέχρι την ημερομηνία
        # ✅ ΔΙΟΡΘΩΣΗ: Μόνο Payment model (ΟΧΙ διπλή μέτρηση)
        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Υπολογισμός management fees (αν include_management_fees=True)
        management_fee_charges = Decimal('0.00')

        if include_management_fees:
            # ✅ SIMPLIFIED 2025-10-10: Management fees come from EXPENSE records!
            # MonthlyChargeService creates Expense records with category='management_fees'
            
            # Βρίσκουμε ΟΛΑ τα management fee expenses (ΧΩΡΙΣ exclude!)
            # Αφού τα αφαιρέσαμε από το transaction calculation παραπάνω, δεν υπάρχει διπλό μέτρημα
            management_expenses = Expense.objects.filter(
                building_id=apartment.building_id,
                category='management_fees',
                date__gte=system_start_date,
                date__lt=month_start
            )

            if management_expenses.exists():
                # Κάθε management fee expense χρεώνεται με equal_share στα διαμερίσματα
                total_apartments = apartment.building.apartments.count()

                if total_apartments > 0:
                    total_management_expenses = management_expenses.aggregate(
                        total=Sum('amount')
                    )['total'] or Decimal('0.00')

                    # Equal share distribution
                    management_fee_charges = total_management_expenses / total_apartments

        # Υπολογισμός reserve fund (αν include_reserve_fund=True)
        reserve_fund_charges = Decimal('0.00')

        if include_reserve_fund:
            # ✅ SIMPLIFIED 2025-10-10: Reserve fund comes from EXPENSE records!
            # MonthlyChargeService creates Expense records with category='reserve_fund'
            
            # Βρίσκουμε ΟΛΑ τα reserve fund expenses (ΧΩΡΙΣ exclude!)
            # Αφού τα αφαιρέσαμε από το transaction calculation παραπάνω, δεν υπάρχει διπλό μέτρημα
            reserve_expenses = Expense.objects.filter(
                building_id=apartment.building_id,
                category='reserve_fund',
                date__gte=system_start_date,
                date__lt=month_start
            )

            if reserve_expenses.exists():
                # Reserve fund expenses κατανέμονται με by_participation_mills
                total_mills = sum(
                    apt.participation_mills or 0 
                    for apt in building.apartments.all()
                )
                
                if total_mills > 0:
                    total_reserve_expenses = reserve_expenses.aggregate(
                        total=Sum('amount')
                    )['total'] or Decimal('0.00')
                    
                    # Υπολογισμός μεριδίου διαμερίσματος
                    apartment_mills = apartment.participation_mills or 0
                    apartment_share = Decimal(str(apartment_mills)) / Decimal(str(total_mills))
                    reserve_fund_charges = total_reserve_expenses * apartment_share

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # ΤΕΛΙΚΟΣ ΥΠΟΛΟΓΙΣΜΟΣ
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # Υπόλοιπο = Χρεώσεις - Πληρωμές
        # Θετικό = Χρέος (apartment owes money)
        # Αρνητικό = Πίστωση (apartment has credit)

        balance = (total_charges + management_fee_charges + reserve_fund_charges) - total_payments

        return balance

    @staticmethod
    def calculate_current_balance(apartment: Apartment) -> Decimal:
        """
        Υπολογισμός τρέχοντος υπολοίπου διαμερίσματος από ΟΛΑ τα transactions

        Αυτή η function υπολογίζει το balance από όλες τις συναλλαγές
        που έχουν γίνει, ανεξάρτητα από ημερομηνία.

        Args:
            apartment: Το διαμέρισμα για το οποίο υπολογίζουμε το υπόλοιπο

        Returns:
            Decimal: Το τρέχον υπόλοιπο του διαμερίσματος
                    (θετικό = χρέος, αρνητικό = πίστωση)

        Example:
            >>> apartment = Apartment.objects.get(number="Α1")
            >>> balance = BalanceCalculationService.calculate_current_balance(apartment)
            >>> print(f"Current balance: {balance}")
            Current balance: -50.00  # Apartment has 50€ credit
        """
        # ✅ ΔΙΟΡΘΩΣΗ: Χρήση apartment object (FK) αντί για apartment_number
        transactions = Transaction.objects.filter(
            apartment=apartment  # ✅ ΣΩΣΤΟ! (όχι apartment_number)
        ).order_by('date', 'id')

        running_balance = Decimal('0.00')

        for transaction in transactions:
            # Payments decrease debt (add to balance - make it more negative/less positive)
            if TransactionType.is_payment(transaction.type):
                running_balance -= transaction.amount

            # Charges increase debt (subtract from balance - make it more positive/less negative)
            elif TransactionType.is_charge(transaction.type):
                running_balance += transaction.amount

            # Balance adjustments set the balance directly
            elif TransactionType.is_special(transaction.type):
                if transaction.balance_after is not None:
                    running_balance = transaction.balance_after

        return running_balance

    @staticmethod
    def update_apartment_balance(apartment: Apartment, use_locking: bool = True) -> Decimal:
        """
        Ενημέρωση του apartment.current_balance με το σωστό υπόλοιπο

        Αυτή η function:
        1. Κλειδώνει το apartment record (αν use_locking=True) για αποφυγή race conditions
        2. Υπολογίζει το τρέχον υπόλοιπο
        3. Αποθηκεύει το στο apartment.current_balance
        4. Επιστρέφει το νέο υπόλοιπο

        Χρησιμοποιείται από:
        - Signals (post_save/post_delete) ✅
        - Manual recalculation scripts ✅
        - Admin actions ✅

        Args:
            apartment: Το διαμέρισμα του οποίου θα ενημερωθεί το υπόλοιπο
            use_locking: Αν True, χρησιμοποιεί select_for_update() για locking (default: True)

        Returns:
            Decimal: Το νέο υπόλοιπο

        Example:
            >>> apartment = Apartment.objects.get(number="Α1")
            >>> new_balance = BalanceCalculationService.update_apartment_balance(apartment)
            >>> print(f"Updated balance: {new_balance}")
            Updated balance: 100.00
            >>> assert apartment.current_balance == new_balance

        Warning:
            Αν καλείται μέσα σε transaction που ήδη έχει lock, θέστε use_locking=False
        """
        from django.db import transaction

        start_time = time.time()

        # Lock apartment για παράλληλες ενημερώσεις (race condition protection)
        if use_locking:
            with transaction.atomic():
                apartment = Apartment.objects.select_for_update().get(id=apartment.id)
                old_balance = apartment.current_balance or Decimal('0.00')

                new_balance = BalanceCalculationService.calculate_current_balance(apartment)

                # Update the apartment's current_balance field
                apartment.current_balance = new_balance
                apartment.save(update_fields=['current_balance'])
        else:
            # Χωρίς locking (όταν καλείται μέσα σε transaction που ήδη έχει lock)
            old_balance = apartment.current_balance or Decimal('0.00')

            new_balance = BalanceCalculationService.calculate_current_balance(apartment)

            # Update the apartment's current_balance field
            apartment.current_balance = new_balance
            apartment.save(update_fields=['current_balance'])

        # Performance logging
        elapsed_time = (time.time() - start_time) * 1000  # ms
        logger.debug(
            f"Balance updated for Apartment {apartment.number}: "
            f"{old_balance} → {new_balance} ({elapsed_time:.2f}ms)"
        )

        # Log all balance changes
        if new_balance != old_balance:
            logger.info(
                f"Balance change for Apartment {apartment.number}: "
                f"{old_balance} → {new_balance} (Δ={new_balance - old_balance})"
            )

        return new_balance

    @staticmethod
    def verify_balance_consistency(apartment: Apartment) -> dict:
        """
        Επιβεβαίωση ότι το stored balance ταιριάζει με το calculated balance

        Χρήσιμο για debugging και verification scripts.

        Args:
            apartment: Το διαμέρισμα που θα ελεγχθεί

        Returns:
            dict: {
                'apartment_number': str,
                'stored_balance': Decimal,
                'calculated_balance': Decimal,
                'difference': Decimal,
                'is_consistent': bool
            }

        Example:
            >>> apartment = Apartment.objects.get(number="Α1")
            >>> result = BalanceCalculationService.verify_balance_consistency(apartment)
            >>> if not result['is_consistent']:
            ...     print(f"❌ Inconsistency: {result['difference']}€")
        """
        stored_balance = apartment.current_balance or Decimal('0.00')
        calculated_balance = BalanceCalculationService.calculate_current_balance(apartment)
        difference = calculated_balance - stored_balance

        # Consider balances consistent if difference < 0.01€ (floating point tolerance)
        is_consistent = abs(difference) < Decimal('0.01')

        return {
            'apartment_number': apartment.number,
            'stored_balance': stored_balance,
            'calculated_balance': calculated_balance,
            'difference': difference,
            'is_consistent': is_consistent
        }

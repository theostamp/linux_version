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
from collections import defaultdict
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, Dict, Iterable

from django.db.models import Sum, Min, Count
from django.utils import timezone

from apartments.models import Apartment
from buildings.models import Building
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
    def calculate_historical_balances_bulk(
        apartments: Iterable[Apartment],
        end_date: date,
        include_management_fees: bool = True,
        include_reserve_fund: bool = False
    ) -> Dict[int, Decimal]:
        """
        Bulk version του ιστορικού υπολοίπου για πολλά διαμερίσματα.
        Επιστρέφει map apartment_id -> balance.
        """
        if isinstance(end_date, datetime):
            end_date = end_date.date()

        apartments = list(apartments)
        if not apartments:
            return {}

        apartment_ids = [apartment.id for apartment in apartments]
        apartments_by_id = {apartment.id: apartment for apartment in apartments}
        apartments_by_building: Dict[int, list[Apartment]] = defaultdict(list)
        for apartment in apartments:
            apartments_by_building[apartment.building_id].append(apartment)

        month_start = end_date.replace(day=1)
        building_ids = list(apartments_by_building.keys())
        buildings = Building.objects.in_bulk(building_ids)
        apartment_stats_by_building = {
            row['building_id']: {
                'total_apartments': row['total_apartments'] or 0,
                'total_mills': row['total_mills'] or 0,
            }
            for row in Apartment.objects.filter(
                building_id__in=building_ids
            ).values('building_id').annotate(
                total_apartments=Count('id'),
                total_mills=Sum('participation_mills'),
            )
        }

        oldest_expenses = Expense.objects.filter(
            building_id__in=building_ids
        ).values('building_id').annotate(oldest_date=Min('date'))
        oldest_expense_month_by_building = {
            row['building_id']: row['oldest_date'].replace(day=1)
            for row in oldest_expenses
            if row.get('oldest_date')
        }

        system_start_by_building: Dict[int, date | None] = {}
        for building_id in building_ids:
            building = buildings.get(building_id)
            if building is None:
                system_start_by_building[building_id] = None
                continue

            system_start_date = building.financial_system_start_date
            earliest_month = oldest_expense_month_by_building.get(building_id)

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
                    logger.warning(
                        "⚠️ Building %s has no financial_system_start_date and no expenses. Returning 0.",
                        building.id
                    )
                    system_start_by_building[building_id] = None
                    continue

            system_start_by_building[building_id] = system_start_date

        payments_by_apartment = {
            row['apartment_id']: row['total'] or Decimal('0.00')
            for row in Payment.objects.filter(
                apartment_id__in=apartment_ids,
                date__lt=end_date
            ).values('apartment_id').annotate(total=Sum('amount'))
        }

        total_charges_by_apartment: Dict[int, Decimal] = defaultdict(lambda: Decimal('0.00'))
        charge_types = TransactionType.get_charge_types()

        for building_id, building_apartments in apartments_by_building.items():
            system_start_date = system_start_by_building.get(building_id)
            if system_start_date is None:
                continue

            building_apartment_ids = [apartment.id for apartment in building_apartments]
            building_stats = apartment_stats_by_building.get(
                building_id,
                {'total_apartments': 0, 'total_mills': 0}
            )
            building_apartment_count = building_stats['total_apartments']
            building_total_mills = building_stats['total_mills']

            expenses_before_month = list(
                Expense.objects.filter(
                    building_id=building_id,
                    date__gte=system_start_date,
                    date__lt=month_start
                ).only(
                    'id',
                    'building_id',
                    'amount',
                    'category',
                    'distribution_type',
                    'payer_responsibility',
                    'split_ratio',
                )
            )

            if not expenses_before_month:
                continue

            management_expenses = [expense for expense in expenses_before_month if expense.category == 'management_fees']
            reserve_expenses = [expense for expense in expenses_before_month if expense.category == 'reserve_fund']
            regular_expenses = [
                expense for expense in expenses_before_month
                if expense.category not in {'management_fees', 'reserve_fund'}
            ]

            regular_expense_ids = [expense.id for expense in regular_expenses]
            if regular_expense_ids:
                regular_expense_ids_as_str = [str(expense_id) for expense_id in regular_expense_ids]
                transaction_rows = list(
                    Transaction.objects.filter(
                        apartment_id__in=building_apartment_ids,
                        reference_type='expense',
                        reference_id__in=regular_expense_ids_as_str,
                        type__in=charge_types
                    ).values('apartment_id', 'reference_id').annotate(total=Sum('amount'))
                )

                transaction_totals_by_key: Dict[tuple[int, int], Decimal] = {}
                for row in transaction_rows:
                    apartment_id = row['apartment_id']
                    reference_id = row['reference_id']
                    if apartment_id is None or not str(reference_id).isdigit():
                        continue
                    expense_id = int(reference_id)
                    total = row['total'] or Decimal('0.00')
                    transaction_totals_by_key[(apartment_id, expense_id)] = total
                    total_charges_by_apartment[apartment_id] += total

                expected_pairs = len(regular_expenses) * len(building_apartments)
                if len(transaction_totals_by_key) < expected_pairs:
                    for expense in regular_expenses:
                        for apartment in building_apartments:
                            key = (apartment.id, expense.id)
                            if key in transaction_totals_by_key:
                                continue
                            try:
                                share_amount = expense._calculate_apartment_share(apartment)
                            except Exception:
                                share_amount = Decimal('0.00')
                            if share_amount:
                                total_charges_by_apartment[apartment.id] += share_amount

            if include_management_fees and management_expenses and building_apartment_count > 0:
                management_total = sum((expense.amount or Decimal('0.00')) for expense in management_expenses)
                management_share = management_total / Decimal(str(building_apartment_count))
                for apartment in building_apartments:
                    total_charges_by_apartment[apartment.id] += management_share

            if include_reserve_fund and reserve_expenses:
                if building_total_mills > 0:
                    reserve_total = sum((expense.amount or Decimal('0.00')) for expense in reserve_expenses)
                    total_mills_decimal = Decimal(str(building_total_mills))
                    for apartment in building_apartments:
                        apartment_mills = Decimal(str(apartment.participation_mills or 0))
                        reserve_share = reserve_total * apartment_mills / total_mills_decimal
                        total_charges_by_apartment[apartment.id] += reserve_share

        balances_by_apartment: Dict[int, Decimal] = {}
        for apartment_id in apartment_ids:
            apartment = apartments_by_id[apartment_id]
            if system_start_by_building.get(apartment.building_id) is None:
                balances_by_apartment[apartment_id] = Decimal('0.00')
                continue
            charges = total_charges_by_apartment.get(apartment_id, Decimal('0.00'))
            payments = payments_by_apartment.get(apartment_id, Decimal('0.00'))
            balances_by_apartment[apartment_id] = charges - payments

        return balances_by_apartment

    @staticmethod
    def calculate_historical_balance(
        apartment: Apartment,
        end_date: date,
        include_management_fees: bool = True,
        include_reserve_fund: bool = False
    ) -> Decimal:
        """
        Υπολογισμός ιστορικού υπολοίπου διαμερίσματος μέχρι συγκεκριμένη ημερομηνία.
        """
        balances = BalanceCalculationService.calculate_historical_balances_bulk(
            apartments=[apartment],
            end_date=end_date,
            include_management_fees=include_management_fees,
            include_reserve_fund=include_reserve_fund,
        )
        return balances.get(apartment.id, Decimal('0.00'))

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

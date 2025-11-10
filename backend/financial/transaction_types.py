"""
Transaction Type Definitions and Validation

This module defines all valid transaction types using Django's TextChoices
for better type safety and validation.

Created: 2025-10-03
Purpose: Centralized transaction type management with validation
"""

from django.db import models


class TransactionType(models.TextChoices):
    """
    Validated transaction types for the financial system

    Transaction types are categorized into three groups:
    1. CHARGES - Increase apartment debt (positive balance)
    2. PAYMENTS - Decrease apartment debt (negative balance)
    3. SPECIAL - Special operations (balance adjustments, etc.)
    """

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # CHARGES (Increase Debt - Make Balance More Positive)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    COMMON_EXPENSE_CHARGE = 'common_expense_charge', 'Χρέωση Κοινοχρήστων'
    EXPENSE_CREATED = 'expense_created', 'Δαπάνη Δημιουργήθηκε'
    EXPENSE_ISSUED = 'expense_issued', 'Δαπάνη Εκδόθηκε'
    MANAGEMENT_FEE_CHARGE = 'management_fee_charge', 'Χρέωση Δαπανών Διαχείρισης'
    RESERVE_FUND_CHARGE = 'reserve_fund_charge', 'Χρέωση Αποθεματικού'
    INTEREST_CHARGE = 'interest_charge', 'Χρέωση Τόκων'
    PENALTY_CHARGE = 'penalty_charge', 'Χρέωση Προστίμου'

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # PAYMENTS (Decrease Debt - Make Balance More Negative/Less Positive)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    COMMON_EXPENSE_PAYMENT = 'common_expense_payment', 'Είσπραξη Κοινοχρήστων'
    EXPENSE_PAYMENT = 'expense_payment', 'Είσπραξη Δαπάνης'
    PAYMENT_RECEIVED = 'payment_received', 'Είσπραξη Ληφθείσα'
    RESERVE_FUND_PAYMENT = 'reserve_fund_payment', 'Πληρωμή Αποθεματικού'
    REFUND = 'refund', 'Επιστροφή'

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SPECIAL (Special Operations)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    BALANCE_ADJUSTMENT = 'balance_adjustment', 'Προσαρμογή Υπολοίπου'

    @classmethod
    def is_charge(cls, transaction_type: str) -> bool:
        """
        Check if a transaction type represents a charge (debt increase)

        Args:
            transaction_type: The transaction type to check

        Returns:
            bool: True if the type is a charge, False otherwise

        Example:
            >>> TransactionType.is_charge('expense_created')
            True
            >>> TransactionType.is_charge('common_expense_payment')
            False
        """
        charge_types = {
            cls.COMMON_EXPENSE_CHARGE,
            cls.EXPENSE_CREATED,
            cls.EXPENSE_ISSUED,
            cls.MANAGEMENT_FEE_CHARGE,
            cls.RESERVE_FUND_CHARGE,
            cls.INTEREST_CHARGE,
            cls.PENALTY_CHARGE,
        }
        return transaction_type in charge_types

    @classmethod
    def is_payment(cls, transaction_type: str) -> bool:
        """
        Check if a transaction type represents a payment (debt decrease)

        Args:
            transaction_type: The transaction type to check

        Returns:
            bool: True if the type is a payment, False otherwise

        Example:
            >>> TransactionType.is_payment('common_expense_payment')
            True
            >>> TransactionType.is_payment('expense_created')
            False
        """
        payment_types = {
            cls.COMMON_EXPENSE_PAYMENT,
            cls.EXPENSE_PAYMENT,
            cls.PAYMENT_RECEIVED,
            cls.RESERVE_FUND_PAYMENT,
            cls.REFUND,
        }
        return transaction_type in payment_types

    @classmethod
    def is_special(cls, transaction_type: str) -> bool:
        """
        Check if a transaction type is a special operation

        Args:
            transaction_type: The transaction type to check

        Returns:
            bool: True if the type is special, False otherwise

        Example:
            >>> TransactionType.is_special('balance_adjustment')
            True
            >>> TransactionType.is_special('expense_created')
            False
        """
        special_types = {
            cls.BALANCE_ADJUSTMENT,
        }
        return transaction_type in special_types

    @classmethod
    def get_charge_types(cls) -> list:
        """
        Get all transaction types that represent charges

        Returns:
            list: List of all charge type values

        Example:
            >>> charge_types = TransactionType.get_charge_types()
            >>> 'expense_created' in charge_types
            True
        """
        return [
            cls.COMMON_EXPENSE_CHARGE,
            cls.EXPENSE_CREATED,
            cls.EXPENSE_ISSUED,
            cls.MANAGEMENT_FEE_CHARGE,
            cls.RESERVE_FUND_CHARGE,
            cls.INTEREST_CHARGE,
            cls.PENALTY_CHARGE,
        ]

    @classmethod
    def get_payment_types(cls) -> list:
        """
        Get all transaction types that represent payments

        Returns:
            list: List of all payment type values

        Example:
            >>> payment_types = TransactionType.get_payment_types()
            >>> 'common_expense_payment' in payment_types
            True
        """
        return [
            cls.COMMON_EXPENSE_PAYMENT,
            cls.EXPENSE_PAYMENT,
            cls.PAYMENT_RECEIVED,
            cls.RESERVE_FUND_PAYMENT,
            cls.REFUND,
        ]

    @classmethod
    def validate_type(cls, transaction_type: str) -> bool:
        """
        Validate that a transaction type is recognized

        Args:
            transaction_type: The transaction type to validate

        Returns:
            bool: True if valid, False otherwise

        Example:
            >>> TransactionType.validate_type('expense_created')
            True
            >>> TransactionType.validate_type('invalid_type')
            False
        """
        return transaction_type in cls.values


class TransactionStatus(models.TextChoices):
    """
    Validated transaction statuses

    Defines all possible states a transaction can be in.
    """

    PENDING = 'pending', 'Εκκρεμεί'
    COMPLETED = 'completed', 'Ολοκληρώθηκε'
    CANCELLED = 'cancelled', 'Ακυρώθηκε'
    FAILED = 'failed', 'Απέτυχε'

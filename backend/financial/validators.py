"""
Validation functions για balance transfer logic

⚠️ ΚΡΙΣΙΜΟ: Αυτές οι συναρτήσεις θωρακίζουν τη λογική μεταφοράς υπολοίπων
ΜΗΝ ΑΛΛΑΞΕΤΕ ΧΩΡΙΣ TESTING!

Βλέπε: BALANCE_TRANSFER_ARCHITECTURE.md
"""
from datetime import date
from decimal import Decimal
from django.core.exceptions import ValidationError
import calendar
from typing import Optional


class ExpenseDateValidator:
    """
    Validator για την επαλήθευση ότι οι ημερομηνίες δαπανών
    είναι σωστές για τη μεταφορά υπολοίπων
    """

    @staticmethod
    def validate_installment_date(expense_date: date, expense_due_date: date,
                                   expense_title: str) -> None:
        """
        Επαληθεύει ότι η δόση έχει σωστή ημερομηνία

        ⚠️ ΚΡΙΣΙΜΟ: Δόσεις πρέπει να έχουν date = due_date = τελευταία μήνα

        Args:
            expense_date: Η ημερομηνία δημιουργίας της δαπάνης
            expense_due_date: Η προθεσμία πληρωμής
            expense_title: Ο τίτλος της δαπάνης

        Raises:
            ValidationError: Αν η ημερομηνία δεν είναι σωστή
        """
        if 'Δόση' not in expense_title:
            return  # Δεν είναι δόση

        # Check 1: date == due_date
        if expense_date != expense_due_date:
            raise ValidationError(
                f"Δόση πρέπει να έχει date == due_date. "
                f"Τρέχον: date={expense_date}, due_date={expense_due_date}"
            )

        # Check 2: Είναι τελευταία μέρα του μήνα
        last_day = calendar.monthrange(expense_date.year, expense_date.month)[1]
        if expense_date.day != last_day:
            raise ValidationError(
                f"Δόση πρέπει να έχει date = τελευταία του μήνα. "
                f"Τρέχον: {expense_date.day}, Αναμενόμενο: {last_day}"
            )

    @staticmethod
    def validate_management_fee_date(expense_date: date, expense_category: str,
                                      distribution_type: str) -> None:
        """
        Επαληθεύει ότι το management fee έχει σωστή ημερομηνία και κατανομή

        ⚠️ ΚΡΙΣΙΜΟ: Management fees πρέπει να έχουν:
        - date = τελευταία του μήνα
        - distribution_type = 'equal_share'

        Args:
            expense_date: Η ημερομηνία δημιουργίας της δαπάνης
            expense_category: Η κατηγορία της δαπάνης
            distribution_type: Ο τρόπος κατανομής

        Raises:
            ValidationError: Αν η ημερομηνία ή η κατανομή δεν είναι σωστή
        """
        if expense_category != 'management_fees':
            return  # Δεν είναι management fee

        # Check 1: Είναι τελευταία μέρα του μήνα
        last_day = calendar.monthrange(expense_date.year, expense_date.month)[1]
        if expense_date.day != last_day:
            raise ValidationError(
                f"Management fee πρέπει να έχει date = τελευταία του μήνα. "
                f"Τρέχον: {expense_date.day}, Αναμενόμενο: {last_day}"
            )

        # Check 2: Distribution type πρέπει να είναι equal_share
        if distribution_type != 'equal_share':
            raise ValidationError(
                f"Management fee πρέπει να έχει distribution_type='equal_share'. "
                f"Τρέχον: {distribution_type}"
            )

    @staticmethod
    def validate_advance_payment_not_overlapping(advance_date: date,
                                                   first_installment_date: date) -> None:
        """
        Επαληθεύει ότι η προκαταβολή και η πρώτη δόση δεν επικαλύπτονται

        ⚠️ ΚΡΙΣΙΜΟ: Η πρώτη δόση πρέπει να είναι σε ΔΙΑΦΟΡΕΤΙΚΟ μήνα από την προκαταβολή

        Args:
            advance_date: Η ημερομηνία της προκαταβολής
            first_installment_date: Η ημερομηνία της πρώτης δόσης

        Raises:
            ValidationError: Αν οι ημερομηνίες είναι στον ίδιο μήνα
        """
        if (advance_date.year == first_installment_date.year and
            advance_date.month == first_installment_date.month):
            raise ValidationError(
                f"Η πρώτη δόση πρέπει να είναι σε διαφορετικό μήνα από την προκαταβολή. "
                f"Προκαταβολή: {advance_date.strftime('%Y-%m')}, "
                f"Δόση 1: {first_installment_date.strftime('%Y-%m')}"
            )


class BuildingFinancialValidator:
    """
    Validator για financial configuration του Building
    """

    @staticmethod
    def validate_financial_system_start_date(building) -> None:
        """
        Επαληθεύει ότι το Building έχει financial_system_start_date

        ⚠️ ΚΡΙΣΙΜΟ: Χωρίς αυτό, το _calculate_historical_balance επιστρέφει 0

        Args:
            building: Το Building object

        Raises:
            ValidationError: Αν δεν υπάρχει financial_system_start_date
        """
        if not building.financial_system_start_date:
            raise ValidationError(
                f"Building '{building.name}' δεν έχει financial_system_start_date. "
                f"Αυτό είναι απαραίτητο για τη μεταφορά υπολοίπων."
            )

    @staticmethod
    def validate_management_fee_settings(building) -> None:
        """
        Επαληθεύει ότι το Building έχει ορισμένο management fee

        Args:
            building: Το Building object

        Raises:
            ValidationError: Αν δεν υπάρχει management_fee_per_apartment
        """
        if not building.management_fee_per_apartment:
            raise ValidationError(
                f"Building '{building.name}' δεν έχει management_fee_per_apartment. "
                f"Ορίστε το πριν δημιουργήσετε management fees."
            )


class BalanceTransferValidator:
    """
    Comprehensive validator για balance transfer logic
    """

    @staticmethod
    def validate_expense_for_balance_transfer(expense) -> list:
        """
        Επαληθεύει μια δαπάνη για τη λογική μεταφοράς υπολοίπων

        Args:
            expense: Το Expense object

        Returns:
            list: Λίστα με warnings (αν υπάρχουν)
        """
        warnings = []

        try:
            # Check 1: Έχει date και due_date
            if not expense.date:
                warnings.append("⚠️ Expense δεν έχει date")

            if not expense.due_date:
                warnings.append("⚠️ Expense δεν έχει due_date")

            # Check 2: Δόσεις
            if expense.date and expense.due_date:
                ExpenseDateValidator.validate_installment_date(
                    expense.date, expense.due_date, expense.title
                )

            # Check 3: Management fees
            if expense.date:
                ExpenseDateValidator.validate_management_fee_date(
                    expense.date, expense.category, expense.distribution_type
                )

            # Check 4: Building financial settings
            BuildingFinancialValidator.validate_financial_system_start_date(expense.building)

        except ValidationError as e:
            warnings.append(f"❌ {str(e)}")

        return warnings

    @staticmethod
    def validate_project_installments(project, advance_payment_date: date,
                                       installments: list) -> list:
        """
        Επαληθεύει τις δόσεις ενός έργου

        Args:
            project: Το Project object
            advance_payment_date: Η ημερομηνία της προκαταβολής
            installments: Λίστα με Expense objects (δόσεις)

        Returns:
            list: Λίστα με warnings (αν υπάρχουν)
        """
        warnings = []

        if not installments:
            return warnings

        try:
            # Check 1: Πρώτη δόση δεν επικαλύπτεται με προκαταβολή
            first_installment = installments[0]
            ExpenseDateValidator.validate_advance_payment_not_overlapping(
                advance_payment_date, first_installment.date
            )

            # Check 2: Κάθε δόση έχει σωστή ημερομηνία
            for i, installment in enumerate(installments, start=1):
                try:
                    ExpenseDateValidator.validate_installment_date(
                        installment.date, installment.due_date, installment.title
                    )
                except ValidationError as e:
                    warnings.append(f"❌ Δόση {i}: {str(e)}")

            # Check 3: Οι δόσεις είναι σε διαδοχικούς μήνες
            for i in range(len(installments) - 1):
                current = installments[i]
                next_inst = installments[i + 1]

                # Υπολογισμός διαφοράς μηνών
                months_diff = (next_inst.date.year - current.date.year) * 12 + \
                             (next_inst.date.month - current.date.month)

                if months_diff != 1:
                    warnings.append(
                        f"⚠️ Δόσεις {i+1} και {i+2} δεν είναι σε διαδοχικούς μήνες "
                        f"(διαφορά: {months_diff} μήνες)"
                    )

        except ValidationError as e:
            warnings.append(f"❌ {str(e)}")

        return warnings


# Utility functions για development/testing

def check_expense_balance_transfer_compliance(expense) -> dict:
    """
    Επαληθεύει αν μια δαπάνη συμμορφώνεται με τους κανόνες balance transfer

    Returns:
        dict με keys: 'compliant' (bool), 'warnings' (list), 'info' (dict)
    """
    validator = BalanceTransferValidator()
    warnings = validator.validate_expense_for_balance_transfer(expense)

    return {
        'compliant': len(warnings) == 0,
        'warnings': warnings,
        'info': {
            'title': expense.title,
            'date': expense.date,
            'due_date': expense.due_date,
            'category': expense.category,
            'distribution_type': expense.distribution_type,
            'amount': expense.amount
        }
    }


def check_building_balance_transfer_compliance(building) -> dict:
    """
    Επαληθεύει αν ένα Building συμμορφώνεται με τους κανόνες balance transfer

    Returns:
        dict με keys: 'compliant' (bool), 'warnings' (list), 'info' (dict)
    """
    warnings = []

    try:
        BuildingFinancialValidator.validate_financial_system_start_date(building)
    except ValidationError as e:
        warnings.append(f"❌ {str(e)}")

    try:
        BuildingFinancialValidator.validate_management_fee_settings(building)
    except ValidationError as e:
        warnings.append(f"⚠️ {str(e)}")

    return {
        'compliant': len([w for w in warnings if w.startswith('❌')]) == 0,
        'warnings': warnings,
        'info': {
            'name': building.name,
            'financial_system_start_date': building.financial_system_start_date,
            'management_fee_per_apartment': building.management_fee_per_apartment
        }
    }

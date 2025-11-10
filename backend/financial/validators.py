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

        # Check 2: Είναι ΠΡΩΤΗ μέρα του μήνα (ΔΙΟΡΘΩΣΗ)
        if expense_date.day != 1:
            raise ValidationError(
                f"Δόση πρέπει να έχει date = 1η του μήνα. "
                f"Τρέχον: {expense_date.day}, Αναμενόμενο: 1"
            )

    @staticmethod
    def validate_management_fee_date(expense_date: date, expense_category: str,
                                      distribution_type: str) -> None:
        """
        Επαληθεύει ότι το management fee έχει σωστή ημερομηνία και κατανομή

        ⚠️ ΚΡΙΣΙΜΟ: Management fees πρέπει να έχουν:
        - date = 1η του μήνα (ΔΙΟΡΘΩΣΗ)
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

        # Check 1: Είναι ΠΡΩΤΗ μέρα του μήνα (ΔΙΟΡΘΩΣΗ)
        if expense_date.day != 1:
            raise ValidationError(
                f"Management fee πρέπει να έχει date = 1η του μήνα. "
                f"Τρέχον: {expense_date.day}, Αναμενόμενο: 1"
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


class RecurringExpenseValidator:
    """
    ⚠️ ΚΡΙΣΙΜΟ: Validator για επαναλαμβανόμενες δαπάνες

    Διασφαλίζει ότι:
    1. Δεν υπάρχουν overlapping configurations
    2. Οι δαπάνες δημιουργούνται με σωστές ημερομηνίες
    3. Το ιστορικό αλλαγών διατηρείται σωστά
    """

    @staticmethod
    def validate_no_overlaps(config: 'RecurringExpenseConfig') -> None:
        """
        Επαληθεύει ότι δεν υπάρχουν overlapping configurations.

        ⚠️ ΚΡΙΣΙΜΟ: Δεν μπορούν να υπάρχουν 2 ρυθμίσεις ενεργές την ίδια ημερομηνία

        Args:
            config: Η νέα ρύθμιση προς έλεγχο

        Raises:
            ValidationError: Αν υπάρχει overlap
        """
        from financial.models import RecurringExpenseConfig
        from django.db.models import Q

        # Βρες overlapping configs
        overlapping = RecurringExpenseConfig.objects.filter(
            building=config.building,
            expense_type=config.expense_type,
            is_active=True
        ).filter(
            # Overlap condition:
            # (new_start <= existing_end OR existing_end IS NULL) AND
            # (new_end >= existing_start OR new_end IS NULL)
            Q(effective_from__lte=config.effective_until) | Q(effective_until__isnull=True)
        ).filter(
            Q(effective_until__gte=config.effective_from) | Q(effective_until__isnull=True)
        )

        # Exclude self (για updates)
        if config.pk:
            overlapping = overlapping.exclude(pk=config.pk)

        if overlapping.exists():
            overlap_config = overlapping.first()
            raise ValidationError(
                f"Overlap detected με υπάρχουσα ρύθμιση: {overlap_config}. "
                f"Παρακαλώ ενημερώστε το effective_until της παλιάς ρύθμισης."
            )

    @staticmethod
    def validate_amount_fields(config: 'RecurringExpenseConfig') -> None:
        """
        Επαληθεύει ότι τα πεδία ποσού είναι σωστά για τη μέθοδο υπολογισμού.

        Args:
            config: Η ρύθμιση προς έλεγχο

        Raises:
            ValidationError: Αν τα πεδία δεν είναι σωστά
        """
        if config.calculation_method == 'fixed_per_apartment':
            if not config.amount_per_apartment or config.amount_per_apartment <= 0:
                raise ValidationError(
                    "Για fixed_per_apartment πρέπει amount_per_apartment > 0"
                )

        elif config.calculation_method == 'percentage_of_expenses':
            if not config.percentage or config.percentage <= 0:
                raise ValidationError(
                    "Για percentage_of_expenses πρέπει percentage > 0"
                )

        elif config.calculation_method == 'fixed_total':
            if not config.total_amount or config.total_amount <= 0:
                raise ValidationError(
                    "Για fixed_total πρέπει total_amount > 0"
                )

    @staticmethod
    def validate_effective_dates(config: 'RecurringExpenseConfig') -> None:
        """
        Επαληθεύει ότι οι ημερομηνίες ισχύος είναι λογικές.

        Args:
            config: Η ρύθμιση προς έλεγχο

        Raises:
            ValidationError: Αν οι ημερομηνίες δεν είναι λογικές
        """
        if config.effective_until and config.effective_until < config.effective_from:
            raise ValidationError(
                f"effective_until ({config.effective_until}) "
                f"πρέπει να είναι >= effective_from ({config.effective_from})"
            )

    @staticmethod
    def validate_recurring_expense_compliant(expense: 'Expense') -> dict:
        """
        Ελέγχει αν μια επαναλαμβανόμενη δαπάνη είναι compliant.

        Args:
            expense: Η δαπάνη προς έλεγχο

        Returns:
            dict με 'compliant' και 'warnings'
        """
        warnings = []

        # Check 1: Είναι ΠΡΩΤΗ μέρα του μήνα (ΔΙΟΡΘΩΣΗ)
        if expense.date.day != 1:
            warnings.append(
                f"❌ Recurring expense date πρέπει να είναι 1η του μήνα. "
                f"Τρέχον: {expense.date}, Αναμενόμενο: {expense.date.replace(day=1)}"
            )

        # Check 2: date == due_date
        if expense.due_date and expense.date != expense.due_date:
            warnings.append(
                f"⚠️ Recurring expense: date != due_date. "
                f"Συνιστάται date == due_date"
            )

        # Check 3: Υπάρχει ενεργή config
        from financial.models import RecurringExpenseConfig

        config = RecurringExpenseConfig.get_active_config(
            building_id=expense.building_id,
            expense_type=expense.expense_type,
            target_date=expense.date
        )

        if not config:
            warnings.append(
                f"⚠️ Δεν βρέθηκε ενεργή RecurringExpenseConfig για {expense.date}"
            )

        return {
            'compliant': len([w for w in warnings if w.startswith('❌')]) == 0,
            'warnings': warnings,
            'config': config
        }


def validate_recurring_expense_config(config: 'RecurringExpenseConfig') -> None:
    """
    ⚠️ ΚΡΙΣΙΜΟ: Full validation για RecurringExpenseConfig

    Καλέστε αυτήν πριν από save() για να διασφαλίσετε ακεραιότητα.

    Args:
        config: Η ρύθμιση προς έλεγχο

    Raises:
        ValidationError: Αν υπάρχει πρόβλημα
    """
    RecurringExpenseValidator.validate_amount_fields(config)
    RecurringExpenseValidator.validate_effective_dates(config)
    RecurringExpenseValidator.validate_no_overlaps(config)

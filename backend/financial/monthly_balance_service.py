"""
Κεντρική Υπηρεσία Διαχείρισης Μηνιαίων Υπολοίπων

Αυτή η υπηρεσία διαχειρίζεται ΟΛΟΚΛΗΡΩΤΙΚΑ τη μεταφορά υπολοίπων από μήνα σε μήνα.

Created: 2025-10-10
Purpose: Συστηματική και ολοκληρωμένη λύση για τη μεταφορά υπολοίπων
"""

import logging
from decimal import Decimal
from datetime import date
from typing import Dict, Any, List, Optional, Tuple
from django.db.models import Sum
from django.db import transaction

from .models import MonthlyBalance, Expense, Payment
from buildings.models import Building
from apartments.models import Apartment
from .balance_service import BalanceCalculationService
from maintenance.models import PaymentInstallment

logger = logging.getLogger(__name__)


class MonthlyBalanceService:
    """
    Κεντρική υπηρεσία για τη δημιουργία και ενημέρωση μηνιαίων υπολοίπων.
    
    Αυτή η υπηρεσία είναι η ΜΟΝΗ πηγή αλήθειας για:
    - Δημιουργία MonthlyBalance records
    - Υπολογισμό carry_forward
    - Μεταφορά υπολοίπων από μήνα σε μήνα
    """
    
    def __init__(self, building: Building):
        """
        Args:
            building: Το κτίριο για το οποίο θα διαχειριστούμε τα μηνιαία υπόλοιπα
        """
        self.building = building
    
    @transaction.atomic
    def create_or_update_monthly_balance(
        self, 
        year: int, 
        month: int,
        recalculate: bool = True
    ) -> MonthlyBalance:
        """
        Δημιουργεί ή ενημερώνει ένα MonthlyBalance record με όλα τα απαραίτητα δεδομένα.
        
        Αυτή η μέθοδος:
        1. Υπολογίζει τις δαπάνες του μήνα
        2. Υπολογίζει τις εισπράξεις του μήνα
        3. Υπολογίζει τις παλαιότερες οφειλές (από προηγούμενο μήνα)
        4. Υπολογίζει management fees για το μήνα
        5. Υπολογίζει reserve fund για το μήνα
        6. Υπολογίζει scheduled maintenance installments
        7. Υπολογίζει το carry_forward για μεταφορά στον επόμενο μήνα
        
        Args:
            year: Έτος
            month: Μήνας (1-12)
            recalculate: Αν True, επανυπολογίζει όλα τα πεδία ακόμα και αν το record υπάρχει
        
        Returns:
            MonthlyBalance: Το δημιουργημένο ή ενημερωμένο record
        """
        logger.info(f"📊 Creating/updating MonthlyBalance for {self.building.name} - {month:02d}/{year}")

        # Fast-path: if we are NOT recalculating and the record already exists, return it
        # (prevents expensive re-computation when we are only ensuring the month chain exists)
        if not recalculate:
            existing = MonthlyBalance.objects.filter(
                building=self.building,
                year=year,
                month=month
            ).first()
            if existing:
                return existing
        
        # Περίοδος μήνα
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        
        # 1. Υπολογισμός δαπανών μήνα (Expense records)
        total_expenses = self._calculate_month_expenses(year, month)
        logger.debug(f"   💸 Δαπάνες μήνα: €{total_expenses}")
        
        # 2. Υπολογισμός εισπράξεων μήνα (Payment records)
        total_payments = self._calculate_month_payments(year, month)
        logger.debug(f"   💰 Εισπράξεις μήνα: €{total_payments}")
        
        # 3. Υπολογισμός παλαιότερων οφειλών (από προηγούμενο μήνα)
        # IMPORTANT: For correct carry-over, ensure the previous month exists (build chain if missing)
        previous_obligations = self._calculate_previous_obligations(year, month)
        logger.debug(f"   📊 Παλαιότερες οφειλές: €{previous_obligations}")
        
        # 4. Υπολογισμός management fees (από Expense records)
        management_fees = self._calculate_management_fees(year, month)
        logger.debug(f"   🏢 Διαχειριστικά έξοδα: €{management_fees}")
        
        # 5. Υπολογισμός reserve fund (από Expense records)
        reserve_fund_amount = self._calculate_reserve_fund(year, month)
        logger.debug(f"   🏦 Αποθεματικό: €{reserve_fund_amount}")
        
        # 6. Υπολογισμός scheduled maintenance installments
        scheduled_maintenance_amount = self._calculate_scheduled_maintenance(year, month)
        logger.debug(f"   🔧 Προγραμματισμένα έργα: €{scheduled_maintenance_amount}")
        
        # 7. Υπολογισμός carry_forward
        total_obligations = (
            total_expenses + 
            previous_obligations + 
            management_fees + 
            reserve_fund_amount + 
            scheduled_maintenance_amount
        )
        net_result = total_payments - total_obligations
        carry_forward = -net_result if net_result < 0 else Decimal('0.00')
        
        logger.debug(f"   ⚖️ Καθαρό αποτέλεσμα: €{net_result}")
        logger.debug(f"   🔄 Carry Forward: €{carry_forward}")
        
        # Δημιουργία ή ενημέρωση record
        monthly_balance, created = MonthlyBalance.objects.get_or_create(
            building=self.building,
            year=year,
            month=month,
            defaults={
                'total_expenses': total_expenses,
                'total_payments': total_payments,
                'previous_obligations': previous_obligations,
                'reserve_fund_amount': reserve_fund_amount,
                'management_fees': management_fees,
                'scheduled_maintenance_amount': scheduled_maintenance_amount,
                'carry_forward': carry_forward,
                'balance_year': year,
                'annual_carry_forward': Decimal('0.00'),
                'main_balance_carry_forward': Decimal('0.00'),
                'reserve_balance_carry_forward': Decimal('0.00'),
                'management_balance_carry_forward': Decimal('0.00'),
            }
        )
        
        if not created and recalculate:
            # Ενημέρωση υπάρχοντος record
            monthly_balance.total_expenses = total_expenses
            monthly_balance.total_payments = total_payments
            monthly_balance.previous_obligations = previous_obligations
            monthly_balance.reserve_fund_amount = reserve_fund_amount
            monthly_balance.management_fees = management_fees
            monthly_balance.scheduled_maintenance_amount = scheduled_maintenance_amount
            monthly_balance.carry_forward = carry_forward
            monthly_balance.save()
            logger.info(f"   ✅ Ενημερώθηκε υπάρχον record για {month:02d}/{year}")
        elif created:
            logger.info(f"   ✅ Δημιουργήθηκε νέο record για {month:02d}/{year}")
        else:
            logger.info(f"   ℹ️  Υπάρχον record δεν τροποποιήθηκε για {month:02d}/{year}")
        
        return monthly_balance
    
    def _calculate_month_expenses(self, year: int, month: int) -> Decimal:
        """
        Υπολογισμός συνολικών δαπανών για συγκεκριμένο μήνα.
        
        Περιλαμβάνει ΜΟΝΟ Expense records (όχι management fees/reserve fund)
        """
        expenses = Expense.objects.filter(
            building=self.building,
            date__year=year,
            date__month=month
        ).exclude(
            # Εξαιρούμε management fees και reserve fund γιατί υπολογίζονται ξεχωριστά
            category__in=['management_fees', 'reserve_fund']
        )
        
        total = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return total
    
    def _calculate_month_payments(self, year: int, month: int) -> Decimal:
        """Υπολογισμός συνολικών εισπράξεων για συγκεκριμένο μήνα."""
        payments = Payment.objects.filter(
            apartment__building=self.building,
            date__year=year,
            date__month=month
        )
        
        total = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return total
    
    def _calculate_previous_obligations(self, year: int, month: int) -> Decimal:
        """
        Υπολογισμός παλαιότερων οφειλών (carry_forward από προηγούμενο μήνα).
        
        Αυτό είναι το κλειδί της μεταφοράς υπολοίπων!
        """
        # Υπολογισμός προηγούμενου μήνα
        prev_month = month - 1
        prev_year = year
        
        if prev_month == 0:
            prev_month = 12
            prev_year -= 1
        
        # Έλεγχος αν υπάρχει MonthlyBalance για προηγούμενο μήνα
        prev_balance = MonthlyBalance.objects.filter(
            building=self.building,
            year=prev_year,
            month=prev_month
        ).first()

        if prev_balance:
            # Χρησιμοποιούμε το carry_forward από προηγούμενο μήνα
            return prev_balance.carry_forward

        # Αν δεν υπάρχει MonthlyBalance, χτίζουμε την αλυσίδα προς τα πίσω
        # ώστε το carry_forward να προκύψει από την ίδια (συνεπή) λογική.
        # Αυτό αποφεύγει αποκλίσεις από legacy/sign conventions στο dynamic fallback.
        month_start = date(year, month, 1)
        
        # Έλεγχος financial_system_start_date
        if self.building.financial_system_start_date:
            if month_start <= self.building.financial_system_start_date:
                # Πριν την έναρξη του συστήματος, δεν υπάρχουν παλαιότερες οφειλές
                return Decimal('0.00')

        # Try to create the missing previous month MonthlyBalance (without forcing recalculation of existing ones).
        # This may recursively ensure earlier months if they are also missing.
        try:
            prev_generated = self.create_or_update_monthly_balance(prev_year, prev_month, recalculate=False)
            return prev_generated.carry_forward or Decimal('0.00')
        except Exception as exc:
            logger.warning(
                "Failed to backfill previous MonthlyBalance for %02d/%d (building=%s). Falling back to dynamic calc.",
                prev_month,
                prev_year,
                self.building.id,
                exc_info=exc
            )

        # LAST RESORT: dynamic calculation using BalanceCalculationService
        # (kept for backward compatibility; should be rare after backfilling)
        total_balance = Decimal('0.00')
        apartments = Apartment.objects.filter(building=self.building)

        for apartment in apartments:
            apartment_balance = BalanceCalculationService.calculate_historical_balance(
                apartment=apartment,
                end_date=month_start,
                include_management_fees=True,
                include_reserve_fund=True  # ✅ ΚΡΙΣΙΜΟ: Περιλαμβάνουμε reserve fund!
            )
            total_balance += apartment_balance

        # Παλαιότερες οφειλές = θετικό balance (χρέη)
        return total_balance if total_balance > 0 else Decimal('0.00')
    
    def _calculate_management_fees(self, year: int, month: int) -> Decimal:
        """
        Υπολογισμός management fees για συγκεκριμένο μήνα.
        
        Βασίζεται αποκλειστικά σε Expense records με category='management_fees'.
        """
        month_start = date(year, month, 1)
        if self.building.financial_system_start_date and month_start < self.building.financial_system_start_date:
            return Decimal('0.00')

        management_expenses = Expense.objects.filter(
            building=self.building,
            category='management_fees',
            date__year=year,
            date__month=month
        )
        return management_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    def _calculate_reserve_fund(self, year: int, month: int) -> Decimal:
        """
        Υπολογισμός reserve fund για συγκεκριμένο μήνα.
        
        Βασίζεται αποκλειστικά σε Expense records με category='reserve_fund'.
        """
        reserve_expenses = Expense.objects.filter(
            building=self.building,
            category='reserve_fund',
            date__year=year,
            date__month=month
        )
        return reserve_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    def _calculate_scheduled_maintenance(self, year: int, month: int) -> Decimal:
        """
        Υπολογισμός scheduled maintenance installments για συγκεκριμένο μήνα.
        """
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        
        # Αναζήτηση installments που λήγουν αυτό το μήνα
        installments = PaymentInstallment.objects.filter(
            payment_schedule__scheduled_maintenance__building=self.building,
            due_date__gte=month_start,
            due_date__lt=month_end
        )
        
        total = installments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return total
    
    @transaction.atomic
    def close_month_and_create_next(self, year: int, month: int) -> Tuple[MonthlyBalance, MonthlyBalance]:
        """
        Κλείνει τον τρέχοντα μήνα και δημιουργεί τον επόμενο με σωστή μεταφορά υπολοίπων.
        
        Args:
            year: Έτος
            month: Μήνας
        
        Returns:
            Tuple[MonthlyBalance, MonthlyBalance]: (closed_month, next_month)
        """
        logger.info(f"🔐 Closing month {month:02d}/{year} for {self.building.name}")
        
        # 1. Βεβαιωνόμαστε ότι το τρέχον record είναι ενημερωμένο
        current_month = self.create_or_update_monthly_balance(year, month, recalculate=True)
        
        # 2. Κλείνουμε το μήνα
        if not current_month.is_closed:
            current_month.close_month()  # Αυτό καλεί την close_month() του model
        
        # 3. Υπολογισμός επόμενου μήνα
        next_month = month + 1
        next_year = year
        
        if next_month > 12:
            next_month = 1
            next_year += 1
        
        logger.info(f"📅 Creating next month {next_month:02d}/{next_year}")
        
        # 4. Δημιουργία επόμενου μήνα
        next_month_balance = self.create_or_update_monthly_balance(next_year, next_month, recalculate=True)
        
        logger.info(f"✅ Month closed successfully. Carry forward: €{current_month.carry_forward}")
        
        return current_month, next_month_balance
    
    def recalculate_all_months(self, start_year: int, start_month: int, end_year: int, end_month: int):
        """
        Επανυπολογίζει όλα τα MonthlyBalance records από start_month/start_year έως end_month/end_year.
        
        Χρήσιμο για διόρθωση ιστορικών δεδομένων.
        """
        logger.info(f"🔄 Recalculating all months from {start_month:02d}/{start_year} to {end_month:02d}/{end_year}")
        
        current_month = start_month
        current_year = start_year
        
        while True:
            # Επανυπολογισμός τρέχοντος μήνα
            self.create_or_update_monthly_balance(current_year, current_month, recalculate=True)
            
            # Έλεγχος αν φτάσαμε στο τέλος
            if current_year == end_year and current_month == end_month:
                break
            
            # Μετάβαση στον επόμενο μήνα
            current_month += 1
            if current_month > 12:
                current_month = 1
                current_year += 1
        
        logger.info(f"✅ Recalculation complete")
    
    def verify_balance_integrity(self, year: int, month: int) -> Dict[str, Any]:
        """
        Επιβεβαιώνει την ακεραιότητα του MonthlyBalance για συγκεκριμένο μήνα.
        
        Ελέγχει:
        1. Ότι το previous_obligations ταιριάζει με το carry_forward του προηγούμενου μήνα
        2. Ότι το carry_forward υπολογίζεται σωστά
        3. Ότι όλα τα components συμφωνούν με τα πραγματικά δεδομένα
        
        Returns:
            Dict με τα αποτελέσματα της επιβεβαίωσης
        """
        logger.info(f"🔍 Verifying balance integrity for {month:02d}/{year}")
        
        issues = []
        warnings = []
        
        # 1. Βρίσκουμε το MonthlyBalance
        monthly_balance = MonthlyBalance.objects.filter(
            building=self.building,
            year=year,
            month=month
        ).first()
        
        if not monthly_balance:
            return {
                'status': 'error',
                'message': f'No MonthlyBalance found for {month:02d}/{year}',
                'issues': ['MonthlyBalance record does not exist']
            }
        
        # 2. Έλεγχος previous_obligations
        expected_previous_obligations = self._calculate_previous_obligations(year, month)
        if monthly_balance.previous_obligations != expected_previous_obligations:
            issues.append(
                f'Previous obligations mismatch: stored={monthly_balance.previous_obligations}, '
                f'expected={expected_previous_obligations}'
            )
        
        # 3. Έλεγχος carry_forward
        expected_carry_forward = -monthly_balance.net_result if monthly_balance.net_result < 0 else Decimal('0.00')
        if monthly_balance.carry_forward != expected_carry_forward:
            issues.append(
                f'Carry forward mismatch: stored={monthly_balance.carry_forward}, '
                f'expected={expected_carry_forward}'
            )
        
        # 4. Έλεγχος total_expenses
        expected_expenses = self._calculate_month_expenses(year, month)
        if monthly_balance.total_expenses != expected_expenses:
            warnings.append(
                f'Expenses mismatch: stored={monthly_balance.total_expenses}, '
                f'expected={expected_expenses}'
            )
        
        # 5. Έλεγχος total_payments
        expected_payments = self._calculate_month_payments(year, month)
        if monthly_balance.total_payments != expected_payments:
            warnings.append(
                f'Payments mismatch: stored={monthly_balance.total_payments}, '
                f'expected={expected_payments}'
            )
        
        status = 'ok' if not issues else 'error'
        if warnings and not issues:
            status = 'warning'
        
        return {
            'status': status,
            'month': f'{month:02d}/{year}',
            'building': self.building.name,
            'issues': issues,
            'warnings': warnings,
            'monthly_balance': monthly_balance
        }
    
    def verify_balance_chain(self, start_year: int, start_month: int, end_year: int, end_month: int) -> Dict[str, Any]:
        """
        Επιβεβαιώνει ότι η αλυσίδα μεταφοράς υπολοίπων είναι σωστή από start έως end.
        
        Ελέγχει ότι κάθε μήνας:
        1. Έχει previous_obligations = προηγούμενου μήνα carry_forward
        2. Υπολογίζει σωστά το carry_forward
        
        Returns:
            Dict με συνολική αναφορά ακεραιότητας
        """
        logger.info(f"🔗 Verifying balance chain from {start_month:02d}/{start_year} to {end_month:02d}/{end_year}")
        
        all_issues = []
        all_warnings = []
        verified_months = []
        
        current_month = start_month
        current_year = start_year
        
        while True:
            result = self.verify_balance_integrity(current_year, current_month)
            verified_months.append(result)
            all_issues.extend(result.get('issues', []))
            all_warnings.extend(result.get('warnings', []))
            
            # Έλεγχος αν φτάσαμε στο τέλος
            if current_year == end_year and current_month == end_month:
                break
            
            # Μετάβαση στον επόμενο μήνα
            current_month += 1
            if current_month > 12:
                current_month = 1
                current_year += 1
        
        overall_status = 'ok' if not all_issues else 'error'
        if all_warnings and not all_issues:
            overall_status = 'warning'
        
        return {
            'status': overall_status,
            'building': self.building.name,
            'period': f'{start_month:02d}/{start_year} - {end_month:02d}/{end_year}',
            'total_issues': len(all_issues),
            'total_warnings': len(all_warnings),
            'verified_months': verified_months,
            'summary_issues': all_issues,
            'summary_warnings': all_warnings
        }

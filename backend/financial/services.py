import logging
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.db.models import Sum
from datetime import datetime
from django.utils import timezone
from .models import Expense, Transaction, Payment, CommonExpensePeriod, ApartmentShare, MonthlyBalance
from apartments.models import Apartment
from buildings.models import Building
from .monthly_balance_service import MonthlyBalanceService

import os
import uuid
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
from django.conf import settings
import magic


class CommonExpenseCalculator:
    """Υπηρεσία για τον υπολογισμό μεριδίων κοινοχρήστων"""
    
    def __init__(self, building_id: int, month: str = None):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.month = month  # Format: YYYY-MM
        self.period_end_date = None
        self.period_start_date = None
        
        # Calculate period dates and filter expenses if month is provided
        if month:
            try:
                from datetime import date
                year, mon = map(int, month.split('-'))
                self.period_start_date = date(year, mon, 1)
                if mon == 12:
                    self.period_end_date = date(year + 1, 1, 1)
                else:
                    self.period_end_date = date(year, mon + 1, 1)
                
                # Filter expenses for the specific month
                self.expenses = Expense.objects.filter(
                    building_id=building_id,
                    date__gte=self.period_start_date,
                    date__lt=self.period_end_date
                )
            except Exception:
                # Fallback to all expenses if month parsing fails
                self.expenses = Expense.objects.filter(building_id=building_id)
        else:
            # No month specified, use all expenses
            self.expenses = Expense.objects.filter(building_id=building_id)
    
    # ❌ DELETED: _get_historical_balance() - Use BalanceCalculationService instead
    # This function was removed as part of the balance calculation refactoring.
    # All callers have been migrated to use:
    #   from financial.balance_service import BalanceCalculationService
    #   BalanceCalculationService.calculate_historical_balance(apartment, end_date)

    def calculate_shares(self, include_reserve_fund: bool = True) -> Dict[str, Any]:
        """
        Υπολογισμός μεριδίων για κάθε διαμέρισμα
        
        Args:
            include_reserve_fund: Αν θα συμπεριλαμβάνεται η εισφορά αποθεματικού
        """
        shares = {}
        
        # Αρχικοποίηση μεριδίων για κάθε διαμέρισμα
        for apartment in self.apartments:
            # ✅ ΜIGRATED: Use BalanceCalculationService
            from .balance_service import BalanceCalculationService
            historical_balance = BalanceCalculationService.calculate_historical_balance(
                apartment, self.period_end_date
            ) if self.period_end_date else (apartment.current_balance or Decimal('0.00'))
            
            shares[apartment.id] = {
                'apartment_id': apartment.id,
                'apartment_number': apartment.number,
                'identifier': apartment.identifier or apartment.number,
                'owner_name': apartment.owner_name or 'Άγνωστος',
                'participation_mills': apartment.participation_mills or 0,
                'current_balance': historical_balance,
                'total_amount': Decimal('0.00'),
                'reserve_fund_amount': Decimal('0.00'),  # Νέα: Εισφορά αποθεματικού
                'breakdown': [],
                'previous_balance': historical_balance,
                'total_due': Decimal('0.00')
            }
        
        # Υπολογισμός μεριδίων για κάθε δαπάνη
        for expense in self.expenses:
            if expense.distribution_type == 'by_participation_mills':
                self._calculate_by_participation_mills(expense, shares)
            elif expense.distribution_type == 'equal_share':
                self._calculate_equal_share(expense, shares)
            elif expense.distribution_type == 'specific_apartments':
                self._calculate_specific_apartments(expense, shares)
            elif expense.distribution_type == 'by_meters':
                self._calculate_by_meters(expense, shares)
        
        # Υπολογισμός εισφοράς αποθεματικού αν ζητηθεί
        if include_reserve_fund:
            self._calculate_reserve_fund_contribution(shares)
        
        # Υπολογισμός δαπανών διαχείρισης (management fee)
        self._calculate_management_fee(shares)
        
        # Υπολογισμός συνολικού οφειλόμενου ποσού
        # Σημείωση: χρησιμοποιούμε αρνητικό πρόσημο για οφειλές
        for apartment_id, share_data in shares.items():
            share_data['total_due'] = (
                share_data['previous_balance'] - (share_data['total_amount'] + share_data['reserve_fund_amount'])
            )
        
        return shares
    
    def _calculate_by_participation_mills(self, expense: Expense, shares: Dict):
        """Υπολογισμός μεριδίων ανά χιλιοστά συμμετοχής"""
        total_mills = sum(
            apt.participation_mills or 0 for apt in self.apartments
        )
        
        if total_mills == 0:
            # Αν δεν υπάρχουν χιλιοστά, κατανομή ισόποσα
            self._calculate_equal_share(expense, shares)
            return
        
        for apartment in self.apartments:
            if apartment.participation_mills:
                participation_mills_decimal = Decimal(str(apartment.participation_mills))
                total_mills_decimal = Decimal(str(total_mills))
                share_amount = (expense.amount * participation_mills_decimal) / total_mills_decimal
                shares[apartment.id]['total_amount'] += share_amount
                shares[apartment.id]['breakdown'].append({
                    'expense_id': expense.id,
                    'expense_title': expense.title,
                    'expense_amount': expense.amount,
                    'apartment_share': share_amount,
                    'distribution_type': expense.distribution_type,
                    'distribution_type_display': expense.get_distribution_type_display()
                })
    
    def _calculate_equal_share(self, expense: Expense, shares: Dict):
        """Υπολογισμός ισόποσων μεριδίων"""
        share_per_apartment = expense.amount / len(self.apartments)
        
        for apartment in self.apartments:
            shares[apartment.id]['total_amount'] += share_per_apartment
            shares[apartment.id]['breakdown'].append({
                'expense_id': expense.id,
                'expense_title': expense.title,
                'expense_amount': expense.amount,
                'apartment_share': share_per_apartment,
                'distribution_type': expense.distribution_type,
                'distribution_type_display': expense.get_distribution_type_display()
            })
    
    def _calculate_specific_apartments(self, expense: Expense, shares: Dict):
        """Υπολογισμός για συγκεκριμένα διαμερίσματα"""
        # TODO: Υλοποίηση για συγκεκριμένα διαμερίσματα
        # Αυτή τη στιγμή κατανομή ισόποσα
        self._calculate_equal_share(expense, shares)
    
    def _calculate_by_meters(self, expense: Expense, shares: Dict):
        """Υπολογισμός με βάση μετρητές (για θέρμανση)"""
        from .models import MeterReading
        from datetime import timedelta
        
        # Προσδιορισμός περιόδου μετρήσεων
        # Αν η δαπάνη είναι για θέρμανση, χρησιμοποιούμε μετρήσεις θέρμανσης
        meter_type = 'heating'  # Προσωρινά μόνο για θέρμανση
        
        # Προσδιορισμός περιόδου (τελευταίος μήνας)
        end_date = expense.date
        start_date = end_date - timedelta(days=30)  # Προσωρινά 30 μέρες
        
        # Λήψη μετρήσεων για όλα τα διαμερίσματα
        meter_readings = MeterReading.objects.filter(
            apartment__building_id=self.building_id,
            meter_type=meter_type,
            reading_date__gte=start_date,
            reading_date__lte=end_date
        ).order_by('apartment', 'reading_date')
        
        # Υπολογισμός κατανάλωσης ανά διαμέρισμα
        apartment_consumption = {}
        total_consumption = Decimal('0.00')
        
        for apartment in self.apartments:
            apartment_readings = meter_readings.filter(apartment=apartment).order_by('reading_date')
            
            if len(apartment_readings) >= 2:
                # Υπολογισμός κατανάλωσης
                first_reading = apartment_readings.first()
                last_reading = apartment_readings.last()
                consumption = Decimal(str(last_reading.value - first_reading.value))
                
                apartment_consumption[apartment.id] = consumption
                total_consumption += consumption
            else:
                # Αν δεν υπάρχουν επαρκείς μετρήσεις, μηδενική κατανάλωση
                apartment_consumption[apartment.id] = Decimal('0.00')
        
        # Αν δεν υπάρχει συνολική κατανάλωση, κατανομή ισόποσα
        if total_consumption == 0:
            self._calculate_equal_share(expense, shares)
            return
        
        # Κατανομή δαπάνης ανάλογα με την κατανάλωση
        for apartment in self.apartments:
            consumption = apartment_consumption.get(apartment.id, Decimal('0.00'))
            if total_consumption > 0:
                share_amount = (expense.amount * consumption) / total_consumption
            else:
                share_amount = Decimal('0.00')
            
            shares[apartment.id]['total_amount'] += share_amount
            shares[apartment.id]['breakdown'].append({
                'expense_id': expense.id,
                'expense_title': expense.title,
                'expense_amount': expense.amount,
                'apartment_share': share_amount,
                'distribution_type': expense.distribution_type,
                'distribution_type_display': expense.get_distribution_type_display(),
                'meter_consumption': consumption,
                'total_meter_consumption': total_consumption
            })
    
    def _calculate_reserve_fund_contribution(self, shares: Dict):
        """Υπολογισμός εισφοράς αποθεματικού ανά χιλιοστά"""
        # Έλεγχος αν υπάρχει στόχος αποθεματικού
        if not self.building.reserve_fund_goal or self.building.reserve_fund_goal <= 0:
            return
        
        # Έλεγχος αν η συλλογή αποθεματικού έχει ξεκινήσει
        if not self.building.reserve_fund_start_date:
            return
        
        # ΚΡΙΣΙΜΟΣ ΕΛΕΓΧΟΣ: Έλεγχος αν ο επιλεγμένος μήνας είναι εντός της περιόδου συλλογής
        if self.month:
            from datetime import date
            try:
                year, mon = map(int, self.month.split('-'))
                selected_month_date = date(year, mon, 1)
                
                # Συγκρίνουμε μήνες, όχι ημερομηνίες
                selected_year_month = (selected_month_date.year, selected_month_date.month)
                start_year_month = (self.building.reserve_fund_start_date.year, self.building.reserve_fund_start_date.month)
                
                # Έλεγχος αν ο επιλεγμένος μήνας είναι πριν την έναρξη συλλογής
                if selected_year_month < start_year_month:
                    print(f"⏭️ Μήνας {self.month} είναι πριν την έναρξη συλλογής - παρακάμπτεται")
                    return  # Δεν συλλέγουμε αποθεματικό πριν την έναρξη
                
                # Έλεγχος αν ο επιλεγμένος μήνας είναι μετά την ολοκλήρωση
                if self.building.reserve_fund_target_date:
                    target_year_month = (self.building.reserve_fund_target_date.year, self.building.reserve_fund_target_date.month)
                    if selected_year_month > target_year_month:
                        print(f"⏭️ Μήνας {self.month} είναι μετά την ολοκλήρωση συλλογής - παρακάμπτεται")
                        return  # Δεν συλλέγουμε αποθεματικό μετά την ολοκλήρωση
                    
            except Exception as e:
                print(f"Error parsing month {self.month}: {e}")
                return
        
        # Το αποθεματικό συλλέγεται πάντα (είναι απόφαση ΓΣ)
        print(f"✅ Αποθεματικό: Συλλογή ανεξάρτητα από εκκρεμότητες (απόφαση ΓΣ)")

        # Υπολογισμός μηνιαίας εισφοράς αποθεματικού
        monthly_target = 0
        if self.building.reserve_fund_goal and self.building.reserve_fund_duration_months:
            monthly_target = float(self.building.reserve_fund_goal) / float(self.building.reserve_fund_duration_months)
        else:
            # Χρήση της εισφοράς ανά διαμέρισμα
            monthly_target = float(self.building.reserve_contribution_per_apartment or 0) * len(self.apartments)
        
        if monthly_target <= 0:
            return
        
        # Υπολογισμός συνολικών χιλιοστών
        total_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
        
        if total_mills == 0:
            # Αν δεν υπάρχουν χιλιοστά, κατανομή ισόποσα
            share_per_apartment = Decimal(str(monthly_target)) / len(self.apartments)
            for apartment in self.apartments:
                shares[apartment.id]['reserve_fund_amount'] = share_per_apartment
                shares[apartment.id]['reserve_fund_contribution'] = share_per_apartment
        else:
            # Κατανομή ανά χιλιοστά
            for apartment in self.apartments:
                if apartment.participation_mills:
                    participation_mills_decimal = Decimal(str(apartment.participation_mills))
                    total_mills_decimal = Decimal(str(total_mills))
                    reserve_share = (Decimal(str(monthly_target)) * participation_mills_decimal) / total_mills_decimal
                    shares[apartment.id]['reserve_fund_amount'] = reserve_share
                    shares[apartment.id]['reserve_fund_contribution'] = reserve_share
        
        # Προσθήκη στο breakdown μόνο αν δεν υπάρχουν εκκρεμότητες
        # ΣΗΜΕΙΩΣΗ: Το αποθεματικό ΔΕΝ προστίθεται στο total_amount
        # γιατί το total_amount περιέχει μόνο τις δαπάνες
        for apartment in self.apartments:
            if shares[apartment.id]['reserve_fund_amount'] > 0:
                shares[apartment.id]['breakdown'].append({
                    'expense_id': None,
                    'expense_title': 'Εισφορά Αποθεματικού',
                    'expense_amount': shares[apartment.id]['reserve_fund_amount'],
                    'apartment_share': shares[apartment.id]['reserve_fund_amount'],
                    'distribution_type': 'reserve_fund',
                    'distribution_type_display': 'Εισφορά Αποθεματικού'
                })
        
        # 🆕 Αυτόματη δημιουργία δαπάνης αποθεματικού αν δεν υπάρχει
        self._create_reserve_fund_expense_if_needed(monthly_target)
    
    def _create_reserve_fund_expense_if_needed(self, monthly_target: float):
        """Δημιουργεί αυτόματα δαπάνη αποθεματικού αν δεν υπάρχει για τον τρέχον μήνα"""
        if not self.month or monthly_target <= 0:
            return
        
        try:
            from datetime import date, timedelta
            year, month = map(int, self.month.split('-'))
            expense_date = date(year, month, 1)
            
            # Έλεγχος αν ο τρέχον μήνας ανήκει στο reserve fund timeline
            # ✅ REFACTORED: Using centralized date helper
            from .utils.date_helpers import is_date_in_reserve_fund_timeline
            if not is_date_in_reserve_fund_timeline(expense_date, self.building):
                print(f"⏭️ Μήνας {self.month} δεν ανήκει στο reserve fund timeline - παρακάμπτεται")
                return
            
            # Έλεγχος αν υπάρχει ήδη δαπάνη αποθεματικού για αυτόν τον μήνα
            existing_expense = Expense.objects.filter(
                building=self.building,
                category='reserve_fund',
                date__year=year,
                date__month=month
            ).first()
            
            if existing_expense:
                print(f"✅ Δαπάνη αποθεματικού υπάρχει ήδη για {self.month}: €{existing_expense.amount}")
                return
            
            # Δημιουργία νέας δαπάνης αποθεματικού
            from decimal import Decimal
            
            expense = Expense.objects.create(
                building=self.building,
                title=f"Εισφορά Αποθεματικού - {expense_date.strftime('%B %Y')}",
                amount=Decimal(str(monthly_target)),
                date=expense_date,
                category='reserve_fund',
                expense_type='reserve_fund',
                distribution_type='by_participation_mills',
                payer_responsibility='owner',  # ✅ ΚΡΙΣΙΜΟ: Χρέωση ιδιοκτητών!
                notes=f"Αυτόματη δημιουργία - Μηνιαία εισφορά αποθεματικού (στόχος: €{self.building.reserve_fund_goal})"
            )
            
            print(f"🆕 Δημιουργήθηκε δαπάνη αποθεματικού για {self.month}: €{monthly_target}")
            
        except Exception as e:
            print(f"❌ Σφάλμα δημιουργίας δαπάνης αποθεματικού: {e}")
    
    # ❌ DELETED: _is_month_in_reserve_fund_timeline() method
    # This duplicate implementation has been replaced with centralized utility:
    #   from financial.utils.date_helpers import is_date_in_reserve_fund_timeline
    #   is_date_in_reserve_fund_timeline(target_date, building)
    # See: financial-module-refactoring.plan.md (Phase 2.2)

    def get_total_expenses(self) -> Decimal:
        """Επιστρέφει το συνολικό ποσό ανέκδοτων δαπανών"""
        return sum(exp.amount for exp in self.expenses)
    
    def _calculate_management_fee(self, shares: Dict):
        """Υπολογισμός δαπανών διαχείρισης (management fee)"""
        management_fee = self.building.management_fee_per_apartment or Decimal('0.00')
        
        if management_fee > 0:
            # 🔧 ΝΕΟ: Έλεγχος financial_system_start_date πριν χρέωση management fees
            should_charge_management_fees = True
            
            if self.building.financial_system_start_date and self.period_start_date:
                # Αν ο μήνας είναι πριν την έναρξη του οικονομικού συστήματος, μην χρεώνεις
                # Αυτό σημαίνει ότι αν το financial_system_start_date είναι 2025-10-03,
                # τότε ο Οκτώβριος 2025 (2025-10-01) είναι πριν την έναρξη και δεν πρέπει να χρεώνεται
                if self.period_start_date < self.building.financial_system_start_date:
                    should_charge_management_fees = False
                    print(f"⏭️ Management fees παρακάμπονται για {self.period_start_date.strftime('%Y-%m')} - πριν από financial_system_start_date ({self.building.financial_system_start_date})")
            
            if not should_charge_management_fees:
                return
            
            # Ελέγχουμε αν υπάρχουν ήδη management_fees expenses
            management_expenses_exist = any(
                expense.category == 'management_fees' for expense in self.expenses
            )
            
            # Προσθέτουμε management fee μόνο αν δεν υπάρχουν ήδη management_fees expenses
            if not management_expenses_exist:
                for apartment in self.apartments:
                    shares[apartment.id]['total_amount'] += management_fee
                    shares[apartment.id]['breakdown'].append({
                        'expense_id': None,
                        'expense_title': 'Δαπάνες Διαχείρισης',
                        'expense_amount': management_fee,
                        'apartment_share': management_fee,
                        'distribution_type': 'management_fee',
                        'distribution_type_display': 'Δαπάνες Διαχείρισης'
                    })
    
    def get_apartments_count(self) -> int:
        """Επιστρέφει τον αριθμό διαμερισμάτων"""
        return len(self.apartments)


class FinancialDashboardService:
    """Υπηρεσία για τα δεδομένα του οικονομικού dashboard"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.logger = logging.getLogger(__name__)
        self._monthly_balance_service = MonthlyBalanceService(self.building)
    
    def get_summary(self, month: str | None = None) -> Dict[str, Any]:
        # 🔧 ΝΕΟ: Αποθήκευση month context για reserve fund calculation
        self.current_month = month
        """Επιστρέφει σύνοψη οικονομικών στοιχείων.
        Αν δοθεί month (YYYY-MM), υπολογίζει για τον συγκεκριμένο μήνα."""
        apartments = Apartment.objects.filter(building_id=self.building_id)
        
        # Monthly balance snapshot (single source of truth for carryover)
        monthly_balance_snapshot: Optional[MonthlyBalance] = None
        scheduled_maintenance_amount = Decimal('0.00')
        carry_forward_amount = Decimal('0.00')
        
        # Resolve the target month/year (defaults to current month)
        target_year: int
        target_month_number: int
        if month:
            try:
                target_year, target_month_number = map(int, month.split('-'))
            except ValueError:
                today = timezone.now().date()
                target_year, target_month_number = today.year, today.month
        else:
            today = timezone.now().date()
            target_year, target_month_number = today.year, today.month
        
        try:
            monthly_balance_snapshot = self._monthly_balance_service.create_or_update_monthly_balance(
                target_year,
                target_month_number,
                recalculate=bool(month)
            )
            scheduled_maintenance_amount = monthly_balance_snapshot.scheduled_maintenance_amount
            carry_forward_amount = monthly_balance_snapshot.carry_forward
        except Exception as exc:
            self.logger.warning(
                "MonthlyBalanceService failed for %s-%s",
                target_year,
                f"{target_month_number:02d}",
                exc_info=exc
            )
        
        # Συνολικές οφειλές: αρνητικά υπόλοιπα + ανέκδοτες δαπάνες
        apartment_obligations = Decimal(str(sum(
            abs(apt.current_balance) for apt in apartments 
            if apt.current_balance and apt.current_balance < 0
        )))
        
        # Σημείωση: Όλες οι δαπάνες θεωρούνται πλέον εκδομένες
        # Δεν υπάρχουν πια "ανέκδοτες" δαπάνες
        pending_expenses_all = Decimal('0.00')
        
        # Get building info for management fees (moved up for earlier use)
        from buildings.models import Building
        building = Building.objects.get(id=self.building_id)
        management_fee_per_apartment = building.management_fee_per_apartment
        apartments_count = Apartment.objects.filter(building_id=self.building_id).count()
        
        # 🔧 ΝΕΟ: Έλεγχος financial_system_start_date για management fees
        total_management_cost = Decimal('0.00')
        effective_management_fee_per_apartment = Decimal('0.00')  # 🔧 ΝΕΟ: Effective fee based on start date
        if management_fee_per_apartment > 0:
            # Αν δόθηκε month, ελέγχουμε αν είναι μετά την έναρξη του συστήματος
            if month:
                try:
                    year, mon = map(int, month.split('-'))
                    month_start_date = date(year, mon, 1)
                    
                    # Αν ο μήνας είναι μετά την έναρξη του οικονομικού συστήματος, χρεώνουμε
                    if not building.financial_system_start_date or month_start_date >= building.financial_system_start_date:
                        total_management_cost = management_fee_per_apartment * apartments_count
                        effective_management_fee_per_apartment = management_fee_per_apartment
                        print(f"✅ Management fees χρεώνονται για {month} - μετά από financial_system_start_date")
                    else:
                        total_management_cost = Decimal('0.00')  # 🔧 ΝΕΟ: Ορισμός ρητά σε 0
                        effective_management_fee_per_apartment = Decimal('0.00')  # 🔧 ΝΕΟ: Ορισμός ρητά σε 0
                        print(f"⏭️ Management fees παρακάμπονται για {month} - πριν από financial_system_start_date ({building.financial_system_start_date})")
                except Exception:
                    # Fallback: χρεώνουμε αν δεν μπορούμε να κάνουμε parse το month
                    total_management_cost = management_fee_per_apartment * apartments_count
                    effective_management_fee_per_apartment = management_fee_per_apartment
            else:
                # Για current view, χρεώνουμε πάντα (για backwards compatibility)
                total_management_cost = management_fee_per_apartment * apartments_count
                effective_management_fee_per_apartment = management_fee_per_apartment
        
        # Συνολικές υποχρεώσεις = Υφιστάμενες οφειλές + Ανέκδοτες δαπάνες + Διαχειριστικά τέλη
        # This represents the TOTAL financial obligations, not month-specific
        total_obligations = apartment_obligations + pending_expenses_all + total_management_cost
        management_fees_snapshot = total_management_cost
        
        # Δαπάνες αυτού του μήνα
        from datetime import date
        
        if month:
            # Parse YYYY-MM
            try:
                year, mon = map(int, month.split('-'))
                start_date = date(year, mon, 1)
                if mon == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, mon + 1, 1)
            except Exception:
                # Fallback to current month
                now = timezone.now()
                start_date = date(now.year, now.month, 1)
                if now.month == 12:
                    end_date = date(now.year + 1, 1, 1)
                else:
                    end_date = date(now.year, now.month + 1, 1)
        else:
            # Current month
            now = timezone.now()
            start_date = date(now.year, now.month, 1)
            if now.month == 12:
                end_date = date(now.year + 1, 1, 1)
            else:
                end_date = date(now.year, now.month + 1, 1)
        
        total_expenses_this_month = Expense.objects.filter(
            building_id=self.building_id,
            date__gte=start_date,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Εισπράξεις αυτού του μήνα
        total_payments_this_month = Payment.objects.filter(
            apartment__building_id=self.building_id,
            date__gte=start_date,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Πρόσφατες κινήσεις
        recent_transactions_query = Transaction.objects.filter(
            building_id=self.building_id
        )
        
        # Φιλτράρισμα ανά μήνα αν δοθεί
        if month:
            try:
                year, mon = map(int, month.split('-'))
                start_date = timezone.make_aware(
                    datetime(year, mon, 1, 0, 0, 0)
                )
                if mon == 12:
                    end_date = timezone.make_aware(
                        datetime(year + 1, 1, 1, 0, 0, 0)
                    )
                else:
                    end_date = timezone.make_aware(
                        datetime(year, mon + 1, 1, 0, 0, 0)
                    )
                recent_transactions_query = recent_transactions_query.filter(
                    date__gte=start_date, date__lt=end_date
                )
            except Exception:
                # Fallback to all transactions if month parsing fails
                pass
        
        recent_transactions = recent_transactions_query.select_related('building', 'apartment').order_by('-date')[:10]
        
        # Σημείωση: Όλες οι δαπάνες θεωρούνται εκδομένες
        # Επιστρέφουμε άδειο queryset για backwards compatibility
        pending_expenses_query = Expense.objects.filter(
            building_id=self.building_id
        ).none()
        
        # Φιλτράρισμα ανά μήνα αν δοθεί
        if month:
            try:
                year, mon = map(int, month.split('-'))
                start_date = date(year, mon, 1)
                if mon == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, mon + 1, 1)
                pending_expenses_query = pending_expenses_query.filter(
                    date__gte=start_date, date__lt=end_date
                )
            except Exception:
                # Fallback to all pending expenses if month parsing fails
                pass
        
        pending_expenses = pending_expenses_query.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Κατάσταση διαμερισμάτων
        apartment_balances = self.get_apartment_balances(month)
        
        # Στατιστικά πληρωμών
        payment_statistics = self.get_payment_statistics(month)
        
        # Calculate financial position based on month parameter
        if month:
            # SNAPSHOT VIEW: Calculate financial position as it would be at the end of the selected month
            # This provides a "point in time" view of the building's finances
            
            # Calculate cumulative totals up to the end of the selected month
            total_payments_snapshot = Payment.objects.filter(
                apartment__building_id=self.building_id,
                date__lte=end_date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            total_expenses_snapshot = Expense.objects.filter(
                building_id=self.building_id,
                date__lte=end_date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            current_reserve = total_payments_snapshot - total_expenses_snapshot - total_management_cost
            
            # Σημείωση: Όλες οι δαπάνες θεωρούνται εκδομένες
            # Δεν υπάρχουν πια "ανέκδοτες" δαπάνες
            pending_expenses_snapshot = Decimal('0.00')
            
            # Update total_obligations for snapshot view (include management fees)
            total_obligations = apartment_obligations + pending_expenses_snapshot + total_management_cost
            
        else:
            # CURRENT VIEW: Current actual financial position (all time)
            total_payments_all_time = Payment.objects.filter(
                apartment__building_id=self.building_id
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            total_expenses_all_time = Expense.objects.filter(
                building_id=self.building_id
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            current_reserve = total_payments_all_time - total_expenses_all_time - total_management_cost
        
        # Calculate reserve fund monthly target FIRST
        # Always show the calculated monthly target for all months
        # The system will stop collecting when the goal is reached
        reserve_fund_monthly_target = self._get_reserve_fund_monthly_target(apartments_count)
        
        # Check if there's any financial activity for this month (διακανονισμός)
        has_monthly_activity = self._has_monthly_activity(month) if month else True
        
        # Apply timeline validation to reserve fund monthly target
        # Only show reserve fund if the selected month is within the collection period
        if month and self.building.reserve_fund_start_date:
            try:
                year, mon = map(int, month.split('-'))
                selected_month_date = date(year, mon, 1)
                
                # Check if selected month is before start date
                if selected_month_date < self.building.reserve_fund_start_date:
                    reserve_fund_monthly_target = Decimal('0.00')
                # Check if selected month is after target date
                elif (self.building.reserve_fund_target_date and 
                      selected_month_date > self.building.reserve_fund_target_date):
                    reserve_fund_monthly_target = Decimal('0.00')
            except Exception as e:
                print(f"Error parsing month {month}: {e}")
                reserve_fund_monthly_target = Decimal('0.00')
        
        # Υπολογισμός εισφοράς αποθεματικού με προτεραιότητα
        # Για month-specific view, χρησιμοποιούμε το reserve_fund_monthly_target (έχει ήδη timeline validation)
        if month:
            reserve_fund_contribution = reserve_fund_monthly_target
        else:
            # Για current view, χρησιμοποιούμε την παλιά λογική
            reserve_fund_contribution = self._calculate_reserve_fund_contribution(
                current_reserve, total_obligations
            )
        
        # 🔧 ΝΕΟ: Ενημέρωση total_management_cost με βάση το financial_system_start_date
        # Η _calculate_reserve_fund_contribution υπολογίζει το σωστό management_cost
        if hasattr(self, 'current_month') and self.current_month and self.building.financial_system_start_date:
            try:
                year, mon = map(int, self.current_month.split('-'))
                month_start_date = date(year, mon, 1)
                if month_start_date < self.building.financial_system_start_date:
                    # Ενημερώνουμε το total_management_cost για μήνες πριν την έναρξη
                    total_management_cost = Decimal('0.00')
                    effective_management_fee_per_apartment = Decimal('0.00')
                    print(f"🔧 Final update: total_management_cost = 0.00 for {self.current_month}")
            except Exception:
                pass
        
        # Calculate total balance based on view type
        if month:
            # For snapshot view, total balance should be payments minus all obligations
            # This includes current monthly expenses + previous obligations + reserve fund contribution
            total_monthly_obligations = total_expenses_this_month + total_management_cost + reserve_fund_monthly_target
            
            # We'll calculate previous_obligations later, so for now use placeholder
            total_balance = total_payments_this_month - total_monthly_obligations
        else:
            # For current view, use current reserve
            total_balance = current_reserve
        
        # Add debugging info for month-specific calculations
        calculation_context = "current" if not month else f"snapshot_{month}"
        
        print(f"🔍 FinancialDashboard ({calculation_context}): current_reserve={current_reserve}, total_obligations={total_obligations}")
        print(f"🔍 FinancialDashboard ({calculation_context}): total_balance={total_balance}")
        
        # Calculate previous obligations FIRST (needed for current_obligations calculation)
        if month:
            # For month-specific view, calculate previous balance as of the end of the previous month
            try:
                year, mon = map(int, month.split('-'))
                if mon == 1:
                    # January - previous month is December of previous year
                    from calendar import monthrange
                    previous_month_end = date(year - 1, 12, 31)
                else:
                    # Other months - previous month end
                    from calendar import monthrange
                    _, last_day = monthrange(year, mon - 1)
                    previous_month_end = date(year, mon - 1, last_day)

                # 🔧 ΔΙΟΡΘΩΣΗ 2025-10-10: Χρήση MonthlyBalance.carry_forward αν υπάρχει
                # Αυτό είναι πιο αξιόπιστο γιατί τα MonthlyBalance records
                # υπολογίζονται με συνεπή τρόπο και αποθηκεύονται
                previous_obligations = Decimal('0.00')
                
                # Βρες το MonthlyBalance του προηγούμενου μήνα
                prev_month = mon - 1
                prev_year = year
                if prev_month == 0:
                    prev_month = 12
                    prev_year -= 1
                
                prev_balance = MonthlyBalance.objects.filter(
                    building_id=self.building_id,
                    year=prev_year,
                    month=prev_month
                ).first()

                try:
                    if prev_balance:
                        # ✅ Χρήση carry_forward από το MonthlyBalance του προηγούμενου μήνα
                        previous_obligations = prev_balance.carry_forward
                        print(f"✅ Previous obligations for {year}-{mon:02d}: €{previous_obligations:.2f}")
                        print(f"   (από MonthlyBalance {prev_month:02d}/{prev_year} carry_forward)")
                    else:
                        # Fallback: Raw calculation αν δεν υπάρχει MonthlyBalance
                        print(f"⚠️ MonthlyBalance not found for {prev_month:02d}/{prev_year}, using raw calculation")
                        
                        # ✅ ΚΡΙΣΙΜΗ ΔΙΟΡΘΩΣΗ 2025-10-10:
                        # Έλεγχος financial_system_start_date για αποφυγή χρεώσεων από το -άπειρο
                        start_filter_date = building.financial_system_start_date or date(year, mon, 1)
                        
                        # 1. Expenses πριν τον μήνα (ΑΠΟ την έναρξη του συστήματος)
                        expenses_before_month = Expense.objects.filter(
                            building_id=self.building_id,
                            date__gte=start_filter_date,  # ✅ ΑΠΟ την έναρξη του συστήματος!
                            date__lt=date(year, mon, 1)
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

                        # 2. Payments πριν τον μήνα (ΑΠΟ την έναρξη του συστήματος)
                        payments_before_month = Payment.objects.filter(
                            apartment__building_id=self.building_id,
                            date__gte=start_filter_date,  # ✅ ΑΠΟ την έναρξη του συστήματος!
                            date__lt=date(year, mon, 1)
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

                        # 3. Management fees ΗΔΗ περιλαμβάνονται στα expenses_before_month
                        # Τα management fees καταγράφονται ως Expense records (category='management_fees')
                        # Δεν τα προσθέτουμε ξεχωριστά για να αποφύγουμε διπλό μέτρημα

                        # 4. Reserve fund ΗΔΗ περιλαμβάνεται στα expenses_before_month
                        # Δεν το προσθέτουμε ξεχωριστά για να αποφύγουμε διπλό μέτρημα

                        previous_obligations = expenses_before_month - payments_before_month

                        print(f"   Previous obligations for {year}-{mon:02d}: €{previous_obligations:.2f}")
                        print(f"   System start date: {start_filter_date}")
                        print(f"   Expenses before month (from {start_filter_date}): €{expenses_before_month:.2f}")
                        print(f"   Payments before month (from {start_filter_date}): €{payments_before_month:.2f}")

                except Exception as e:
                    print(f"⚠️ Error calculating previous obligations: {e}")
                    import traceback
                    traceback.print_exc()
                    previous_obligations = Decimal('0.00')
            except Exception as e:
                print(f"⚠️ Error calculating previous obligations for {month}: {e}")
                previous_obligations = apartment_obligations
        else:
            # For current view, use current apartment obligations
            previous_obligations = apartment_obligations

        # Calculate current obligations (should include management costs and reserve fund for consistency)
        if month:
            # For snapshot view, current obligations should include management costs and reserve fund
            # ΔΙΟΡΘΩΣΗ: Μη διπλό μέτρημα - τα management fees περιλαμβάνονται ήδη στο total_expenses_this_month
            # Αφαιρούμε τα management fees από το total_management_cost για να αποφύγουμε διπλό μέτρημα
            from datetime import date
            if month:
                year, mon = map(int, month.split('-'))
                month_start = date(year, mon, 1)
                month_end = date(year, mon + 1, 1) if mon < 12 else date(year + 1, 1, 1)
            else:
                month_start = date.today().replace(day=1)
                month_end = date.today()

            management_fees_in_expenses = Expense.objects.filter(
                building_id=self.building_id,
                category='management_fees',
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            # Αφαιρούμε τα management fees που ήδη περιλαμβάνονται στο total_expenses_this_month
            # 🔧 ΝΕΟ: Χρησιμοποιούμε το total_management_cost που έχει ήδη ελέγξει το financial_system_start_date
            management_cost_adjustment = total_management_cost - management_fees_in_expenses

            # 🔧 ΔΙΟΡΘΩΣΗ 2025-10-09: Προσθήκη previous_obligations στο current_obligations
            # Οι συνολικές υποχρεώσεις του μήνα = Δαπάνες μήνα + Management adjustment + Παλαιότερες οφειλές
            # ΣΗΜ: Το reserve_fund ΗΔΗ περιλαμβάνεται στα expenses (category='reserve_fund')
            # ΔΕΝ το προσθέτουμε ξεχωριστά για να αποφύγουμε διπλό μέτρημα
            current_obligations = total_expenses_this_month + management_cost_adjustment + previous_obligations
        else:
            # For current view, use total obligations
            current_obligations = total_obligations

        # Εφαρμογή αποτελεσμάτων MonthlyBalanceService (Single Source of Truth)
        if monthly_balance_snapshot:
            previous_obligations = monthly_balance_snapshot.previous_obligations
            total_expenses_this_month = monthly_balance_snapshot.total_expenses
            total_payments_this_month = monthly_balance_snapshot.total_payments
            reserve_fund_contribution = monthly_balance_snapshot.reserve_fund_amount
            current_obligations = monthly_balance_snapshot.total_obligations
            current_month_expenses = monthly_balance_snapshot.total_expenses
            management_fees_snapshot = monthly_balance_snapshot.management_fees
        
        # (apartments_count, building, management_fee_per_apartment, total_management_cost already calculated above)

        # Calculate pending payments (apartments with negative balance)
        pending_payments = Apartment.objects.filter(
            building_id=self.building_id,
            current_balance__lt=0
        ).count()

        # Calculate average monthly expenses (only actual expenses, NOT including management fees)
        # Management fees are handled separately and should not be included in "actual expenses"
        average_monthly_expenses = total_expenses_this_month
        
        # ΔΙΟΡΘΩΣΗ: total_balance είναι το Αποθεματικό μείον τις Συνολικές Υποχρεώσεις
        # Δεν είναι πληρωμές μείον οφειλές - αυτό είναι το net cash flow
        # Το total_balance αντιπροσωπεύει την οικονομική θέση του κτιρίου
        total_balance = current_reserve - current_obligations
        print(f"🔧 TOTAL BALANCE: current_reserve={current_reserve} - current_obligations={current_obligations} = {total_balance}")

        # 🔧 ΝΕΟΟ FIELD: Δαπάνες μόνο του τρέχοντος μήνα (χωρίς παλαιότερες οφειλές)
        # Διασφαλίζουμε ότι previous_obligations δεν είναι None
        safe_previous_obligations = previous_obligations if previous_obligations is not None else Decimal('0.00')
        current_month_expenses = current_obligations - safe_previous_obligations
        print(f"🔧 CURRENT MONTH EXPENSES: {current_month_expenses} = {current_obligations} - {safe_previous_obligations}")

        # Παίρνουμε την αναλυτική κατανομή δαπανών
        expense_breakdown = self.get_expense_breakdown(month)

        return {
            'total_balance': float(total_balance.quantize(Decimal('0.01'))),
            'current_obligations': float(current_obligations.quantize(Decimal('0.01'))),
            'previous_obligations': float(safe_previous_obligations.quantize(Decimal('0.01'))),  # ← ΝΕΟ FIELD
            'current_month_expenses': float(current_month_expenses.quantize(Decimal('0.01'))),  # ← ΝΕΟ FIELD
            'reserve_fund_contribution': float(reserve_fund_contribution.quantize(Decimal('0.01'))),
            'current_reserve': float(current_reserve.quantize(Decimal('0.01'))),
            'has_monthly_activity': has_monthly_activity,
            'apartments_count': apartments_count,
            'pending_payments': pending_payments,
            'average_monthly_expenses': float(average_monthly_expenses.quantize(Decimal('0.01'))),
            'last_calculation_date': timezone.now().strftime('%Y-%m-%d'),
            'total_expenses_month': float(total_expenses_this_month.quantize(Decimal('0.01'))),
            'total_payments_month': float(total_payments_this_month.quantize(Decimal('0.01'))),
            'scheduled_maintenance_amount': float(scheduled_maintenance_amount.quantize(Decimal('0.01'))),
            'carry_forward': float(carry_forward_amount.quantize(Decimal('0.01'))),
            'pending_expenses': float(pending_expenses.quantize(Decimal('0.01'))),
            'recent_transactions': list(recent_transactions),
            'recent_transactions_count': len(recent_transactions),
            'apartment_balances': apartment_balances,
            'payment_statistics': payment_statistics,
            # Reserve fund settings - dynamic based on building or 0 for new buildings
            'reserve_fund_goal': float(self.building.reserve_fund_goal or Decimal('0.0')),  # From building settings
            'reserve_fund_duration_months': int(self.building.reserve_fund_duration_months or 0),  # From building settings
            'reserve_fund_monthly_target': float(reserve_fund_monthly_target),  # Use calculated value based on period
            # Reserve fund timeline dates - CRITICAL for frontend timeline checks
            'reserve_fund_start_date': self.building.reserve_fund_start_date.strftime('%Y-%m-%d') if self.building.reserve_fund_start_date else None,
            'reserve_fund_target_date': self.building.reserve_fund_target_date.strftime('%Y-%m-%d') if self.building.reserve_fund_target_date else None,
            # Management expenses
            'management_fee_per_apartment': float(effective_management_fee_per_apartment),  # 🔧 ΝΕΟ: Χρήση effective fee
            'total_management_cost': float(management_fees_snapshot.quantize(Decimal('0.01'))),
            'uses_monthly_balance_snapshot': monthly_balance_snapshot is not None,
            # Αναλυτική κατανομή δαπανών ανά κατηγορία
            'expense_breakdown': expense_breakdown  # ← ΝΕΟ FIELD
        }
    

    
    def _calculate_reserve_fund_contribution(self, current_reserve: Decimal, total_obligations: Decimal) -> Decimal:
        """
        Υπολογίζει την εισφορά αποθεματικού με βάση την προτεραιότητα:
        1. Αν προτεραιότητα = 'after_obligations': Πρώτα πρέπει να καλυφθούν οι τρέχουσες υποχρεώσεις
        2. Αν προτεραιότητα = 'always': Συλλέγεται πάντα ανεξάρτητα από εκκρεμότητες
        """
        # Υπολογίζουμε τις εκκρεμότητες ΕΚΤΟΣ από το κόστος διαχείρισης
        # Το κόστος διαχείρισης είναι τακτική υποχρέωση, όχι εκκρεμότητα
        building = Building.objects.get(id=self.building_id)
        apartments = Apartment.objects.filter(building_id=self.building_id)
        apartments_count = apartments.count()
        
        # 🔧 ΝΕΟ: Έλεγχος financial_system_start_date για management_cost
        # Η μέθοδος χρησιμοποιείται από get_summary, οπότε πρέπει να ελέγχει το financial_system_start_date
        management_fee_per_apartment = building.management_fee_per_apartment or Decimal('0.00')
        if management_fee_per_apartment > 0:
            # Ελέγχουμε αν υπάρχει financial_system_start_date και αν το month είναι πριν από αυτό
            # Αν δεν έχουμε month context, χρεώνουμε πάντα (current view)
            if hasattr(self, 'current_month') and self.current_month and building.financial_system_start_date:
                try:
                    year, mon = map(int, self.current_month.split('-'))
                    month_start_date = date(year, mon, 1)
                    if month_start_date < building.financial_system_start_date:
                        management_cost = Decimal('0.00')
                        print(f"⏭️ Reserve fund: No management fees for {self.current_month} - before financial_system_start_date")
                    else:
                        management_cost = management_fee_per_apartment * apartments_count
                        print(f"✅ Reserve fund: Management fees charged for {self.current_month}")
                except Exception:
                    management_cost = management_fee_per_apartment * apartments_count
            else:
                # Current view ή fallback - χρεώνουμε πάντα
                management_cost = management_fee_per_apartment * apartments_count
        else:
            management_cost = Decimal('0.00')
        
        # Το αποθεματικό συλλέγεται πάντα (είναι απόφαση ΓΣ)
        print(f"✅ FinancialDashboard: Συλλογή αποθεματικού (απόφαση ΓΣ)")

        # Υπολογίζουμε την εισφορά αποθεματικού
        # Χρησιμοποιούμε τον ίδιο υπολογισμό με το CommonExpenseCalculator
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            total_monthly_contribution = monthly_target
        else:
            # Fallback στην εισφορά ανά διαμέρισμα
            contribution_per_apartment = building.reserve_contribution_per_apartment or Decimal('0.00')
            total_monthly_contribution = contribution_per_apartment * apartments_count
        
        return total_monthly_contribution
    
    # ❌ DELETED: _is_month_within_reserve_fund_period() method
    # This duplicate implementation has been replaced with centralized utility:
    #   from financial.utils.date_helpers import is_date_in_reserve_fund_timeline, parse_month_string, get_month_first_day
    #   year, month = parse_month_string(month_str)
    #   month_date = get_month_first_day(year, month)
    #   is_date_in_reserve_fund_timeline(month_date, building)
    # See: financial-module-refactoring.plan.md (Phase 2.2)

    def _has_monthly_activity(self, month: str) -> bool:
        """
        Ελέγχει αν υπάρχει οικονομική δραστηριότητα (διακανονισμός) για τον συγκεκριμένο μήνα
        
        Args:
            month: Μήνας σε μορφή YYYY-MM
            
        Returns:
            bool: True αν υπάρχει δραστηριότητα (δαπάνες ή πληρωμές), False αλλιώς
        """
        from datetime import date
        
        try:
            year, mon = map(int, month.split('-'))
            start_date = date(year, mon, 1)
            if mon == 12:
                end_date = date(year + 1, 1, 1)
            else:
                end_date = date(year, mon + 1, 1)
        except Exception:
            # Αν δεν μπορούμε να parse τον μήνα, επιστρέφουμε True για ασφάλεια
            return True
        
        # Ελέγχουμε για δαπάνες στον μήνα
        has_expenses = Expense.objects.filter(
            building_id=self.building_id,
            date__gte=start_date,
            date__lt=end_date
        ).exists()
        
        # Ελέγχουμε για πληρωμές στον μήνα
        has_payments = Payment.objects.filter(
            apartment__building_id=self.building_id,
            date__gte=start_date,
            date__lt=end_date
        ).exists()
        
        # Ελέγχουμε για δαπάνες (όλες θεωρούνται εκδομένες)
        has_issued_expenses = Expense.objects.filter(
            building_id=self.building_id,
            created_at__gte=start_date,
            created_at__lt=end_date
        ).exists()
        
        activity_found = has_expenses or has_payments or has_issued_expenses
        
        print(f"🔍 Monthly Activity Check for {month}:")
        print(f"   📤 Has expenses: {has_expenses}")
        print(f"   📥 Has payments: {has_payments}")
        print(f"   📋 Has issued expenses: {has_issued_expenses}")
        print(f"   ✅ Overall activity: {activity_found}")
        
        return activity_found
    
    def get_apartment_balances(self, month: str | None = None) -> List[Dict[str, Any]]:
        """Επιστρέφει την κατάσταση οφειλών για όλα τα διαμερίσματα
        
        Args:
            month: Προαιρετικός μήνας σε μορφή YYYY-MM για ιστορικό snapshot
        """
        from .balance_service import BalanceCalculationService
        
        apartments = Apartment.objects.filter(building_id=self.building_id)
        apartment_count_total = apartments.count()
        total_participation_mills = apartments.aggregate(total=Sum('participation_mills'))['total'] or 0
        safe_apartment_count = apartment_count_total if apartment_count_total > 0 else 1
        balances = []
        
        # Υπολογισμός end_date αν δοθεί month
        end_date = None
        if month:
            try:
                from datetime import date
                year, mon = map(int, month.split('-'))
                if mon == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, mon + 1, 1)
            except Exception:
                end_date = None
        
        for apartment in apartments:
            # ΔΙΟΡΘΩΣΗ: Πάντα υπολογίζω το balance από transactions για συνέπεια
            # ✅ REFACTORED: Using centralized BalanceCalculationService
            # ✅ FIX 2025-10-10: Added include_reserve_fund=True for proper carryover
            if end_date:
                # Για snapshot view, υπολογίζουμε το balance μέχρι την αρχή του μήνα (πριν τον επιλεγμένο μήνα)
                if month:
                    year, mon = map(int, month.split('-'))
                    month_start = date(year, mon, 1)
                    calculated_balance = BalanceCalculationService.calculate_historical_balance(
                        apartment, month_start, 
                        include_management_fees=True,
                        include_reserve_fund=True  # ✅ CRITICAL: Include reserve fund in previous balance!
                    )
                else:
                    calculated_balance = BalanceCalculationService.calculate_historical_balance(
                        apartment, end_date, 
                        include_management_fees=True,
                        include_reserve_fund=True  # ✅ CRITICAL: Include reserve fund in previous balance!
                    )
                # Τελευταία πληρωμή μέχρι την ημερομηνία
                last_payment = apartment.payments.filter(date__lt=end_date).order_by('-date').first()
            else:
                # Για current view, χρησιμοποίησε current date
                from datetime import date
                calculated_balance = BalanceCalculationService.calculate_historical_balance(
                    apartment, date.today(), 
                    include_management_fees=True,
                    include_reserve_fund=True  # ✅ CRITICAL: Include reserve fund in previous balance!
                )
                # Τελευταία πληρωμή συνολικά
                last_payment = apartment.payments.order_by('-date').first()
            
            # ΔΙΟΡΘΩΣΗ: Υπολογισμός κατάστασης βασισμένη στο υπόλοιπο
            if calculated_balance > 100:  # More than 100€ debt
                status = 'Κρίσιμο'
            elif calculated_balance > 0:  # Any debt > 0€
                status = 'Οφειλή'
            elif calculated_balance < 0:  # Credit balance
                status = 'Πιστωτικό'
            else:  # Exactly 0€
                status = 'Ενήμερο'
            
            # ΔΙΟΡΘΩΣΗ: Υπολογισμός previous_balance, reserve_fund_share και net_obligation για snapshot view
            previous_balance = Decimal('0.00')
            reserve_fund_share = Decimal('0.00')
            net_obligation = Decimal('0.00')
            expense_share = Decimal('0.00')
            # ΝΕΑ FIELDS: Διαχωρισμός δαπανών ιδιοκτήτη/ενοίκου
            resident_expenses = Decimal('0.00')
            owner_expenses = Decimal('0.00')

            if month and end_date:
                # Για snapshot view, υπολογίζουμε previous balance και net obligation

                # ΔΙΟΡΘΩΣΗ: month_start πρέπει να είναι η αρχή του επιλεγμένου μήνα
                year, mon = map(int, month.split('-'))
                month_start = date(year, mon, 1)

                # 1. Previous Balance = οφειλές από προηγούμενους μήνες (πριν τον επιλεγμένο μήνα)
                # ΔΙΟΡΘΩΣΗ: Χρησιμοποίησε το calculated_balance που ήδη υπολογίστηκε παραπάνω
                previous_balance = calculated_balance
                
                # 1.1. Υπολογισμός previous balance διαχωρισμένο σε resident/owner
                previous_resident_expenses = Decimal('0.00')
                previous_owner_expenses = Decimal('0.00')
                
                # Βρες όλες τις δαπάνες πριν τον τρέχοντα μήνα
                previous_expenses = Expense.objects.filter(
                    building_id=apartment.building_id,
                    date__gte=self.building.financial_system_start_date or month_start,
                    date__lt=month_start
                )
                
                total_mills = total_participation_mills or 1000
                apartment_count = safe_apartment_count
                
                for expense in previous_expenses:
                    # Υπολογισμός μεριδίου διαμερίσματος
                    if expense.category == 'management_fees':
                        apartment_share = expense.amount / apartment_count
                    else:
                        apartment_share = Decimal(apartment.participation_mills) / Decimal(total_mills) * expense.amount
                    
                    # Διαχωρισμός ανά payer_responsibility
                    if expense.payer_responsibility == 'owner':
                        previous_owner_expenses += apartment_share
                    elif expense.payer_responsibility == 'shared':
                        # Αν υπάρχει split_ratio, χρησιμοποιούμε αυτό, αλλιώς 50-50
                        split_ratio = expense.split_ratio if expense.split_ratio is not None else Decimal('0.5')
                        previous_owner_expenses += apartment_share * split_ratio
                        previous_resident_expenses += apartment_share * (Decimal('1.0') - split_ratio)
                    else:  # resident
                        previous_resident_expenses += apartment_share

                # 2. Current month expense share (για net_obligation)
                month_expenses = Expense.objects.filter(
                    building_id=apartment.building_id,
                    date__gte=month_start,
                    date__lt=end_date
                )
                
                # Υπολογισμός μεριδίου διαμερίσματος από τις δαπάνες του μήνα
                current_resident_expenses = Decimal('0.00')
                current_owner_expenses = Decimal('0.00')

                for expense in month_expenses:
                    # ΔΙΟΡΘΩΣΗ: Management fees είναι ισόποσα, άλλες δαπάνες ανά χιλιοστά
                    if expense.category == 'management_fees':
                        apartment_share = expense.amount / apartment_count
                    else:
                        apartment_share = Decimal(apartment.participation_mills) / Decimal(total_mills) * expense.amount

                    expense_share += apartment_share

                    # ΝΕΟ: Διαχωρισμός ανά payer_responsibility
                    if expense.payer_responsibility == 'owner':
                        current_owner_expenses += apartment_share
                    elif expense.payer_responsibility == 'shared':
                        # Αν υπάρχει split_ratio, χρησιμοποιούμε αυτό, αλλιώς 50-50
                        split_ratio = expense.split_ratio if expense.split_ratio is not None else Decimal('0.5')
                        current_owner_expenses += apartment_share * split_ratio
                        current_resident_expenses += apartment_share * (Decimal('1.0') - split_ratio)
                    else:  # resident
                        current_resident_expenses += apartment_share
                
                # ✅ ΚΡΙΣΙΜΟ: Προσθήκη previous στα totals για UI display!
                resident_expenses = previous_resident_expenses + current_resident_expenses
                owner_expenses = previous_owner_expenses + current_owner_expenses
                
                # ✅ ΔΙΟΡΘΩΣΗ: Υπολογισμός reserve_fund_share ξεχωριστά
                # Ψάχνουμε για Expense records με category='reserve_fund' για τον μήνα
                reserve_fund_expenses = month_expenses.filter(category='reserve_fund')
                if reserve_fund_expenses.exists():
                    # Αν υπάρχουν Expense records, υπολογίζουμε το μερίδιο από αυτά
                    for reserve_expense in reserve_fund_expenses:
                        # Reserve fund καταμερίζεται ανά χιλιοστά (όχι ισόποσα)
                        reserve_share = (
                            Decimal(apartment.participation_mills or 0) / Decimal(total_mills)
                        ) * reserve_expense.amount
                        reserve_fund_share += reserve_share
                elif self.building.reserve_fund_start_date:
                    # Αν δεν υπάρχουν Expense records, υπολογίζουμε δυναμικά από Building settings
                    # month_start έχει ήδη υπολογιστεί παραπάνω (γραμμή 1114)
                    if (month_start >= self.building.reserve_fund_start_date and
                        (not self.building.reserve_fund_target_date or month_start <= self.building.reserve_fund_target_date)):
                        
                        monthly_reserve_target = self._get_reserve_fund_monthly_target(apartment_count)
                        if monthly_reserve_target > 0:
                            if total_mills > 0:
                                reserve_share = (
                                    Decimal(apartment.participation_mills or 0) / Decimal(total_mills)
                                ) * monthly_reserve_target
                            else:
                                reserve_share = Decimal(monthly_reserve_target) / Decimal(apartment_count)
                            
                            reserve_fund_share += reserve_share
                            # ✅ Προσθήκη reserve_fund_share στο owner_expenses για σωστή εμφάνιση
                            current_owner_expenses += reserve_share
                            owner_expenses += reserve_share
                            # ✅ Πρέπει να ενσωματώνεται στα συνολικά έξοδα του μήνα (expense_share)
                            expense_share += reserve_share
                
                # ✅ ΔΙΟΡΘΩΣΗ 2025-10-10: Management fees & Reserve fund είναι ΗΔΗ Expense records!
                # ΣΗΜΕΙΩΣΗ: Αν το reserve fund υπολογίζεται δυναμικά (χωρίς Expense records),
                # προστίθεται στο owner_expenses παραπάνω
                # Δεν χρειάζεται δυναμική προσθήκη - περιλαμβάνονται στο loop παραπάνω (γραμμές 1073-1089)
                # Αφαιρέθηκε η διπλή χρέωση management fees & reserve fund
                
                # 3. Υπολογισμός πληρωμών του μήνα
                month_payments = Payment.objects.filter(
                    apartment=apartment,
                    date__gte=month_start,
                    date__lt=end_date
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                # 4. Net Obligation = Previous Balance + Current Month Expenses - Payments this month
                # Το expense_share ΗΔΗ περιλαμβάνει ΟΛΑ (management fees + reserve fund + άλλες δαπάνες)
                net_obligation = previous_balance + expense_share - month_payments
                
                print(f"📊 Apartment {apartment.number} - {month}:")
                print(f"   Previous Balance: €{previous_balance:.2f}")
                print(f"   Current Month Expenses: €{expense_share:.2f}")
                print(f"   Reserve Fund Share: €{reserve_fund_share:.2f}")
                print(f"   Payments This Month: €{month_payments:.2f}")
                print(f"   Net Obligation: €{net_obligation:.2f}")
            else:
                # ✅ ΔΙΟΡΘΩΣΗ: Για current view (χωρίς month), υπολογίζουμε reserve_fund_share για τον τρέχοντα μήνα
                from datetime import date
                today = date.today()
                current_month_start = date(today.year, today.month, 1)
                
                # Ψάχνουμε για Expense records με category='reserve_fund' για τον τρέχοντα μήνα
                current_month_expenses = Expense.objects.filter(
                    building_id=apartment.building_id,
                    date__gte=current_month_start,
                    date__lt=end_date if end_date else date(today.year, today.month + 1, 1) if today.month < 12 else date(today.year + 1, 1, 1)
                )
                
                total_mills_current = total_participation_mills or 1000
                apartment_count_current = safe_apartment_count
                
                # ✅ ΔΙΟΡΘΩΣΗ: Για current view, υπολογίζουμε owner_expenses και resident_expenses από Expense records
                if not month and not end_date:
                    current_owner_expenses_current = Decimal('0.00')
                    current_resident_expenses_current = Decimal('0.00')
                    
                    for expense in current_month_expenses:
                        if expense.category == 'management_fees':
                            apartment_share = expense.amount / apartment_count_current
                        else:
                            apartment_share = Decimal(apartment.participation_mills) / Decimal(total_mills_current) * expense.amount
                        
                        if expense.payer_responsibility == 'owner':
                            current_owner_expenses_current += apartment_share
                        elif expense.payer_responsibility == 'shared':
                            split_ratio = expense.split_ratio if expense.split_ratio is not None else Decimal('0.5')
                            current_owner_expenses_current += apartment_share * split_ratio
                            current_resident_expenses_current += apartment_share * (Decimal('1.0') - split_ratio)
                        else:  # resident
                            current_resident_expenses_current += apartment_share
                    
                    owner_expenses = current_owner_expenses_current
                    resident_expenses = current_resident_expenses_current
                
                # ✅ Υπολογισμός reserve_fund_share για current view
                reserve_fund_expenses_current = current_month_expenses.filter(category='reserve_fund')
                if reserve_fund_expenses_current.exists():
                    # Αν υπάρχουν Expense records, υπολογίζουμε το μερίδιο από αυτά
                    for reserve_expense in reserve_fund_expenses_current:
                        reserve_share = Decimal(apartment.participation_mills) / Decimal(total_mills_current) * reserve_expense.amount
                        reserve_fund_share += reserve_share
                    # ΣΗΜΕΙΩΣΗ: Αν υπάρχουν Expense records, το reserve_fund_share περιλαμβάνεται ήδη στο owner_expenses
                    # μέσω του loop παραπάνω, οπότε ΔΕΝ χρειάζεται να το προσθέσουμε ξανά
                elif self.building.reserve_fund_start_date:
                    # Αν δεν υπάρχουν Expense records, υπολογίζουμε δυναμικά από Building settings
                    if (current_month_start >= self.building.reserve_fund_start_date and
                        (not self.building.reserve_fund_target_date or current_month_start <= self.building.reserve_fund_target_date)):
                        
                        monthly_reserve_target = self._get_reserve_fund_monthly_target(apartment_count_current)
                        if monthly_reserve_target > 0:
                            if total_mills_current > 0:
                                reserve_share = (
                                    Decimal(apartment.participation_mills or 0) / Decimal(total_mills_current)
                                ) * monthly_reserve_target
                            else:
                                reserve_share = Decimal(monthly_reserve_target) / Decimal(apartment_count_current)
                            
                            reserve_fund_share += reserve_share
                            
                            # ✅ Προσθήκη reserve_fund_share στο owner_expenses (μόνο αν υπολογίστηκε δυναμικά)
                            if not month and not end_date:
                                owner_expenses += reserve_share
                            
                            # ✅ Το fallback αποθεματικού πρέπει να μετράει στις δαπάνες μήνα
                            expense_share += reserve_share
            
            # ΔΙΟΡΘΩΣΗ: Υπολογισμός total_payments για κάθε διαμέρισμα
            if end_date:
                # Για historical view, μόνο πληρωμές μέχρι την ημερομηνία
                apartment_payments = apartment.payments.filter(date__lt=end_date)
            else:
                # Για current view, όλες οι πληρωμές
                apartment_payments = apartment.payments.all()
                
            total_payments_apartment = apartment_payments.aggregate(
                total=Sum('amount'))['total'] or Decimal('0.00')

            balances.append({
                'id': apartment.id,
                'apartment_id': apartment.id,
                'number': apartment.number,
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name or 'Άγνωστος',
                'tenant_name': apartment.tenant_name or None,
                'current_balance': calculated_balance,
                'previous_balance': previous_balance,  # ← ΝΕΟ FIELD
                'reserve_fund_share': reserve_fund_share,  # ← ΝΕΟ FIELD - Αποθεματικό
                'expense_share': expense_share,        # ← ΝΕΟ FIELD
                # ΝΕΑ FIELDS: Διαχωρισμός δαπανών ιδιοκτήτη/ενοίκου
                'resident_expenses': resident_expenses,  # Δαπάνες Ενοίκου
                'owner_expenses': owner_expenses,        # Δαπάνες Ιδιοκτήτη
                'net_obligation': net_obligation,      # ← ΝΕΟ FIELD
                'total_payments': total_payments_apartment,  # ← ΝΕΟ FIELD - Διόρθωση!
                'participation_mills': apartment.participation_mills or 0,
                'status': status,
                'last_payment_date': last_payment.date if last_payment else None,
                'last_payment_amount': last_payment.amount if last_payment else None
            })
        
        return balances
    
    # ❌ DELETED: _calculate_historical_balance() method (was ~197 lines, 1209-1404)
    # This duplicate implementation has been removed as part of the Single Source of Truth refactoring.
    # All historical balance calculations now use:
    #   from financial.balance_service import BalanceCalculationService
    #   BalanceCalculationService.calculate_historical_balance(apartment, end_date, include_management_fees=True)
    # See: financial-module-refactoring.plan.md (Phase 2.1)
    # Refactored: 2025-10-10
    
    def get_payment_statistics(self, month: str | None = None) -> Dict[str, Any]:
        """Υπολογισμός στατιστικών πληρωμών"""
        from django.db.models import Count, Avg
        from datetime import date
        
        # Όλες οι πληρωμές
        payments = Payment.objects.filter(apartment__building_id=self.building_id)
        
        # Φιλτράρισμα ανά μήνα αν δοθεί
        if month:
            try:
                year, mon = map(int, month.split('-'))
                start_date = date(year, mon, 1)
                if mon == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, mon + 1, 1)
                payments = payments.filter(date__gte=start_date, date__lt=end_date)
            except Exception:
                # Fallback to all payments if month parsing fails
                pass
        
        # Συνολικές πληρωμές
        total_payments_count = payments.count()
        total_payments_amount = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Μέση πληρωμή
        average_payment = payments.aggregate(avg=Avg('amount'))['avg'] or Decimal('0.00')
        
        # Κατανομή ανά τρόπο πληρωμής
        payment_methods = payments.values('method').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        payment_methods_data = []
        for method_data in payment_methods:
            method_label = dict(Payment.PAYMENT_METHODS).get(method_data['method'], method_data['method'])
            payment_methods_data.append({
                'method': method_label,
                'count': method_data['count'],
                'total': float(method_data['total'])
            })
        
        return {
            'total_payments': total_payments_count,
            'total_amount': float(total_payments_amount),
            'average_payment': float(average_payment),
            'payment_methods': payment_methods_data
        }

    def get_expense_breakdown(self, month: str | None = None) -> List[Dict[str, Any]]:
        """Επιστρέφει αναλυτική κατανομή δαπανών ανά κατηγορία για τον συγκεκριμένο μήνα

        Args:
            month: Μήνας σε μορφή YYYY-MM

        Returns:
            List με dictionaries που περιέχουν category, category_display, amount
        """
        from datetime import date

        if month:
            try:
                year, mon = map(int, month.split('-'))
                start_date = date(year, mon, 1)
                if mon == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, mon + 1, 1)
            except Exception:
                # Fallback to current month
                now = timezone.now()
                start_date = date(now.year, now.month, 1)
                if now.month == 12:
                    end_date = date(now.year + 1, 1, 1)
                else:
                    end_date = date(now.year, now.month + 1, 1)
        else:
            # Current month
            now = timezone.now()
            start_date = date(now.year, now.month, 1)
            if now.month == 12:
                end_date = date(now.year + 1, 1, 1)
            else:
                end_date = date(now.year, now.month + 1, 1)

        # Φιλτράρισμα δαπανών για τον συγκεκριμένο μήνα
        # Εξαιρούμε management_fees και reserve_fund γιατί αυτές εμφανίζονται ξεχωριστά
        expenses = Expense.objects.filter(
            building_id=self.building_id,
            date__gte=start_date,
            date__lt=end_date
        ).exclude(
            category__in=['management_fees', 'reserve_fund']
        ).values('category', 'payer_responsibility').annotate(
            total_amount=Sum('amount')
        ).order_by('-total_amount')

        # Δημιουργία λίστας με αναλυτικές δαπάνες
        breakdown = []
        for expense in expenses:
            category = expense['category']
            # Παίρνουμε το display name από το model
            category_display = dict(Expense.EXPENSE_CATEGORIES).get(category, category.upper())
            
            # Χρήση πραγματικού payer_responsibility αν υπάρχει, αλλιώς fallback στο default mapping
            payer = expense.get('payer_responsibility') or Expense.get_default_payer_for_category(category) or 'resident'

            breakdown.append({
                'category': category,
                'category_display': category_display,
                'amount': float(expense['total_amount']),
                'payer_responsibility': payer  # 'resident', 'owner', ή 'shared'
            })

        return breakdown

    def _get_reserve_fund_monthly_target(self, apartment_count: int) -> Decimal:
        """
        Υπολογίζει το συνολικό μηνιαίο ποσό που πρέπει να συλλεχθεί για το αποθεματικό.
        Υποστηρίζει τόσο στόχο/διάρκεια όσο και σταθερή εισφορά ανά διαμέρισμα.
        """
        contribution_per_apartment = self.building.reserve_contribution_per_apartment or Decimal('0.00')
        if self.building.reserve_fund_goal and self.building.reserve_fund_duration_months:
            duration = max(self.building.reserve_fund_duration_months, 1)
            goal = self.building.reserve_fund_goal or Decimal('0.00')
            return goal / Decimal(duration)
        if contribution_per_apartment > 0 and apartment_count > 0:
            return contribution_per_apartment * Decimal(apartment_count)
        return Decimal('0.00')


class PaymentProcessor:
    """Υπηρεσία για την επεξεργασία εισπράξεων"""
    
    @staticmethod
    def process_payment(payment_data: Dict[str, Any]) -> Transaction:
        """
        Επεξεργασία εισπράξεως και ενημέρωση συστήματος
        """
        
        # 1. Ενημέρωση υπόλοιπου διαμερίσματος
        apartment = Apartment.objects.get(id=payment_data['apartment_id'])
        apartment.current_balance += payment_data['amount']
        apartment.save()
        
        # 2. Προσθήκη στο τρέχον αποθεματικό
        building = apartment.building
        building.current_reserve += payment_data['amount']
        building.save()
        
        # 3. Δημιουργία εγγραφής κίνησης
        transaction = Transaction.objects.create(
            building=building,
            date=timezone.now(),
            type='common_expense_payment',
            description=f"Είσπραξη Κοινοχρήστων - {apartment.number}",
            apartment_number=apartment.number,
            amount=payment_data['amount'],
            balance_after=building.current_reserve,
            receipt=payment_data.get('receipt')
        )
        
        # 4. Δημιουργία εγγραφής εισπράξεως
        Payment.objects.create(
            apartment=apartment,
            amount=payment_data['amount'],
            date=payment_data['date'],
            method=payment_data['method'],
            notes=payment_data.get('notes', ''),
            receipt=payment_data.get('receipt')
        )
        
        return transaction 


class ReportService:
    """Service για τη δημιουργία αναφορών και exports"""
    
    def __init__(self, building_id):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
    
    def generate_transaction_history_report(self, start_date=None, end_date=None, transaction_type=None, apartment_id=None):
        """Δημιουργία αναφοράς ιστορικού κινήσεων"""
        from financial.serializers import TransactionSerializer
        
        queryset = Transaction.objects.filter(building_id=self.building_id)
        
        if start_date:
            queryset = queryset.filter(date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__date__lte=end_date)
        if transaction_type:
            queryset = queryset.filter(type=transaction_type)
        if apartment_id:
            queryset = queryset.filter(apartment_id=apartment_id)
        
        # Serialize the queryset
        serializer = TransactionSerializer(queryset.order_by('-date'), many=True)
        return serializer.data
    
    def generate_apartment_balance_report(self, apartment_id=None):
        """Δημιουργία αναφοράς κατάστασης οφειλών"""
        
        apartments = Apartment.objects.filter(building_id=self.building_id)
        
        if apartment_id:
            apartments = apartments.filter(id=apartment_id)
        
        balance_data = []
        for apartment in apartments:
            # Υπολογισμός τρέχοντος υπολοίπου
            payments = Payment.objects.filter(apartment=apartment)
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or 0
            
            # Υπολογισμός συνολικών χρεώσεων από κοινοχρήστους
            transactions = Transaction.objects.filter(
                apartment_number=apartment.number,
                type__in=['common_expense_charge', 'expense_payment']
            )
            total_charges = transactions.aggregate(total=Sum('amount'))['total'] or 0
            
            current_balance = total_charges - total_payments
            
            # Υπολογισμός κατάστασης βασισμένη στο υπόλοιπο
            if current_balance > 0:
                if current_balance > 100:  # More than 100€ debt
                    status = 'Κρίσιμο'
                elif current_balance > 50:  # More than 50€ debt
                    status = 'Οφειλή'
                else:
                    status = 'Ενεργό'
            elif current_balance < 0:
                status = 'Πιστωτικό'
            else:
                status = 'Ενεργό'
            
            balance_data.append({
                'apartment': apartment,
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name,
                'participation_mills': apartment.participation_mills,
                'total_charges': total_charges,
                'total_payments': total_payments,
                'current_balance': current_balance,
                'status': status,
                'last_payment_date': payments.order_by('-date').first().date if payments.exists() else None,
                'last_payment_amount': payments.order_by('-date').first().amount if payments.exists() else None,
            })
        
        return balance_data

    
    def generate_financial_summary_report(self, period='month'):
        """Δημιουργία οικονομικής σύνοψης"""
        from datetime import timedelta
        
        if period == 'month':
            start_date = timezone.now().replace(day=1)
        elif period == 'quarter':
            current_month = timezone.now().month
            quarter_start_month = ((current_month - 1) // 3) * 3 + 1
            start_date = timezone.now().replace(month=quarter_start_month, day=1)
        elif period == 'yearly':
            start_date = timezone.now().replace(month=1, day=1)
        else:
            start_date = timezone.now() - timedelta(days=30)
        
        end_date = timezone.now()
        
        # Στατιστικά δαπανών
        expenses = Expense.objects.filter(
            building_id=self.building_id,
            date__range=[start_date, end_date]
        )
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        # Στατιστικά εισπράξεων
        payments = Payment.objects.filter(
            apartment__building_id=self.building_id,
            date__range=[start_date, end_date]
        )
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or 0
        
        # Στατιστικά κινήσεων
        transactions = Transaction.objects.filter(
            building_id=self.building_id,
            date__range=[start_date, end_date]
        )
        
        # Κατανομή ανά κατηγορία δαπάνης
        expense_by_category = {}
        for expense in expenses:
            category = expense.get_category_display()
            if category not in expense_by_category:
                expense_by_category[category] = 0
            expense_by_category[category] += float(expense.amount)
        
        # Κατανομή ανά τρόπο εισπράξεως
        payment_by_method = {}
        for payment in payments:
            method = payment.get_method_display()
            if method not in payment_by_method:
                payment_by_method[method] = 0
            payment_by_method[method] += float(payment.amount)
        
        return {
            'period': period,
            'start_date': start_date,
            'end_date': end_date,
            'total_expenses': total_expenses,
            'total_payments': total_payments,
            'net_cash_flow': total_payments - total_expenses,
            'expense_by_category': expense_by_category,
            'payment_by_method': payment_by_method,
            'transaction_count': transactions.count(),
            'expense_count': expenses.count(),
            'payment_count': payments.count(),
        }
    
    def generate_cash_flow_data(self, days=30):
        """Δημιουργία δεδομένων ταμειακής ροής για γραφήματα"""
        from datetime import timedelta
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Δημιουργία ημερολογίου
        date_list = []
        current_date = start_date
        while current_date <= end_date:
            date_list.append(current_date.date())
            current_date += timedelta(days=1)
        
        # Στατιστικά ανά ημέρα
        cash_flow_data = []
        for date in date_list:
            # Εισροές (εισπράξεις)
            payments = Payment.objects.filter(
                apartment__building_id=self.building_id,
                date=date
            )
            total_inflow = payments.aggregate(total=Sum('amount'))['total'] or 0
            
            # Εκροές (δαπάνες)
            expenses = Expense.objects.filter(
                building_id=self.building_id,
                date=date
            )
            total_outflow = expenses.aggregate(total=Sum('amount'))['total'] or 0
            
            cash_flow_data.append({
                'date': date,
                'inflow': float(total_inflow),
                'outflow': float(total_outflow),
                'net_flow': float(total_inflow - total_outflow),
            })
        
        return cash_flow_data
    
    def export_to_excel(self, report_type, **kwargs):
        """Εξαγωγή αναφοράς σε Excel"""
        import pandas as pd
        from io import BytesIO
        
        if report_type == 'transaction_history':
            data = self.generate_transaction_history_report(**kwargs)
            df = pd.DataFrame(list(data.values()))
            filename = f'transaction_history_{self.building.name}_{timezone.now().strftime("%Y%m%d")}.xlsx'
        
        elif report_type == 'apartment_balances':
            data = self.generate_apartment_balance_report(**kwargs)
            df = pd.DataFrame(data)
            filename = f'apartment_balances_{self.building.name}_{timezone.now().strftime("%Y%m%d")}.xlsx'
        
        elif report_type == 'financial_summary':
            data = self.generate_financial_summary_report(**kwargs)
            df = pd.DataFrame([data])
            filename = f'financial_summary_{self.building.name}_{timezone.now().strftime("%Y%m%d")}.xlsx'
        
        else:
            raise ValueError(f"Unknown report type: {report_type}")
        
        # Δημιουργία Excel file
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Report', index=False)
        
        output.seek(0)
        return output, filename
    
    def generate_pdf_report(self, report_type, **kwargs):
        """Δημιουργία PDF αναφοράς"""
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from io import BytesIO
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        
        # Στυλ
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center
        )
        
        # Τίτλος
        title = Paragraph(f"Αναφορά: {self.building.name}", title_style)
        elements.append(title)
        elements.append(Spacer(1, 20))
        
        if report_type == 'transaction_history':
            data = self.generate_transaction_history_report(**kwargs)
            # Δημιουργία πίνακα κινήσεων
            table_data = [['Ημερομηνία', 'Τύπος', 'Περιγραφή', 'Ποσό', 'Υπόλοιπο']]
            for transaction in data:
                table_data.append([
                    transaction.date.strftime('%d/%m/%Y'),
                    transaction.get_type_display(),
                    transaction.description[:50] + '...' if len(transaction.description) > 50 else transaction.description,
                    f"€{transaction.amount}",
                    f"€{transaction.balance_after}"
                ])
        
        elif report_type == 'apartment_balances':
            data = self.generate_apartment_balance_report(**kwargs)
            # Δημιουργία πίνακα οφειλών
            table_data = [['Διαμέρισμα', 'Ιδιοκτήτης', 'Χιλιοστά', 'Οφειλή', 'Τελευταία Είσπραξη']]
            for item in data:
                table_data.append([
                    item['apartment_number'],
                    item['owner_name'],
                    item['participation_mills'],
                    f"€{item['current_balance']}",
                    item['last_payment_date'].strftime('%d/%m/%Y') if item['last_payment_date'] else '-'
                ])
        
        # Δημιουργία πίνακα
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        
        # Δημιουργία PDF
        doc.build(elements)
        buffer.seek(0)
        
        filename = f"{report_type}_{self.building.name}_{timezone.now().strftime('%Y%m%d')}.pdf"
        return buffer, filename 


class FileUploadService:
    """Service για τη διαχείριση file uploads με ασφάλεια και validation"""
    
    ALLOWED_EXTENSIONS = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_FILES_PER_EXPENSE = 5
    
    @classmethod
    def validate_file(cls, file: UploadedFile) -> dict:
        """Επιβεβαίωση αρχείου για ασφάλεια και έγκυροτητα"""
        errors = []
        
        # Έλεγχος μεγέθους
        if file.size > cls.MAX_FILE_SIZE:
            errors.append(f"Το αρχείο '{file.name}' είναι πολύ μεγάλο. Μέγιστο μέγεθος: {cls.MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Έλεγχος επέκτασης
        file_extension = file.name.split('.')[-1].lower() if '.' in file.name else ''
        if file_extension not in cls.ALLOWED_EXTENSIONS:
            errors.append(f"Η επέκταση '{file_extension}' δεν επιτρέπεται. Επιτρεπόμενες: {', '.join(cls.ALLOWED_EXTENSIONS.keys())}")
        
        # Έλεγχος MIME type
        try:
            mime_type = magic.from_buffer(file.read(1024), mime=True)
            file.seek(0)  # Reset file pointer
            
            expected_mime = cls.ALLOWED_EXTENSIONS.get(file_extension)
            if expected_mime and mime_type != expected_mime:
                errors.append(f"Το αρχείο '{file.name}' έχει μη έγκυρο τύπο MIME: {mime_type}")
        except Exception as e:
            errors.append(f"Δεν ήταν δυνατή η επαλήθευση του τύπου αρχείου: {str(e)}")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'file_extension': file_extension,
            'mime_type': mime_type if 'mime_type' in locals() else None,
            'file_size': file.size
        }
    
    @classmethod
    def generate_safe_filename(cls, original_filename: str, expense_id: int = None) -> str:
        """Δημιουργία ασφαλούς ονόματος αρχείου"""
        # Αφαίρεση επεκτάσεων και ειδικών χαρακτήρων
        name, ext = os.path.splitext(original_filename)
        safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_')
        
        # Προσθήκη UUID για μοναδικότητα
        unique_id = str(uuid.uuid4())[:8]
        
        # Προσθήκη expense_id αν υπάρχει
        if expense_id:
            filename = f"expense_{expense_id}_{safe_name}_{unique_id}{ext}"
        else:
            filename = f"{safe_name}_{unique_id}{ext}"
        
        return filename.lower()
    
    @classmethod
    def get_upload_path(cls, expense_id: int, filename: str) -> str:
        """Δημιουργία path για το upload"""
        return f"expenses/{expense_id}/{filename}"
    
    @classmethod
    def save_file(cls, file: UploadedFile, expense_id: int) -> str:
        """Αποθήκευση αρχείου με ασφάλεια"""
        # Επιβεβαίωση αρχείου
        validation = cls.validate_file(file)
        if not validation['is_valid']:
            raise ValidationError(validation['errors'])
        
        # Δημιουργία ασφαλούς ονόματος
        safe_filename = cls.generate_safe_filename(file.name, expense_id)
        upload_path = cls.get_upload_path(expense_id, safe_filename)
        
        # Δημιουργία directory αν δεν υπάρχει
        full_path = os.path.join(settings.MEDIA_ROOT, upload_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Αποθήκευση αρχείου
        with open(full_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        return upload_path 


class CommonExpenseAutomationService:
    """Υπηρεσία για αυτοματισμούς κοινοχρήστων"""
    
    PERIOD_TEMPLATES = {
        'monthly': {
            'name': 'Κοινοχρήστα {month_name} {year}',
            'months': 1
        },
        'quarterly': {
            'name': 'Κοινοχρήστα Q{quarter} {year}',
            'months': 3
        },
        'semester': {
            'name': 'Κοινοχρήστα {semester} {year}',
            'months': 6
        },
        'yearly': {
            'name': 'Κοινοχρήστα {year}',
            'months': 12
        }
    }
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
    
    def create_period_automatically(self, period_type: str = 'monthly', start_date: str = None) -> CommonExpensePeriod:
        """
        Αυτόματη δημιουργία περιόδου κοινοχρήστων
        
        Args:
            period_type: 'monthly', 'quarterly', 'semester', 'yearly'
            start_date: Ημερομηνία έναρξης (YYYY-MM-DD). Αν None, χρησιμοποιείται η τρέχουσα.
        
        Returns:
            CommonExpensePeriod: Η δημιουργηθείσα περίοδος
        """
        from datetime import date, timedelta
        
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start = date.today().replace(day=1)  # Πρώτη ημέρα του τρέχοντος μήνα
        
        template = self.PERIOD_TEMPLATES.get(period_type, self.PERIOD_TEMPLATES['monthly'])

        # Υπολογισμός τέλους περιόδου χωρίς εξάρτηση από dateutil
        def add_months_first_day(d: date, months: int) -> date:
            total_month = d.month - 1 + months
            year = d.year + total_month // 12
            month = total_month % 12 + 1
            return date(year, month, 1)

        first_day_next_period = add_months_first_day(start, template['months'])
        end = first_day_next_period - timedelta(days=1)
        
        # Δημιουργία ονόματος περιόδου
        if period_type == 'monthly':
            period_name = template['name'].format(
                month_name=start.strftime('%B'),
                year=start.year
            )
        elif period_type == 'quarterly':
            quarter = (start.month - 1) // 3 + 1
            period_name = template['name'].format(
                quarter=quarter,
                year=start.year
            )
        elif period_type == 'semester':
            semester = '1ο' if start.month <= 6 else '2ο'
            period_name = template['name'].format(
                semester=semester,
                year=start.year
            )
        else:  # yearly
            period_name = template['name'].format(year=start.year)
        
        # Έλεγχος αν υπάρχει ήδη περίοδος
        existing_period = CommonExpensePeriod.objects.filter(
            building_id=self.building_id,
            period_name=period_name
        ).first()
        
        if existing_period:
            return existing_period
        
        # Δημιουργία νέας περιόδου
        period = CommonExpensePeriod.objects.create(
            building_id=self.building_id,
            period_name=period_name,
            start_date=start,
            end_date=end
        )
        
        return period
    
    def collect_expenses_for_period(self, period: CommonExpensePeriod) -> List[Expense]:
        """
        Αυτόματη συλλογή δαπανών για την περίοδο
        
        Args:
            period: CommonExpensePeriod object
            
        Returns:
            List[Expense]: Λίστα δαπανών που ανήκουν στην περίοδο
        """
        expenses = Expense.objects.filter(
            building_id=self.building_id,
            date__gte=period.start_date,
            date__lte=period.end_date
        ).order_by('date')
        
        return list(expenses)
    
    def calculate_shares_for_period(self, period: CommonExpensePeriod, expenses: List[Expense] = None) -> Dict[str, Any]:
        """
        Αυτόματος υπολογισμός μεριδίων για την περίοδο
        
        Args:
            period: CommonExpensePeriod object
            expenses: Λίστα δαπανών (αν None, συλλέγονται αυτόματα)
            
        Returns:
            Dict με τα μερίδια και στατιστικά
        """
        if expenses is None:
            expenses = self.collect_expenses_for_period(period)
        
        if not expenses:
            return {
                'shares': {},
                'total_expenses': 0.0,
                'apartments_count': 0,
                'period': period.period_name
            }
        
        # Χρήση του υπάρχοντος calculator
        calculator = CommonExpenseCalculator(self.building_id)
        
        # Προσωρινή ενημέρωση των δαπανών για τον υπολογισμό
        original_expenses = calculator.expenses
        calculator.expenses = expenses
        
        try:
            shares = calculator.calculate_shares()
            total_expenses = float(calculator.get_total_expenses())
            apartments_count = calculator.get_apartments_count()
            
            return {
                'shares': shares,
                'total_expenses': total_expenses,
                'apartments_count': apartments_count,
                'period': period.period_name,
                'expenses_count': len(expenses)
            }
        finally:
            # Επαναφορά των αρχικών δαπανών
            calculator.expenses = original_expenses
    
    def issue_period_automatically(self, period: CommonExpensePeriod, expenses: List[Expense] = None) -> Dict[str, Any]:
        """
        Αυτόματη έκδοση λογαριασμών για την περίοδο
        
        Args:
            period: CommonExpensePeriod object
            expenses: Λίστα δαπανών (αν None, συλλέγονται αυτόματα)
            
        Returns:
            Dict με τα αποτελέσματα της έκδοσης
        """
        
        if expenses is None:
            expenses = self.collect_expenses_for_period(period)
        
        if not expenses:
            return {
                'success': False,
                'message': 'Δεν βρέθηκαν δαπάνες για έκδοση',
                'period_id': period.id
            }
        
        # Υπολογισμός μεριδίων
        calculation_result = self.calculate_shares_for_period(period, expenses)
        shares = calculation_result['shares']
        
        if not shares:
            return {
                'success': False,
                'message': 'Δεν μπόρεσαν να υπολογιστούν μερίδια',
                'period_id': period.id
            }
        
        # Δημιουργία μεριδίων για κάθε διαμέρισμα
        apartment_shares = []
        total_amount = Decimal('0.00')
        
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            previous_balance = apartment.current_balance or Decimal('0.00')
            share_amount = Decimal(str(share_data.get('total_amount', 0)))
            # Χρέωση αυξάνει την οφειλή => πιο αρνητικό υπόλοιπο
            total_due = previous_balance - share_amount
            
            share = ApartmentShare.objects.create(
                period=period,
                apartment=apartment,
                total_amount=share_amount,
                previous_balance=previous_balance,
                total_due=total_due,
                breakdown=share_data.get('breakdown', {})
            )
            apartment_shares.append(share)
            total_amount += share_amount
            
            # Δημιουργία κίνησης ταμείου
            Transaction.objects.create(
                building_id=self.building_id,
                date=timezone.now(),
                type='common_expense_charge',
                description=f'Χρέωση κοινοχρήστων - {period.period_name}',
                apartment_number=apartment.number,
                amount=-share_amount,  # αρνητική κίνηση για χρέωση
                balance_before=previous_balance,
                balance_after=total_due,
                reference_id=str(period.id),
                reference_type='common_expense_period'
            )

            # Ενημέρωση υπολοίπου διαμερίσματος using BalanceCalculationService
            from .balance_service import BalanceCalculationService
            BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)
        
        # Σημείωση: Οι δαπάνες θεωρούνται αυτόματα εκδομένες
        # Δεν χρειάζεται πλέον μαρκάρισμα ως εκδοθείσες
        
        return {
            'success': True,
            'message': f'Τα κοινοχρήστα εκδόθηκαν επιτυχώς για την περίοδο {period.period_name}',
            'period_id': period.id,
            'apartments_count': len(apartment_shares),
            'total_amount': float(total_amount),
            'expenses_count': len(expenses)
        }
    
    def auto_process_period(self, period_type: str = 'monthly', start_date: str = None) -> Dict[str, Any]:
        """
        Πλήρης αυτοματοποιημένη επεξεργασία περιόδου
        
        Args:
            period_type: Τύπος περιόδου ('monthly', 'quarterly', 'semester', 'yearly')
            start_date: Ημερομηνία έναρξης (αν None, τρέχουσα)
            
        Returns:
            Dict με τα αποτελέσματα της επεξεργασίας
        """
        try:
            # 1. Αυτόματη δημιουργία περιόδου
            period = self.create_period_automatically(period_type, start_date)
            
            # 2. Αυτόματη συλλογή δαπανών
            expenses = self.collect_expenses_for_period(period)
            
            if not expenses:
                return {
                    'success': False,
                    'message': f'Δεν βρέθηκαν δαπάνες για την περίοδο {period.period_name}',
                    'period_id': period.id,
                    'expenses_count': 0
                }
            
            # 3. Αυτόματη έκδοση
            result = self.issue_period_automatically(period, expenses)
            
            return {
                **result,
                'period_name': period.period_name,
                'start_date': period.start_date,
                'end_date': period.end_date
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Σφάλμα κατά την αυτοματοποιημένη επεξεργασία: {str(e)}',
                'error': str(e)
            }
    
    def get_period_statistics(self, period: CommonExpensePeriod) -> Dict[str, Any]:
        """
        Στατιστικά για την περίοδο
        
        Args:
            period: CommonExpensePeriod object
            
        Returns:
            Dict με στατιστικά
        """
        expenses = self.collect_expenses_for_period(period)
        shares = ApartmentShare.objects.filter(period=period)
        
        total_expenses = sum(exp.amount for exp in expenses)
        total_shares = sum(share.total_amount for share in shares)
        paid_shares = sum(share.total_amount for share in shares if share.total_due <= 0)
        
        return {
            'period_name': period.period_name,
            'start_date': period.start_date,
            'end_date': period.end_date,
            'expenses_count': len(expenses),
            'total_expenses': float(total_expenses),
            'apartments_count': shares.count(),
            'total_shares': float(total_shares),
            'paid_shares': float(paid_shares),
            'unpaid_shares': float(total_shares - paid_shares),
            'payment_rate': float(paid_shares / total_shares * 100) if total_shares > 0 else 0
        } 


class AdvancedCommonExpenseCalculator:
    """
    Προηγμένος υπολογιστής κοινοχρήστων σύμφωνα με το TODO αρχείο.
    Υλοποιεί τον πλήρη αλγόριθμο με όλες τις κατηγορίες δαπανών.
    """
    
    def __init__(self, building_id: int, period_start_date: str = None, period_end_date: str = None, reserve_fund_monthly_total: Optional[Decimal] = None, heating_type: str = None, heating_fixed_percentage: int = None):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.period_start_date = None
        self.period_end_date = None
        
        # Φιλτράρισμα δαπανών ανά περίοδο
        if period_start_date and period_end_date:
            from datetime import datetime
            start_date = datetime.strptime(period_start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(period_end_date, '%Y-%m-%d').date()
            # Αποθήκευση για χρήση στους υπολογισμούς ιστορικών υπολοίπων
            self.period_start_date = start_date
            self.period_end_date = end_date
            self.expenses = Expense.objects.filter(
                building_id=building_id,
                date__gte=start_date,
                date__lte=end_date
            )
        else:
            self.expenses = Expense.objects.filter(
                building_id=building_id
            )
        
        # Παράμετροι υπολογισμού θέρμανσης - χρήση από το κτίριο
        if heating_type is not None:
            # Backward compatibility: αν παρέχεται παράμετρος, χρησιμοποίησέ την
            self.heating_type = 'autonomous' if heating_type == 'autonomous' else 'central'
        else:
            # Χρήση του νέου πεδίου από το κτίριο
            if self.building.heating_system == Building.HEATING_SYSTEM_CONVENTIONAL:
                self.heating_type = 'central'
            elif self.building.heating_system in [Building.HEATING_SYSTEM_HOUR_METERS, Building.HEATING_SYSTEM_HEAT_METERS]:
                self.heating_type = 'autonomous'
            else:
                self.heating_type = 'none'  # Χωρίς θέρμανση
        
        if heating_fixed_percentage is not None:
            # Backward compatibility: αν παρέχεται παράμετρος, χρησιμοποίησέ την
            self.heating_fixed_percentage = Decimal(str(heating_fixed_percentage)) / Decimal('100')
        else:
            # Χρήση του πεδίου από το κτίριο
            self.heating_fixed_percentage = Decimal(str(self.building.heating_fixed_percentage)) / Decimal('100')
        
        # Συνολική μηνιαία εισφορά αποθεματικού για όλο το κτίριο (όχι ανά διαμέρισμα)
        # 1) Αν δοθεί  expl. από το frontend, το χρησιμοποιούμε
        # 2) Αλλιώς, αντλούμε από το FinancialDashboardService (υπολογίζει με προτεραιότητα υποχρεώσεων)
        if reserve_fund_monthly_total is not None:
            try:
                self.reserve_fund_monthly_total = Decimal(str(reserve_fund_monthly_total))
            except Exception:
                self.reserve_fund_monthly_total = Decimal('0.00')
        else:
            # Calculate from building settings directly if dashboard service doesn't provide it
            if (self.building.reserve_fund_goal and 
                self.building.reserve_fund_duration_months and 
                self.building.reserve_fund_duration_months > 0):
                monthly_total = float(self.building.reserve_fund_goal) / float(self.building.reserve_fund_duration_months)
                try:
                    self.reserve_fund_monthly_total = Decimal(str(monthly_total))
                except Exception:
                    self.reserve_fund_monthly_total = Decimal('0.00')
            else:
                # Fallback to dashboard service
                dashboard_service = FinancialDashboardService(self.building_id)
                summary = dashboard_service.get_summary()
                monthly_total = summary.get('reserve_fund_contribution', 0) or 0
                try:
                    self.reserve_fund_monthly_total = Decimal(str(monthly_total))
                except Exception:
                    self.reserve_fund_monthly_total = Decimal('0.00')
    
    # ❌ DELETED: _get_historical_balance() - Use BalanceCalculationService instead
    # This function was removed as part of the balance calculation refactoring.
    # All callers have been migrated to use:
    #   from financial.balance_service import BalanceCalculationService
    #   BalanceCalculationService.calculate_historical_balance(apartment, end_date)

    def calculate_advanced_shares(self) -> Dict[str, Any]:
        """
        Υλοποίηση του αλγορίθμου από το TODO αρχείο
        """
        # Βήμα 1: Αρχικοποίηση μεταβλητών
        shares = self._initialize_shares()
        
        # Βήμα 2: Υπολογισμός συνολικών ποσών ανά κατηγορία
        expense_totals = self._calculate_expense_totals()
        
        # Βήμα 3: Υπολογισμός δαπανών θέρμανσης
        heating_costs = self._calculate_heating_costs(expense_totals['heating'])
        
        # Βήμα 4: Κατανομή δαπανών ανά διαμέρισμα
        self._distribute_expenses_by_apartment(shares, expense_totals, heating_costs)
        
        # Βήμα 5: Προσθήκη ατομικών χρεώσεων
        self._add_individual_charges(shares)
        
        # Βήμα 6: Οριστικοποίηση τελικών ποσών
        self._finalize_shares(shares)
        
        # Βήμα 7: Προσθήκη λεπτομερειών δαπανών για εμφάνιση στο φύλλο
        expense_details = self._get_expense_details()
        
        # Get reserve fund information from building overview
        dashboard_service = FinancialDashboardService(self.building_id)
        # 🔧 ΝΕΟ: Χρήση month-specific summary για σωστή λογική management fees
        if self.period_start_date:
            month_str = self.period_start_date.strftime('%Y-%m')
            summary = dashboard_service.get_summary(month_str)
        else:
            summary = dashboard_service.get_summary()
        
        # Calculate correct monthly reserve fund amount
        reserve_fund_goal = summary.get('reserve_fund_goal', 0)
        reserve_fund_duration = summary.get('reserve_fund_duration_months', 1)
        
        # Use calculated monthly amount instead of the passed value
        calculated_monthly_reserve = 0
        if reserve_fund_goal > 0 and reserve_fund_duration > 0:
            calculated_monthly_reserve = float(reserve_fund_goal) / float(reserve_fund_duration)
        else:
            calculated_monthly_reserve = float(self.reserve_fund_monthly_total)
        
        # Calculate actual reserve fund collected (separate from current balance)
        actual_reserve_collected = self._calculate_actual_reserve_collected()
        
        return {
            'shares': shares,
            'expense_totals': expense_totals,
            'expense_details': expense_details,
            'heating_costs': heating_costs,
            'reserve_contribution': calculated_monthly_reserve,
            'reserve_fund_goal': reserve_fund_goal,
            'reserve_fund_duration': reserve_fund_duration,
            'current_reserve': summary.get('current_reserve', 0),  # Current balance (includes obligations)
            'actual_reserve_collected': actual_reserve_collected,  # Only reserve fund money collected
            'management_fee_per_apartment': float(self.building.management_fee_per_apartment or 0),
            'total_apartments': len(self.apartments),
            'calculation_date': timezone.now().isoformat(),
            # Reserve fund timeline dates - CRITICAL for frontend timeline checks
            'reserve_fund_start_date': self.building.reserve_fund_start_date.strftime('%Y-%m-%d') if self.building.reserve_fund_start_date else None,
            'reserve_fund_target_date': self.building.reserve_fund_target_date.strftime('%Y-%m-%d') if self.building.reserve_fund_target_date else None,
        }
    
    def _calculate_actual_reserve_collected(self) -> float:
        """
        Υπολογίζει το πραγματικό ποσό αποθεματικού που έχει μαζευτεί
        (χωρίς να περιλαμβάνει οφειλές ή άλλες δαπάνες)
        """
        from financial.models import Payment
        
        # Get all reserve fund payments (positive amounts = money collected)
        reserve_payments = Payment.objects.filter(
            apartment__building_id=self.building_id,
            payment_type='reserve_fund',
            amount__gt=0  # Only positive amounts (money collected)
        )
        
        # Sum all reserve fund collections
        total_collected = reserve_payments.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        return float(total_collected)
    
    def _initialize_shares(self) -> Dict[str, Any]:
        """Αρχικοποίηση μεριδίων για κάθε διαμέρισμα"""
        shares = {}

        for apartment in self.apartments:
            # ✅ MIGRATED: Use BalanceCalculationService
            from .balance_service import BalanceCalculationService
            historical_balance = BalanceCalculationService.calculate_historical_balance(
                apartment, self.period_end_date
            ) if self.period_end_date else (apartment.current_balance or Decimal('0.00'))
            
            shares[apartment.id] = {
                'apartment_id': apartment.id,
                'apartment_number': apartment.number,
                'identifier': apartment.identifier or apartment.number,
                'owner_name': apartment.owner_name or 'Άγνωστος',
                'participation_mills': apartment.participation_mills or 0,
                'heating_mills': apartment.heating_mills or 0,
                'elevator_mills': apartment.elevator_mills or 0,
                'current_balance': historical_balance,
                'total_amount': Decimal('0.00'),
                'breakdown': {
                    'general_expenses': Decimal('0.00'),
                    'elevator_expenses': Decimal('0.00'),
                    'heating_expenses': Decimal('0.00'),
                    'equal_share_expenses': Decimal('0.00'),
                    'individual_expenses': Decimal('0.00'),
                    'reserve_fund_contribution': Decimal('0.00'),
                    # ΝΕΑ: Διαχωρισμός owner vs resident expenses
                    'owner_expenses': Decimal('0.00'),
                    'resident_expenses': Decimal('0.00'),
                },
                'heating_breakdown': {
                    'fixed_cost': Decimal('0.00'),
                    'variable_cost': Decimal('0.00'),
                    'consumption_hours': Decimal('0.00')
                },
                'previous_balance': apartment.current_balance or Decimal('0.00'),
                'total_due': Decimal('0.00')
            }
        
        return shares
    
    def _calculate_expense_totals(self) -> Dict[str, Decimal]:
        """Υπολογισμός συνολικών ποσών ανά κατηγορία δαπάνης"""
        totals = {
            'general': Decimal('0.00'),
            'elevator': Decimal('0.00'),
            'heating': Decimal('0.00'),
            'equal_share': Decimal('0.00'),
            'individual': Decimal('0.00'),
            # ΝΕΑ: Διαχωρισμός owner vs resident expenses
            'owner_general': Decimal('0.00'),
            'resident_general': Decimal('0.00'),
            'owner_elevator': Decimal('0.00'),
            'resident_elevator': Decimal('0.00'),
            'owner_heating': Decimal('0.00'),
            'resident_heating': Decimal('0.00'),
            'owner_equal_share': Decimal('0.00'),
            'resident_equal_share': Decimal('0.00'),
        }
        
        # Αντιστοίχιση κατηγοριών δαπανών με κανόνες κατανομής
        general_categories = [
            'cleaning', 'electricity_common', 'water_common', 'garbage_collection',
            'security', 'concierge', 'electrical_maintenance', 'electrical_repair',
            'electrical_upgrade', 'lighting_common', 'intercom_system',
            'plumbing_maintenance', 'plumbing_repair', 'water_tank_cleaning',
            'water_tank_maintenance', 'sewage_system', 'building_insurance',
            'building_maintenance', 'roof_maintenance', 'roof_repair',
            'facade_maintenance', 'facade_repair', 'painting_exterior',
            'painting_interior', 'garden_maintenance', 'parking_maintenance',
            'entrance_maintenance', 'emergency_repair', 'storm_damage',
            'flood_damage', 'fire_damage', 'earthquake_damage', 'vandalism_repair',
            'locksmith', 'glass_repair', 'door_repair', 'window_repair',
            'balcony_repair', 'staircase_repair', 'security_system',
            'cctv_installation', 'access_control', 'fire_alarm', 'fire_extinguishers',
            'legal_fees', 'notary_fees', 'surveyor_fees', 'architect_fees',
            'engineer_fees', 'accounting_fees', 'management_fees',
            'asbestos_removal', 'lead_paint_removal', 'mold_removal',
            'pest_control', 'tree_trimming', 'snow_removal', 'energy_upgrade',
            'insulation_work', 'solar_panel_installation', 'led_lighting',
            'smart_systems', 'miscellaneous', 'consulting_fees',
            'permits_licenses', 'taxes_fees', 'utilities_other'
        ]
        
        elevator_categories = [
            'elevator_maintenance', 'elevator_repair', 'elevator_inspection',
            'elevator_modernization'
        ]
        
        heating_categories = [
            'heating_fuel', 'heating_gas', 'heating_maintenance',
            'heating_repair', 'heating_inspection', 'heating_modernization'
        ]
        heating_fuel_keywords = [
            'πετρέλαιο', 'πετρελαιο', 'φυσικό αέριο', 'φυσικο αεριο',
            'αέριο', 'αεριο', 'aerio', 'gas', 'μαζούτ', 'mazout'
        ]
        heating_general_keywords = [
            'θέρμανσ', 'θερμανσ', 'heating', 'therm', 'radiator',
            'boiler', 'καυστήρ', 'καυστηρ', 'burner', 'λέβητα', 'λεβητα'
        ]
        heating_excluded_categories = {
            'reserve_fund', 'management_fees', 'electricity_common',
            'water_common', 'garbage_collection', 'cleaning', 'security'
        }
        def _contains_keyword(text: str, keywords: list[str]) -> bool:
            text = text or ''
            return any(keyword in text for keyword in keywords)
        def _is_heating_expense(expense: Expense) -> bool:
            category_lower = (expense.category or '').lower()
            if category_lower in heating_categories:
                return True
            title_lower = (expense.title or '').lower()
            description_lower = (expense.description or '').lower()
            distribution_type = (expense.distribution_type or '').lower()
            has_fuel_keyword = _contains_keyword(title_lower, heating_fuel_keywords) or _contains_keyword(description_lower, heating_fuel_keywords)
            has_general_keyword = _contains_keyword(title_lower, heating_general_keywords) or _contains_keyword(description_lower, heating_general_keywords)
            has_distribution_hint = (
                distribution_type in ['by_meters', 'by_participation_mills']
                and (has_fuel_keyword or has_general_keyword)
            )
            if has_fuel_keyword or has_distribution_hint:
                return True
            if category_lower not in heating_excluded_categories and has_general_keyword:
                return True
            return False
       
        equal_share_categories = [
            'special_contribution', 'reserve_fund', 'emergency_fund',
            'renovation_fund'
        ]
        
        for expense in self.expenses:
            # Υπολογισμός ποσού ανά payer_responsibility
            if expense.payer_responsibility == 'owner':
                owner_amount = expense.amount
                resident_amount = Decimal('0.00')
            elif expense.payer_responsibility == 'shared':
                # Αν υπάρχει split_ratio, χρησιμοποιούμε αυτό, αλλιώς 50-50
                split_ratio = expense.split_ratio if expense.split_ratio is not None else Decimal('0.5')
                owner_amount = expense.amount * split_ratio
                resident_amount = expense.amount * (Decimal('1.0') - split_ratio)
            else:  # resident
                owner_amount = Decimal('0.00')
                resident_amount = expense.amount
            
            # Κατανομή ανά κατηγορία
            if _is_heating_expense(expense):
                totals['heating'] += expense.amount
                totals['owner_heating'] += owner_amount
                totals['resident_heating'] += resident_amount
            elif expense.category in general_categories:
                totals['general'] += expense.amount
                totals['owner_general'] += owner_amount
                totals['resident_general'] += resident_amount
            elif expense.category in elevator_categories:
                totals['elevator'] += expense.amount
                totals['owner_elevator'] += owner_amount
                totals['resident_elevator'] += resident_amount
            elif expense.category in equal_share_categories:
                totals['equal_share'] += expense.amount
                totals['owner_equal_share'] += owner_amount
                totals['resident_equal_share'] += resident_amount
            elif expense.distribution_type == 'specific_apartments':
                totals['individual'] += expense.amount
        
        # Προσθήκη δαπανών διαχείρισης στις γενικές δαπάνες
        # Management fees είναι resident expenses (τακτικά κοινόχρηστα)
        total_management_fees = (self.building.management_fee_per_apartment or Decimal('0.00')) * len(self.apartments)
        totals['general'] += total_management_fees
        totals['resident_general'] += total_management_fees
        
        return totals
    
    def _calculate_heating_costs(self, total_heating_cost: Decimal) -> Dict[str, Any]:
        """Υπολογισμός δαπανών θέρμανσης (πάγιο + μεταβλητό)"""
        from .models import MeterReading
        from datetime import timedelta
        
        # Υπολογισμός πάγιου και μεταβλητού κόστους
        if self.heating_type == 'none':
            # Χωρίς θέρμανση: δεν υπάρχουν δαπάνες θέρμανσης
            fixed_cost = Decimal('0.00')
            variable_cost = Decimal('0.00')
            total_heating_cost = Decimal('0.00')  # Αγνόηση δαπανών θέρμανσης
        elif self.heating_type == 'autonomous':
            # Αυτονομία: πάγιο + μεταβλητό
            fixed_cost = total_heating_cost * self.heating_fixed_percentage
            variable_cost = total_heating_cost - fixed_cost
        else:
            # Κεντρική: 100% ανά χιλιοστά θέρμανσης
            fixed_cost = total_heating_cost
            variable_cost = Decimal('0.00')
        
        # Λήψη μετρήσεων θέρμανσης για την περίοδο (μόνο για αυτονομία)
        total_consumption_hours = Decimal('0.00')
        apartment_consumption = {}
        
        if self.heating_type == 'autonomous':
            if self.expenses.exists():
                # Χρήση της ημερομηνίας της πρώτης δαπάνης ως αναφορά
                reference_date = self.expenses.first().date
                start_date = reference_date - timedelta(days=30)
                end_date = reference_date
            else:
                # Fallback σε τρέχοντα μήνα
                now = timezone.now()
                start_date = now.replace(day=1).date()
                end_date = now.date()
            
            # Προσδιορισμός τύπου μετρητή βάσει συστήματος θέρμανσης
            meter_type = MeterReading.METER_TYPE_HEATING_HOURS  # Default
            if self.building.heating_system == Building.HEATING_SYSTEM_HEAT_METERS:
                meter_type = MeterReading.METER_TYPE_HEATING_ENERGY
            
            # Λήψη μετρήσεων θέρμανσης
            meter_readings = MeterReading.objects.filter(
                apartment__building_id=self.building_id,
                meter_type=meter_type,
                reading_date__gte=start_date,
                reading_date__lte=end_date
            ).order_by('apartment', 'reading_date')
            
            # Υπολογισμός συνολικής κατανάλωσης
            for apartment in self.apartments:
                apartment_readings = meter_readings.filter(apartment=apartment).order_by('reading_date')
                
                if len(apartment_readings) >= 2:
                    first_reading = apartment_readings.first()
                    last_reading = apartment_readings.last()
                    consumption = Decimal(str(last_reading.value - first_reading.value))
                    apartment_consumption[apartment.id] = consumption
                    total_consumption_hours += consumption
                else:
                    apartment_consumption[apartment.id] = Decimal('0.00')
        
        # Υπολογισμός κόστους ανά μονάδα
        cost_per_unit = Decimal('0.00')
        if self.heating_type == 'autonomous' and total_consumption_hours > 0:
            # Αυτονομία με μετρήσεις: ανά ώρα κατανάλωσης
            cost_per_unit = variable_cost / total_consumption_hours
        else:
            # Κεντρική ή αυτονομία χωρίς μετρήσεις: ανά χιλιοστά θέρμανσης
            total_heating_mills = sum(apt.heating_mills or 0 for apt in self.apartments)
            if total_heating_mills > 0:
                cost_per_unit = (fixed_cost + variable_cost) / total_heating_mills
            else:
                # Fallback: κατανομή ανά χιλιοστά συμμετοχής
                total_participation_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
                if total_participation_mills > 0:
                    cost_per_unit = (fixed_cost + variable_cost) / total_participation_mills
        
        return {
            'total_cost': total_heating_cost,
            'fixed_cost': fixed_cost,
            'variable_cost': variable_cost,
            'total_consumption_hours': total_consumption_hours,
            'cost_per_unit': cost_per_unit,
            'apartment_consumption': apartment_consumption,
            'heating_type': self.heating_type
        }
    
    def _distribute_expenses_by_apartment(self, shares: Dict, expense_totals: Dict, heating_costs: Dict):
        """Κατανομή δαπανών ανά διαμέρισμα"""
        total_participation_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
        total_heating_mills = sum(apt.heating_mills or 0 for apt in self.apartments)
        total_elevator_mills = sum(apt.elevator_mills or 0 for apt in self.apartments)
        
        for apartment in self.apartments:
            apartment_id = apartment.id
            participation_mills = Decimal(str(apartment.participation_mills or 0))
            heating_mills = Decimal(str(apartment.heating_mills or 0))
            elevator_mills = Decimal(str(apartment.elevator_mills or 0))
            
            # α. Υπολογισμός Γενικών Δαπανών
            # Σημαντικό: το expense_totals['general'] περιλαμβάνει και τις δαπάνες διαχείρισης (management)
            # για λόγους συνολικών στατιστικών. Ωστόσο, η διαχείριση χρεώνεται ισόποσα ανά διαμέρισμα
            # και δεν πρέπει να κατανέμεται δεύτερη φορά ανά χιλιοστά μέσω των γενικών δαπανών.
            # Άρα, από τα γενικά αφαιρούμε το συνολικό ποσό διαχείρισης και κατανέμουμε μόνο το «καθαρό» γενικό ποσό.
            if total_participation_mills > 0:
                total_participation_mills_decimal = Decimal(str(total_participation_mills))
                # Υπολογισμός συνολικού ποσού διαχείρισης για όλο το κτίριο
                management_total = (self.building.management_fee_per_apartment or Decimal('0.00')) * len(self.apartments)
                # «Καθαρό» γενικό ποσό προς κατανομή (χωρίς διαχείριση)
                pure_general_total = expense_totals['general'] - management_total
                if pure_general_total < 0:
                    pure_general_total = Decimal('0.00')
                general_share = pure_general_total * (participation_mills / total_participation_mills_decimal)
                shares[apartment_id]['breakdown']['general_expenses'] = general_share
                shares[apartment_id]['total_amount'] += general_share
                
                # ΝΕΟ: Διαχωρισμός owner vs resident για γενικές δαπάνες
                pure_owner_general = expense_totals['owner_general']
                pure_resident_general = expense_totals['resident_general'] - management_total  # Management fees είναι resident
                if pure_resident_general < 0:
                    pure_resident_general = Decimal('0.00')
                
                owner_general_share = pure_owner_general * (participation_mills / total_participation_mills_decimal)
                resident_general_share = pure_resident_general * (participation_mills / total_participation_mills_decimal)
                shares[apartment_id]['breakdown']['owner_expenses'] += owner_general_share
                shares[apartment_id]['breakdown']['resident_expenses'] += resident_general_share
            
            # β. Υπολογισμός Δαπανών Ανελκυστήρα
            if total_elevator_mills > 0:
                total_elevator_mills_decimal = Decimal(str(total_elevator_mills))
                elevator_share = expense_totals['elevator'] * (elevator_mills / total_elevator_mills_decimal)
                shares[apartment_id]['breakdown']['elevator_expenses'] = elevator_share
                shares[apartment_id]['total_amount'] += elevator_share
                
                # ΝΕΟ: Διαχωρισμός owner vs resident για δαπάνες ανελκυστήρα
                owner_elevator_share = expense_totals['owner_elevator'] * (elevator_mills / total_elevator_mills_decimal)
                resident_elevator_share = expense_totals['resident_elevator'] * (elevator_mills / total_elevator_mills_decimal)
                shares[apartment_id]['breakdown']['owner_expenses'] += owner_elevator_share
                shares[apartment_id]['breakdown']['resident_expenses'] += resident_elevator_share
            
            # γ. Υπολογισμός Δαπανών Θέρμανσης
            if total_heating_mills > 0:
                total_heating_mills_decimal = Decimal(str(total_heating_mills))
                
                if heating_costs['heating_type'] == 'autonomous':
                    # Αυτονομία: πάγιο + μεταβλητό
                    # Πάγιο κόστος (ανά χιλιοστά θέρμανσης)
                    fixed_heating_share = heating_costs['fixed_cost'] * (heating_mills / total_heating_mills_decimal)
                    shares[apartment_id]['heating_breakdown']['fixed_cost'] = fixed_heating_share
                    
                    # Μεταβλητό κόστος (ανά μετρήσεις ή χιλιοστά)
                    consumption_hours = heating_costs['apartment_consumption'].get(apartment_id, Decimal('0.00'))
                    if heating_costs['total_consumption_hours'] > 0:
                        # Ανά μετρήσεις
                        variable_heating_share = consumption_hours * heating_costs['cost_per_unit']
                    else:
                        # Ανά χιλιοστά θέρμανσης (fallback)
                        variable_heating_share = heating_costs['variable_cost'] * (heating_mills / total_heating_mills_decimal)
                    
                    shares[apartment_id]['heating_breakdown']['variable_cost'] = variable_heating_share
                    shares[apartment_id]['heating_breakdown']['consumption_hours'] = consumption_hours
                    
                    total_heating_share = fixed_heating_share + variable_heating_share
                else:
                    # Κεντρική: 100% ανά χιλιοστά θέρμανσης
                    total_heating_share = heating_costs['total_cost'] * (heating_mills / total_heating_mills_decimal)
                    shares[apartment_id]['heating_breakdown']['fixed_cost'] = total_heating_share
                    shares[apartment_id]['heating_breakdown']['variable_cost'] = Decimal('0.00')
                    shares[apartment_id]['heating_breakdown']['consumption_hours'] = Decimal('0.00')
                
                shares[apartment_id]['breakdown']['heating_expenses'] = total_heating_share
                shares[apartment_id]['total_amount'] += total_heating_share
                
                # ΝΕΟ: Διαχωρισμός owner vs resident για δαπάνες θέρμανσης
                # Υπολογίζουμε το ποσοστό του total_heating_share που αντιστοιχεί σε owner vs resident
                if heating_costs['total_cost'] > 0:
                    owner_heating_ratio = expense_totals['owner_heating'] / heating_costs['total_cost']
                    resident_heating_ratio = expense_totals['resident_heating'] / heating_costs['total_cost']
                    owner_heating_share = total_heating_share * owner_heating_ratio
                    resident_heating_share = total_heating_share * resident_heating_ratio
                else:
                    owner_heating_share = Decimal('0.00')
                    resident_heating_share = Decimal('0.00')
                shares[apartment_id]['breakdown']['owner_expenses'] += owner_heating_share
                shares[apartment_id]['breakdown']['resident_expenses'] += resident_heating_share
            
            # δ. Υπολογισμός Ισόποσων Δαπανών
            equal_share_amount = expense_totals['equal_share'] / len(self.apartments)
            shares[apartment_id]['breakdown']['equal_share_expenses'] = equal_share_amount
            shares[apartment_id]['total_amount'] += equal_share_amount
            
            # ΝΕΟ: Διαχωρισμός owner vs resident για ισόποσες δαπάνες
            owner_equal_share = expense_totals['owner_equal_share'] / len(self.apartments)
            resident_equal_share = expense_totals['resident_equal_share'] / len(self.apartments)
            shares[apartment_id]['breakdown']['owner_expenses'] += owner_equal_share
            shares[apartment_id]['breakdown']['resident_expenses'] += resident_equal_share
            
            # ε. Υπολογισμός Εισφοράς Αποθεματικού (κατανομή ανά χιλιοστά)
            # FIXED: Add obligations check like Basic Calculator (excluding reserve fund to avoid circular dependency)
            # Χρήση ιστορικών υπολοίπων για τον έλεγχο εκκρεμοτήτων
            from .balance_service import BalanceCalculationService
            total_obligations = 0
            for apt in self.apartments:
                # ✅ MIGRATED: Use BalanceCalculationService
                historical_balance = BalanceCalculationService.calculate_historical_balance(
                    apt, self.period_end_date
                ) if self.period_end_date else (apt.current_balance or Decimal('0.00'))
                
                if historical_balance < 0:
                    # Αφαίρεση τυχόν χρεώσεων αποθεματικού για αποφυγή κυκλικής παγίδας
                    from django.utils import timezone
                    from datetime import datetime
                    from django.db.models import Sum
                    
                    # Use current date if period_end_date is None
                    end_date = self.period_end_date or timezone.now().date()
                    end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
                    
                    reserve_charges = Transaction.objects.filter(
                        apartment=apt,
                        date__lt=end_datetime,
                        description__icontains='αποθεματικ'
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    # Προσαρμογή υπολοίπου αφαιρώντας χρεώσεις αποθεματικού
                    adjusted_balance = historical_balance + reserve_charges
                    
                    if adjusted_balance < 0:
                        total_obligations += abs(adjusted_balance)
            
            if (self.reserve_fund_monthly_total > 0 and 
                total_participation_mills > 0 and 
                total_obligations == 0):  # Only collect reserve fund if no non-reserve obligations
                total_participation_mills_decimal = Decimal(str(total_participation_mills))
                participation_mills_decimal = Decimal(str(participation_mills))
                reserve_share = self.reserve_fund_monthly_total * (participation_mills_decimal / total_participation_mills_decimal)
                shares[apartment_id]['breakdown']['reserve_fund_contribution'] = reserve_share
                shares[apartment_id]['total_amount'] += reserve_share
            else:
                # No reserve fund if there are obligations
                shares[apartment_id]['breakdown']['reserve_fund_contribution'] = Decimal('0.00')
            
            # στ. Υπολογισμός Δαπανών Διαχείρισης (προσθήκη στις γενικές δαπάνες)
            management_fee = self.building.management_fee_per_apartment or Decimal('0.00')
            shares[apartment_id]['breakdown']['management_fee'] = management_fee
            shares[apartment_id]['breakdown']['general_expenses'] += management_fee  # Προσθήκη στις γενικές δαπάνες
            shares[apartment_id]['total_amount'] += management_fee
            
            # ΝΕΟ: Management fees είναι resident expenses
            shares[apartment_id]['breakdown']['resident_expenses'] += management_fee
    
    def _add_individual_charges(self, shares: Dict):
        """Προσθήκη ατομικών χρεώσεων"""
        # Αυτή τη στιγμή δεν υλοποιείται η σύνδεση με συγκεκριμένα διαμερίσματα
        # Θα προστεθεί αργότερα όταν υλοποιηθεί το ExpenseApartment model
        pass
    
    def _get_expense_details(self) -> Dict[str, List[Dict]]:
        """Επιστρέφει λεπτομέρειες δαπανών για εμφάνιση στο φύλλο κοινοχρήστων"""
        general_categories = [
            'cleaning', 'electricity_common', 'water_common', 'garbage_collection',
            'security', 'concierge', 'electrical_maintenance', 'electrical_repair',
            'electrical_upgrade', 'lighting_common', 'intercom_system',
            'plumbing_maintenance', 'plumbing_repair', 'water_tank_cleaning',
            'water_tank_maintenance', 'sewage_system', 'building_insurance',
            'building_maintenance', 'roof_maintenance', 'roof_repair',
            'facade_maintenance', 'facade_repair', 'painting_exterior',
            'painting_interior', 'garden_maintenance', 'parking_maintenance',
            'entrance_maintenance', 'emergency_repair', 'storm_damage',
            'flood_damage', 'fire_damage', 'earthquake_damage', 'vandalism_repair',
            'locksmith', 'glass_repair', 'door_repair', 'window_repair',
            'balcony_repair', 'staircase_repair', 'security_system',
            'cctv_installation', 'access_control', 'fire_alarm', 'fire_extinguishers',
            'legal_fees', 'notary_fees', 'surveyor_fees', 'architect_fees',
            'engineer_fees', 'accounting_fees', 'management_fees',
            'asbestos_removal', 'lead_paint_removal', 'mold_removal',
            'pest_control', 'tree_trimming', 'snow_removal', 'energy_upgrade',
            'insulation_work', 'solar_panel_installation', 'led_lighting',
            'smart_systems', 'miscellaneous', 'consulting_fees',
            'permits_licenses', 'taxes_fees', 'utilities_other'
        ]
        
        elevator_categories = [
            'elevator_maintenance', 'elevator_repair', 'elevator_inspection',
            'elevator_modernization'
        ]
        
        heating_categories = [
            'heating_fuel', 'heating_gas', 'heating_maintenance',
            'heating_repair', 'heating_inspection', 'heating_modernization'
        ]
        
        equal_share_categories = [
            'special_contribution', 'reserve_fund', 'emergency_fund',
            'renovation_fund'
        ]
        
        expense_details = {
            'general': [],
            'elevator': [],
            'heating': [],
            'equal_share': [],
            'individual': []
        }
        
        for expense in self.expenses:
            expense_data = {
                'id': expense.id,
                'title': expense.title,
                'description': expense.notes or expense.title,
                'amount': float(expense.amount),
                'category': expense.category,
                'distribution_type': expense.distribution_type,
                'date': expense.date.isoformat() if expense.date else None,
                'supplier_name': expense.supplier.name if expense.supplier else None,
                'payer_responsibility': expense.payer_responsibility,  # ΝΕΟ: Ευθύνη πληρωμής
                'split_ratio': float(expense.split_ratio) if expense.split_ratio is not None else None  # ΝΕΟ: Ποσοστό κατανομής
            }
            
            if expense.category in general_categories:
                expense_details['general'].append(expense_data)
            elif expense.category in elevator_categories:
                expense_details['elevator'].append(expense_data)
            elif expense.category in heating_categories:
                expense_details['heating'].append(expense_data)
            elif expense.category in equal_share_categories:
                expense_details['equal_share'].append(expense_data)
            elif expense.distribution_type == 'specific_apartments':
                expense_details['individual'].append(expense_data)
            else:
                # Default fallback
                expense_details['general'].append(expense_data)
        
        return expense_details

    def _finalize_shares(self, shares: Dict):
        """Οριστικοποίηση τελικών ποσών"""
        for apartment_id, share_data in shares.items():
            # Υπολογισμός συνολικού πληρωτέου ποσού
            # Χρέωση αυξάνει οφειλή => πιο αρνητικό υπόλοιπο
            share_data['total_due'] = share_data['previous_balance'] - share_data['total_amount']


class DataIntegrityService:
    """Υπηρεσία για αυτόματο έλεγχο και καθαρισμό δεδομένων"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
    
    def cleanup_orphaned_transactions(self) -> dict:
        """Καθαρισμός orphaned transactions και επαναυπολογισμός υπολοίπων"""
        try:
            # Find orphaned transactions from both payments and expenses
            orphaned_transactions = []
            
            # Check orphaned payment transactions
            payment_transactions = Transaction.objects.filter(
                building_id=self.building_id, 
                reference_type='payment'
            )
            
            for transaction in payment_transactions:
                try:
                    Payment.objects.get(id=transaction.reference_id)
                except Payment.DoesNotExist:
                    orphaned_transactions.append(transaction)
            
            # Check orphaned expense transactions
            expense_transactions = Transaction.objects.filter(
                building_id=self.building_id, 
                reference_type='expense'
            )
            
            for transaction in expense_transactions:
                try:
                    Expense.objects.get(id=int(transaction.reference_id))
                except (Expense.DoesNotExist, ValueError, TypeError):
                    orphaned_transactions.append(transaction)
            
            # Delete orphaned transactions
            total_orphaned_amount = 0
            deleted_transactions = []
            
            for transaction in orphaned_transactions:
                total_orphaned_amount += transaction.amount
                deleted_transactions.append({
                    'id': transaction.id,
                    'type': transaction.type,
                    'amount': float(transaction.amount),
                    'description': transaction.description,
                    'apartment': transaction.apartment.number if transaction.apartment else None
                })
                transaction.delete()
            
            # Recalculate apartment balances using BalanceCalculationService
            from .balance_service import BalanceCalculationService
            apartments = Apartment.objects.filter(building_id=self.building_id)
            updated_balances = {}

            for apartment in apartments:
                old_balance = apartment.current_balance or 0
                new_balance = BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)

                if old_balance != new_balance:
                    updated_balances[apartment.number] = {
                        'old': float(old_balance),
                        'new': float(new_balance)
                    }
            
            return {
                'success': True,
                'orphaned_transactions_found': len(orphaned_transactions),
                'orphaned_transactions_deleted': deleted_transactions,
                'total_orphaned_amount': float(total_orphaned_amount),
                'apartments_updated': len(updated_balances),
                'balance_updates': updated_balances
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'orphaned_transactions_found': 0,
                'orphaned_transactions_deleted': [],
                'total_orphaned_amount': 0.0,
                'apartments_updated': 0,
                'balance_updates': {}
            }
    
    def _calculate_apartment_balance(self, apartment: Apartment) -> Decimal:
        """Υπολογισμός υπολοίπου διαμερίσματος από transactions"""
        transactions = Transaction.objects.filter(apartment_number=apartment.number).order_by('date', 'id')
        running_balance = Decimal('0.00')
        
        for transaction in transactions:
            if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                running_balance += transaction.amount
            elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                    'interest_charge', 'penalty_charge']:
                running_balance -= transaction.amount
            elif transaction.type == 'balance_adjustment' and transaction.balance_after is not None:
                running_balance = transaction.balance_after
        
        return running_balance
    
    def verify_data_integrity(self) -> dict:
        """Επιβεβαίωση ακεραιότητας δεδομένων"""
        try:
            # Check for orphaned transactions (both payments and expenses)
            orphaned_count = 0
            
            # Check payment transactions
            payment_transactions = Transaction.objects.filter(
                building_id=self.building_id, 
                reference_type='payment'
            )
            
            for transaction in payment_transactions:
                try:
                    Payment.objects.get(id=transaction.reference_id)
                except Payment.DoesNotExist:
                    orphaned_count += 1
            
            # Check expense transactions
            expense_transactions = Transaction.objects.filter(
                building_id=self.building_id, 
                reference_type='expense'
            )
            
            for transaction in expense_transactions:
                try:
                    Expense.objects.get(id=int(transaction.reference_id))
                except (Expense.DoesNotExist, ValueError, TypeError):
                    orphaned_count += 1
            
            # Check apartment balance consistency
            apartments = Apartment.objects.filter(building_id=self.building_id)
            inconsistent_balances = []
            
            for apartment in apartments:
                stored_balance = apartment.current_balance or 0
                calculated_balance = self._calculate_apartment_balance(apartment)
                
                if abs(stored_balance - calculated_balance) > Decimal('0.01'):
                    inconsistent_balances.append({
                        'apartment': apartment.number,
                        'stored': float(stored_balance),
                        'calculated': float(calculated_balance),
                        'difference': float(calculated_balance - stored_balance)
                    })
            
            return {
                'success': True,
                'orphaned_transactions': orphaned_count,
                'inconsistent_balances': len(inconsistent_balances),
                'balance_details': inconsistent_balances,
                'needs_cleanup': orphaned_count > 0 or len(inconsistent_balances) > 0
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'orphaned_transactions': 0,
                'inconsistent_balances': 0,
                'balance_details': [],
                'needs_cleanup': False
            }
    
    def auto_cleanup_and_refresh(self) -> dict:
        """Αυτόματος καθαρισμός και ανανέωση dashboard"""
        try:
            # First verify integrity
            integrity_check = self.verify_data_integrity()
            
            if not integrity_check['needs_cleanup']:
                return {
                    'success': True,
                    'message': 'Δεδομένα ήδη καθαρά',
                    'cleanup_performed': False,
                    'integrity_check': integrity_check
                }
            
            # Perform cleanup
            cleanup_result = self.cleanup_orphaned_transactions()
            
            # Re-verify after cleanup
            final_check = self.verify_data_integrity()
            
            return {
                'success': True,
                'message': 'Καθαρισμός ολοκληρώθηκε',
                'cleanup_performed': True,
                'cleanup_result': cleanup_result,
                'final_integrity_check': final_check
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'cleanup_performed': False
            }

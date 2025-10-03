from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.db.models import Sum
from datetime import datetime
from django.utils import timezone
from .models import Expense, Transaction, Payment, CommonExpensePeriod, ApartmentShare
from apartments.models import Apartment
from buildings.models import Building

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
        
        # Έλεγχος προτεραιότητας συλλογής αποθεματικού
        # Αν η προτεραιότητα είναι 'after_obligations', ελέγχουμε για εκκρεμότητες
        if self.building.reserve_fund_priority == 'after_obligations':
            # Έλεγχος αν υπάρχουν εκκρεμότητες (εξαιρώντας το αποθεματικό για αποφυγή κυκλικής παγίδας)
            # Χρήση ιστορικών υπολοίπων για τον έλεγχο εκκρεμοτήτων
            total_obligations = 0
            
            # Αν δεν υπάρχει period_end_date, χρησιμοποιούμε τον τρέχον μήνα
            end_date = self.period_end_date
            if end_date is None and self.month:
                from datetime import date
                try:
                    year, mon = map(int, self.month.split('-'))
                    end_date = date(year, mon, 1)
                except Exception as e:
                    print(f"Error parsing month {self.month}: {e}")
                    end_date = None
            
            if end_date:
                for apt in self.apartments:
                    # ✅ MIGRATED: Use BalanceCalculationService
                    from .balance_service import BalanceCalculationService
                    historical_balance = BalanceCalculationService.calculate_historical_balance(apt, end_date)
                    
                    if historical_balance < 0:
                        # Αφαίρεση τυχόν χρεώσεων αποθεματικού για αποφυγή κυκλικής παγίδας
                        from django.utils import timezone
                        from datetime import datetime
                        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
                        
                        from django.db.models import Sum
                        reserve_charges = Transaction.objects.filter(
                            apartment=apt,
                            date__lt=end_datetime,
                            description__icontains='αποθεματικ'
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                        
                        # Προσαρμογή υπολοίπου αφαιρώντας χρεώσεις αποθεματικού
                        adjusted_balance = historical_balance + reserve_charges
                        
                        if adjusted_balance < 0:
                            total_obligations += abs(adjusted_balance)
                
                if total_obligations > 0:
                    print(f"🚫 Αποθεματικό: Υπάρχουν εκκρεμότητες €{total_obligations}, δεν συλλέγεται (προτεραιότητα: after_obligations)")
                    return
            else:
                print(f"⚠️ Αποθεματικό: Δεν μπορεί να ελεγχθεί για εκκρεμότητες (no end_date)")
        else:
            print(f"✅ Αποθεματικό: Συλλογή ανεξάρτητα από εκκρεμότητες (προτεραιότητα: always)")
        
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
            if not self._is_month_in_reserve_fund_timeline(expense_date):
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
                notes=f"Αυτόματη δημιουργία - Μηνιαία εισφορά αποθεματικού (στόχος: €{self.building.reserve_fund_goal})"
            )
            
            print(f"🆕 Δημιουργήθηκε δαπάνη αποθεματικού για {self.month}: €{monthly_target}")
            
        except Exception as e:
            print(f"❌ Σφάλμα δημιουργίας δαπάνης αποθεματικού: {e}")
    
    def _is_month_in_reserve_fund_timeline(self, target_date) -> bool:
        """Ελέγχει αν ένας μήνας ανήκει στο reserve fund timeline"""
        if not self.building.reserve_fund_start_date or not self.building.reserve_fund_duration_months:
            return False
        
        start_date = self.building.reserve_fund_start_date
        end_date = start_date + timedelta(days=30 * self.building.reserve_fund_duration_months)
        
        # Συγκρίνουμε μήνες, όχι ημερομηνίες
        target_year_month = (target_date.year, target_date.month)
        start_year_month = (start_date.year, start_date.month)
        end_year_month = (end_date.year, end_date.month)
        
        # Έλεγχος αν ο target μήνας είναι εντός του timeline
        return start_year_month <= target_year_month < end_year_month

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
    
    def get_summary(self, month: str | None = None) -> Dict[str, Any]:
        # 🔧 ΝΕΟ: Αποθήκευση month context για reserve fund calculation
        self.current_month = month
        """Επιστρέφει σύνοψη οικονομικών στοιχείων.
        Αν δοθεί month (YYYY-MM), υπολογίζει για τον συγκεκριμένο μήνα."""
        apartments = Apartment.objects.filter(building_id=self.building_id)
        
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
        reserve_fund_monthly_target = (self.building.reserve_fund_goal or Decimal('0.0')) / (self.building.reserve_fund_duration_months or 1)
        
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
            
            current_obligations = total_expenses_this_month + management_cost_adjustment + reserve_fund_monthly_target
        else:
            # For current view, use total obligations
            current_obligations = total_obligations
        
        # (apartments_count, building, management_fee_per_apartment, total_management_cost already calculated above)
        
        # Calculate pending payments (apartments with negative balance)
        pending_payments = Apartment.objects.filter(
            building_id=self.building_id,
            current_balance__lt=0
        ).count()
        
        # Calculate average monthly expenses (only actual expenses, NOT including management fees)
        # Management fees are handled separately and should not be included in "actual expenses"
        average_monthly_expenses = total_expenses_this_month
        
        # Calculate previous obligations (accumulated apartment debts)
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
                
                # ΔΙΟΡΘΩΣΗ: Υπολογισμός previous obligations από transaction data
                # Χρησιμοποιούμε την ίδια λογική με τη get_apartment_balances για συνέπεια
                previous_obligations = Decimal('0.00')
                
                try:
                    # Υπολογισμός συνολικών προηγούμενων οφειλών από όλα τα διαμερίσματα
                    apartments = Apartment.objects.filter(building_id=self.building_id)
                    month_start = date(year, mon, 1)
                    
                    for apartment in apartments:
                        # Υπολογισμός προηγούμενων οφειλών για κάθε διαμέρισμα
                        apartment_previous_balance = self._calculate_historical_balance(apartment, month_start)
                        # ΔΙΟΡΘΩΣΗ: Μόνο θετικές οφειλές προστίθενται στα previous_obligations
                        if apartment_previous_balance > 0:
                            previous_obligations += apartment_previous_balance
                    
                    print(f"🔍 Calculated previous obligations from transactions: €{previous_obligations}")
                        
                except Exception as e:
                    print(f"⚠️ Error calculating previous obligations from transactions: {e}")
                    previous_obligations = Decimal('0.00')
            except Exception as e:
                print(f"⚠️ Error calculating previous obligations for {month}: {e}")
                previous_obligations = apartment_obligations
        else:
            # For current view, use current apartment obligations
            previous_obligations = apartment_obligations
        
        # ΔΙΟΡΘΩΣΗ: Για snapshot view, προσθήκη previous_obligations στον υπολογισμό total_balance
        if month:
            # Πλήρης υπολογισμός: Πληρωμές μείον (Προηγούμενες Οφειλές + Τρέχουσες Υποχρεώσεις)
            total_balance = total_payments_this_month - (previous_obligations + current_obligations)
            print(f"🔧 BALANCE CORRECTION: payments={total_payments_this_month} - (previous={previous_obligations} + current={current_obligations}) = {total_balance}")
        
        return {
            'total_balance': float(total_balance.quantize(Decimal('0.01'))),
            'current_obligations': float(current_obligations.quantize(Decimal('0.01'))),
            'previous_obligations': float(previous_obligations.quantize(Decimal('0.01'))),  # ← ΝΕΟ FIELD
            'reserve_fund_contribution': float(reserve_fund_contribution.quantize(Decimal('0.01'))),
            'current_reserve': float(current_reserve.quantize(Decimal('0.01'))),
            'has_monthly_activity': has_monthly_activity,
            'apartments_count': apartments_count,
            'pending_payments': pending_payments,
            'average_monthly_expenses': float(average_monthly_expenses.quantize(Decimal('0.01'))),
            'last_calculation_date': timezone.now().strftime('%Y-%m-%d'),
            'total_expenses_month': float(total_expenses_this_month.quantize(Decimal('0.01'))),
            'total_payments_month': float(total_payments_this_month.quantize(Decimal('0.01'))),
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
            'total_management_cost': float(total_management_cost)
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
        
        # Εκκρεμότητες = total_obligations - management_cost
        actual_obligations = total_obligations - management_cost
        
        # Έλεγχος προτεραιότητας συλλογής αποθεματικού
        if building.reserve_fund_priority == 'after_obligations':
            # Αν υπάρχουν πραγματικές εκκρεμότητες (εκτός διαχείρισης), δεν υπολογίζουμε αποθεματικό
            if actual_obligations > 0:
                print(f"🚫 FinancialDashboard: Υπάρχουν εκκρεμότητες €{actual_obligations}, δεν συλλέγεται αποθεματικό (προτεραιότητα: after_obligations)")
                return Decimal('0.00')
        else:
            print(f"✅ FinancialDashboard: Συλλογή αποθεματικού ανεξάρτητα από εκκρεμότητες €{actual_obligations} (προτεραιότητα: always)")
        
        # Αν δεν υπάρχουν πραγματικές εκκρεμότητες, υπολογίζουμε την κανονική εισφορά αποθεματικού
        # Χρησιμοποιούμε τον ίδιο υπολογισμό με το CommonExpenseCalculator
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            total_monthly_contribution = monthly_target
        else:
            # Fallback στην εισφορά ανά διαμέρισμα
            contribution_per_apartment = building.reserve_contribution_per_apartment or Decimal('0.00')
            total_monthly_contribution = contribution_per_apartment * apartments_count
        
        return total_monthly_contribution
    
    def _is_month_within_reserve_fund_period(self, month: str) -> bool:
        """
        Ελέγχει αν ο συγκεκριμένος μήνας είναι μέσα στην περίοδο συλλογής αποθεματικού
        
        Args:
            month: Μήνας σε μορφή YYYY-MM
            
        Returns:
            bool: True αν ο μήνας είναι μέσα στην περίοδο συλλογής, False αλλιώς
        """
        from datetime import date
        from dateutil.relativedelta import relativedelta
        
        # Αν δεν υπάρχουν ρυθμίσεις αποθεματικού, επιστρέφουμε False
        if not self.building.reserve_fund_start_date or not self.building.reserve_fund_duration_months:
            return False
        
        try:
            # Parse τον επιλεγμένο μήνα
            year, mon = map(int, month.split('-'))
            selected_month_date = date(year, mon, 1)
            
            # Ημερομηνία έναρξης συλλογής αποθεματικού
            start_date = self.building.reserve_fund_start_date
            
            # Υπολογισμός ημερομηνίας λήξης βάσει της διάρκειας
            # Αν έχουμε target_date, το χρησιμοποιούμε, αλλιώς το υπολογίζουμε
            if self.building.reserve_fund_target_date:
                target_date = self.building.reserve_fund_target_date
            else:
                # Υπολογισμός: start_date + duration_months
                target_date = start_date + relativedelta(months=self.building.reserve_fund_duration_months)
            
            print(f"🔍 Reserve Fund Period Check: month={month}, start={start_date}, target={target_date}, selected={selected_month_date}")
            
            # Ελέγχουμε αν ο επιλεγμένος μήνας είναι μέσα στην περίοδο
            is_within = start_date <= selected_month_date <= target_date
            print(f"🔍 Reserve Fund Period Check: is_within={is_within}")
            
            return is_within
            
        except Exception as e:
            print(f"🔍 Reserve Fund Period Check: Error - {e}")
            # Αν δεν μπορούμε να parse τον μήνα, επιστρέφουμε False για ασφάλεια
            return False

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
        apartments = Apartment.objects.filter(building_id=self.building_id)
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
            if end_date:
                # Για snapshot view, υπολογίζουμε το balance μέχρι την αρχή του μήνα (πριν τον επιλεγμένο μήνα)
                if month:
                    year, mon = map(int, month.split('-'))
                    month_start = date(year, mon, 1)
                    calculated_balance = self._calculate_historical_balance(apartment, month_start)
                else:
                    calculated_balance = self._calculate_historical_balance(apartment, end_date)
                # Τελευταία πληρωμή μέχρι την ημερομηνία
                last_payment = apartment.payments.filter(date__lt=end_date).order_by('-date').first()
            else:
                # Για current view, χρησιμοποίησε current date
                from datetime import date
                calculated_balance = self._calculate_historical_balance(apartment, date.today())
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
            
            if month and end_date:
                # Για snapshot view, υπολογίζουμε previous balance και net obligation
                
                # ΔΙΟΡΘΩΣΗ: month_start πρέπει να είναι η αρχή του επιλεγμένου μήνα
                year, mon = map(int, month.split('-'))
                month_start = date(year, mon, 1)
                
                # 1. Previous Balance = οφειλές από προηγούμενους μήνες (πριν τον επιλεγμένο μήνα)
                # ΔΙΟΡΘΩΣΗ: Χρησιμοποίησε το calculated_balance που ήδη υπολογίστηκε παραπάνω
                previous_balance = calculated_balance
                
                # 2. Current month expense share (για net_obligation)
                month_expenses = Expense.objects.filter(
                    building_id=apartment.building_id,
                    date__gte=month_start,
                    date__lt=end_date
                )
                
                # Υπολογισμός μεριδίου διαμερίσματος από τις δαπάνες του μήνα
                total_mills = Apartment.objects.filter(building_id=apartment.building_id).aggregate(
                    total=Sum('participation_mills'))['total'] or 1000
                    
                for expense in month_expenses:
                    # ΔΙΟΡΘΩΣΗ: Management fees είναι ισόποσα, άλλες δαπάνες ανά χιλιοστά
                    if expense.category == 'management_fees':
                        # Ισόποση κατανομή για management fees
                        apartment_count = Apartment.objects.filter(building_id=apartment.building_id).count()
                        apartment_share = expense.amount / apartment_count
                    else:
                        # Κατανομή ανά χιλιοστά για άλλες δαπάνες
                        apartment_share = Decimal(apartment.participation_mills) / Decimal(total_mills) * expense.amount
                    
                    expense_share += apartment_share
                
                # 3. Υπολογισμός αποθεματικού για τον μήνα
                if (self.building.reserve_fund_goal and 
                    self.building.reserve_fund_duration_months and
                    self.building.reserve_fund_start_date and
                    month_start >= self.building.reserve_fund_start_date):
                    
                    # Έλεγχος αν ο μήνας είναι εντός της περιόδου συλλογής αποθεματικού
                    if (not self.building.reserve_fund_target_date or 
                        month_start <= self.building.reserve_fund_target_date):
                        
                        # ΔΙΟΡΘΩΣΗ: Έλεγχος προτεραιότητας αποθεματικού
                        should_collect_reserve = False
                        
                        if self.building.reserve_fund_priority == 'always':
                            # Πάντα συλλέγουμε αποθεματικό ανεξάρτητα από εκκρεμότητες
                            should_collect_reserve = True
                            print(f"✅ Αποθεματικό: Συλλογή ανεξάρτητα από εκκρεμότητες (προτεραιότητα: always)")
                        elif self.building.reserve_fund_priority == 'after_obligations':
                            # Συλλέγουμε μόνο αν δεν υπάρχουν εκκρεμότητες
                            # Έλεγχος εκκρεμοτήτων (εξαιρώντας management fees)
                            total_obligations = 0
                            for apt in Apartment.objects.filter(building_id=apartment.building_id):
                                apt_historical_balance = self._calculate_historical_balance(apt, month_start)
                                if apt_historical_balance < 0:
                                    total_obligations += abs(apt_historical_balance)
                            
                            if total_obligations == 0:
                                should_collect_reserve = True
                                print(f"✅ Αποθεματικό: Δεν υπάρχουν εκκρεμότητες - συλλέγεται (προτεραιότητα: after_obligations)")
                            else:
                                print(f"🚫 Αποθεματικό: Υπάρχουν εκκρεμότητες €{total_obligations} - δεν συλλέγεται (προτεραιότητα: after_obligations)")
                        
                        if should_collect_reserve:
                            monthly_reserve_target = self.building.reserve_fund_goal / self.building.reserve_fund_duration_months
                            
                            # Κατανομή ανά χιλιοστά
                            total_mills = Apartment.objects.filter(building_id=apartment.building_id).aggregate(
                                total=Sum('participation_mills'))['total'] or 1000
                            
                            if total_mills > 0:
                                reserve_fund_share = (monthly_reserve_target * apartment.participation_mills) / total_mills
                                print(f"💰 Αποθεματικό για διαμέρισμα {apartment.number}: €{reserve_fund_share:.2f}")
                
                # 4. Net Obligation = Previous Balance + Current Month Expenses + Reserve Fund - Payments this month
                month_payments = Payment.objects.filter(
                    apartment=apartment,
                    date__gte=month_start,
                    date__lt=end_date
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                net_obligation = previous_balance + expense_share + reserve_fund_share - month_payments
            
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
                'current_balance': calculated_balance,
                'previous_balance': previous_balance,  # ← ΝΕΟ FIELD
                'reserve_fund_share': reserve_fund_share,  # ← ΝΕΟ FIELD - Αποθεματικό
                'expense_share': expense_share,        # ← ΝΕΟ FIELD  
                'net_obligation': net_obligation,      # ← ΝΕΟ FIELD
                'total_payments': total_payments_apartment,  # ← ΝΕΟ FIELD - Διόρθωση!
                'participation_mills': apartment.participation_mills or 0,
                'status': status,
                'last_payment_date': last_payment.date if last_payment else None,
                'last_payment_amount': last_payment.amount if last_payment else None
            })
        
        return balances
    
    def _calculate_historical_balance(self, apartment, end_date) -> Decimal:
        """
        Υπολογισμός ιστορικού υπολοίπου διαμερίσματος μέχρι συγκεκριμένη ημερομηνία
        
        ΣΗΜΑΝΤΙΚΟ: Για "Previous Months' Obligations", πρέπει να υπολογίζουμε μόνο
        τις οφειλές από δαπάνες που δημιουργήθηκαν ΠΡΙΝ από τον επιλεγμένο μήνα.
        
        Args:
            apartment: Το διαμέρισμα για το οποίο υπολογίζουμε το υπόλοιπο
            end_date: Η ημερομηνία μέχρι την οποία υπολογίζουμε
            
        Returns:
            Decimal: Το υπόλοιπο του διαμερίσματος μέχρι την δοθείσα ημερομηνία
        """
        from decimal import Decimal
        from .models import Transaction, Payment
        from django.utils import timezone
        
        # Υπολογισμός πληρωμών μέχρι την ημερομηνία
        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # ΔΙΟΡΘΩΣΗ: Για τον υπολογισμό προηγούμενων οφειλών, πρέπει να συμπεριλάβουμε
        # μόνο χρεώσεις από δαπάνες που δημιουργήθηκαν ΠΡΙΝ από τον επιλεγμένο μήνα
        
        # Βρίσκουμε την αρχή του μήνα για τον οποίο υπολογίζουμε
        # Αν end_date είναι 2025-08-01, τότε θέλουμε δαπάνες πριν από 2025-07-01
        if isinstance(end_date, datetime):
            end_date = end_date.date()
        
        # Υπολογισμός αρχής του μήνα
        month_start = end_date.replace(day=1)
        
        # Συνεχής μεταφορά ποσών: Όλες οι μεταφορές υπολοίπων είναι συνεχείς
        # Για Ιανουάριο 2026: Παλαιότερες οφειλές = Ιούνιος-Δεκέμβριος 2025
        
        # Συνεχής μεταφορά ποσών - χωρίς ετήσια απομόνωση
        # Κρατάμε μόνο την ημερομηνία έναρξης υπολογισμών (1-6-2025)
        from datetime import date
        system_start_date = self.building.financial_system_start_date
        
        # Αν δεν υπάρχει ημερομηνία έναρξης συστήματος, επιστρέφουμε 0
        if system_start_date is None:
            return Decimal('0.00')
        
        # Χρησιμοποιούμε την ημερομηνία έναρξης συστήματος ως αρχή υπολογισμών
        year_start = system_start_date

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
            date__gte=year_start,  # Από την ημερομηνία έναρξης συστήματος
            date__lt=month_start   # ⚠️ ΚΡΙΣΙΜΟ: < όχι <= !!!
        )
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        expense_ids_before_month = list(expenses_before_month.values_list('id', flat=True))
        
        # Υπολογισμός χρεώσεων μόνο από αυτές τις δαπάνες
        # ΔΙΟΡΘΩΣΗ: Αφαιρούμε τα management_fees expenses από τα transactions
        # γιατί θα τα υπολογίσουμε ξεχωριστά παρακάτω
        if expense_ids_before_month:
            # Βρίσκουμε τα management_fees expense IDs για να τα αφαιρέσουμε
            management_expense_ids = list(Expense.objects.filter(
                id__in=expense_ids_before_month,
                category='management_fees'
            ).values_list('id', flat=True))
            
            # Αφαιρούμε τα management_fees από τα expense_ids
            non_management_expense_ids = [exp_id for exp_id in expense_ids_before_month 
                                        if exp_id not in management_expense_ids]
            
            if non_management_expense_ids:
                total_charges = Transaction.objects.filter(
                    apartment=apartment,  # ΔΙΟΡΘΩΣΗ: Χρήση apartment object αντί για apartment_number
                    reference_type='expense',
                    reference_id__in=[str(exp_id) for exp_id in non_management_expense_ids],
                    type__in=['common_expense_charge', 'expense_created', 'expense_issued',
                             'interest_charge', 'penalty_charge']
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            else:
                total_charges = Decimal('0.00')
        else:
            total_charges = Decimal('0.00')
        
        # ΔΙΟΡΘΩΣΗ: Μη διπλομέτρηση πληρωμών - χρησιμοποίησε μόνο Payment model
        # Οι συναλλαγές τύπου 'common_expense_payment' δημιουργούνται αυτόματα όταν 
        # καταχωρείται Payment, οπότε δεν πρέπει να προστίθενται ξανά
        
        # ΔΙΟΡΘΩΣΗ ΠΡΟΣΗΜΟΥ: Χρέος = θετικό υπόλοιπο, Πίστωση = αρνητικό υπόλοιπο  
        # Υπόλοιπο = Χρεώσεις - Πληρωμές (θετικό = χρέος, αρνητικό = πίστωση)

        # ΔΙΟΡΘΩΣΗ: Δυναμικός υπολογισμός management fees αντί για Expense lookup
        # Τα management fees δεν αποθηκεύονται ως Expense objects αλλά υπολογίζονται δυναμικά

        # Υπολογισμός management fees βάσει μηνιαίας χρέωσης × αριθμός μηνών
        # 🔧 ΝΕΟ: Έλεγχος financial_system_start_date πριν υπολογισμό management fees
        management_fee_per_apartment = self.building.management_fee_per_apartment or Decimal('0.00')

        if management_fee_per_apartment > 0:
            # Υπολογισμός αριθμού μηνών από την ημερομηνία έναρξης μέχρι τον τρέχοντα μήνα
            from dateutil.relativedelta import relativedelta

            # 🔧 ΝΕΟ: Χρήση financial_system_start_date αν υπάρχει, αλλιώς year_start
            if self.building.financial_system_start_date:
                financial_start_year = self.building.financial_system_start_date.year
                financial_start_month = self.building.financial_system_start_date.month
                # Πόσοι μήνες έχουν περάσει από την ημερομηνία έναρξης οικονομικού συστήματος
                months_diff = (month_start.year - financial_start_year) * 12 + (month_start.month - financial_start_month)
                print(f"🔧 Financial system start date used: {self.building.financial_system_start_date}")
            else:
                # Fallback στο year_start αν δεν υπάρχει financial_system_start_date
                months_diff = (month_start.year - year_start.year) * 12 + (month_start.month - year_start.month)
                print(f"🔧 Year start used: {year_start}")

            # Συνολικά management fees = μηνιαία χρέωση × αριθμός μηνών (μόνο θετικοί μήνες)
            management_fees_share = management_fee_per_apartment * max(0, months_diff)

            total_charges += management_fees_share

            # Debug output
            if management_fees_share > 0:
                print(f"💰 Management fees for apt {apartment.number}: {max(0, months_diff)} months × €{management_fee_per_apartment} = €{management_fees_share}")
            else:
                print(f"⏭️ No management fees for apt {apartment.number} - before financial system start date")
        
        # ΔΙΟΡΘΩΣΗ: Προσθήκη αποθεματικού από προηγούμενους μήνες
        # Για τον υπολογισμό των "Παλαιότερων Οφειλών", πρέπει να συμπεριλάβουμε
        # το αποθεματικό που συλλέχθηκε στους προηγούμενους μήνες
        reserve_fund_from_previous_months = Decimal('0.00')
        
        if (self.building.reserve_fund_goal and 
            self.building.reserve_fund_duration_months and
            self.building.reserve_fund_start_date):
            
            monthly_reserve_target = self.building.reserve_fund_goal / self.building.reserve_fund_duration_months
            
            # Υπολογισμός αποθεματικού για κάθε μήνα πριν από τον επιλεγμένο μήνα
            current_date = self.building.reserve_fund_start_date
            
            while current_date < month_start:
                # Έλεγχος αν ο μήνας είναι εντός της περιόδου συλλογής αποθεματικού
                if (current_date >= self.building.reserve_fund_start_date and
                    (not self.building.reserve_fund_target_date or current_date <= self.building.reserve_fund_target_date)):
                    
                    # Υπολογισμός μεριδίου διαμερίσματος από το αποθεματικό αυτού του μήνα
                    total_mills = Apartment.objects.filter(building_id=apartment.building_id).aggregate(
                        total=Sum('participation_mills'))['total'] or 1000
                    
                    if total_mills > 0:
                        apartment_reserve_share = (monthly_reserve_target * apartment.participation_mills) / total_mills
                        reserve_fund_from_previous_months += apartment_reserve_share
                
                # Μετακίνηση στον επόμενο μήνα
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
        
        # Συνολικό ιστορικό υπόλοιπο = χρεώσεις + αποθεματικό προηγούμενων μηνών - πληρωμές
        historical_balance = total_charges + reserve_fund_from_previous_months - total_payments
        
        # Debug output
        if reserve_fund_from_previous_months > 0:
            print(f"💰 Reserve fund from previous months for apt {apartment.number}: €{reserve_fund_from_previous_months}")
        
        return historical_balance
    
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
            
            # Ενημέρωση υπολοίπου διαμερίσματος
            apartment.current_balance = total_due
            apartment.save()
        
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
                    'reserve_fund_contribution': Decimal('0.00')
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
            'individual': Decimal('0.00')
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
        
        equal_share_categories = [
            'special_contribution', 'reserve_fund', 'emergency_fund',
            'renovation_fund'
        ]
        
        for expense in self.expenses:
            if expense.category in general_categories:
                totals['general'] += expense.amount
            elif expense.category in elevator_categories:
                totals['elevator'] += expense.amount
            elif expense.category in heating_categories:
                totals['heating'] += expense.amount
            elif expense.category in equal_share_categories:
                totals['equal_share'] += expense.amount
            elif expense.distribution_type == 'specific_apartments':
                totals['individual'] += expense.amount
        
        # Προσθήκη δαπανών διαχείρισης στις γενικές δαπάνες
        total_management_fees = (self.building.management_fee_per_apartment or Decimal('0.00')) * len(self.apartments)
        totals['general'] += total_management_fees
        
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
            
            # β. Υπολογισμός Δαπανών Ανελκυστήρα
            if total_elevator_mills > 0:
                total_elevator_mills_decimal = Decimal(str(total_elevator_mills))
                elevator_share = expense_totals['elevator'] * (elevator_mills / total_elevator_mills_decimal)
                shares[apartment_id]['breakdown']['elevator_expenses'] = elevator_share
                shares[apartment_id]['total_amount'] += elevator_share
            
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
            
            # δ. Υπολογισμός Ισόποσων Δαπανών
            equal_share_amount = expense_totals['equal_share'] / len(self.apartments)
            shares[apartment_id]['breakdown']['equal_share_expenses'] = equal_share_amount
            shares[apartment_id]['total_amount'] += equal_share_amount
            
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
                'supplier_name': expense.supplier.name if expense.supplier else None
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
            
            # Recalculate apartment balances
            apartments = Apartment.objects.filter(building_id=self.building_id)
            updated_balances = {}
            
            for apartment in apartments:
                old_balance = apartment.current_balance or 0
                new_balance = self._calculate_apartment_balance(apartment)
                apartment.current_balance = new_balance
                apartment.save()
                
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
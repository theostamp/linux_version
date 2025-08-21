from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.db.models import Sum
from datetime import datetime
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
        self.expenses = Expense.objects.filter(
            building_id=building_id, 
            is_issued=False
        )
        self.month = month  # Format: YYYY-MM
        self.period_end_date = None
        
        # Calculate period end date if month is provided
        if month:
            try:
                from datetime import date
                year, mon = map(int, month.split('-'))
                if mon == 12:
                    self.period_end_date = date(year + 1, 1, 1)
                else:
                    self.period_end_date = date(year, mon + 1, 1)
            except Exception:
                pass
    
    def _get_historical_balance(self, apartment, end_date):
        """
        Υπολογίζει το ιστορικό υπόλοιπο διαμερίσματος μέχρι την δοθείσα ημερομηνία
        """
        from datetime import datetime
        from django.utils import timezone
        
        if not end_date:
            return apartment.current_balance or Decimal('0.00')
        
        # Μετατροπή end_date σε timezone-aware datetime
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        
        # Υπολογισμός από πληρωμές και συναλλαγές
        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός χρεώσεων μέχρι την ημερομηνία από συναλλαγές
        total_charges = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_datetime,
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός επιπλέον εισπράξεων από συναλλαγές
        additional_payments = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_datetime,
            type__in=['common_expense_payment', 'payment_received', 'refund']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        return total_payments + additional_payments - total_charges
    
    def calculate_shares(self, include_reserve_fund: bool = True) -> Dict[str, Any]:
        """
        Υπολογισμός μεριδίων για κάθε διαμέρισμα
        
        Args:
            include_reserve_fund: Αν θα συμπεριλαμβάνεται η εισφορά αποθεματικού
        """
        shares = {}
        
        # Αρχικοποίηση μεριδίων για κάθε διαμέρισμα
        for apartment in self.apartments:
            # Χρήση ιστορικού υπολοίπου αν έχουμε period_end_date
            historical_balance = self._get_historical_balance(apartment, self.period_end_date)
            
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
        from datetime import datetime, timedelta
        
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
        
        # Έλεγχος αν υπάρχουν εκκρεμότητες (αν ναι, δεν συλλέγουμε αποθεματικό)
        # Χρήση ιστορικών υπολοίπων για τον έλεγχο εκκρεμοτήτων
        total_obligations = sum(abs(self._get_historical_balance(apt, self.period_end_date)) 
                              for apt in self.apartments 
                              if self._get_historical_balance(apt, self.period_end_date) < 0)
        if total_obligations > 0:
            return
        
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
        else:
            # Κατανομή ανά χιλιοστά
            for apartment in self.apartments:
                if apartment.participation_mills:
                    participation_mills_decimal = Decimal(str(apartment.participation_mills))
                    total_mills_decimal = Decimal(str(total_mills))
                    reserve_share = (Decimal(str(monthly_target)) * participation_mills_decimal) / total_mills_decimal
                    shares[apartment.id]['reserve_fund_amount'] = reserve_share
        
        # Προσθήκη στο breakdown και στο total_amount μόνο αν δεν υπάρχουν εκκρεμότητες
        # Χρήση του ίδιου υπολογισμού με πριν για συνέπεια
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
                
                # Προσθήκη στο total_amount μόνο αν δεν υπάρχουν εκκρεμότητες
                if total_obligations == 0:
                    shares[apartment.id]['total_amount'] += shares[apartment.id]['reserve_fund_amount']
    
    def get_total_expenses(self) -> Decimal:
        """Επιστρέφει το συνολικό ποσό ανέκδοτων δαπανών"""
        return sum(exp.amount for exp in self.expenses)
    
    def _calculate_management_fee(self, shares: Dict):
        """Υπολογισμός δαπανών διαχείρισης (management fee)"""
        management_fee = self.building.management_fee_per_apartment or Decimal('0.00')
        
        if management_fee > 0:
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
        """Επιστρέφει σύνοψη οικονομικών στοιχείων.
        Αν δοθεί month (YYYY-MM), υπολογίζει για τον συγκεκριμένο μήνα."""
        apartments = Apartment.objects.filter(building_id=self.building_id)
        
        # Συνολικές οφειλές: αρνητικά υπόλοιπα + ανέκδοτες δαπάνες
        apartment_obligations = sum(
            abs(apt.current_balance) for apt in apartments 
            if apt.current_balance and apt.current_balance < 0
        )
        
        # Ανέκδοτες δαπάνες που δεν έχουν χρεωθεί ακόμα στα διαμερίσματα
        # NOTE: For current_obligations, we show ALL pending expenses regardless of month
        # This gives a complete picture of financial obligations
        pending_expenses_all = Expense.objects.filter(
            building_id=self.building_id,
            is_issued=False
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Get building info for management fees (moved up for earlier use)
        from buildings.models import Building
        building = Building.objects.get(id=self.building_id)
        management_fee_per_apartment = building.management_fee_per_apartment
        apartments_count = Apartment.objects.filter(building_id=self.building_id).count()
        total_management_cost = management_fee_per_apartment * apartments_count
        
        # Συνολικές υποχρεώσεις = Υφιστάμενες οφειλές + Ανέκδοτες δαπάνες + Διαχειριστικά τέλη
        # This represents the TOTAL financial obligations, not month-specific
        total_obligations = apartment_obligations + pending_expenses_all + total_management_cost
        
        # Δαπάνες αυτού του μήνα
        from datetime import datetime, date
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
                now = datetime.now()
                start_date = date(now.year, now.month, 1)
                if now.month == 12:
                    end_date = date(now.year + 1, 1, 1)
                else:
                    end_date = date(now.year, now.month + 1, 1)
        else:
            # Current month
            now = datetime.now()
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
                from django.utils import timezone
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
        
        recent_transactions = recent_transactions_query.order_by('-date')[:10]
        
        # Ανέκδοτες δαπάνες (δεν έχουν εκδοθεί ακόμα)
        pending_expenses_query = Expense.objects.filter(
            building_id=self.building_id,
            is_issued=False
        )
        
        # Φιλτράρισμα ανά μήνα αν δοθεί
        if month:
            try:
                from django.utils import timezone
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
            
            # For snapshot view, recalculate obligations based on what would be pending at month end
            pending_expenses_snapshot = Expense.objects.filter(
                building_id=self.building_id,
                is_issued=False,
                date__lte=end_date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
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
        
        # Check if there's any financial activity for this month (διακανονισμός)
        has_monthly_activity = self._has_monthly_activity(month) if month else True
        
        # Υπολογισμός εισφοράς αποθεματικού με προτεραιότητα
        # Αν δεν υπάρχει δραστηριότητα για συγκεκριμένο μήνα, δεν υπολογίζουμε εισφορά
        if month and not has_monthly_activity:
            reserve_fund_contribution = Decimal('0.00')
        else:
            reserve_fund_contribution = self._calculate_reserve_fund_contribution(
                current_reserve, total_obligations
            )
        
        # Calculate total balance based on view type
        total_balance = current_reserve
        
        # Add debugging info for month-specific calculations
        calculation_context = "current" if not month else f"snapshot_{month}"
        
        print(f"🔍 FinancialDashboard ({calculation_context}): current_reserve={current_reserve}, total_obligations={total_obligations}")
        print(f"🔍 FinancialDashboard ({calculation_context}): total_balance={total_balance}")
        
        # Calculate current obligations (negative balances from apartments)
        current_obligations = total_obligations
        
        # (apartments_count, building, management_fee_per_apartment, total_management_cost already calculated above)
        
        # Calculate pending payments (apartments with negative balance)
        pending_payments = Apartment.objects.filter(
            building_id=self.building_id,
            current_balance__lt=0
        ).count()
        
        # Calculate average monthly expenses (from the current month + management fees)
        # Include management fees as they are part of the monthly recurring costs
        average_monthly_expenses = total_expenses_this_month + total_management_cost
        
        return {
            'total_balance': float(total_balance),
            'current_obligations': float(current_obligations),
            'reserve_fund_contribution': float(reserve_fund_contribution),
            'current_reserve': float(current_reserve),
            'has_monthly_activity': has_monthly_activity,
            'apartments_count': apartments_count,
            'pending_payments': pending_payments,
            'average_monthly_expenses': float(average_monthly_expenses),
            'last_calculation_date': datetime.now().strftime('%Y-%m-%d'),
            'total_expenses_month': float(total_expenses_this_month),
            'total_payments_month': float(total_payments_this_month),
            'pending_expenses': float(pending_expenses),
            'recent_transactions': list(recent_transactions),
            'recent_transactions_count': len(recent_transactions),
            'apartment_balances': apartment_balances,
            'payment_statistics': payment_statistics,
            # Reserve fund settings - dynamic based on building or 0 for new buildings
            'reserve_fund_goal': float(self.building.reserve_fund_goal or Decimal('0.0')),  # From building settings
            'reserve_fund_duration_months': int(self.building.reserve_fund_duration_months or 0),  # From building settings
            'reserve_fund_monthly_target': float(self.building.reserve_fund_goal or Decimal('0.0')) / float(self.building.reserve_fund_duration_months or 1),  # Calculate: goal / duration
            # Management expenses
            'management_fee_per_apartment': float(management_fee_per_apartment),
            'total_management_cost': float(total_management_cost)
        }
    

    
    def _calculate_reserve_fund_contribution(self, current_reserve: Decimal, total_obligations: Decimal) -> Decimal:
        """
        Υπολογίζει την εισφορά αποθεματικού με βάση την προτεραιότητα:
        1. Πρώτα πρέπει να καλυφθούν οι τρέχουσες υποχρεώσεις
        2. Μετά υπολογίζεται η εισφορά αποθεματικού
        """
        # Αν υπάρχουν ανέκδοτες δαπάνες, δεν υπολογίζουμε εισφορά αποθεματικού
        if total_obligations > 0:
            return Decimal('0.00')
        
        # Αν δεν υπάρχουν υποχρεώσεις, υπολογίζουμε την κανονική εισφορά αποθεματικού
        # Χρησιμοποιούμε τις ρυθμίσεις αποθεματικού από το κτίριο
        building = Building.objects.get(id=self.building_id)
        apartments = Apartment.objects.filter(building_id=self.building_id)
        apartments_count = apartments.count()
        
        # Χρησιμοποιούμε την εισφορά ανά διαμέρισμα από τις ρυθμίσεις του κτιρίου
        contribution_per_apartment = building.reserve_contribution_per_apartment or Decimal('0.00')
        total_monthly_contribution = contribution_per_apartment * apartments_count
        
        return total_monthly_contribution
    
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
        
        # Ελέγχουμε για εκδοθείσες δαπάνες (χρησιμοποιούμε created_at αντί για issue_date)
        has_issued_expenses = Expense.objects.filter(
            building_id=self.building_id,
            is_issued=True,
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
            # Υπολογισμός υπολοίπου με βάση την ημερομηνία
            if end_date:
                calculated_balance = self._calculate_historical_balance(apartment, end_date)
                # Τελευταία πληρωμή μέχρι την ημερομηνία
                last_payment = apartment.payments.filter(date__lt=end_date).order_by('-date').first()
            else:
                calculated_balance = apartment.current_balance or Decimal('0.00')
                # Τελευταία πληρωμή συνολικά
                last_payment = apartment.payments.order_by('-date').first()
            
            balances.append({
                'id': apartment.id,
                'apartment_id': apartment.id,
                'number': apartment.number,
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name or 'Άγνωστος',
                'current_balance': calculated_balance,
                'participation_mills': apartment.participation_mills or 0,
                'last_payment_date': last_payment.date if last_payment else None,
                'last_payment_amount': last_payment.amount if last_payment else None
            })
        
        return balances
    
    def _calculate_historical_balance(self, apartment, end_date) -> Decimal:
        """
        Υπολογισμός ιστορικού υπολοίπου διαμερίσματος μέχρι συγκεκριμένη ημερομηνία
        
        Args:
            apartment: Το διαμέρισμα για το οποίο υπολογίζουμε το υπόλοιπο
            end_date: Η ημερομηνία μέχρι την οποία υπολογίζουμε
            
        Returns:
            Decimal: Το υπόλοιπο του διαμερίσματος μέχρι την δοθείσα ημερομηνία
        """
        from decimal import Decimal
        from .models import Transaction, Payment
        
        # Υπολογισμός πληρωμών μέχρι την ημερομηνία
        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός χρεώσεων μέχρι την ημερομηνία από συναλλαγές
        total_charges = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_date,
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός επιπλέον εισπράξεων από συναλλαγές (εκτός από τις κανονικές πληρωμές)
        additional_payments = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_date,
            type__in=['common_expense_payment', 'payment_received', 'refund']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός τελικού υπολοίπου: (πληρωμές + επιπλέον εισπράξεις) - χρεώσεις
        historical_balance = total_payments + additional_payments - total_charges
        
        return historical_balance
    
    def get_payment_statistics(self, month: str | None = None) -> Dict[str, Any]:
        """Υπολογισμός στατιστικών πληρωμών"""
        from django.db.models import Count, Avg
        from datetime import datetime, date
        
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
        from datetime import datetime
        
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
            date=datetime.now(),
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
        queryset = Transaction.objects.filter(building_id=self.building_id)
        
        if start_date:
            queryset = queryset.filter(date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__date__lte=end_date)
        if transaction_type:
            queryset = queryset.filter(type=transaction_type)
        if apartment_id:
            queryset = queryset.filter(apartment_id=apartment_id)
        
        return queryset.order_by('-date')
    
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
                apartment=apartment,
                type__in=['common_expense_charge', 'expense_payment']
            )
            total_charges = transactions.aggregate(total=Sum('amount'))['total'] or 0
            
            current_balance = total_charges - total_payments
            
            balance_data.append({
                'apartment': apartment,
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name,
                'participation_mills': apartment.participation_mills,
                'total_charges': total_charges,
                'total_payments': total_payments,
                'current_balance': current_balance,
                'last_payment_date': payments.order_by('-date').first().date if payments.exists() else None,
                'last_payment_amount': payments.order_by('-date').first().amount if payments.exists() else None,
            })
        
        return balance_data
    
    def generate_financial_summary_report(self, period='month'):
        """Δημιουργία οικονομικής σύνοψης"""
        from datetime import datetime, timedelta
        
        if period == 'month':
            start_date = datetime.now().replace(day=1)
        elif period == 'quarter':
            current_month = datetime.now().month
            quarter_start_month = ((current_month - 1) // 3) * 3 + 1
            start_date = datetime.now().replace(month=quarter_start_month, day=1)
        elif period == 'yearly':
            start_date = datetime.now().replace(month=1, day=1)
        else:
            start_date = datetime.now() - timedelta(days=30)
        
        end_date = datetime.now()
        
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
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
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
            filename = f'transaction_history_{self.building.name}_{datetime.now().strftime("%Y%m%d")}.xlsx'
        
        elif report_type == 'apartment_balances':
            data = self.generate_apartment_balance_report(**kwargs)
            df = pd.DataFrame(data)
            filename = f'apartment_balances_{self.building.name}_{datetime.now().strftime("%Y%m%d")}.xlsx'
        
        elif report_type == 'financial_summary':
            data = self.generate_financial_summary_report(**kwargs)
            df = pd.DataFrame([data])
            filename = f'financial_summary_{self.building.name}_{datetime.now().strftime("%Y%m%d")}.xlsx'
        
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
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
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
        
        filename = f"{report_type}_{self.building.name}_{datetime.now().strftime('%Y%m%d')}.pdf"
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
        from datetime import datetime, date, timedelta
        
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
            date__lte=period.end_date,
            is_issued=False
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
        from datetime import datetime
        
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
                date=datetime.now(),
                type='common_expense_charge',
                description=f'Χρέωση κοινοχρήστων - {period.period_name}',
                apartment=apartment,
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
        
        # Μαρκάρισμα δαπανών ως εκδοθείσες
        expense_ids = [exp.id for exp in expenses]
        Expense.objects.filter(
            id__in=expense_ids,
            building_id=self.building_id,
            is_issued=False
        ).update(is_issued=True)
        
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
    
    def __init__(self, building_id: int, period_start_date: str = None, period_end_date: str = None, reserve_fund_monthly_total: Optional[Decimal] = None, heating_type: str = 'autonomous', heating_fixed_percentage: int = 30):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.period_end_date = None
        
        # Φιλτράρισμα δαπανών ανά περίοδο
        if period_start_date and period_end_date:
            from datetime import datetime
            start_date = datetime.strptime(period_start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(period_end_date, '%Y-%m-%d').date()
            # Αποθήκευση για χρήση στους υπολογισμούς ιστορικών υπολοίπων
            self.period_end_date = end_date
            self.expenses = Expense.objects.filter(
                building_id=building_id,
                date__gte=start_date,
                date__lte=end_date,
                is_issued=False
            )
        else:
            self.expenses = Expense.objects.filter(
                building_id=building_id, 
                is_issued=False
            )
        
        # Παράμετροι υπολογισμού θέρμανσης
        self.heating_type = heating_type  # 'autonomous' ή 'central'
        self.heating_fixed_percentage = Decimal(str(heating_fixed_percentage)) / Decimal('100')  # Πάγιο ποσοστό θέρμανσης
        
        # Συνολική μηνιαία εισφορά αποθεματικού για όλο το κτίριο (όχι ανά διαμέρισμα)
        # 1) Αν δοθεί  expl. από το frontend, το χρησιμοποιούμε
        # 2) Αλλιώς, αντλούμε από το FinancialDashboardService (υπολογίζει με προτεραιότητα υποχρεώσεων)
        if reserve_fund_monthly_total is not None:
            try:
                self.reserve_fund_monthly_total = Decimal(str(reserve_fund_monthly_total))
            except Exception:
                self.reserve_fund_monthly_total = Decimal('0.00')
        else:
            dashboard_service = FinancialDashboardService(self.building_id)
            summary = dashboard_service.get_summary()
            monthly_total = summary.get('reserve_fund_contribution', 0) or 0
            try:
                self.reserve_fund_monthly_total = Decimal(str(monthly_total))
            except Exception:
                self.reserve_fund_monthly_total = Decimal('0.00')
    
    def _get_historical_balance(self, apartment, end_date):
        """
        Υπολογίζει το ιστορικό υπόλοιπο διαμερίσματος μέχρι την δοθείσα ημερομηνία
        """
        from datetime import datetime
        from django.utils import timezone
        
        if not end_date:
            return apartment.current_balance or Decimal('0.00')
        
        # Μετατροπή end_date σε timezone-aware datetime
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        
        # Υπολογισμός από πληρωμές και συναλλαγές
        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός χρεώσεων μέχρι την ημερομηνία από συναλλαγές
        total_charges = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_datetime,
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός επιπλέον εισπράξεων από συναλλαγές
        additional_payments = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_datetime,
            type__in=['common_expense_payment', 'payment_received', 'refund']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        return total_payments + additional_payments - total_charges
    
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
            'calculation_date': datetime.now().isoformat()
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
            # Χρήση ιστορικού υπολοίπου αν έχουμε period_end_date
            historical_balance = self._get_historical_balance(apartment, self.period_end_date)
            
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
        from datetime import datetime, timedelta
        
        # Υπολογισμός πάγιου και μεταβλητού κόστους
        if self.heating_type == 'autonomous':
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
                now = datetime.now()
                start_date = now.replace(day=1).date()
                end_date = now.date()
            
            # Λήψη μετρήσεων θέρμανσης
            meter_readings = MeterReading.objects.filter(
                apartment__building_id=self.building_id,
                meter_type='heating',
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
            # FIXED: Add obligations check like Basic Calculator
            # Χρήση ιστορικών υπολοίπων για τον έλεγχο εκκρεμοτήτων
            total_obligations = sum(abs(self._get_historical_balance(apt, self.period_end_date)) 
                                  for apt in self.apartments 
                                  if self._get_historical_balance(apt, self.period_end_date) < 0)
            if (self.reserve_fund_monthly_total > 0 and 
                total_participation_mills > 0 and 
                total_obligations == 0):  # Only collect reserve fund if no obligations
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
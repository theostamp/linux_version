from decimal import Decimal
from typing import Dict, Any, List
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
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.expenses = Expense.objects.filter(
            building_id=building_id, 
            is_issued=False
        )
    
    def calculate_shares(self) -> Dict[str, Any]:
        """
        Υπολογισμός μεριδίων για κάθε διαμέρισμα
        """
        shares = {}
        
        # Αρχικοποίηση μεριδίων για κάθε διαμέρισμα
        for apartment in self.apartments:
            shares[apartment.id] = {
                'apartment_id': apartment.id,
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name or 'Άγνωστος',
                'participation_mills': apartment.participation_mills or 0,
                'current_balance': apartment.current_balance or Decimal('0.00'),
                'total_amount': Decimal('0.00'),
                'breakdown': [],
                'previous_balance': apartment.current_balance or Decimal('0.00'),
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
        
        # Υπολογισμός συνολικού οφειλόμενου ποσού
        for apartment_id, share_data in shares.items():
            share_data['total_due'] = (
                share_data['total_amount'] + share_data['previous_balance']
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
                share_amount = (expense.amount * apartment.participation_mills) / total_mills
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
                consumption = last_reading.value - first_reading.value
                
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
    
    def get_total_expenses(self) -> Decimal:
        """Επιστρέφει το συνολικό ποσό ανέκδοτων δαπανών"""
        return sum(exp.amount for exp in self.expenses)
    
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
        
        # Συνολικές οφειλές (αρνητικά υπόλοιπα)
        total_obligations = sum(
            abs(apt.current_balance) for apt in apartments 
            if apt.current_balance and apt.current_balance < 0
        )
        
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
                year, mon = map(int, month.split('-'))
                start_date = date(year, mon, 1)
                if mon == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, mon + 1, 1)
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
        apartment_balances = self.get_apartment_balances()
        
        # Στατιστικά πληρωμών
        payment_statistics = self.get_payment_statistics(month)
        
        # Υπολογισμός τρέχοντος αποθεματικού: Εισπράξεις - Δαπάνες για τον επιλεγμένο μήνα
        if month:
            # Για συγκεκριμένο μήνα, χρησιμοποιούμε τα δεδομένα του μήνα
            current_reserve = total_payments_this_month - total_expenses_this_month
        else:
            # Για τρέχον μήνα, χρησιμοποιούμε τα δεδομένα του τρέχοντος μήνα
            current_reserve = total_payments_this_month - total_expenses_this_month
        
        return {
            'current_reserve': current_reserve,
            'total_obligations': total_obligations,
            'total_expenses_month': total_expenses_this_month,
            'total_payments_month': total_payments_this_month,
            'pending_expenses': pending_expenses,
            'recent_transactions': list(recent_transactions),
            'recent_transactions_count': len(recent_transactions),
            'apartment_balances': apartment_balances,
            'payment_statistics': payment_statistics
        }
    
    def get_apartment_balances(self) -> List[Dict[str, Any]]:
        """Επιστρέφει την κατάσταση οφειλών για όλα τα διαμερίσματα"""
        apartments = Apartment.objects.filter(building_id=self.building_id)
        balances = []
        
        for apartment in apartments:
            # Τελευταία είσπραξη
            last_payment = apartment.payments.order_by('-date').first()
            
            balances.append({
                'id': apartment.id,
                'apartment_id': apartment.id,
                'number': apartment.number,
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name or 'Άγνωστος',
                'current_balance': apartment.current_balance or Decimal('0.00'),
                'participation_mills': apartment.participation_mills or 0,
                'last_payment_date': last_payment.date if last_payment else None,
                'last_payment_amount': last_payment.amount if last_payment else None
            })
        
        return balances
    
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
        from datetime import datetime, date
        from dateutil.relativedelta import relativedelta
        
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start = date.today().replace(day=1)  # Πρώτη ημέρα του τρέχοντος μήνα
        
        template = self.PERIOD_TEMPLATES.get(period_type, self.PERIOD_TEMPLATES['monthly'])
        end = start + relativedelta(months=template['months']) - relativedelta(days=1)
        
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
            total_due = previous_balance + share_amount
            
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
                amount=share_amount,
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
    
    def __init__(self, building_id: int, period_start_date: str = None, period_end_date: str = None):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        
        # Φιλτράρισμα δαπανών ανά περίοδο
        if period_start_date and period_end_date:
            from datetime import datetime
            start_date = datetime.strptime(period_start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(period_end_date, '%Y-%m-%d').date()
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
        
        # Παράμετροι υπολογισμού (προσαρμοσμένες)
        self.heating_fixed_percentage = Decimal('0.30')  # 30% πάγιο θέρμανσης
        self.reserve_fund_contribution = Decimal('5.00')  # 5€ ανά διαμέρισμα
    
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
        
        return {
            'shares': shares,
            'expense_totals': expense_totals,
            'heating_costs': heating_costs,
            'total_apartments': len(self.apartments),
            'calculation_date': datetime.now().isoformat()
        }
    
    def _initialize_shares(self) -> Dict[str, Any]:
        """Αρχικοποίηση μεριδίων για κάθε διαμέρισμα"""
        shares = {}
        
        for apartment in self.apartments:
            shares[apartment.id] = {
                'apartment_id': apartment.id,
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name or 'Άγνωστος',
                'participation_mills': apartment.participation_mills or 0,
                'heating_mills': apartment.heating_mills or 0,
                'elevator_mills': apartment.elevator_mills or 0,
                'current_balance': apartment.current_balance or Decimal('0.00'),
                'total_amount': Decimal('0.00'),
                'breakdown': {
                    'general_expenses': Decimal('0.00'),
                    'elevator_expenses': Decimal('0.00'),
                    'heating_expenses': Decimal('0.00'),
                    'equal_share_expenses': Decimal('0.00'),
                    'individual_expenses': Decimal('0.00'),
                    'reserve_fund_contribution': self.reserve_fund_contribution
                },
                'heating_breakdown': {
                    'fixed_cost': Decimal('0.00'),
                    'variable_cost': Decimal('0.00'),
                    'consumption_hours': 0
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
        
        return totals
    
    def _calculate_heating_costs(self, total_heating_cost: Decimal) -> Dict[str, Any]:
        """Υπολογισμός δαπανών θέρμανσης (πάγιο + μεταβλητό)"""
        from .models import MeterReading
        from datetime import datetime, timedelta
        
        # Υπολογισμός πάγιου και μεταβλητού κόστους
        fixed_cost = total_heating_cost * self.heating_fixed_percentage
        variable_cost = total_heating_cost - fixed_cost
        
        # Λήψη μετρήσεων θέρμανσης για την περίοδο
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
        total_consumption_hours = Decimal('0.00')
        apartment_consumption = {}
        
        for apartment in self.apartments:
            apartment_readings = meter_readings.filter(apartment=apartment).order_by('reading_date')
            
            if len(apartment_readings) >= 2:
                first_reading = apartment_readings.first()
                last_reading = apartment_readings.last()
                consumption = last_reading.value - first_reading.value
                apartment_consumption[apartment.id] = consumption
                total_consumption_hours += consumption
            else:
                apartment_consumption[apartment.id] = Decimal('0.00')
        
        # Υπολογισμός κόστους ανά ώρα
        cost_per_hour = Decimal('0.00')
        if total_consumption_hours > 0:
            cost_per_hour = variable_cost / total_consumption_hours
        
        return {
            'total_cost': total_heating_cost,
            'fixed_cost': fixed_cost,
            'variable_cost': variable_cost,
            'total_consumption_hours': total_consumption_hours,
            'cost_per_hour': cost_per_hour,
            'apartment_consumption': apartment_consumption
        }
    
    def _distribute_expenses_by_apartment(self, shares: Dict, expense_totals: Dict, heating_costs: Dict):
        """Κατανομή δαπανών ανά διαμέρισμα"""
        total_participation_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
        total_heating_mills = sum(apt.heating_mills or 0 for apt in self.apartments)
        total_elevator_mills = sum(apt.elevator_mills or 0 for apt in self.apartments)
        
        for apartment in self.apartments:
            apartment_id = apartment.id
            participation_mills = apartment.participation_mills or 0
            heating_mills = apartment.heating_mills or 0
            elevator_mills = apartment.elevator_mills or 0
            
            # α. Υπολογισμός Γενικών Δαπανών
            if total_participation_mills > 0:
                general_share = expense_totals['general'] * (participation_mills / total_participation_mills)
                shares[apartment_id]['breakdown']['general_expenses'] = general_share
                shares[apartment_id]['total_amount'] += general_share
            
            # β. Υπολογισμός Δαπανών Ανελκυστήρα
            if total_elevator_mills > 0:
                elevator_share = expense_totals['elevator'] * (elevator_mills / total_elevator_mills)
                shares[apartment_id]['breakdown']['elevator_expenses'] = elevator_share
                shares[apartment_id]['total_amount'] += elevator_share
            
            # γ. Υπολογισμός Δαπανών Θέρμανσης
            if total_heating_mills > 0:
                # Πάγιο κόστος
                fixed_heating_share = heating_costs['fixed_cost'] * (heating_mills / total_heating_mills)
                shares[apartment_id]['heating_breakdown']['fixed_cost'] = fixed_heating_share
                
                # Μεταβλητό κόστος
                consumption_hours = heating_costs['apartment_consumption'].get(apartment_id, Decimal('0.00'))
                variable_heating_share = consumption_hours * heating_costs['cost_per_hour']
                shares[apartment_id]['heating_breakdown']['variable_cost'] = variable_heating_share
                shares[apartment_id]['heating_breakdown']['consumption_hours'] = consumption_hours
                
                total_heating_share = fixed_heating_share + variable_heating_share
                shares[apartment_id]['breakdown']['heating_expenses'] = total_heating_share
                shares[apartment_id]['total_amount'] += total_heating_share
            
            # δ. Υπολογισμός Ισόποσων Δαπανών
            equal_share_amount = expense_totals['equal_share'] / len(self.apartments)
            shares[apartment_id]['breakdown']['equal_share_expenses'] = equal_share_amount
            shares[apartment_id]['total_amount'] += equal_share_amount
    
    def _add_individual_charges(self, shares: Dict):
        """Προσθήκη ατομικών χρεώσεων"""
        # Αυτή τη στιγμή δεν υλοποιείται η σύνδεση με συγκεκριμένα διαμερίσματα
        # Θα προστεθεί αργότερα όταν υλοποιηθεί το ExpenseApartment model
        pass
    
    def _finalize_shares(self, shares: Dict):
        """Οριστικοποίηση τελικών ποσών"""
        for apartment_id, share_data in shares.items():
            # Προσθήκη εισφοράς αποθεματικού
            share_data['total_amount'] += self.reserve_fund_contribution
            
            # Υπολογισμός συνολικού πληρωτέου ποσού
            share_data['total_due'] = share_data['total_amount'] + share_data['previous_balance'] 
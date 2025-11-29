"""
Office Finance Services
Υπηρεσίες για τη διαχείριση οικονομικών του γραφείου.
"""

from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import calendar
import logging

from .models import (
    OfficeExpense, 
    OfficeIncome, 
    OfficeExpenseCategory,
    OfficeIncomeCategory,
    OfficeFinancialSummary
)

logger = logging.getLogger(__name__)


class OfficeFinanceService:
    """
    Κεντρική υπηρεσία για τα οικονομικά του γραφείου.
    """
    
    @staticmethod
    def get_month_range(year: int, month: int) -> tuple:
        """Επιστρέφει την πρώτη και τελευταία ημέρα του μήνα."""
        first_day = date(year, month, 1)
        last_day = date(year, month, calendar.monthrange(year, month)[1])
        return first_day, last_day
    
    @staticmethod
    def get_current_month_summary() -> dict:
        """
        Επιστρέφει σύνοψη τρέχοντος μήνα.
        """
        today = timezone.now().date()
        first_day, last_day = OfficeFinanceService.get_month_range(today.year, today.month)
        
        # Έσοδα
        income_data = OfficeIncome.objects.filter(
            date__gte=first_day,
            date__lte=last_day
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00')),
            received=Coalesce(
                Sum('amount', filter=Q(status='received')), 
                Decimal('0.00')
            ),
            pending=Coalesce(
                Sum('amount', filter=Q(status='pending')), 
                Decimal('0.00')
            ),
            count=Count('id')
        )
        
        # Έξοδα
        expense_data = OfficeExpense.objects.filter(
            date__gte=first_day,
            date__lte=last_day
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00')),
            paid=Coalesce(
                Sum('amount', filter=Q(is_paid=True)), 
                Decimal('0.00')
            ),
            unpaid=Coalesce(
                Sum('amount', filter=Q(is_paid=False)), 
                Decimal('0.00')
            ),
            count=Count('id')
        )
        
        return {
            'year': today.year,
            'month': today.month,
            'income': {
                'total': float(income_data['total']),
                'received': float(income_data['received']),
                'pending': float(income_data['pending']),
                'count': income_data['count'],
            },
            'expenses': {
                'total': float(expense_data['total']),
                'paid': float(expense_data['paid']),
                'unpaid': float(expense_data['unpaid']),
                'count': expense_data['count'],
            },
            'net_result': float(income_data['received'] - expense_data['paid']),
        }
    
    @staticmethod
    def get_previous_month_summary() -> dict:
        """
        Επιστρέφει σύνοψη προηγούμενου μήνα.
        """
        today = timezone.now().date()
        if today.month == 1:
            prev_year, prev_month = today.year - 1, 12
        else:
            prev_year, prev_month = today.year, today.month - 1
        
        first_day, last_day = OfficeFinanceService.get_month_range(prev_year, prev_month)
        
        income_data = OfficeIncome.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            status='received'
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )
        
        expense_data = OfficeExpense.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            is_paid=True
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )
        
        return {
            'year': prev_year,
            'month': prev_month,
            'income': float(income_data['total']),
            'expenses': float(expense_data['total']),
            'net_result': float(income_data['total'] - expense_data['total']),
        }
    
    @staticmethod
    def get_yearly_summary(year: int = None) -> dict:
        """
        Επιστρέφει ετήσια σύνοψη.
        """
        if year is None:
            year = timezone.now().year
        
        first_day = date(year, 1, 1)
        last_day = date(year, 12, 31)
        
        # Έσοδα
        income_data = OfficeIncome.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            status='received'
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )
        
        # Έξοδα
        expense_data = OfficeExpense.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            is_paid=True
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )
        
        # Ανά μήνα
        monthly_income = OfficeIncome.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            status='received'
        ).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        monthly_expenses = OfficeExpense.objects.filter(
            date__gte=first_day,
            date__lte=last_day,
            is_paid=True
        ).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        # Μετατροπή σε dict
        income_by_month = {
            item['month'].month: float(item['total']) 
            for item in monthly_income
        }
        expenses_by_month = {
            item['month'].month: float(item['total']) 
            for item in monthly_expenses
        }
        
        # Δημιουργία λίστας για όλους τους μήνες
        monthly_data = []
        for m in range(1, 13):
            inc = income_by_month.get(m, 0)
            exp = expenses_by_month.get(m, 0)
            monthly_data.append({
                'month': m,
                'income': inc,
                'expenses': exp,
                'net': inc - exp,
            })
        
        return {
            'year': year,
            'total_income': float(income_data['total']),
            'total_expenses': float(expense_data['total']),
            'net_result': float(income_data['total'] - expense_data['total']),
            'monthly_data': monthly_data,
        }
    
    @staticmethod
    def get_income_by_building(year: int = None, month: int = None) -> list:
        """
        Επιστρέφει έσοδα ανά κτίριο.
        """
        if year is None:
            year = timezone.now().year
        
        queryset = OfficeIncome.objects.filter(
            building__isnull=False,
            status='received'
        )
        
        if month:
            first_day, last_day = OfficeFinanceService.get_month_range(year, month)
            queryset = queryset.filter(date__gte=first_day, date__lte=last_day)
        else:
            queryset = queryset.filter(date__year=year)
        
        data = queryset.values(
            'building__id', 
            'building__name',
            'building__address'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        return [
            {
                'building_id': item['building__id'],
                'building_name': item['building__name'],
                'building_address': item['building__address'],
                'total': float(item['total']),
                'count': item['count'],
            }
            for item in data
        ]
    
    @staticmethod
    def get_expenses_by_category(year: int = None, month: int = None) -> list:
        """
        Επιστρέφει έξοδα ανά κατηγορία.
        """
        if year is None:
            year = timezone.now().year
        
        queryset = OfficeExpense.objects.filter(is_paid=True)
        
        if month:
            first_day, last_day = OfficeFinanceService.get_month_range(year, month)
            queryset = queryset.filter(date__gte=first_day, date__lte=last_day)
        else:
            queryset = queryset.filter(date__year=year)
        
        data = queryset.values(
            'category__id',
            'category__name',
            'category__category_type',
            'category__color'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        return [
            {
                'category_id': item['category__id'],
                'category_name': item['category__name'],
                'category_type': item['category__category_type'],
                'color': item['category__color'],
                'total': float(item['total']),
                'count': item['count'],
            }
            for item in data
        ]
    
    @staticmethod
    def get_pending_incomes() -> list:
        """
        Επιστρέφει εκκρεμή έσοδα.
        """
        from .serializers import OfficeIncomeSerializer
        
        queryset = OfficeIncome.objects.filter(
            status='pending'
        ).select_related('category', 'building').order_by('date')[:20]
        
        return [
            {
                'id': item.id,
                'title': item.title,
                'amount': float(item.amount),
                'date': item.date.isoformat(),
                'category_name': item.category.name if item.category else None,
                'building_name': item.building.name if item.building else None,
                'client_name': item.client_name,
            }
            for item in queryset
        ]
    
    @staticmethod
    def get_dashboard_data() -> dict:
        """
        Επιστρέφει όλα τα δεδομένα για το dashboard.
        """
        today = timezone.now().date()
        
        # Τελευταίες κινήσεις
        recent_expenses = OfficeExpense.objects.select_related(
            'category'
        ).order_by('-date', '-created_at')[:5]
        
        recent_incomes = OfficeIncome.objects.select_related(
            'category', 'building'
        ).order_by('-date', '-created_at')[:5]
        
        return {
            'current_month': OfficeFinanceService.get_current_month_summary(),
            'previous_month': OfficeFinanceService.get_previous_month_summary(),
            'yearly_summary': OfficeFinanceService.get_yearly_summary(),
            'income_by_building': OfficeFinanceService.get_income_by_building(
                year=today.year, 
                month=today.month
            ),
            'expenses_by_category': OfficeFinanceService.get_expenses_by_category(
                year=today.year, 
                month=today.month
            ),
            'pending_incomes': OfficeFinanceService.get_pending_incomes(),
            'recent_expenses': [
                {
                    'id': e.id,
                    'title': e.title,
                    'amount': float(e.amount),
                    'date': e.date.isoformat(),
                    'category_name': e.category.name if e.category else None,
                    'is_paid': e.is_paid,
                }
                for e in recent_expenses
            ],
            'recent_incomes': [
                {
                    'id': i.id,
                    'title': i.title,
                    'amount': float(i.amount),
                    'date': i.date.isoformat(),
                    'category_name': i.category.name if i.category else None,
                    'building_name': i.building.name if i.building else None,
                    'status': i.status,
                }
                for i in recent_incomes
            ],
            'generated_at': timezone.now().isoformat(),
        }
    
    @staticmethod
    def create_default_categories():
        """
        Δημιουργεί τις προκαθορισμένες κατηγορίες.
        """
        # Κατηγορίες Εξόδων
        expense_categories = [
            {'name': 'Συνδρομή Digital Concierge', 'category_type': 'platform', 'icon': 'Monitor', 'color': 'blue'},
            {'name': 'Hosting & Domains', 'category_type': 'platform', 'icon': 'Cloud', 'color': 'blue'},
            {'name': 'Μισθοδοσία', 'category_type': 'staff', 'icon': 'Users', 'color': 'indigo'},
            {'name': 'Ασφαλιστικές Εισφορές', 'category_type': 'staff', 'icon': 'Shield', 'color': 'indigo'},
            {'name': 'ΔΕΗ Γραφείου', 'category_type': 'utilities', 'icon': 'Zap', 'color': 'amber'},
            {'name': 'Τηλεφωνία & Internet', 'category_type': 'utilities', 'icon': 'Phone', 'color': 'amber'},
            {'name': 'Νερό Γραφείου', 'category_type': 'utilities', 'icon': 'Droplet', 'color': 'amber'},
            {'name': 'Ενοίκιο Γραφείου', 'category_type': 'rent', 'icon': 'Building', 'color': 'slate'},
            {'name': 'Κοινόχρηστα Γραφείου', 'category_type': 'rent', 'icon': 'Building2', 'color': 'slate'},
            {'name': 'Εξοπλισμός Γραφείου', 'category_type': 'equipment', 'icon': 'Laptop', 'color': 'purple'},
            {'name': 'Γραφική Ύλη', 'category_type': 'equipment', 'icon': 'Pencil', 'color': 'purple'},
            {'name': 'Λογιστής', 'category_type': 'professional', 'icon': 'Calculator', 'color': 'emerald'},
            {'name': 'Δικηγόρος', 'category_type': 'professional', 'icon': 'Scale', 'color': 'emerald'},
            {'name': 'Ασφάλεια Επαγγελματικής Ευθύνης', 'category_type': 'insurance', 'icon': 'Shield', 'color': 'red'},
            {'name': 'Διαφήμιση', 'category_type': 'marketing', 'icon': 'Megaphone', 'color': 'pink'},
            {'name': 'Φόροι & Τέλη', 'category_type': 'taxes', 'icon': 'Receipt', 'color': 'orange'},
        ]
        
        for cat_data in expense_categories:
            OfficeExpenseCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'category_type': cat_data['category_type'],
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'is_system': True,
                }
            )
        
        # Κατηγορίες Εσόδων
        income_categories = [
            {'name': 'Αμοιβή Διαχείρισης (Μηνιαία)', 'category_type': 'management_fee', 'icon': 'Euro', 'color': 'emerald'},
            {'name': 'Αμοιβή Διαχείρισης (Ετήσια)', 'category_type': 'management_fee', 'icon': 'Euro', 'color': 'emerald'},
            {'name': 'Έκδοση Πιστοποιητικών', 'category_type': 'extra_services', 'icon': 'FileCheck', 'color': 'blue'},
            {'name': 'Παράσταση σε Γ.Σ.', 'category_type': 'extra_services', 'icon': 'Users', 'color': 'blue'},
            {'name': 'Τεχνική Συμβουλή', 'category_type': 'consulting', 'icon': 'Lightbulb', 'color': 'amber'},
            {'name': 'Προμήθεια Συνεργείου', 'category_type': 'commissions', 'icon': 'Percent', 'color': 'purple'},
            {'name': 'Λοιπά Έσοδα', 'category_type': 'other', 'icon': 'Plus', 'color': 'slate'},
        ]
        
        for cat_data in income_categories:
            OfficeIncomeCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'category_type': cat_data['category_type'],
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'is_system': True,
                }
            )
        
        logger.info("Default office finance categories created")


# Global service instance
office_finance_service = OfficeFinanceService()


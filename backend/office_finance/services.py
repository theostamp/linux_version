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
    def get_unpaid_expenses() -> list:
        """
        Επιστρέφει απλήρωτα έξοδα.
        """
        queryset = OfficeExpense.objects.filter(
            is_paid=False
        ).select_related('category').order_by('date')[:20]
        
        return [
            {
                'id': item.id,
                'title': item.title,
                'amount': float(item.amount),
                'date': item.date.isoformat(),
                'category_name': item.category.name if item.category else None,
                'supplier_name': item.supplier_name,
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
            'unpaid_expenses': OfficeFinanceService.get_unpaid_expenses(),
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
        Δημιουργεί τις προκαθορισμένες κατηγορίες εσόδων και εξόδων.
        Οργανωμένες ανά ομάδα για εύκολη επιλογή.
        """
        # ═══════════════════════════════════════════════════════════════
        # ΚΑΤΗΓΟΡΙΕΣ ΕΞΟΔΩΝ
        # ═══════════════════════════════════════════════════════════════
        expense_categories = [
            # ─── ΠΑΓΙΑ ΕΞΟΔΑ ───
            {'name': 'Ενοίκιο Γραφείου', 'group_type': 'fixed', 'category_type': 'rent', 'icon': 'Building', 'color': 'slate', 'order': 1},
            {'name': 'Κοινόχρηστα Γραφείου', 'group_type': 'fixed', 'category_type': 'common_charges', 'icon': 'Building2', 'color': 'slate', 'order': 2},
            {'name': 'Ασφάλεια Επαγγελματικής Ευθύνης', 'group_type': 'fixed', 'category_type': 'insurance', 'icon': 'Shield', 'color': 'red', 'order': 3},
            {'name': 'Ασφάλεια Γραφείου', 'group_type': 'fixed', 'category_type': 'insurance', 'icon': 'ShieldCheck', 'color': 'red', 'order': 4},
            
            # ─── ΛΕΙΤΟΥΡΓΙΚΑ ΕΞΟΔΑ ───
            {'name': 'ΔΕΗ Γραφείου', 'group_type': 'operational', 'category_type': 'utilities', 'icon': 'Zap', 'color': 'amber', 'order': 1},
            {'name': 'Νερό Γραφείου', 'group_type': 'operational', 'category_type': 'utilities', 'icon': 'Droplet', 'color': 'cyan', 'order': 2},
            {'name': 'Τηλεφωνία & Internet', 'group_type': 'operational', 'category_type': 'utilities', 'icon': 'Phone', 'color': 'blue', 'order': 3},
            {'name': 'Γραφική Ύλη & Αναλώσιμα', 'group_type': 'operational', 'category_type': 'office_supplies', 'icon': 'Pencil', 'color': 'purple', 'order': 4},
            {'name': 'Συνδρομή Digital Concierge', 'group_type': 'operational', 'category_type': 'platform', 'icon': 'Monitor', 'color': 'indigo', 'order': 5},
            {'name': 'Λογισμικό & Εφαρμογές', 'group_type': 'operational', 'category_type': 'platform', 'icon': 'Cloud', 'color': 'indigo', 'order': 6},
            {'name': 'Hosting & Domains', 'group_type': 'operational', 'category_type': 'platform', 'icon': 'Server', 'color': 'indigo', 'order': 7},
            {'name': 'Εξοπλισμός Γραφείου', 'group_type': 'operational', 'category_type': 'equipment', 'icon': 'Laptop', 'color': 'violet', 'order': 8},
            {'name': 'Συντήρηση & Επισκευές', 'group_type': 'operational', 'category_type': 'maintenance', 'icon': 'Wrench', 'color': 'orange', 'order': 9},
            {'name': 'Μετακινήσεις & Καύσιμα', 'group_type': 'operational', 'category_type': 'transport', 'icon': 'Car', 'color': 'emerald', 'order': 10},
            
            # ─── ΣΥΝΕΡΓΑΤΕΣ & ΕΞΩΤΕΡΙΚΟΙ ───
            {'name': 'Λογιστής', 'group_type': 'collaborators', 'category_type': 'accountant', 'icon': 'Calculator', 'color': 'emerald', 'order': 1},
            {'name': 'Δικηγόρος', 'group_type': 'collaborators', 'category_type': 'lawyer', 'icon': 'Scale', 'color': 'emerald', 'order': 2},
            {'name': 'Τεχνικός Σύμβουλος', 'group_type': 'collaborators', 'category_type': 'technical_consultant', 'icon': 'HardHat', 'color': 'amber', 'order': 3},
            {'name': 'Μηχανικός', 'group_type': 'collaborators', 'category_type': 'external_services', 'icon': 'Compass', 'color': 'blue', 'order': 4},
            {'name': 'Εξωτερικές Υπηρεσίες', 'group_type': 'collaborators', 'category_type': 'external_services', 'icon': 'Briefcase', 'color': 'slate', 'order': 5},
            
            # ─── ΠΡΟΜΗΘΕΥΤΕΣ ───
            {'name': 'Υλικά & Προμήθειες', 'group_type': 'suppliers', 'category_type': 'supplier_materials', 'icon': 'Package', 'color': 'rose', 'order': 1},
            {'name': 'Υπηρεσίες Προμηθευτών', 'group_type': 'suppliers', 'category_type': 'supplier_services', 'icon': 'Truck', 'color': 'rose', 'order': 2},
            {'name': 'Υπεργολάβοι', 'group_type': 'suppliers', 'category_type': 'subcontractors', 'icon': 'Users', 'color': 'rose', 'order': 3},
            
            # ─── ΠΡΟΣΩΠΙΚΟ ───
            {'name': 'Μισθοδοσία', 'group_type': 'staff', 'category_type': 'salaries', 'icon': 'UserCheck', 'color': 'blue', 'order': 1},
            {'name': 'Ασφαλιστικές Εισφορές', 'group_type': 'staff', 'category_type': 'social_security', 'icon': 'Shield', 'color': 'blue', 'order': 2},
            {'name': 'Παροχές Προσωπικού', 'group_type': 'staff', 'category_type': 'benefits', 'icon': 'Gift', 'color': 'blue', 'order': 3},
            
            # ─── ΦΟΡΟΙ & ΝΟΜΙΚΑ ───
            {'name': 'Φόροι & Τέλη', 'group_type': 'taxes_legal', 'category_type': 'taxes', 'icon': 'Receipt', 'color': 'orange', 'order': 1},
            {'name': 'Νομικά Έξοδα', 'group_type': 'taxes_legal', 'category_type': 'legal_fees', 'icon': 'Gavel', 'color': 'orange', 'order': 2},
            {'name': 'Πρόστιμα', 'group_type': 'taxes_legal', 'category_type': 'fines', 'icon': 'AlertTriangle', 'color': 'red', 'order': 3},
            
            # ─── ΛΟΙΠΑ ───
            {'name': 'Διαφήμιση & Marketing', 'group_type': 'other', 'category_type': 'marketing', 'icon': 'Megaphone', 'color': 'pink', 'order': 1},
            {'name': 'Εκδηλώσεις', 'group_type': 'other', 'category_type': 'events', 'icon': 'Calendar', 'color': 'pink', 'order': 2},
            {'name': 'Τραπεζικά Έξοδα', 'group_type': 'other', 'category_type': 'bank_fees', 'icon': 'CreditCard', 'color': 'slate', 'order': 3},
            {'name': 'Λοιπά Έξοδα', 'group_type': 'other', 'category_type': 'other', 'icon': 'MoreHorizontal', 'color': 'slate', 'order': 99},
        ]
        
        for cat_data in expense_categories:
            OfficeExpenseCategory.objects.update_or_create(
                name=cat_data['name'],
                defaults={
                    'group_type': cat_data['group_type'],
                    'category_type': cat_data['category_type'],
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'display_order': cat_data['order'],
                    'is_system': True,
                }
            )
        
        # ═══════════════════════════════════════════════════════════════
        # ΚΑΤΗΓΟΡΙΕΣ ΕΣΟΔΩΝ
        # ═══════════════════════════════════════════════════════════════
        income_categories = [
            # ─── ΑΜΟΙΒΕΣ ΚΤΙΡΙΩΝ (συνδέονται με δαπάνες διαχείρισης) ───
            {'name': 'Αμοιβή Διαχείρισης (Μηνιαία)', 'group_type': 'building_fees', 'category_type': 'management_fee_monthly', 'icon': 'Euro', 'color': 'emerald', 'order': 1, 'links_to_management': True},
            {'name': 'Αμοιβή Διαχείρισης (Ετήσια)', 'group_type': 'building_fees', 'category_type': 'management_fee_annual', 'icon': 'Euro', 'color': 'emerald', 'order': 2, 'links_to_management': True},
            {'name': 'Αμοιβή Έκτακτης Γ.Σ.', 'group_type': 'building_fees', 'category_type': 'special_assembly_fee', 'icon': 'Users', 'color': 'emerald', 'order': 3, 'links_to_management': True},
            {'name': 'Αμοιβή Ελέγχου/Απολογισμού', 'group_type': 'building_fees', 'category_type': 'audit_fee', 'icon': 'ClipboardCheck', 'color': 'emerald', 'order': 4, 'links_to_management': True},
            
            # ─── ΥΠΗΡΕΣΙΕΣ ───
            {'name': 'Έκδοση Πιστοποιητικών', 'group_type': 'services', 'category_type': 'certificate_issue', 'icon': 'FileCheck', 'color': 'blue', 'order': 1, 'links_to_management': False},
            {'name': 'Παράσταση σε Γ.Σ.', 'group_type': 'services', 'category_type': 'assembly_attendance', 'icon': 'Users', 'color': 'blue', 'order': 2, 'links_to_management': False},
            {'name': 'Τεχνική Συμβουλή', 'group_type': 'services', 'category_type': 'technical_advice', 'icon': 'Lightbulb', 'color': 'amber', 'order': 3, 'links_to_management': False},
            {'name': 'Διαμεσολάβηση', 'group_type': 'services', 'category_type': 'mediation', 'icon': 'Handshake', 'color': 'blue', 'order': 4, 'links_to_management': False},
            {'name': 'Σύνταξη Εγγράφων', 'group_type': 'services', 'category_type': 'document_preparation', 'icon': 'FileText', 'color': 'blue', 'order': 5, 'links_to_management': False},
            {'name': 'Επίβλεψη Έργων', 'group_type': 'services', 'category_type': 'project_supervision', 'icon': 'Eye', 'color': 'violet', 'order': 6, 'links_to_management': False},
            
            # ─── ΠΡΟΜΗΘΕΙΕΣ ───
            {'name': 'Προμήθεια Συνεργείου', 'group_type': 'commissions', 'category_type': 'contractor_commission', 'icon': 'Percent', 'color': 'purple', 'order': 1, 'links_to_management': False},
            {'name': 'Προμήθεια Προμηθευτή', 'group_type': 'commissions', 'category_type': 'supplier_commission', 'icon': 'Percent', 'color': 'purple', 'order': 2, 'links_to_management': False},
            {'name': 'Προμήθεια Ασφάλειας', 'group_type': 'commissions', 'category_type': 'insurance_commission', 'icon': 'Percent', 'color': 'purple', 'order': 3, 'links_to_management': False},
            
            # ─── ΛΟΙΠΑ ───
            {'name': 'Τόκοι Καταθέσεων', 'group_type': 'other', 'category_type': 'interest_income', 'icon': 'TrendingUp', 'color': 'emerald', 'order': 1, 'links_to_management': False},
            {'name': 'Προσαυξήσεις Καθυστέρησης', 'group_type': 'other', 'category_type': 'late_payment_fees', 'icon': 'Clock', 'color': 'orange', 'order': 2, 'links_to_management': False},
            {'name': 'Λοιπά Έσοδα', 'group_type': 'other', 'category_type': 'other', 'icon': 'Plus', 'color': 'slate', 'order': 99, 'links_to_management': False},
        ]
        
        for cat_data in income_categories:
            OfficeIncomeCategory.objects.update_or_create(
                name=cat_data['name'],
                defaults={
                    'group_type': cat_data['group_type'],
                    'category_type': cat_data['category_type'],
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'display_order': cat_data['order'],
                    'links_to_management_expense': cat_data['links_to_management'],
                    'is_system': True,
                }
            )
        
        logger.info("Default office finance categories created/updated")


# Global service instance
office_finance_service = OfficeFinanceService()


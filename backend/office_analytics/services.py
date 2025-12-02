"""
Office Analytics Service
Provides comprehensive analytics for Management Offices (Γραφεία Διαχείρισης)
Aggregates data across ALL buildings for a unified "Command Center" view.
"""

from django.db.models import Sum, Count, Q, F, Avg, Case, When, Value, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction, MonthlyBalance
from maintenance.models import ScheduledMaintenance
from user_requests.models import UserRequest

logger = logging.getLogger(__name__)


class OfficeAnalyticsService:
    """
    Service για συγκεντρωτική ανάλυση όλων των κτιρίων του γραφείου.
    Παρέχει KPIs, alerts, και reports για τον Office Manager.
    """

    @staticmethod
    def get_portfolio_overview(user=None) -> dict:
        """
        Επιστρέφει συνοπτική εικόνα του χαρτοφυλακίου.
        
        Returns:
            dict: {
                'total_buildings': int,
                'total_apartments': int,
                'total_residents': int,
                'total_balance': Decimal,
                'total_obligations': Decimal,
                'total_reserve': Decimal,
                'collection_rate': float,
            }
        """
        try:
            # Βασικά στατιστικά
            buildings = Building.objects.all()
            total_buildings = buildings.count()
            total_apartments = Apartment.objects.count()
            
            # Υπολογισμός συνολικών υποχρεώσεων και υπολοίπων
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            # Συνολικές οφειλές από όλα τα διαμερίσματα
            apartments_data = Apartment.objects.aggregate(
                total_balance=Coalesce(Sum('current_balance'), Decimal('0.00')),
            )
            
            # Συνολικό αποθεματικό από MonthlyBalance
            reserve_data = MonthlyBalance.objects.filter(
                year=current_year,
                month=current_month
            ).aggregate(
                total_reserve=Coalesce(Sum('reserve_fund_amount'), Decimal('0.00')),
            )
            
            # Συνολικές πληρωμές τρέχοντος μήνα
            month_start = datetime(current_year, current_month, 1).date()
            payments_this_month = Payment.objects.filter(
                date__gte=month_start
            ).aggregate(
                total=Coalesce(Sum('amount'), Decimal('0.00'))
            )['total']
            
            # Συνολικές δαπάνες τρέχοντος μήνα
            expenses_this_month = Expense.objects.filter(
                date__gte=month_start
            ).aggregate(
                total=Coalesce(Sum('amount'), Decimal('0.00'))
            )['total']
            
            # Collection rate υπολογισμός
            total_obligations = abs(apartments_data['total_balance']) if apartments_data['total_balance'] else Decimal('0.00')
            collection_rate = 0.0
            if total_obligations > 0:
                collection_rate = min(100.0, float(payments_this_month / total_obligations * 100))
            
            return {
                'total_buildings': total_buildings,
                'total_apartments': total_apartments,
                'total_balance': float(apartments_data['total_balance'] or 0),
                'total_obligations': float(total_obligations),
                'total_reserve': float(reserve_data['total_reserve'] or 0),
                'payments_this_month': float(payments_this_month),
                'expenses_this_month': float(expenses_this_month),
                'collection_rate': round(collection_rate, 1),
                'period': {
                    'month': current_month,
                    'year': current_year,
                }
            }
        except Exception as e:
            logger.error(f"Error in get_portfolio_overview: {e}")
            return {}

    @staticmethod
    def get_buildings_financial_status() -> list:
        """
        Επιστρέφει οικονομική κατάσταση ανά κτίριο.
        Ταξινομημένη με τα "κόκκινα" κτίρια πρώτα.
        
        Returns:
            list: [{
                'id': int,
                'name': str,
                'address': str,
                'apartments_count': int,
                'total_balance': Decimal,
                'total_obligations': Decimal,
                'reserve_fund': Decimal,
                'collection_rate': float,
                'status': 'critical' | 'warning' | 'healthy',
            }]
        """
        try:
            buildings = Building.objects.all()
            result = []
            
            for building in buildings:
                apartments = Apartment.objects.filter(building=building)
                apartments_count = apartments.count()
                
                # Υπολογισμός υπολοίπων
                balance_data = apartments.aggregate(
                    total_balance=Coalesce(Sum('current_balance'), Decimal('0.00'))
                )
                total_balance = balance_data['total_balance'] or Decimal('0.00')
                
                # Αποθεματικό από MonthlyBalance
                current_month = timezone.now().month
                current_year = timezone.now().year
                monthly_balance = MonthlyBalance.objects.filter(
                    building=building,
                    year=current_year,
                    month=current_month
                ).first()
                
                reserve_fund = monthly_balance.reserve_fund_amount if monthly_balance else Decimal('0.00')
                
                # Πληρωμές τρέχοντος μήνα
                month_start = datetime(current_year, current_month, 1).date()
                payments = Payment.objects.filter(
                    apartment__building=building,
                    date__gte=month_start
                ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
                
                # Υπολογισμός κατάστασης
                total_obligations = abs(total_balance) if total_balance < 0 else Decimal('0.00')
                collection_rate = 0.0
                if total_obligations > 0:
                    collection_rate = min(100.0, float(payments / total_obligations * 100))
                
                # Καθορισμός status
                if total_balance < -1000:  # Πάνω από 1000€ χρέος
                    status = 'critical'
                elif total_balance < -200:  # Πάνω από 200€ χρέος
                    status = 'warning'
                else:
                    status = 'healthy'
                
                result.append({
                    'id': building.id,
                    'name': building.name,
                    'address': building.address,
                    'apartments_count': apartments_count,
                    'total_balance': float(total_balance),
                    'total_obligations': float(total_obligations),
                    'reserve_fund': float(reserve_fund),
                    'collection_rate': round(collection_rate, 1),
                    'status': status,
                })
            
            # Ταξινόμηση: critical πρώτα, μετά warning, μετά healthy
            status_order = {'critical': 0, 'warning': 1, 'healthy': 2}
            result.sort(key=lambda x: (status_order[x['status']], x['total_balance']))
            
            return result
        except Exception as e:
            logger.error(f"Error in get_buildings_financial_status: {e}")
            return []

    @staticmethod
    def get_top_debtors(limit: int = 10) -> list:
        """
        Επιστρέφει τους μεγαλύτερους οφειλέτες από όλα τα κτίρια.
        
        Args:
            limit: Μέγιστος αριθμός αποτελεσμάτων
            
        Returns:
            list: [{
                'apartment_id': int,
                'apartment_number': str,
                'building_name': str,
                'building_id': int,
                'owner_name': str,
                'balance': Decimal,
                'last_payment_date': date | None,
                'days_overdue': int,
            }]
        """
        try:
            # Διαμερίσματα με αρνητικό υπόλοιπο (χρέος)
            debtors = Apartment.objects.filter(
                current_balance__lt=0
            ).select_related('building').order_by('current_balance')[:limit]
            
            result = []
            for apt in debtors:
                # Τελευταία πληρωμή
                last_payment = Payment.objects.filter(
                    apartment=apt
                ).order_by('-date').first()
                
                last_payment_date = last_payment.date if last_payment else None
                
                # Υπολογισμός ημερών καθυστέρησης
                days_overdue = 0
                if last_payment_date:
                    days_overdue = (timezone.now().date() - last_payment_date).days
                else:
                    # Αν δεν υπάρχει πληρωμή, υπολογίζουμε από την ημερομηνία δημιουργίας
                    days_overdue = (timezone.now().date() - apt.created_at.date()).days if hasattr(apt, 'created_at') else 0
                
                result.append({
                    'apartment_id': apt.id,
                    'apartment_number': apt.number,
                    'building_name': apt.building.name,
                    'building_id': apt.building.id,
                    'owner_name': apt.owner_name or 'Άγνωστος',
                    'balance': float(apt.current_balance),
                    'last_payment_date': last_payment_date.isoformat() if last_payment_date else None,
                    'days_overdue': days_overdue,
                })
            
            return result
        except Exception as e:
            logger.error(f"Error in get_top_debtors: {e}")
            return []

    @staticmethod
    def get_pending_maintenance_tasks() -> list:
        """
        Επιστρέφει εκκρεμή αιτήματα συντήρησης από όλα τα κτίρια.
        
        Returns:
            list: [{
                'id': int,
                'title': str,
                'building_name': str,
                'building_id': int,
                'status': str,
                'priority': str,
                'created_at': datetime,
                'days_pending': int,
            }]
        """
        try:
            # Εκκρεμή αιτήματα
            pending_requests = UserRequest.objects.filter(
                status__in=['pending', 'in_progress', 'approved', 'scheduled']
            ).select_related('building').order_by('-created_at')[:20]
            
            result = []
            for req in pending_requests:
                days_pending = (timezone.now() - req.created_at).days if req.created_at else 0
                
                result.append({
                    'id': req.id,
                    'title': req.title,
                    'building_name': req.building.name if req.building else 'Γενικό',
                    'building_id': req.building.id if req.building else None,
                    'status': req.status,
                    'priority': getattr(req, 'priority', 'normal'),
                    'created_at': req.created_at.isoformat() if req.created_at else None,
                    'days_pending': days_pending,
                })
            
            return result
        except Exception as e:
            logger.error(f"Error in get_pending_maintenance_tasks: {e}")
            return []

    @staticmethod
    def get_monthly_cash_flow(months: int = 6) -> list:
        """
        Επιστρέφει cash flow για τους τελευταίους μήνες.
        
        Args:
            months: Αριθμός μηνών για ανάλυση
            
        Returns:
            list: [{
                'month': str (MM/YYYY),
                'income': Decimal,
                'expenses': Decimal,
                'net': Decimal,
            }]
        """
        try:
            result = []
            today = timezone.now().date()
            
            for i in range(months - 1, -1, -1):
                # Υπολογισμός μήνα
                target_date = today - timedelta(days=30 * i)
                month = target_date.month
                year = target_date.year
                
                month_start = datetime(year, month, 1).date()
                if month == 12:
                    month_end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
                else:
                    month_end = datetime(year, month + 1, 1).date() - timedelta(days=1)
                
                # Εισπράξεις
                income = Payment.objects.filter(
                    date__gte=month_start,
                    date__lte=month_end
                ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
                
                # Δαπάνες
                expenses = Expense.objects.filter(
                    date__gte=month_start,
                    date__lte=month_end
                ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
                
                result.append({
                    'month': f"{month:02d}/{year}",
                    'income': float(income),
                    'expenses': float(expenses),
                    'net': float(income - expenses),
                })
            
            return result
        except Exception as e:
            logger.error(f"Error in get_monthly_cash_flow: {e}")
            return []

    @staticmethod
    def get_alerts() -> list:
        """
        Επιστρέφει alerts/ειδοποιήσεις για τον διαχειριστή.
        
        Returns:
            list: [{
                'type': 'critical' | 'warning' | 'info',
                'category': str,
                'message': str,
                'action_url': str | None,
            }]
        """
        try:
            alerts = []
            
            # Alert 1: Κτίρια με αρνητικό ταμείο
            critical_buildings = Building.objects.annotate(
                total_balance=Coalesce(
                    Sum('apartments__current_balance'),
                    Decimal('0.00')
                )
            ).filter(total_balance__lt=-500)
            
            for building in critical_buildings:
                alerts.append({
                    'type': 'critical',
                    'category': 'financial',
                    'message': f"Το κτίριο '{building.name}' έχει αρνητικό ταμείο ({building.total_balance:.2f}€)",
                    'action_url': f"/buildings/{building.id}/financial",
                })
            
            # Alert 2: Αιτήματα που εκκρεμούν πάνω από 7 ημέρες
            week_ago = timezone.now() - timedelta(days=7)
            old_requests = UserRequest.objects.filter(
                status__in=['pending', 'in_progress'],
                created_at__lt=week_ago
            ).count()
            
            if old_requests > 0:
                alerts.append({
                    'type': 'warning',
                    'category': 'maintenance',
                    'message': f"{old_requests} αιτήματα εκκρεμούν πάνω από 7 ημέρες",
                    'action_url': "/requests",
                })
            
            # Alert 3: Διαμερίσματα με μεγάλες οφειλές (>500€)
            high_debt_count = Apartment.objects.filter(
                current_balance__lt=-500
            ).count()
            
            if high_debt_count > 0:
                alerts.append({
                    'type': 'warning',
                    'category': 'financial',
                    'message': f"{high_debt_count} διαμερίσματα με οφειλές άνω των 500€",
                    'action_url': "/office-dashboard#debtors",
                })
            
            return alerts
        except Exception as e:
            logger.error(f"Error in get_alerts: {e}")
            return []

    @staticmethod
    def get_full_dashboard() -> dict:
        """
        Επιστρέφει όλα τα δεδομένα για το Office Dashboard.
        """
        return {
            'overview': OfficeAnalyticsService.get_portfolio_overview(),
            'buildings': OfficeAnalyticsService.get_buildings_financial_status(),
            'top_debtors': OfficeAnalyticsService.get_top_debtors(),
            'pending_tasks': OfficeAnalyticsService.get_pending_maintenance_tasks(),
            'cash_flow': OfficeAnalyticsService.get_monthly_cash_flow(),
            'alerts': OfficeAnalyticsService.get_alerts(),
            'generated_at': timezone.now().isoformat(),
        }


# Global service instance
office_analytics_service = OfficeAnalyticsService()


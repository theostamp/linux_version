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
            
            # 📝 ΔΙΟΡΘΩΣΗ 2025-12-03: Χρήση net_obligation για consistent data με Financial Page
            # net_obligation = previous_balance + expenses - payments (για τον μήνα)
            from financial.services import FinancialDashboardService
            
            # Τρέχων μήνας σε format YYYY-MM
            current_month_str = f"{current_year}-{current_month:02d}"
            
            # Υπολογισμός συνολικών οφειλών από όλα τα κτίρια
            total_obligations = Decimal('0.00')
            total_balance_calculated = Decimal('0.00')
            
            for building in buildings:
                try:
                    service = FinancialDashboardService(building.id)
                    apt_balances = service.get_apartment_balances(month=current_month_str)
                    
                    # Άθροισμα net_obligation (θετικό = οφειλή)
                    building_obligations = sum(
                        Decimal(str(apt.get('net_obligation', 0)))
                        for apt in apt_balances
                        if apt.get('net_obligation', 0) > 0
                    )
                    total_obligations += building_obligations
                    
                    # Υπολογισμός total balance (για reference)
                    building_balance = sum(
                        Decimal(str(apt.get('net_obligation', 0)))
                        for apt in apt_balances
                    )
                    total_balance_calculated += building_balance
                except Exception as e:
                    logger.warning(f"Error calculating obligations for building {building.id}: {e}")
            
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
            collection_rate = 0.0
            if total_obligations > 0:
                collection_rate = min(100.0, float(payments_this_month / total_obligations * 100))
            
            return {
                'total_buildings': total_buildings,
                'total_apartments': total_apartments,
                'total_balance': float(total_balance_calculated),
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
            # 📝 ΔΙΟΡΘΩΣΗ 2025-12-03: Χρήση net_obligation για consistent data με Financial Page
            from financial.services import FinancialDashboardService
            
            buildings = Building.objects.all()
            result = []
            
            current_month = timezone.now().month
            current_year = timezone.now().year
            current_month_str = f"{current_year}-{current_month:02d}"
            
            for building in buildings:
                apartments = Apartment.objects.filter(building=building)
                apartments_count = apartments.count()
                
                # Χρήση FinancialDashboardService για consistent υπολογισμούς
                try:
                    service = FinancialDashboardService(building.id)
                    apt_balances = service.get_apartment_balances(month=current_month_str)
                    
                    # Υπολογισμός total_balance και total_obligations από net_obligation
                    total_balance = sum(
                        Decimal(str(apt.get('net_obligation', 0)))
                        for apt in apt_balances
                    )
                    total_obligations = sum(
                        Decimal(str(apt.get('net_obligation', 0)))
                        for apt in apt_balances
                        if apt.get('net_obligation', 0) > 0  # Θετικά = Οφειλές
                    )
                except Exception as e:
                    logger.warning(f"Error getting apartment balances for building {building.id}: {e}")
                    total_balance = Decimal('0.00')
                    total_obligations = Decimal('0.00')
                
                # Αποθεματικό από MonthlyBalance
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
                
                collection_rate = 0.0
                if total_obligations > 0:
                    collection_rate = min(100.0, float(payments / total_obligations * 100))
                
                # Καθορισμός status (θετικό net_obligation = χρέος)
                if total_obligations > 1000:  # Πάνω από 1000€ χρέος
                    status = 'critical'
                elif total_obligations > 200:  # Πάνω από 200€ χρέος
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
            # 📝 ΔΙΟΡΘΩΣΗ 2025-12-03: Χρήση net_obligation για consistent data με Financial Page
            from financial.services import FinancialDashboardService
            
            current_month = timezone.now().month
            current_year = timezone.now().year
            current_month_str = f"{current_year}-{current_month:02d}"
            
            # Συλλογή όλων των διαμερισμάτων με οφειλές
            all_debtors = []
            
            for building in Building.objects.all():
                try:
                    service = FinancialDashboardService(building.id)
                    apt_balances = service.get_apartment_balances(month=current_month_str)
                    
                    for apt_data in apt_balances:
                        net_obligation = float(apt_data.get('net_obligation', 0))
                        if net_obligation > 0:  # Θετικό net_obligation = Οφειλή
                            # Τελευταία πληρωμή
                            apt = Apartment.objects.get(id=apt_data['apartment_id'])
                            last_payment = Payment.objects.filter(
                                apartment=apt
                            ).order_by('-date').first()
                            
                            last_payment_date = last_payment.date if last_payment else None
                            
                            # Υπολογισμός ημερών καθυστέρησης
                            days_overdue = 0
                            if last_payment_date:
                                days_overdue = (timezone.now().date() - last_payment_date).days
                            else:
                                days_overdue = (timezone.now().date() - apt.created_at.date()).days if hasattr(apt, 'created_at') else 0
                            
                            all_debtors.append({
                                'apartment_id': apt.id,
                                'apartment_number': apt.number,
                                'building_name': building.name,
                                'building_id': building.id,
                                'owner_name': apt.owner_name or 'Άγνωστος',
                                'balance': net_obligation,
                                'last_payment_date': last_payment_date.isoformat() if last_payment_date else None,
                                'days_overdue': days_overdue,
                            })
                except Exception as e:
                    logger.warning(f"Error getting debtors for building {building.id}: {e}")
            
            # Ταξινόμηση κατά φθίνουσα σειρά οφειλής και περιορισμός στα top N
            all_debtors.sort(key=lambda x: x['balance'], reverse=True)
            return all_debtors[:limit]
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
            # 📝 ΔΙΟΡΘΩΣΗ 2025-12-03: Χρήση net_obligation για consistent data με Financial Page
            from financial.services import FinancialDashboardService
            
            alerts = []
            
            current_month = timezone.now().month
            current_year = timezone.now().year
            current_month_str = f"{current_year}-{current_month:02d}"
            
            # Alert 1: Κτίρια με σημαντικές οφειλές (>500€ net_obligation)
            for building in Building.objects.all():
                try:
                    service = FinancialDashboardService(building.id)
                    apt_balances = service.get_apartment_balances(month=current_month_str)
                    
                    # Υπολογισμός συνολικών οφειλών με net_obligation
                    total_obligations = sum(
                        float(apt.get('net_obligation', 0))
                        for apt in apt_balances
                        if apt.get('net_obligation', 0) > 0
                    )
                    
                    if total_obligations > 500:
                        alerts.append({
                            'type': 'critical',
                            'category': 'financial',
                            'message': f"Το κτίριο '{building.name}' έχει οφειλές {total_obligations:.2f}€",
                            'action_url': f"/financial?building={building.id}",
                        })
                except Exception as e:
                    logger.warning(f"Error calculating alerts for building {building.id}: {e}")
            
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
            
            # Alert 3: Διαμερίσματα με μεγάλες οφειλές (>500€ net_obligation)
            high_debt_count = 0
            for building in Building.objects.all():
                try:
                    service = FinancialDashboardService(building.id)
                    apt_balances = service.get_apartment_balances(month=current_month_str)
                    
                    high_debt_count += sum(
                        1 for apt in apt_balances
                        if apt.get('net_obligation', 0) > 500
                    )
                except Exception as e:
                    logger.warning(f"Error counting high debt apartments for building {building.id}: {e}")
            
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
            'portfolio_insights': OfficeAnalyticsService.get_portfolio_insights(),
            'buildings': OfficeAnalyticsService.get_buildings_financial_status(),
            'top_debtors': OfficeAnalyticsService.get_top_debtors(),
            'pending_tasks': OfficeAnalyticsService.get_pending_maintenance_tasks(),
            'cash_flow': OfficeAnalyticsService.get_monthly_cash_flow(),
            'alerts': OfficeAnalyticsService.get_alerts(),
            'generated_at': timezone.now().isoformat(),
        }

    @staticmethod
    def get_portfolio_insights() -> dict:
        """
        Επιστρέφει μη-οικονομικά insights για το χαρτοφυλάκιο.
        """
        try:
            buildings = Building.objects.all()
            apartments = Apartment.objects.all()

            total_buildings = buildings.count()
            total_apartments = apartments.count()

            closed_apartments = apartments.filter(is_closed=True).count()
            active_apartments = apartments.filter(is_closed=False)
            active_apartments_count = max(total_apartments - closed_apartments, 0)

            owners_qs = active_apartments.exclude(owner_name__isnull=True).exclude(owner_name__exact='')
            tenants_qs = active_apartments.exclude(tenant_name__isnull=True).exclude(tenant_name__exact='')

            owners_count = owners_qs.values_list('owner_name', flat=True).distinct().count()
            tenants_count = tenants_qs.values_list('tenant_name', flat=True).distinct().count()

            occupied_apartments = active_apartments.filter(
                Q(owner_name__isnull=False, owner_name__gt='') |
                Q(tenant_name__isnull=False, tenant_name__gt='')
            ).count()
            empty_apartments = max(active_apartments_count - occupied_apartments, 0)

            occupancy_rate = 0.0
            if total_apartments > 0:
                occupancy_rate = round((occupied_apartments / total_apartments) * 100, 1)

            today = timezone.now().date()
            trial_building_ids = buildings.filter(trial_ends_at__gte=today).values_list('id', flat=True)

            premium_iot_count = buildings.filter(iot_enabled=True).exclude(id__in=trial_building_ids).count()
            premium_count = buildings.filter(premium_enabled=True, iot_enabled=False).exclude(id__in=trial_building_ids).count()
            standard_count = buildings.exclude(id__in=trial_building_ids).exclude(iot_enabled=True).exclude(premium_enabled=True).count()
            trial_count = buildings.filter(trial_ends_at__gte=today).count()

            city_rows = (
                buildings.values('city')
                .annotate(
                    buildings_count=Count('id'),
                    apartments_count=Coalesce(Sum('apartments_count'), 0)
                )
                .order_by('-buildings_count', 'city')
            )

            city_breakdown = []
            for row in city_rows:
                city_breakdown.append({
                    'city': row['city'] or 'Άγνωστη',
                    'buildings': int(row['buildings_count'] or 0),
                    'apartments': int(row['apartments_count'] or 0),
                })

            directory_rows = buildings.order_by('name').values(
                'id', 'name', 'city', 'apartments_count', 'premium_enabled', 'iot_enabled', 'trial_ends_at'
            )[:24]
            building_directory = []
            for row in directory_rows:
                trial_active = bool(row['trial_ends_at'] and row['trial_ends_at'] >= today)
                building_directory.append({
                    'id': row['id'],
                    'name': row['name'],
                    'city': row['city'] or 'Άγνωστη',
                    'apartments_count': row['apartments_count'] or 0,
                    'premium_enabled': bool(row['premium_enabled']),
                    'iot_enabled': bool(row['iot_enabled']),
                    'trial_active': trial_active,
                })

            return {
                'totals': {
                    'buildings': total_buildings,
                    'apartments': total_apartments,
                    'owners': owners_count,
                    'tenants': tenants_count,
                    'residents': owners_count + tenants_count,
                    'occupied_apartments': occupied_apartments,
                    'empty_apartments': empty_apartments,
                    'closed_apartments': closed_apartments,
                    'occupancy_rate': occupancy_rate,
                    'premium_buildings': premium_count,
                    'premium_iot_buildings': premium_iot_count,
                    'standard_buildings': standard_count,
                    'trial_buildings': trial_count,
                },
                'premium_breakdown': {
                    'premium_iot': premium_iot_count,
                    'premium': premium_count,
                    'standard': standard_count,
                    'trial': trial_count,
                },
                'occupancy_breakdown': {
                    'occupied': occupied_apartments,
                    'empty': empty_apartments,
                    'closed': closed_apartments,
                },
                'city_breakdown': city_breakdown,
                'building_directory': building_directory,
            }
        except Exception as e:
            logger.error(f"Error in get_portfolio_insights: {e}")
            return {}

    @staticmethod
    def search_residents(query: str, limit: int = 20) -> list:
        """
        Αναζήτηση κατοίκων (ιδιοκτήτες/ενοικιαστές) με βάση όνομα ή στοιχεία.
        """
        try:
            query = (query or '').strip()
            if not query:
                return []

            query_lower = query.lower()
            apartments = Apartment.objects.select_related('building').filter(is_closed=False).filter(
                Q(owner_name__icontains=query) |
                Q(tenant_name__icontains=query) |
                Q(owner_email__icontains=query) |
                Q(tenant_email__icontains=query) |
                Q(owner_phone__icontains=query) |
                Q(owner_phone2__icontains=query) |
                Q(tenant_phone__icontains=query) |
                Q(tenant_phone2__icontains=query) |
                Q(number__icontains=query)
            ).order_by('building__name', 'number')[: max(limit * 3, 20)]

            results = []
            for apartment in apartments:
                owner_fields = [
                    apartment.owner_name,
                    apartment.owner_email,
                    apartment.owner_phone,
                    apartment.owner_phone2,
                ]
                tenant_fields = [
                    apartment.tenant_name,
                    apartment.tenant_email,
                    apartment.tenant_phone,
                    apartment.tenant_phone2,
                ]
                matches_owner = any(
                    field and query_lower in str(field).lower()
                    for field in owner_fields
                )
                matches_tenant = any(
                    field and query_lower in str(field).lower()
                    for field in tenant_fields
                )

                if apartment.owner_name and matches_owner:
                    results.append({
                        'name': apartment.owner_name,
                        'role': 'owner',
                        'building_id': apartment.building_id,
                        'building_name': apartment.building.name,
                        'apartment_number': apartment.number,
                        'email': apartment.owner_email,
                        'phone': apartment.owner_phone,
                    })
                if apartment.tenant_name and matches_tenant:
                    results.append({
                        'name': apartment.tenant_name,
                        'role': 'tenant',
                        'building_id': apartment.building_id,
                        'building_name': apartment.building.name,
                        'apartment_number': apartment.number,
                        'email': apartment.tenant_email,
                        'phone': apartment.tenant_phone,
                    })
                if len(results) >= limit:
                    break

            return results[:limit]
        except Exception as e:
            logger.error(f"Error in search_residents: {e}")
            return []


# Global service instance
office_analytics_service = OfficeAnalyticsService()

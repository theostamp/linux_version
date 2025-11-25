import logging
import re
from datetime import datetime, timedelta

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django_tenants.utils import schema_context
from announcements.models import Announcement
from votes.models import Vote
from buildings.models import Building
from financial.models import Transaction, Expense
from maintenance.models import MaintenanceTicket
from .serializers import AnnouncementPublicSerializer, VotePublicSerializer
from tenants.models import Domain as TenantDomain
from financial.services import FinancialDashboardService

@api_view(['GET'])
@permission_classes([AllowAny])
def building_info(request, building_id: int):
    today = timezone.now().date()
    requested_host = (
        request.headers.get('X-Tenant-Host')
        or request.headers.get('x-forwarded-host')
        or request.headers.get('host')
        or ''
    ).split(':')[0].lower()

    schema_name = 'demo'
    if requested_host:
        domain_entry = (
            TenantDomain.objects.filter(domain__iexact=requested_host)
            .select_related('tenant')
            .first()
        )
        if domain_entry and domain_entry.tenant:
            schema_name = domain_entry.tenant.schema_name

    logger = logging.getLogger('django')
    logger.info("[public_info] Resolving schema", extra={
        'requested_host': requested_host,
        'schema_name': schema_name,
    })

    with schema_context(schema_name):
        # Get building information
        try:
            building = Building.objects.get(id=building_id)
            
            # Get manager user details from public schema
            office_logo = None
            management_office_email = None
            management_office_phone_emergency = None
            manager_office_name = None
            manager_office_phone = None
            manager_office_address = None
            
            from users.models import CustomUser
            
            # Query public schema for manager user
            with schema_context('public'):
                manager_user = None
                
                # First, try to get manager by building.manager_id if it exists
                if building.manager_id:
                    try:
                        manager_user = CustomUser.objects.get(id=building.manager_id)
                    except CustomUser.DoesNotExist:
                        manager_user = None
                
                # If no manager_id or manager not found, search for any user with office details
                if not manager_user:
                    # Find first user with office details (office_name or office_phone filled)
                    manager_user = CustomUser.objects.filter(
                        Q(office_name__isnull=False) & ~Q(office_name='') |
                        Q(office_phone__isnull=False) & ~Q(office_phone='')
                    ).first()
                
                # Extract office details from manager user if found
                if manager_user:
                    manager_office_name = manager_user.office_name or None
                    manager_office_phone = manager_user.office_phone or None
                    management_office_phone_emergency = manager_user.office_phone_emergency or None
                    manager_office_address = manager_user.office_address or None
                    management_office_email = manager_user.email or None
                    
                    # Get logo URL if exists - same approach as /users/me/ endpoint
                    if manager_user.office_logo:
                        office_logo = manager_user.office_logo.url
                    else:
                        office_logo = None
            
            building_info = {
                'id': building.id,
                'name': building.name,
                'address': building.address,
                'city': building.city,
                'postal_code': building.postal_code,
                'apartments_count': building.apartments_count,
                'internal_manager_name': building.internal_manager_name,
                'internal_manager_phone': building.internal_manager_phone,
                # Use building's management office data, fallback to manager's office data
                'management_office_name': building.management_office_name or manager_office_name,
                'management_office_phone': building.management_office_phone or manager_office_phone,
                'management_office_address': building.management_office_address or manager_office_address,
                'management_office_email': management_office_email,
                'management_office_phone_emergency': management_office_phone_emergency,
                'office_logo': office_logo,
            }
        except Building.DoesNotExist:
            building_info = None

        # Include future announcements for kiosk countdown (not just current)
        announcements = Announcement.objects.filter(
            building_id=building_id,
            is_active=True,
            published=True
        ).filter(
            Q(end_date__gte=today) | Q(end_date__isnull=True)
        ).order_by('-priority', '-start_date')

        votes = Vote.objects.filter(
            building_id=building_id,
            is_active=True,
            start_date__lte=today,
            end_date__gte=today,
        ).order_by('-start_date')

        requested_month = request.query_params.get('month') if hasattr(request, 'query_params') else request.GET.get('month')
        if requested_month:
            requested_month = requested_month.strip()
        else:
            requested_month = timezone.now().strftime('%Y-%m')

        # Calculate financial data
        try:
            logger = logging.getLogger('django')
            # Get total credits (payments received) and debits (charges) for collection rate
            # Credits: payments received
            credit_types = ['common_expense_payment', 'expense_payment', 'refund', 'payment_received']
            total_credits = Transaction.objects.filter(
                apartment__building_id=building_id,
                type__in=credit_types
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Debits: charges/expenses
            debit_types = ['common_expense_charge', 'expense_created', 'expense_issued', 'interest_charge', 'penalty_charge']
            total_debits = Transaction.objects.filter(
                apartment__building_id=building_id,
                type__in=debit_types
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Collection rate = (credits / debits) * 100 if debits > 0
            collection_rate = (total_credits / total_debits * 100) if total_debits > 0 else 0

            # Get reserve fund (sum of all reserve fund contributions)
            # Transaction model uses 'description' field
            reserve_fund = Transaction.objects.filter(
                apartment__building_id=building_id,
                description__icontains='εφεδρεί'  # Greek for "reserve"
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Get recent expenses (last 3)
            # Expense model uses 'title' and 'notes' instead of 'description'
            recent_expenses = Expense.objects.filter(
                building_id=building_id
            ).order_by('-date')[:3].values('id', 'title', 'notes', 'amount', 'date')

            # Determine current month period (timezone aware)
            today = timezone.localdate()
            current_month_start = today.replace(day=1)
            first_day_next_month = (current_month_start + timedelta(days=32)).replace(day=1)
            current_month_end = first_day_next_month - timedelta(days=1)

            current_month_expenses_qs = Expense.objects.filter(
                building_id=building_id,
                date__gte=current_month_start,
                date__lte=current_month_end
            ).order_by('-date').values('id', 'title', 'description', 'amount', 'date', 'category')

            current_month_fallback = False
            if not current_month_expenses_qs.exists():
                current_month_fallback = True
                fallback_limit = 10
                current_month_expenses_qs = Expense.objects.filter(
                    building_id=building_id
                ).order_by('-date').values('id', 'title', 'description', 'amount', 'date', 'category')[:fallback_limit]

            current_month_expenses = list(current_month_expenses_qs)

            # Get heating expenses (September to May of current heating season)
            now = timezone.localdate()
            current_year = now.year
            current_month = now.month
            
            # Determine heating season year: if after August, use current year; otherwise use previous year
            heating_year = current_year if current_month >= 9 else current_year - 1
            
            # Heating season: September (heating_year) to May (heating_year + 1)
            def get_heating_period(year: int):
                start = datetime(year, 9, 1).date()
                end = datetime(year + 1, 5, 31).date()
                return start, end

            heating_start_date, heating_end_date = get_heating_period(heating_year)
            
            # Heating keywords for filtering
            heating_keywords = ['θέρμανσ', 'θερμανσ', 'heating', 'πετρέλαιο', 'πετρελαιο', 'αέριο', 'αεριο', 'gas', 'mazout']
            
            # Build Q filter for heating keywords
            heating_q = Q()
            for keyword in heating_keywords:
                heating_q |= Q(title__icontains=keyword) | Q(description__icontains=keyword) | Q(category__icontains=keyword)
            
            heating_qs = Expense.objects.filter(
                building_id=building_id,
                date__gte=heating_start_date,
                date__lte=heating_end_date
            ).filter(heating_q)

            heating_fallback = False

            if not heating_qs.exists():
                previous_year = heating_year - 1
                prev_start, prev_end = get_heating_period(previous_year)
                heating_qs = Expense.objects.filter(
                    building_id=building_id,
                    date__gte=prev_start,
                    date__lte=prev_end
                ).filter(heating_q)
                if heating_qs.exists():
                    heating_year = previous_year
                    heating_start_date, heating_end_date = prev_start, prev_end

            if not heating_qs.exists():
                heating_fallback = True
                fallback_days = 365
                fallback_start = now - timedelta(days=fallback_days)
                heating_start_date = fallback_start
                heating_end_date = now
                heating_qs = Expense.objects.filter(
                    building_id=building_id,
                    date__gte=fallback_start,
                    date__lte=now
                ).filter(heating_q)

            heating_expenses = list(
                heating_qs.order_by('date').values('id', 'title', 'description', 'amount', 'date', 'category')
            )

            # Debug logging
            logger.info(f"[public_info] Building {building_id} expenses:", {
                'current_month_count': len(current_month_expenses),
                'heating_count': len(heating_expenses),
                'current_month_start': str(current_month_start),
                'current_month_end': str(current_month_end),
                'heating_start': str(heating_start_date),
                'heating_end': str(heating_end_date),
                'heating_year': heating_year,
            })

            financial_data = {
                'collection_rate': round(collection_rate, 1),
                'reserve_fund': round(reserve_fund, 2),
                'recent_expenses': list(recent_expenses),
                'current_month_expenses': list(current_month_expenses),
                'heating_expenses': list(heating_expenses),
                'current_month_period': {
                    'start': current_month_start.isoformat(),
                    'end': current_month_end.isoformat(),
                    'is_fallback': current_month_fallback,
                },
                'heating_period': {
                    'start': heating_start_date.isoformat() if heating_start_date else None,
                    'end': heating_end_date.isoformat() if heating_end_date else None,
                    'season_label': f"{heating_start_date.year}-{heating_end_date.year}" if heating_start_date and heating_end_date else None,
                    'is_fallback': heating_fallback,
                },
                'total_credits': round(total_credits, 2),
                'total_debits': round(total_debits, 2),
                'total_obligations': 0,
                'current_obligations': 0,
                'apartment_balances': [],
                'top_debtors': [],
            }
        except Exception as e:
            logger = logging.getLogger('django')
            logger.error(f"[public_info] Error fetching expenses for building {building_id}: {str(e)}", exc_info=True)
            today = timezone.localdate()
            first_day = today.replace(day=1)
            fallback_period = {
                'start': first_day.isoformat(),
                'end': today.isoformat(),
                'is_fallback': True,
            }
            financial_data = {
                'collection_rate': 0,
                'reserve_fund': 0,
                'recent_expenses': [],
                'current_month_expenses': [],
                'heating_expenses': [],
                'current_month_period': fallback_period,
                'heating_period': {
                    'start': (today - timedelta(days=365)).isoformat(),
                    'end': today.isoformat(),
                    'season_label': None,
                    'is_fallback': True,
                },
                'total_credits': 0,
                'total_debits': 0,
                'total_obligations': 0,
                'current_obligations': 0,
                'apartment_balances': [],
                'top_debtors': [],
            }

        if building_info:
            try:
                dashboard_service = FinancialDashboardService(building_id=building_id)
                apartment_balances = dashboard_service.get_apartment_balances(month=requested_month)

                total_obligations_amount = 0.0
                apartment_balances_payload = []

                for balance in apartment_balances:
                    raw_current_balance = balance.get('current_balance') or 0
                    raw_net_obligation = balance.get('net_obligation') or 0

                    try:
                        current_balance_value = float(raw_current_balance)
                    except (TypeError, ValueError):
                        current_balance_value = 0.0

                    try:
                        net_obligation_value = float(raw_net_obligation)
                    except (TypeError, ValueError):
                        net_obligation_value = 0.0

                    # FinancialDashboardService returns positive balances for debts in current view.
                    debt_amount = net_obligation_value if net_obligation_value > 0 else 0.0
                    if debt_amount == 0.0 and current_balance_value > 0:
                        debt_amount = current_balance_value

                    if debt_amount:
                        total_obligations_amount += debt_amount

                    apartment_balances_payload.append({
                        'apartment_number': balance.get('apartment_number') or balance.get('number'),
                        'net_obligation': debt_amount,
                        'current_balance': current_balance_value,
                        'owner_name': balance.get('owner_name'),
                        'tenant_name': balance.get('tenant_name'),
                        'occupant_name': balance.get('occupant_name') or balance.get('tenant_name') or balance.get('owner_name'),
                        'status': balance.get('status'),
                    })

                def sort_key(item):
                    number = item.get('apartment_number') or ''
                    return tuple(int(part) if part.isdigit() else part for part in re.split(r'(\d+)', number))

                top_debtors = sorted(
                    [apt for apt in apartment_balances_payload],
                    key=sort_key
                )

                financial_data.update({
                    'total_obligations': round(total_obligations_amount, 2),
                    'current_obligations': round(total_obligations_amount, 2),
                    'apartment_balances': apartment_balances_payload,
                    'top_debtors': top_debtors,
                })
            except Exception as balance_error:
                print(f"[public_info] Unable to load apartment balances: {balance_error}")

        # Calculate maintenance data
        try:
            # Count active maintenance requests
            active_maintenance = MaintenanceTicket.objects.filter(
                building_id=building_id,
                status__in=['pending', 'in_progress', 'open']
            ).count()

            # Count urgent maintenance
            urgent_maintenance = MaintenanceTicket.objects.filter(
                building_id=building_id,
                status__in=['pending', 'in_progress', 'open'],
                priority='high'
            ).count()

            # Get active contractors (distinct)
            active_contractors = MaintenanceTicket.objects.filter(
                building_id=building_id,
                status__in=['pending', 'in_progress', 'open'],
                assigned_to__isnull=False
            ).values('assigned_to__first_name', 'assigned_to__last_name').distinct().count()

            # Get active tasks (recent 5)
            active_tasks = MaintenanceTicket.objects.filter(
                building_id=building_id,
                status__in=['pending', 'in_progress', 'open']
            ).order_by('-created_at')[:5].values('id', 'title', 'description', 'priority', 'due_date', 'status')

            maintenance_data = {
                'active_maintenance': active_maintenance,
                'urgent_maintenance': urgent_maintenance,
                'active_contractors': active_contractors,
                'active_tasks': list(active_tasks)
            }
        except Exception as e:
            maintenance_data = {
                'active_maintenance': 0,
                'urgent_maintenance': 0,
                'active_contractors': 0,
                'active_tasks': []
            }

        return Response({
            'announcements': AnnouncementPublicSerializer(announcements, many=True).data,
            'votes': VotePublicSerializer(votes, many=True).data,
            'building_info': building_info,
            'financial': financial_data,
            'maintenance': maintenance_data,
        })

import re

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

    with schema_context(schema_name):
        # Get building information
        try:
            building = Building.objects.get(id=building_id)
            building_info = {
                'id': building.id,
                'name': building.name,
                'address': building.address,
                'city': building.city,
                'postal_code': building.postal_code,
                'apartments_count': building.apartments_count,
                'internal_manager_name': building.internal_manager_name,
                'internal_manager_phone': building.internal_manager_phone,
                'management_office_name': building.management_office_name,
                'management_office_phone': building.management_office_phone,
                'management_office_address': building.management_office_address,
                'office_logo': None,  # Building model doesn't have direct manager relation
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
            # Get total credits and debits for collection rate
            total_credits = Transaction.objects.filter(
                apartment__building_id=building_id,
                transaction_type='credit'
            ).aggregate(total=Sum('amount'))['total'] or 0

            total_debits = Transaction.objects.filter(
                apartment__building_id=building_id,
                transaction_type='debit'
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Collection rate = (credits / debits) * 100 if debits > 0
            collection_rate = (total_credits / total_debits * 100) if total_debits > 0 else 0

            # Get reserve fund (sum of all reserve fund contributions)
            reserve_fund = Transaction.objects.filter(
                apartment__building_id=building_id,
                description__icontains='εφεδρεί'  # Greek for "reserve"
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Get recent expenses (last 3)
            recent_expenses = Expense.objects.filter(
                building_id=building_id
            ).order_by('-date')[:3].values('id', 'description', 'amount', 'date')

            financial_data = {
                'collection_rate': round(collection_rate, 1),
                'reserve_fund': round(reserve_fund, 2),
                'recent_expenses': list(recent_expenses),
                'total_credits': round(total_credits, 2),
                'total_debits': round(total_debits, 2),
                'total_obligations': 0,
                'current_obligations': 0,
                'apartment_balances': [],
                'top_debtors': [],
            }
        except Exception as e:
            financial_data = {
                'collection_rate': 0,
                'reserve_fund': 0,
                'recent_expenses': [],
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

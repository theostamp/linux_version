import logging
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
from assemblies.models import Assembly
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
        building = None
        building_info = None

        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            building = None
        except Exception as e:
            logger.exception("[public_info] Failed to load building %s: %s", building_id, e)
            building = None

        if building:
            # Get manager user details from public schema (best-effort; never fail the endpoint)
            office_logo = None
            management_office_email = None
            management_office_phone_emergency = None
            manager_office_name = None
            manager_office_phone = None
            manager_office_address = None

            try:
                from users.models import CustomUser

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
                        try:
                            if manager_user.office_logo:
                                office_logo = manager_user.office_logo.url
                        except Exception:
                            office_logo = None
            except Exception as e:
                logger.exception(
                    "[public_info] Failed to resolve management office details for building %s: %s",
                    building_id,
                    e,
                )

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

        # Include future announcements for kiosk countdown (not just current)
        try:
            announcements = Announcement.objects.filter(
                building_id=building_id,
                is_active=True,
                published=True
            ).filter(
                Q(end_date__gte=today) | Q(end_date__isnull=True)
            ).order_by('-priority', '-start_date')
        except Exception as e:
            logger.exception("[public_info] Error fetching announcements for building %s: %s", building_id, e)
            announcements = Announcement.objects.none()

        try:
            votes = Vote.objects.filter(
                building_id=building_id,
                is_active=True,
                start_date__lte=today,
                end_date__gte=today,
            ).order_by('-start_date')
        except Exception as e:
            logger.exception("[public_info] Error fetching votes for building %s: %s", building_id, e)
            votes = Vote.objects.none()

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
            ).order_by('-date').values('id', 'title', 'notes', 'amount', 'date', 'category')

            current_month_fallback = False
            if not current_month_expenses_qs.exists():
                current_month_fallback = True
                fallback_limit = 10
                current_month_expenses_qs = Expense.objects.filter(
                    building_id=building_id
                ).order_by('-date').values('id', 'title', 'notes', 'amount', 'date', 'category')[:fallback_limit]

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
            
            # Heating consumption filter: prefer fuel/energy expenses and avoid maintenance/repairs.
            heating_consumption_categories = ['heating_fuel', 'heating_gas']
            heating_excluded_categories = [
                'heating_maintenance', 'heating_repair', 'heating_inspection',
                'heating_modernization', 'boiler_replacement',
                'heating_system_overhaul', 'burner_replacement',
            ]
            heating_fuel_keywords = [
                'πετρέλαιο', 'πετρελαιο', 'φυσικό αέριο', 'φυσικο αεριο',
                'αέριο', 'αεριο', 'gas', 'mazout', 'μαζούτ',
                'heating oil', 'fuel oil', 'καύσιμ', 'καυσιμ',
            ]
            heating_excluded_keywords = [
                'επισκευ', 'συντηρ', 'αντικατάστασ', 'αντικαταστασ',
                'αναβάθμ', 'αναβαθμ', 'ρύθμισ', 'ρυθμισ',
                'έλεγχ', 'ελεγχ', 'service', 'maintenance', 'repair', 'inspection',
            ]

            heating_text_q = Q()
            for keyword in heating_fuel_keywords:
                heating_text_q |= Q(title__icontains=keyword) | Q(notes__icontains=keyword)

            heating_exclude_q = Q()
            for keyword in heating_excluded_keywords:
                heating_exclude_q |= Q(title__icontains=keyword) | Q(notes__icontains=keyword)

            heating_q = Q(category__in=heating_consumption_categories) | (heating_text_q & ~heating_exclude_q)
            
            heating_qs = Expense.objects.filter(
                building_id=building_id,
                date__gte=heating_start_date,
                date__lte=heating_end_date
            ).filter(heating_q).exclude(category__in=heating_excluded_categories)

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
                heating_qs.order_by('date').values('id', 'title', 'notes', 'amount', 'date', 'category')
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
                'apartment_statuses': [],
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
                'apartment_statuses': [],
            }

        if building_info:
            try:
                dashboard_service = FinancialDashboardService(building_id=building_id)
                apartment_balances = dashboard_service.get_apartment_balances(month=requested_month)

                total_obligations_amount = 0.0
                total_payments_amount = 0.0
                apartment_statuses_payload = []

                for balance in apartment_balances:
                    raw_current_balance = balance.get('current_balance') or 0
                    raw_net_obligation = balance.get('net_obligation') or 0
                    raw_month_payments = balance.get('month_payments') or 0

                    try:
                        current_balance_value = float(raw_current_balance)
                    except (TypeError, ValueError):
                        current_balance_value = 0.0

                    try:
                        net_obligation_value = float(raw_net_obligation)
                    except (TypeError, ValueError):
                        net_obligation_value = 0.0

                    try:
                        month_payments_value = float(raw_month_payments)
                    except (TypeError, ValueError):
                        month_payments_value = 0.0

                    # FinancialDashboardService returns positive balances for debts in current view.
                    debt_amount = net_obligation_value if net_obligation_value > 0 else 0.0
                    if debt_amount == 0.0 and current_balance_value > 0:
                        debt_amount = current_balance_value

                    if debt_amount:
                        total_obligations_amount += debt_amount
                    
                    # Sum monthly payments
                    total_payments_amount += month_payments_value

                    apartment_number = balance.get('apartment_number') or balance.get('number')
                    if apartment_number is not None:
                        apartment_statuses_payload.append({
                            'apartment_number': str(apartment_number),
                            'has_pending': bool(debt_amount > 0),
                        })

                def sort_key(item):
                    raw = item.get('apartment_number') or ''
                    raw_str = str(raw)
                    prefix = ''.join(ch for ch in raw_str if not ch.isdigit()).strip().lower()
                    digits = ''.join(ch for ch in raw_str if ch.isdigit())
                    try:
                        num = int(digits) if digits else 10**9
                    except Exception:
                        num = 10**9
                    return (prefix, num, raw_str.lower())

                apartment_statuses_payload.sort(key=sort_key)

                financial_data.update({
                    'total_obligations': round(total_obligations_amount, 2),
                    'current_obligations': round(total_obligations_amount, 2),
                    'total_payments': round(total_payments_amount, 2),
                    'apartment_statuses': apartment_statuses_payload,
                    # Add summary object for frontend compatibility
                    'summary': {
                        'total_obligations': round(total_obligations_amount, 2),
                        'total_payments': round(total_payments_amount, 2),
                    },
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

        # Get upcoming assemblies (within 7 days)
        try:
            upcoming_assembly = (
                Assembly.objects.filter(
                    building_id=building_id,
                    status__in=['scheduled', 'convened', 'in_progress'],
                    scheduled_date__gte=today,
                    scheduled_date__lte=today + timedelta(days=7),
                )
                .select_related('building')
                .prefetch_related('agenda_items', 'attendees')
                .order_by('scheduled_date', 'scheduled_time')
                .first()
            )

            assembly_data = None
            if upcoming_assembly:
                items = list(upcoming_assembly.agenda_items.order_by('order'))

                # Keep legacy VoteSubmission-only linked votes compatible with the assembly flow.
                try:
                    from assemblies.services import VoteIntegrationService
                    from votes.models import VoteSubmission

                    sync_items = [i for i in items if i.item_type == 'voting' and getattr(i, 'linked_vote_id', None)]
                    did_sync = False
                    for sync_item in sync_items:
                        submissions_count = VoteSubmission.objects.filter(vote_id=sync_item.linked_vote_id).count()
                        if submissions_count == 0:
                            continue

                        assembly_votes_count = sync_item.assembly_votes.count()
                        if submissions_count > assembly_votes_count:
                            VoteIntegrationService(sync_item).sync_vote_results()
                            did_sync = True

                    if did_sync:
                        try:
                            upcoming_assembly.refresh_from_db()
                        except Exception:
                            pass
                except Exception as e:
                    logger.warning(f"[public_info] Vote sync error for assembly {upcoming_assembly.id}: {e}")

                agenda_items = []
                current_item_data = None

                for item in items:
                    item_data = {
                        'id': str(item.id),
                        'order': item.order,
                        'title': item.title,
                        'item_type': item.item_type,
                        'status': item.status,
                        'estimated_duration': item.estimated_duration,
                        'started_at': item.started_at.isoformat() if item.started_at else None,
                        'ended_at': item.ended_at.isoformat() if item.ended_at else None,
                    }
                    agenda_items.append(item_data)

                    if item.status == 'in_progress':
                        current_item_data = item_data.copy()
                        if item.item_type == 'voting':
                            current_item_data['voting_results'] = item.get_voting_results()
                            try:
                                from assemblies.models import AssemblyVote

                                assembly_votes = (
                                    AssemblyVote.objects.filter(agenda_item=item)
                                    .select_related('attendee', 'attendee__apartment')
                                )
                                vote_by_attendee = {v.attendee_id: v for v in assembly_votes}
                                roster = []
                                for attendee in upcoming_assembly.attendees.select_related('apartment').filter(apartment__isnull=False).order_by('apartment__number'):
                                    v = vote_by_attendee.get(attendee.id)
                                    roster.append(
                                        {
                                            'attendee': str(attendee.id),
                                            'apartment_number': attendee.apartment.number if attendee.apartment else '',
                                            'mills': attendee.mills,
                                            'vote': getattr(v, 'vote', None) if v else None,
                                            'vote_source': getattr(v, 'vote_source', None) if v else None,
                                        }
                                    )
                                current_item_data['vote_roster'] = roster
                            except Exception as e:
                                logger.warning(f"[public_info] Failed to build vote roster for {item.id}: {e}")

                all_attendees = list(upcoming_assembly.attendees.all())
                present_count = sum(1 for a in all_attendees if a.is_present)
                pre_voted_count = sum(1 for a in all_attendees if a.has_pre_voted)

                voted_attendee_ids = set()
                try:
                    from assemblies.models import AssemblyVote

                    voted_attendee_ids = set(
                        AssemblyVote.objects.filter(agenda_item__assembly=upcoming_assembly)
                        .values_list('attendee_id', flat=True)
                        .distinct()
                    )
                except Exception:
                    voted_attendee_ids = set()

                voted_count = sum(1 for a in all_attendees if a.id in voted_attendee_ids)
                quorum_participants_count = sum(
                    1 for a in all_attendees if a.is_present or a.has_pre_voted or a.id in voted_attendee_ids
                )

                total_invited = len(all_attendees)
                rsvp_attending = sum(1 for a in all_attendees if a.rsvp_status == 'attending')
                rsvp_not_attending = sum(1 for a in all_attendees if a.rsvp_status == 'not_attending')
                rsvp_pending = sum(1 for a in all_attendees if a.rsvp_status == 'pending')
                pre_voted_percentage = round((pre_voted_count / total_invited * 100) if total_invited > 0 else 0, 1)
                voting_items_count = sum(1 for i in items if i.item_type == 'voting')

                assembly_data = {
                    'id': str(upcoming_assembly.id),
                    'title': upcoming_assembly.title,
                    'scheduled_date': upcoming_assembly.scheduled_date.isoformat(),
                    'scheduled_time': upcoming_assembly.scheduled_time.strftime('%H:%M') if upcoming_assembly.scheduled_time else None,
                    'location': upcoming_assembly.location,
                    'is_online': upcoming_assembly.is_online,
                    'is_physical': upcoming_assembly.is_physical,
                    'meeting_link': upcoming_assembly.meeting_link if upcoming_assembly.is_online else None,
                    'status': upcoming_assembly.status,
                    'actual_start_time': upcoming_assembly.actual_start_time.isoformat() if upcoming_assembly.actual_start_time else None,
                    'building_name': upcoming_assembly.building.name if upcoming_assembly.building else '',
                    'is_pre_voting_active': upcoming_assembly.is_pre_voting_active,
                    'quorum_percentage': float(upcoming_assembly.quorum_percentage),
                    'achieved_quorum_mills': upcoming_assembly.achieved_quorum_mills,
                    'required_quorum_mills': upcoming_assembly.required_quorum_mills,
                    'total_building_mills': upcoming_assembly.total_building_mills,
                    'agenda_items': agenda_items,
                    'current_item': current_item_data,
                    'attendees_stats': {
                        'total': total_invited,
                        'present': present_count,
                        'voted': voted_count,
                        'quorum_participants': quorum_participants_count,
                    },
                    'stats': {
                        'total_apartments_invited': total_invited,
                        'rsvp_attending': rsvp_attending,
                        'rsvp_not_attending': rsvp_not_attending,
                        'rsvp_pending': rsvp_pending,
                        'pre_voted_count': pre_voted_count,
                        'pre_voted_percentage': pre_voted_percentage,
                        'voting_items_count': voting_items_count,
                    },
                }
                logger.info(f"[public_info] Found upcoming assembly for building {building_id}: {upcoming_assembly.title}")
            else:
                logger.info(f"[public_info] No upcoming assembly found for building {building_id}")
        except Exception as e:
            logger.error(f"[public_info] Error fetching assemblies for building {building_id}: {str(e)}")
            assembly_data = None

        return Response({
            'announcements': AnnouncementPublicSerializer(announcements, many=True).data,
            'votes': VotePublicSerializer(votes, many=True).data,
            'building_info': building_info,
            'financial': financial_data,
            'maintenance': maintenance_data,
            'upcoming_assembly': assembly_data,
        })


# backend/api/views.py
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from django.db.models import Q
from django_tenants.utils import schema_context
from announcements.models import Announcement
from votes.models import Vote
from buildings.models import Building
from django.utils import timezone
from financial.services import FinancialDashboardService
from tenants.models import Domain as TenantDomain

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'csrfToken': request.META.get('CSRF_COOKIE')})


@require_GET
def public_info(request, building_id=None):
    """Return comprehensive public information for kiosk display screens."""
    # Get building_id from URL parameter or query parameter
    if building_id is None:
        building_id = request.GET.get('building')
    
    # Convert building_id to int if it's a string
    if building_id is not None:
        try:
            building_id = int(building_id)
        except (ValueError, TypeError):
            building_id = None
    
    # Resolve tenant from request headers (same logic as public_info/views.py)
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

    print(f"[public_info] Resolved schema: {schema_name} from host: {requested_host}")

    with schema_context(schema_name):
        # Get active announcements (include future announcements for kiosk countdown)
        qs_announcements = Announcement.objects.filter(is_active=True, published=True)
        
        print(f"[public_info] Initial announcements count: {qs_announcements.count()}")
        
        if building_id and building_id != 0:  # 0 means "all buildings"
            qs_announcements = qs_announcements.filter(building_id=building_id)
            print(f"[public_info] After building filter (building_id={building_id}): {qs_announcements.count()}")
        
        # Include announcements that haven't ended yet (current OR future)
        # This allows kiosk to show countdown for upcoming assemblies
        today = timezone.now().date()
        qs_announcements = qs_announcements.filter(
            Q(end_date__gte=today) | Q(end_date__isnull=True)
        )
        
        print(f"[public_info] After date filter: {qs_announcements.count()}")
        
        announcements_data = list(
            qs_announcements.order_by('-priority', '-created_at')[:10].values(
                'id', 'title', 'description', 'start_date', 'end_date', 
                'is_urgent', 'priority', 'created_at', 'building_id'
            )
        )
        
        print(f"[public_info] Announcements returned: {[(a['id'], a['title'], a['building_id']) for a in announcements_data]}")
        
        # Get active votes
        qs_votes = Vote.objects.filter(is_active=True)
        if building_id and building_id != 0:  # 0 means "all buildings"
            qs_votes = qs_votes.filter(building_id=building_id)
        
        today_date = timezone.now().date()
        active_votes_qs = qs_votes.filter(
            Q(start_date__lte=today_date) | Q(start_date__isnull=True)
        ).filter(
            Q(end_date__gte=today_date) | Q(end_date__isnull=True)
        ).order_by('-is_urgent', '-created_at')[:5]

        votes_data = []
        for v in active_votes_qs:
            try:
                results = v.get_results()
            except Exception:
                results = None

            votes_data.append({
                'id': v.id,
                'title': v.title,
                'description': v.description,
                'start_date': v.start_date,
                'end_date': v.end_date,
                'created_at': v.created_at,
                'is_urgent': v.is_urgent,
                'min_participation': v.min_participation,
                'total_votes': getattr(v, 'total_votes', 0),
                'participation_percentage': getattr(v, 'participation_percentage', 0),
                'is_valid': getattr(v, 'is_valid_result', False),
                'results': results,
            })
        
        # Get building information
        building_info = None
        financial_info = {
            'total_payments': 0,
            'pending_payments': 0,
            'overdue_payments': 0,
            'total_collected': 0,
            'collection_rate': 0,
            'total_obligations': 0,
            'current_obligations': 0,
            'top_debtors': [],
            'apartment_balances': [],
        }
        if building_id and building_id != 0:  # 0 means "all buildings"
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
                }
                
                # Get financial information for the building
                try:
                    print(f"[DEBUG] Loading financial data for building {building_id}")
                    from financial.models import Apartment, Payment
                    from django.db.models import Sum
                    
                    # Get apartments for this building
                    apartments = Apartment.objects.filter(building_id=building_id)
                    total_apartments = apartments.count()
                    print(f"[DEBUG] Found {total_apartments} apartments for building {building_id}")
                    
                    # Calculate total payments (all time)
                    total_payments = Payment.objects.filter(
                        apartment__building_id=building_id
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    print(f"[DEBUG] Total payments: {total_payments}")
                    
                    # Calculate pending payments (apartments with negative balance)
                    pending_payments = apartments.filter(
                        current_balance__lt=0
                    ).count()
                    print(f"[DEBUG] Pending payments: {pending_payments}")
                    
                    # Calculate overdue payments (apartments with balance < -100)
                    overdue_payments = apartments.filter(
                        current_balance__lt=-100
                    ).count()
                    print(f"[DEBUG] Overdue payments: {overdue_payments}")
                    
                    # Calculate total collected (positive payments)
                    total_collected = float(total_payments) if total_payments else 0
                    
                    # Calculate collection rate
                    collection_rate = 0
                    if total_apartments > 0:
                        paid_apartments = apartments.filter(current_balance__gte=0).count()
                        collection_rate = round((paid_apartments / total_apartments) * 100, 1)
                    
                    financial_info.update({
                        'total_payments': int(total_payments) if total_payments else 0,
                        'pending_payments': pending_payments,
                        'overdue_payments': overdue_payments,
                        'total_collected': total_collected,
                        'collection_rate': collection_rate,
                    })
                    print(f"[DEBUG] Financial info created: {financial_info}")
                    
                    try:
                        dashboard_service = FinancialDashboardService(building_id=building_id)
                        apartment_balances = dashboard_service.get_apartment_balances()
                        
                        total_obligations_amount = 0.0
                        apartment_balances_payload = []
                        
                        for balance in apartment_balances:
                            # Οφειλή = negative current_balance (ή negative net_obligation)
                            # 📝 ΣΗΜΕΙΩΣΗ: Τα current_balance στη βάση χρησιμοποιούν convention:
                            # αρνητικό = οφειλή, θετικό = πίστωση
                            current_balance = balance.get('current_balance') or 0
                            net_obligation = balance.get('net_obligation') or 0
                            
                            # Αν το balance είναι αρνητικό, είναι οφειλή
                            debt_amount = abs(float(current_balance)) if current_balance < 0 else 0.0
                            total_obligations_amount += debt_amount
                            
                            apartment_balances_payload.append({
                                'apartment_number': balance.get('apartment_number') or balance.get('number'),
                                'net_obligation': debt_amount,  # Θετικό ποσό οφειλής
                                'current_balance': float(current_balance),
                                'owner_name': balance.get('owner_name'),
                                'tenant_name': balance.get('tenant_name'),
                                'status': balance.get('status'),
                            })
                        
                        top_debtors = sorted(
                            [apt for apt in apartment_balances_payload if apt['net_obligation'] > 0],
                            key=lambda item: item['net_obligation'],
                            reverse=True
                        )
                        
                        financial_info.update({
                            'total_obligations': round(total_obligations_amount, 2),
                            'current_obligations': round(total_obligations_amount, 2),
                            'apartment_balances': apartment_balances_payload,
                            'top_debtors': top_debtors[:5],
                        })
                        
                    except Exception as balance_error:
                        print(f"[DEBUG] Unable to load apartment balances for public info: {balance_error}")
                    
                except Exception as e:
                    # If financial data cannot be loaded, provide default values
                    print(f"Error loading financial data for building {building_id}: {e}")
                    import traceback
                    traceback.print_exc()
                    financial_info = {
                        'total_payments': 0,
                        'pending_payments': 0,
                        'overdue_payments': 0,
                        'total_collected': 0,
                        'collection_rate': 0,
                    }
                    
            except Building.DoesNotExist:
                pass

        # ------------------------------------------------------------------
        # 🧾 Ads (Automated Ad Portal) - data lives in PUBLIC schema
        # Privacy: we only expose creative fields (no advertiser PII).
        # ------------------------------------------------------------------
        ads_payload = {"ticker": [], "banner": [], "interstitial": []}
        if building_id and building_id != 0:
            try:
                with schema_context("public"):
                    from django.db.models import Prefetch
                    from ad_portal.models import AdContract, AdContractStatus, AdCreative, AdCreativeStatus

                    now = timezone.now()
                    contracts_qs = (
                        AdContract.objects.filter(tenant_schema=schema_name, building_id=building_id)
                        .filter(
                            Q(status=AdContractStatus.ACTIVE_PAID)
                            | Q(status=AdContractStatus.TRIAL_ACTIVE, trial_ends_at__isnull=True)
                            | Q(status=AdContractStatus.TRIAL_ACTIVE, trial_ends_at__gt=now)
                        )
                        .select_related("placement_type")
                        .prefetch_related(
                            Prefetch(
                                "creatives",
                                queryset=AdCreative.objects.exclude(status=AdCreativeStatus.REJECTED).order_by("-updated_at"),
                                to_attr="_prefetched_creatives",
                            )
                        )
                    )

                    for c in contracts_qs:
                        creative = None
                        pref = getattr(c, "_prefetched_creatives", None)
                        if pref:
                            creative = pref[0]

                        # Fallback: if no creative yet, skip (nothing to show)
                        if not creative:
                            continue

                        placement_code = getattr(getattr(c, "placement_type", None), "code", "") or ""
                        if placement_code not in ads_payload:
                            continue

                        # Choose best text for ticker
                        ticker_text = (creative.ticker_text or creative.headline or "").strip()
                        if placement_code == "ticker" and not ticker_text:
                            continue

                        ads_payload[placement_code].append(
                            {
                                "contract_id": c.id,
                                "placement": placement_code,
                                "status": c.status,
                                "active_until": c.active_until,
                                "trial_ends_at": c.trial_ends_at,
                                "creative": {
                                    "headline": (creative.headline or "").strip(),
                                    "body": (creative.body or "").strip(),
                                    "ticker_text": (creative.ticker_text or "").strip(),
                                    "image_url": (creative.image_url or "").strip(),
                                    "cta_url": (creative.cta_url or "").strip(),
                                    "creative_status": creative.status,
                                },
                            }
                        )
            except Exception as e:
                print(f"[public_info] Error loading ads: {e}")
        
        # Return response
        return JsonResponse({
            'announcements': announcements_data,
            'votes': votes_data,
            'building_info': building_info,
            'financial': financial_info,
            'ads': ads_payload,
        })

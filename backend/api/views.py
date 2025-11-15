
# backend/api/views.py
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from django.db.models import Q
from announcements.models import Announcement
from votes.models import Vote
from buildings.models import Building
from django.utils import timezone
from financial.services import FinancialDashboardService

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
    
    # Get active announcements (include future announcements for kiosk countdown)
    qs_announcements = Announcement.objects.filter(is_active=True, published=True)
    if building_id and building_id != 0:  # 0 means "all buildings"
        qs_announcements = qs_announcements.filter(building_id=building_id)
    
    # Include announcements that haven't ended yet (current OR future)
    # This allows kiosk to show countdown for upcoming assemblies
    today = timezone.now().date()
    qs_announcements = qs_announcements.filter(
        Q(end_date__gte=today) | Q(end_date__isnull=True)
    )
    
    announcements_data = list(
        qs_announcements.order_by('-priority', '-created_at')[:10].values(
            'id', 'title', 'description', 'start_date', 'end_date', 
            'is_urgent', 'priority', 'created_at'
        )
    )
    
    # Get active votes
    qs_votes = Vote.objects.filter(is_active=True)
    if building_id and building_id != 0:  # 0 means "all buildings"
        qs_votes = qs_votes.filter(building_id=building_id)
    
    votes_data = list(
        qs_votes.filter(
            start_date__lte=timezone.now().date(),
            end_date__gte=timezone.now().date()
        ).order_by('-is_urgent', '-created_at')[:5].values(
            'id', 'title', 'description', 'start_date', 'end_date',
            'is_urgent', 'min_participation', 'created_at'
        )
    )
    
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
                        net_value = float(max(0, balance.get('net_obligation') or 0))
                        total_obligations_amount += net_value
                        apartment_balances_payload.append({
                            'apartment_number': balance.get('apartment_number') or balance.get('number'),
                            'net_obligation': net_value,
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
    
    # Mock advertising banners (in a real app, this would come from a database)
    advertising_banners = [
        {
            'id': 1,
            'title': 'Καθαριστικές Υπηρεσίες',
            'description': 'Εξειδικευμένες καθαριστικές υπηρεσίες για πολυκατοικίες',
            'image_url': '/api/static/banners/cleaning.jpg',
            'link': 'https://example.com/cleaning',
            'duration': 5000,  # milliseconds
        },
        {
            'id': 2,
            'title': 'Ασφάλεια & Συστήματα',
            'description': 'Συστήματα ασφαλείας και παρακολούθησης',
            'image_url': '/api/static/banners/security.jpg',
            'link': 'https://example.com/security',
            'duration': 5000,
        },
        {
            'id': 3,
            'title': 'Συντήρηση & Επισκευές',
            'description': 'Γρήγορη και αξιόπιστη συντήρηση κτιρίων',
            'image_url': '/api/static/banners/maintenance.jpg',
            'link': 'https://example.com/maintenance',
            'duration': 5000,
        }
    ]
    
    # General information
    general_info = {
        'current_time': timezone.now().isoformat(),
        'current_date': timezone.now().strftime('%A, %d %B %Y'),
        'system_status': 'online',
        'last_updated': timezone.now().isoformat(),
    }
    
    # Add debug info
    print(f"[DEBUG] Final response - financial_info: {financial_info}")
    
    return JsonResponse({
        'announcements': announcements_data,
        'votes': votes_data,
        'building_info': building_info,
        'financial_info': financial_info,
        'advertising_banners': advertising_banners,
        'general_info': general_info,
    })


# backend/api/views.py
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from announcements.models import Announcement
from votes.models import Vote
from buildings.models import Building
from django.utils import timezone
from datetime import datetime, timedelta
import json

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
    
    # Get active announcements
    qs_announcements = Announcement.objects.filter(is_active=True, published=True)
    if building_id and building_id != 0:  # 0 means "all buildings"
        qs_announcements = qs_announcements.filter(building_id=building_id)
    
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
    
    return JsonResponse({
        'announcements': announcements_data,
        'votes': votes_data,
        'building_info': building_info,
        'advertising_banners': advertising_banners,
        'general_info': general_info,
    })
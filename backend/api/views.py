
# backend/api/views.py
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.http import JsonResponse
from announcements.models import Announcement
   

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'csrfToken': request.META.get('CSRF_COOKIE')})


@require_GET
def public_info(request):
    """Return public announcements for display screens."""
    building_id = request.GET.get('building')
    qs = Announcement.objects.filter(is_active=True, published=True)
    if building_id:
        qs = qs.filter(building_id=building_id)
    data = list(
        qs.order_by('-start_date')[:5].values('id', 'title', 'description', 'start_date', 'end_date')
    )
    return JsonResponse({'announcements': data})
# backend/api/views.py
from django.views.decorators.csrf import ensure_csrf_cookie
    # typ
from django.http import JsonResponse
   

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'csrfToken': request.META.get('CSRF_COOKIE')})

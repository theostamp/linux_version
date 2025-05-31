# backend/api/views.py
from django.views.decorators.csrf import ensure_csrf_cookie  # type: ignore  # type: ignore
from django.http import JsonResponse  # type: ignore  # type: ignore

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'csrfToken': request.META.get('CSRF_COOKIE')})

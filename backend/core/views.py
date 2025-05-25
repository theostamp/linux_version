from django.views.decorators.csrf import ensure_csrf_cookie # type: ignore
from django.http import JsonResponse # type: ignore
from django.utils.decorators import method_decorator # type: ignore
from django.views import View # type: ignore

@ensure_csrf_cookie
def get_csrf_token(request):
    """Απλό view που ενεργοποιεί το CSRF cookie"""
    return JsonResponse({"message": "CSRF cookie set"})

def api_root():
    """Προαιρετικό root endpoint της API"""
    return JsonResponse({"message": "Welcome to the API root."})

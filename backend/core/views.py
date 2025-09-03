from django.views.decorators.csrf import ensure_csrf_cookie 
    # t
from django.http import JsonResponse
   # type: ignonor
   
   

@ensure_csrf_cookie
def get_csrf_token(request):
    """Απλό view που ενεργοποιεί το CSRF cookie"""
    return JsonResponse({"message": "CSRF cookie set"})

def api_root(request):
    """Προαιρετικό root endpoint της API"""
    return JsonResponse({"message": "Welcome to the API root."})

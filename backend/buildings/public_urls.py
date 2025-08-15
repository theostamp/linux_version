# backend/buildings/public_urls.py
from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .views import public_buildings_list

@csrf_exempt
def test_public_endpoint(request):
    return JsonResponse({"status": "OK", "message": "Public endpoint working"})

urlpatterns = [
    path('test/', test_public_endpoint, name='test_public_endpoint'),
    path('', public_buildings_list, name='public_buildings_list'),
] 
# backend/buildings/urls.py
from django.urls import path, include  
   
from rest_framework.routers import DefaultRouter 
from .views import BuildingViewSet, get_csrf_token, public_buildings_list

router = DefaultRouter()
router.register(r'', BuildingViewSet, basename='building')

# Public URLs (no authentication required)
public_urlpatterns = [
    path('public/', public_buildings_list, name='public_buildings_list'),
]

# Private URLs (authentication required)
private_urlpatterns = [
    path('csrf/', get_csrf_token, name='get_csrf_token'),
    path('', include(router.urls)),
]

# Include both public and private URLs
urlpatterns = public_urlpatterns + private_urlpatterns

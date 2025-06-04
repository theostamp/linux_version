# backend/buildings/urls.py
from django.urls import path, include  
   
from rest_framework.routers import DefaultRouter 
from .views import BuildingViewSet, get_csrf_token

router = DefaultRouter()
router.register(r'', BuildingViewSet, basename='building')

urlpatterns = [
    path('csrf/', get_csrf_token, name='get_csrf_token'),
    path('', include(router.urls)),
]

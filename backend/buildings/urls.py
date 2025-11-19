# backend/buildings/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuildingViewSet, ServicePackageViewSet, get_current_context_view

router = DefaultRouter()
router.register(r'list', BuildingViewSet, basename='building')
router.register(r'service-packages', ServicePackageViewSet, basename='service-package')

# Custom URL paths for BuildingViewSet actions that need to be at root level
# This allows /api/buildings/current-context/ instead of /api/buildings/list/current-context/

urlpatterns = [
    path('', include(router.urls)),
    path('current-context/', get_current_context_view, name='building-current-context'),
]

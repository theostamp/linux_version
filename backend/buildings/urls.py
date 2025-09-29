# backend/buildings/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BuildingViewSet, ServicePackageViewSet

router = DefaultRouter()
router.register(r'list', BuildingViewSet, basename='building')
router.register(r'service-packages', ServicePackageViewSet, basename='service-package')

urlpatterns = [
    path('', include(router.urls)),
]

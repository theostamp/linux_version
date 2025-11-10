# backend/residents/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResidentViewSet

router = DefaultRouter()
router.register(r'', ResidentViewSet, basename='residents')

urlpatterns = [
    path('', include(router.urls)),
] 
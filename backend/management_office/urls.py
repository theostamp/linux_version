from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OfficeDashboardViewSet

router = DefaultRouter()
router.register(r'dashboard', OfficeDashboardViewSet, basename='office-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]


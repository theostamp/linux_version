# backend/office_staff/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OfficeStaffViewSet, ActivityLogViewSet

router = DefaultRouter()
router.register(r'staff', OfficeStaffViewSet, basename='office-staff')
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-logs')

urlpatterns = [
    path('', include(router.urls)),
]


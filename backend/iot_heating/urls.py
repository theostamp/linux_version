from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HeatingDeviceViewSet, HeatingControlProfileView, DeviceSyncView

router = DefaultRouter()
router.register(r'devices', HeatingDeviceViewSet)

urlpatterns = [
    path('buildings/<int:building_id>/settings/', HeatingControlProfileView.as_view(), name='heating-settings'),
    path('device/<str:device_id>/sync/', DeviceSyncView.as_view(), name='heating-device-sync'),
    path('', include(router.urls)),
]

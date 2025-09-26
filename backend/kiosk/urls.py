from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KioskWidgetConfigViewSet

router = DefaultRouter()
router.register(r'configs', KioskWidgetConfigViewSet, basename='kiosk-config')

urlpatterns = [
    path('', include(router.urls)),
]

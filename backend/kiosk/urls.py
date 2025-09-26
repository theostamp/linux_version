from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KioskWidgetConfigViewSet, PublicKioskWidgetConfigViewSet

router = DefaultRouter()
router.register(r'configs', KioskWidgetConfigViewSet, basename='kiosk-config')

# Public router for kiosk (no authentication required)
public_router = DefaultRouter()
public_router.register(r'public/configs', PublicKioskWidgetConfigViewSet, basename='public-kiosk-config')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(public_router.urls)),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    KioskWidgetConfigViewSet, 
    PublicKioskWidgetConfigViewSet,
    KioskDisplayConfigViewSet,
    KioskSceneViewSet,
    PublicKioskSceneViewSet
)

router = DefaultRouter()
router.register(r'configs', KioskWidgetConfigViewSet, basename='kiosk-config')
router.register(r'display-configs', KioskDisplayConfigViewSet, basename='kiosk-display-config')
router.register(r'scenes', KioskSceneViewSet, basename='kiosk-scene')

# Public router for kiosk (no authentication required)
public_router = DefaultRouter()
public_router.register(r'public/configs', PublicKioskWidgetConfigViewSet, basename='public-kiosk-config')
public_router.register(r'public/scenes', PublicKioskSceneViewSet, basename='public-kiosk-scene')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(public_router.urls)),
    
    # Additional public endpoints
    path('public/configs/get_by_building/', PublicKioskWidgetConfigViewSet.as_view({'get': 'list'}), name='public-kiosk-configs-by-building'),
]

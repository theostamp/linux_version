from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    KioskWidgetConfigViewSet,
    PublicKioskWidgetConfigViewSet,
    KioskDisplayConfigViewSet,
    KioskSceneViewSet,
    PublicKioskSceneViewSet,
    kiosk_register  # New: Kiosk registration endpoint
)
from . import views_apartment_debts as views
from api.kiosk_views import kiosk_state

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

    # Apartment debts endpoint for kiosk widget
    path('apartment-debts/', views.apartment_debts, name='apartment-debts'),

    # Kiosk resident self-registration (no auth required)
    path('register/', kiosk_register, name='kiosk-register'),
    path('connect/', kiosk_register, name='kiosk-connect'),  # Alias for frontend

    # Kiosk state endpoint with ETag support (requires authentication)
    path('state/', kiosk_state, name='kiosk-state'),
]

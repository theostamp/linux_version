from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApartmentViewSet
from .views_personal import (
    apartment_personal_dashboard,
    apartment_common_expenses_history,
    apartment_validate_token,
)

router = DefaultRouter()
router.register(r'', ApartmentViewSet, basename='apartment')

urlpatterns = [
    path('', include(router.urls)),

    # Public kiosk endpoints (no auth required)
    path('personal/<uuid:token>/dashboard/', apartment_personal_dashboard, name='apartment-personal-dashboard'),
    path('personal/<uuid:token>/common-expenses/', apartment_common_expenses_history, name='apartment-common-expenses-history'),
    path('personal/validate-token/', apartment_validate_token, name='apartment-validate-token'),
] 
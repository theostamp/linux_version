# backend/buildings/urls.py
from django.urls import path, include # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore
from .views import BuildingViewSet, get_csrf_token

router = DefaultRouter()
router.register(r'', BuildingViewSet, basename='building')

urlpatterns = [
    # Endpoint για CSRF token
    path('csrf/', get_csrf_token, name='get_csrf_token'),
    # CRUD endpoints για κτίρια
    path('', include(router.urls)),
]

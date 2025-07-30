from django.urls import path, include 
 
from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
from .views import UserViewSet, me_view, logout_view, update_office_details  # αφαίρεσα το login_view αφού θα χρησιμοποιήσουμε το JWT

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    path('me/', me_view, name='me'),
    path('office-details/', update_office_details, name='office-details'),
    path('login/', TokenObtainPairView.as_view(), name='login'),  # JWT login
    path('logout/', logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]

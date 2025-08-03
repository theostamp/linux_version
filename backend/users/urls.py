from django.urls import path, include 
 
from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import (
    TokenRefreshView
)
from .views import UserViewSet, me_view, logout_view, update_office_details, CustomTokenObtainPairView  # αφαίρεσα το login_view αφού θα χρησιμοποιήσουμε το JWT

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    path('me/', me_view, name='me'),
    path('office-details/', update_office_details, name='office-details'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),  # Custom JWT login
    path('logout/', logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]

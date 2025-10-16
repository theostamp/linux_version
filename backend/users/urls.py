from django.urls import path, include 
 
from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import (
    TokenRefreshView
)
from .views import (
    UserViewSet, me_view, logout_view, update_office_details, CustomTokenObtainPairView,
    register_view, verify_email_view, resend_verification_view,
    create_invitation_view, list_invitations_view, accept_invitation_view,
    request_password_reset_view, confirm_password_reset_view, change_password_view,
    user_profile_view
)

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    # Authentication endpoints
    path('register/', register_view, name='register'),
    path('verify-email/', verify_email_view, name='verify-email'),
    path('resend-verification/', resend_verification_view, name='resend-verification'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('login', CustomTokenObtainPairView.as_view(), name='login-no-slash'),
    path('logout/', logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Invitation endpoints
    path('invite/', create_invitation_view, name='create-invitation'),
    path('invitations/', list_invitations_view, name='list-invitations'),
    path('accept-invitation/', accept_invitation_view, name='accept-invitation'),
    
    # Password management endpoints
    path('password-reset/', request_password_reset_view, name='password-reset'),
    path('password-reset-confirm/', confirm_password_reset_view, name='password-reset-confirm'),
    path('change-password/', change_password_view, name='change-password'),
    
    # User profile endpoints
    path('profile/', user_profile_view, name='user-profile'),
    path('me/', me_view, name='me'),
    path('office-details/', update_office_details, name='office-details'),
    
    # Default router
    path('', include(router.urls)),
]

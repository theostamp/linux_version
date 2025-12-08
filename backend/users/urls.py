# users/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import login_view, CustomTokenObtainPairView, CustomTokenRefreshView, me_view, update_office_details
from .oauth_views import google_oauth_initiate, microsoft_oauth_initiate, oauth_callback, oauth_health
from rest_framework_simplejwt.views import TokenObtainPairView
from .profile_views import (
    UserProfileView, 
    UserChangePasswordView, 
    UserNotificationSettingsView,
    UserActiveSessionsView,
    UserAccountDeletionView
)
from .subscription_views import (
    UserCurrentSubscriptionView,
    UserSubscriptionPlansView,
    UserSubscriptionBillingHistoryView,
    UserSubscriptionActionsView,
    UserCreateSubscriptionView
)
from .send_verification_email_view import SendVerificationEmailView

# Create router for ViewSets
router = DefaultRouter()
router.register(r'', views.UserViewSet, basename='users')

urlpatterns = [
    # Authentication endpoints
    path('register/', views.register_view, name='register'),  # With trailing slash
    path('register', views.register_view, name='register-no-slash'),  # Without trailing slash
    path('login/', login_view, name='user-login'),  # With trailing slash
    path('login', login_view, name='user-login-no-slash'),  # Without trailing slash
    path('logout/', views.logout_view, name='logout'),  # With trailing slash
    path('logout', views.logout_view, name='logout-no-slash'),  # Without trailing slash
    path('verify-email/', views.verify_email_view, name='user-verify-email'),  # Email verification with slash
    path('verify-email', views.verify_email_view, name='user-verify-email-no-slash'),  # Email verification without slash
    path('resend-verification/', views.resend_verification_view, name='user-resend-verification'),  # Resend verification
    path('send-verification-email/', SendVerificationEmailView.as_view(), name='user-send-verification-email'),  # Send verification email (internal)
    path('me/', me_view, name='user-me'),  # With trailing slash
    path('me', me_view, name='user-me-no-slash'),  # Without trailing slash
    path('office-details/', update_office_details, name='user-office-details'),  # With trailing slash
    path('office-details', update_office_details, name='user-office-details-no-slash'),  # Without trailing slash
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/simple/', TokenObtainPairView.as_view(), name='token_obtain_pair_simple'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    # Profile endpoints
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/change-password/', UserChangePasswordView.as_view(), name='user-change-password'),
    path('profile/notifications/', UserNotificationSettingsView.as_view(), name='user-notifications'),
    path('profile/sessions/', UserActiveSessionsView.as_view(), name='user-sessions'),
    path('profile/delete-account/', UserAccountDeletionView.as_view(), name='user-delete-account'),

    # Subscription endpoints (IMPORTANT: Must be before router.urls to avoid conflicts)
    path('subscription/', UserCurrentSubscriptionView.as_view(), name='user-subscription'),  # With trailing slash
    path('subscription', UserCurrentSubscriptionView.as_view(), name='user-subscription-no-slash'),  # Without trailing slash
    path('subscription/plans/', UserSubscriptionPlansView.as_view(), name='user-subscription-plans'),
    path('subscription/billing-history/', UserSubscriptionBillingHistoryView.as_view(), name='user-billing-history'),
    path('subscription/actions/', UserSubscriptionActionsView.as_view(), name='user-subscription-actions'),
    path('subscription/create/', UserCreateSubscriptionView.as_view(), name='user-create-subscription'),

    # Free tenant creation (for authenticated users without tenant)
    path('create-free-tenant/', views.create_free_tenant_view, name='create-free-tenant'),
    
    # Invitation endpoints (with and without trailing slashes for compatibility)
    path('invitations/', views.list_invitations_view, name='list-invitations'),
    path('invitations', views.list_invitations_view, name='list-invitations-no-slash'),
    path('invitations/verify/', views.verify_invitation_view, name='verify-invitation'),
    path('invitations/verify', views.verify_invitation_view, name='verify-invitation-no-slash'),
    path('invitations/resend/', views.resend_invitation_view, name='resend-invitation'),
    path('invitations/resend', views.resend_invitation_view, name='resend-invitation-no-slash'),
    path('invitations/<int:pk>/', views.delete_invitation_view, name='delete-invitation'),
    path('invite/', views.create_invitation_view, name='invite-user'),
    path('invite', views.create_invitation_view, name='invite-user-no-slash'),
    path('accept-invitation/', views.accept_invitation_view, name='accept-invitation'),
    path('accept-invitation', views.accept_invitation_view, name='accept-invitation-no-slash'),
    path('revoke-access/', views.revoke_user_access_view, name='revoke-user-access'),
    path('revoke-access', views.revoke_user_access_view, name='revoke-user-access-no-slash'),
    
    # Include router URLs (MUST be last to avoid conflicts with specific paths)
    path('', include(router.urls)),
    
    # OAuth endpoints
    path('auth/google/', google_oauth_initiate, name='google-oauth-initiate'),  # With trailing slash
    path('auth/google', google_oauth_initiate, name='google-oauth-initiate-no-slash'),  # Without trailing slash
    path('auth/microsoft/', microsoft_oauth_initiate, name='microsoft-oauth-initiate'),
    path('auth/callback/', oauth_callback, name='oauth-callback'),
    path('auth/health/', oauth_health, name='oauth-health'),
]

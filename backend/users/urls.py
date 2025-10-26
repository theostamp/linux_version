# users/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import login_view, CustomTokenObtainPairView
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

# Create router for ViewSets
router = DefaultRouter()
router.register(r'', views.UserViewSet, basename='users')

urlpatterns = [
    # Authentication endpoints
    path('register/', views.register_view, name='register'),  # With trailing slash
    path('register', views.register_view, name='register-no-slash'),  # Without trailing slash
    path('login/', login_view, name='user-login'),  # With trailing slash
    path('login', login_view, name='user-login-no-slash'),  # Without trailing slash
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/simple/', TokenObtainPairView.as_view(), name='token_obtain_pair_simple'),

    # Profile endpoints
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/change-password/', UserChangePasswordView.as_view(), name='user-change-password'),
    path('profile/notifications/', UserNotificationSettingsView.as_view(), name='user-notifications'),
    path('profile/sessions/', UserActiveSessionsView.as_view(), name='user-sessions'),
    path('profile/delete-account/', UserAccountDeletionView.as_view(), name='user-delete-account'),

    # Subscription endpoints (IMPORTANT: Must be before router.urls to avoid conflicts)
    path('subscription/', UserCurrentSubscriptionView.as_view(), name='user-subscription'),
    path('subscription/plans/', UserSubscriptionPlansView.as_view(), name='user-subscription-plans'),
    path('subscription/billing-history/', UserSubscriptionBillingHistoryView.as_view(), name='user-billing-history'),
    path('subscription/actions/', UserSubscriptionActionsView.as_view(), name='user-subscription-actions'),
    path('subscription/create/', UserCreateSubscriptionView.as_view(), name='user-create-subscription'),

    # Include router URLs (MUST be last to avoid conflicts with specific paths)
    path('', include(router.urls)),
    
    # OAuth endpoints
    path('auth/google/', google_oauth_initiate, name='google-oauth-initiate'),
    path('auth/microsoft/', microsoft_oauth_initiate, name='microsoft-oauth-initiate'),
    path('auth/callback/', oauth_callback, name='oauth-callback'),
    path('auth/health/', oauth_health, name='oauth-health'),
]

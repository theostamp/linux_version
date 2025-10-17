# users/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import login_view, CustomTokenObtainPairView
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
    # Include router URLs
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('login/', login_view, name='user-login'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/simple/', TokenObtainPairView.as_view(), name='token_obtain_pair_simple'),
    
    # Profile endpoints
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/change-password/', UserChangePasswordView.as_view(), name='user-change-password'),
    path('profile/notifications/', UserNotificationSettingsView.as_view(), name='user-notifications'),
    path('profile/sessions/', UserActiveSessionsView.as_view(), name='user-sessions'),
    path('profile/delete-account/', UserAccountDeletionView.as_view(), name='user-delete-account'),
    
    # Subscription endpoints
    path('subscription/', UserCurrentSubscriptionView.as_view(), name='user-subscription'),
    path('subscription/plans/', UserSubscriptionPlansView.as_view(), name='user-subscription-plans'),
    path('subscription/billing-history/', UserSubscriptionBillingHistoryView.as_view(), name='user-billing-history'),
    path('subscription/actions/', UserSubscriptionActionsView.as_view(), name='user-subscription-actions'),
    path('subscription/create/', UserCreateSubscriptionView.as_view(), name='user-create-subscription'),
]
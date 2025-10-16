# billing/middleware.py

from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.utils import timezone
from django.db import transaction
from django.conf import settings
import logging

from .models import UserSubscription, UsageTracking
from .services import BillingService

logger = logging.getLogger(__name__)


class UsageTrackingMiddleware(MiddlewareMixin):
    """
    Middleware για την παρακολούθηση usage και enforcement των plan limits
    """
    
    # API endpoints που πρέπει να παρακολουθούνται
    TRACKED_ENDPOINTS = {
        # Building management
        '/api/buildings/': 'buildings',
        '/api/buildings/public/': 'buildings',
        
        # Apartment management  
        '/api/apartments/': 'apartments',
        
        # User management
        '/api/users/': 'users',
        
        # Financial management
        '/api/financial/': 'api_calls',
        
        # Maintenance management
        '/api/maintenance/': 'api_calls',
        
        # Announcements
        '/api/announcements/': 'api_calls',
        
        # User requests
        '/api/user-requests/': 'api_calls',
        
        # Votes
        '/api/votes/': 'api_calls',
        
        # Chat
        '/api/chat/': 'api_calls',
        
        # Teams
        '/api/teams/': 'api_calls',
        
        # Collaborators
        '/api/collaborators/': 'api_calls',
        
        # Projects
        '/api/projects/': 'api_calls',
        
        # Todos
        '/api/todos/': 'api_calls',
        
        # Events
        '/api/events/': 'api_calls',
    }
    
    # Endpoints που δεν πρέπει να παρακολουθούνται
    EXCLUDED_ENDPOINTS = [
        '/api/billing/',  # Billing endpoints δεν μετράνε ως usage
        '/admin/',        # Admin interface
        '/health/',       # Health checks
        '/ready/',        # Readiness checks
        '/live/',         # Liveness checks
        '/api/users/login/',  # Login δεν μετράει ως usage
        '/api/users/register/',  # Registration δεν μετράει ως usage
        '/api/users/verify-email/',  # Email verification δεν μετράει
        '/api/users/password-reset/',  # Password reset δεν μετράει
    ]
    
    def process_request(self, request):
        """
        Process request και track usage
        """
        # Skip για non-API requests
        if not request.path.startswith('/api/'):
            return None
        
        # Skip για excluded endpoints
        for excluded in self.EXCLUDED_ENDPOINTS:
            if request.path.startswith(excluded):
                return None
        
        # Skip για anonymous users
        if not request.user or not request.user.is_authenticated:
            return None
        
        # Skip για superusers (unlimited access)
        if request.user.is_superuser:
            return None
        
        # Track API calls
        self._track_api_usage(request)
        
        # Check limits
        if not self._check_usage_limits(request):
            return JsonResponse({
                'error': 'Usage limit exceeded',
                'message': 'You have exceeded your plan limits. Please upgrade your subscription to continue.',
                'limit_type': self._get_limit_type(request)
            }, status=429)
        
        return None
    
    def _track_api_usage(self, request):
        """
        Track API usage για authenticated user
        """
        try:
            subscription = BillingService.get_user_subscription(request.user)
            if not subscription:
                return
            
            # Track API calls
            BillingService.increment_usage(subscription, 'api_calls', 1)
            
            # Track specific resource usage based on endpoint
            resource_type = self._get_resource_type(request.path)
            if resource_type and resource_type != 'api_calls':
                BillingService.increment_usage(subscription, resource_type, 1)
                
        except Exception as e:
            logger.error(f"Error tracking usage for user {request.user.email}: {e}")
    
    def _check_usage_limits(self, request):
        """
        Check αν ο user έχει ξεπεράσει τα limits του plan
        """
        try:
            subscription = BillingService.get_user_subscription(request.user)
            if not subscription:
                return True  # No subscription = no limits
            
            # Check API calls limit
            if not BillingService.check_usage_limits(subscription, 'api_calls', 1):
                return False
            
            # Check specific resource limits
            resource_type = self._get_resource_type(request.path)
            if resource_type and resource_type != 'api_calls':
                if not BillingService.check_usage_limits(subscription, resource_type, 1):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking usage limits for user {request.user.email}: {e}")
            return True  # Allow on error
    
    def _get_resource_type(self, path):
        """
        Determine resource type από το API path
        """
        for endpoint, resource_type in self.TRACKED_ENDPOINTS.items():
            if path.startswith(endpoint):
                return resource_type
        return 'api_calls'  # Default to API calls
    
    def _get_limit_type(self, request):
        """
        Get the type of limit that was exceeded
        """
        resource_type = self._get_resource_type(request.path)
        
        limit_messages = {
            'api_calls': 'API calls per month',
            'buildings': 'Buildings',
            'apartments': 'Apartments per building',
            'users': 'Users per account',
            'storage_gb': 'Storage (GB)'
        }
        
        return limit_messages.get(resource_type, 'Unknown limit')


class PlanFeatureMiddleware(MiddlewareMixin):
    """
    Middleware για τον έλεγχο feature access βασισμένο στο subscription plan
    """
    
    # Feature restrictions per endpoint
    FEATURE_RESTRICTIONS = {
        # Analytics features (Professional/Enterprise only)
        '/api/financial/analytics/': ['professional', 'enterprise'],
        '/api/financial/reports/': ['professional', 'enterprise'],
        
        # Custom integrations (Enterprise only)
        '/api/integrations/custom/': ['enterprise'],
        
        # White-label features (Enterprise only)
        '/api/white-label/': ['enterprise'],
        
        # Advanced maintenance features (Professional/Enterprise)
        '/api/maintenance/advanced/': ['professional', 'enterprise'],
        
        # Team management features (Professional/Enterprise)
        '/api/teams/advanced/': ['professional', 'enterprise'],
    }
    
    def process_request(self, request):
        """
        Check feature access based on subscription plan
        """
        # Skip για non-API requests
        if not request.path.startswith('/api/'):
            return None
        
        # Skip για anonymous users
        if not request.user or not request.user.is_authenticated:
            return None
        
        # Skip για superusers (unlimited access)
        if request.user.is_superuser:
            return None
        
        # Check feature restrictions
        if not self._check_feature_access(request):
            return JsonResponse({
                'error': 'Feature not available',
                'message': 'This feature is not available in your current plan. Please upgrade your subscription.',
                'feature': self._get_feature_name(request.path),
                'required_plans': self._get_required_plans(request.path)
            }, status=403)
        
        return None
    
    def _check_feature_access(self, request):
        """
        Check αν ο user έχει access στο feature
        """
        try:
            subscription = BillingService.get_user_subscription(request.user)
            if not subscription:
                return False  # No subscription = no advanced features
            
            required_plans = self.FEATURE_RESTRICTIONS.get(request.path)
            if not required_plans:
                return True  # No restrictions
            
            user_plan = subscription.plan.plan_type
            return user_plan in required_plans
            
        except Exception as e:
            logger.error(f"Error checking feature access for user {request.user.email}: {e}")
            return False
    
    def _get_feature_name(self, path):
        """
        Get human-readable feature name
        """
        feature_names = {
            '/api/financial/analytics/': 'Financial Analytics',
            '/api/financial/reports/': 'Financial Reports',
            '/api/integrations/custom/': 'Custom Integrations',
            '/api/white-label/': 'White-label Solution',
            '/api/maintenance/advanced/': 'Advanced Maintenance',
            '/api/teams/advanced/': 'Advanced Team Management',
        }
        return feature_names.get(path, 'Advanced Feature')
    
    def _get_required_plans(self, path):
        """
        Get required plans για το feature
        """
        return self.FEATURE_RESTRICTIONS.get(path, [])


class BillingStatusMiddleware(MiddlewareMixin):
    """
    Middleware για τον έλεγχο billing status και trial expiration
    """
    
    def process_request(self, request):
        """
        Check billing status και trial expiration
        """
        # Skip για non-API requests
        if not request.path.startswith('/api/'):
            return None
        
        # Skip για anonymous users
        if not request.user or not request.user.is_authenticated:
            return None
        
        # Skip για superusers
        if request.user.is_superuser:
            return None
        
        # Skip για billing endpoints (to avoid loops)
        if request.path.startswith('/api/billing/'):
            return None
        
        # Check subscription status
        if not self._check_subscription_status(request):
            return JsonResponse({
                'error': 'Subscription required',
                'message': 'Your subscription has expired or is inactive. Please renew your subscription.',
                'subscription_status': self._get_subscription_status(request.user)
            }, status=402)  # Payment Required
        
        return None
    
    def _check_subscription_status(self, request):
        """
        Check αν το subscription είναι active
        """
        try:
            subscription = BillingService.get_user_subscription(request.user)
            if not subscription:
                return False  # No subscription
            
            # Check if subscription is active
            if subscription.status not in ['trial', 'active']:
                return False
            
            # Check trial expiration
            if subscription.is_trial and subscription.trial_end:
                if timezone.now() > subscription.trial_end:
                    # Mark trial as expired
                    subscription.status = 'trial_expired'
                    subscription.save()
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking subscription status for user {request.user.email}: {e}")
            return False
    
    def _get_subscription_status(self, user):
        """
        Get current subscription status
        """
        try:
            subscription = BillingService.get_user_subscription(user)
            if not subscription:
                return 'no_subscription'
            return subscription.status
        except:
            return 'unknown'

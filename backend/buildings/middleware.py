"""
Rate Limiting Middleware για Building Permission Checks

Προστατεύει το σύστημα από abuse με περιορισμό των permission checks
ανά χρήστη ανά λεπτό.

Usage:
    # In settings.py
    MIDDLEWARE = [
        # ... other middleware ...
        'buildings.middleware.PermissionCheckRateLimitMiddleware',
    ]
    
    # Optional: Configure limits
    PERMISSION_CHECK_MAX_PER_MINUTE = 100
"""

import logging
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework import status

logger = logging.getLogger(__name__)


class PermissionCheckRateLimitMiddleware:
    """
    Rate limiting middleware για permission checks.
    
    Αποτρέπει DoS attacks και abuse με περιορισμό του αριθμού των
    permission checks που μπορεί να κάνει ένας user ανά λεπτό.
    
    Features:
    - Per-user rate limiting
    - Configurable limits
    - Cache-based (fast)
    - Graceful degradation
    - Logging για monitoring
    
    Configuration:
        PERMISSION_CHECK_MAX_PER_MINUTE (int): Max checks per user per minute.
                                                Default: 100
    
    Response Format (on limit exceeded):
        {
            "error": "rate_limit_exceeded",
            "message": "Πάρα πολλά αιτήματα...",
            "retry_after": 60
        }
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Configuration με fallback σε defaults
        from django.conf import settings
        self.max_checks_per_minute = getattr(
            settings, 
            'PERMISSION_CHECK_MAX_PER_MINUTE', 
            100
        )
        self.enabled = getattr(
            settings,
            'ENABLE_PERMISSION_RATE_LIMITING',
            True  # Enabled by default
        )
        
        logger.info(
            f"PermissionCheckRateLimitMiddleware initialized: "
            f"max_checks={self.max_checks_per_minute}, enabled={self.enabled}"
        )
    
    def __call__(self, request):
        # Skip rate limiting αν disabled
        if not self.enabled:
            return self.get_response(request)
        
        # Skip rate limiting για anonymous users (δεν κάνουν permission checks)
        if not request.user or not request.user.is_authenticated:
            return self.get_response(request)
        
        # Skip rate limiting για superusers (trusted users)
        if request.user.is_superuser:
            return self.get_response(request)
        
        # Check rate limit
        if self._is_rate_limited(request.user):
            return self._rate_limit_response(request.user)
        
        # Increment counter
        self._increment_counter(request.user)
        
        # Process request
        response = self.get_response(request)
        
        return response
    
    def _get_cache_key(self, user) -> str:
        """
        Δημιουργεί το cache key για τον user.
        
        Args:
            user: CustomUser instance
        
        Returns:
            str: Cache key
        """
        return f"perm_check_rate:{user.id}"
    
    def _is_rate_limited(self, user) -> bool:
        """
        Ελέγχει αν ο user έχει ξεπεράσει το rate limit.
        
        Args:
            user: CustomUser instance
        
        Returns:
            bool: True αν rate limited, False διαφορετικά
        """
        cache_key = self._get_cache_key(user)
        
        try:
            checks = cache.get(cache_key, 0)
            
            if checks >= self.max_checks_per_minute:
                logger.warning(
                    f"Rate limit exceeded for user {user.id} ({user.username}): "
                    f"{checks} checks in last minute (max: {self.max_checks_per_minute})"
                )
                return True
            
            return False
            
        except Exception as e:
            # Graceful degradation - αν το cache αποτύχει, επιτρέπουμε το request
            logger.error(
                f"Rate limit check failed for user {user.id}: {e}. "
                f"Allowing request."
            )
            return False
    
    def _increment_counter(self, user):
        """
        Αυξάνει το counter για τον user.
        
        Args:
            user: CustomUser instance
        """
        cache_key = self._get_cache_key(user)
        
        try:
            checks = cache.get(cache_key, 0)
            cache.set(cache_key, checks + 1, 60)  # 60 seconds TTL
            
        except Exception as e:
            logger.error(f"Failed to increment rate limit counter for user {user.id}: {e}")
    
    def _rate_limit_response(self, user) -> JsonResponse:
        """
        Επιστρέφει rate limit response.
        
        Args:
            user: CustomUser instance
        
        Returns:
            JsonResponse με 429 status
        """
        logger.warning(
            f"Rate limit response sent to user {user.id} ({user.username})"
        )
        
        return JsonResponse(
            {
                'error': 'rate_limit_exceeded',
                'message': (
                    f'Πάρα πολλά αιτήματα. Μέγιστο όριο: '
                    f'{self.max_checks_per_minute} αιτήματα ανά λεπτό. '
                    f'Παρακαλώ δοκιμάστε ξανά σε λίγο.'
                ),
                'retry_after': 60,  # seconds
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )


class APIRateLimitMiddleware:
    """
    General API rate limiting middleware.
    
    Πιο αυστηρό rate limiting για όλα τα API endpoints.
    Χρήσιμο για προστασία από general abuse.
    
    Configuration:
        API_MAX_REQUESTS_PER_MINUTE (int): Max API requests per user per minute.
                                            Default: 60
        API_RATE_LIMIT_EXEMPT_PATHS (list): Paths που εξαιρούνται από rate limiting.
                                             Default: ['/api/health/', '/api/status/']
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        from django.conf import settings
        self.max_requests_per_minute = getattr(
            settings,
            'API_MAX_REQUESTS_PER_MINUTE',
            60
        )
        self.exempt_paths = getattr(
            settings,
            'API_RATE_LIMIT_EXEMPT_PATHS',
            ['/api/health/', '/api/status/']
        )
        self.enabled = getattr(
            settings,
            'ENABLE_API_RATE_LIMITING',
            False  # Disabled by default (more aggressive)
        )
        
        logger.info(
            f"APIRateLimitMiddleware initialized: "
            f"max_requests={self.max_requests_per_minute}, enabled={self.enabled}"
        )
    
    def __call__(self, request):
        if not self.enabled:
            return self.get_response(request)
        
        # Skip exempt paths
        if any(request.path.startswith(path) for path in self.exempt_paths):
            return self.get_response(request)
        
        # Skip για superusers
        if request.user and request.user.is_authenticated and request.user.is_superuser:
            return self.get_response(request)
        
        # Check rate limit
        if self._is_rate_limited(request):
            return self._rate_limit_response()
        
        # Increment counter
        self._increment_counter(request)
        
        return self.get_response(request)
    
    def _get_cache_key(self, request) -> str:
        """
        Δημιουργεί cache key based on user ή IP.
        """
        if request.user and request.user.is_authenticated:
            return f"api_rate:{request.user.id}"
        else:
            # Use IP για anonymous requests
            ip = self._get_client_ip(request)
            return f"api_rate:ip:{ip}"
    
    def _get_client_ip(self, request) -> str:
        """
        Παίρνει το client IP από το request.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _is_rate_limited(self, request) -> bool:
        cache_key = self._get_cache_key(request)
        
        try:
            requests_count = cache.get(cache_key, 0)
            return requests_count >= self.max_requests_per_minute
        except Exception as e:
            logger.error(f"API rate limit check failed: {e}. Allowing request.")
            return False
    
    def _increment_counter(self, request):
        cache_key = self._get_cache_key(request)
        
        try:
            requests_count = cache.get(cache_key, 0)
            cache.set(cache_key, requests_count + 1, 60)
        except Exception as e:
            logger.error(f"Failed to increment API rate limit counter: {e}")
    
    def _rate_limit_response(self) -> JsonResponse:
        return JsonResponse(
            {
                'error': 'api_rate_limit_exceeded',
                'message': (
                    f'Πάρα πολλά API αιτήματα. Μέγιστο όριο: '
                    f'{self.max_requests_per_minute} αιτήματα ανά λεπτό.'
                ),
                'retry_after': 60,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )


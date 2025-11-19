# 🛡️ Rate Limiting Setup Guide

## Overview

Το rate limiting middleware προστατεύει την εφαρμογή από:
- DoS attacks
- Abuse
- Excessive API usage
- Permission check spam

---

## Installation

### Step 1: Add Middleware

Edit `backend/new_concierge_backend/settings.py`:

```python
MIDDLEWARE = [
    # ... existing middleware ...
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... more middleware ...
    
    # NEW: Rate limiting middleware
    'buildings.middleware.PermissionCheckRateLimitMiddleware',
    # Optional: General API rate limiting (more aggressive)
    # 'buildings.middleware.APIRateLimitMiddleware',
]
```

### Step 2: Configure Limits (Optional)

Add to `settings.py`:

```python
# ========================================================================
# Rate Limiting Configuration
# ========================================================================

# Permission check rate limiting (recommended: enabled)
ENABLE_PERMISSION_RATE_LIMITING = True
PERMISSION_CHECK_MAX_PER_MINUTE = 100  # Default: 100

# General API rate limiting (optional: more aggressive)
ENABLE_API_RATE_LIMITING = False  # Default: False (disabled)
API_MAX_REQUESTS_PER_MINUTE = 60  # Default: 60
API_RATE_LIMIT_EXEMPT_PATHS = [
    '/api/health/',
    '/api/status/',
    '/api/docs/',
]
```

### Step 3: Verify Cache is Configured

Rate limiting requires Django cache. Verify in `settings.py`:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# For production, use Redis:
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.redis.RedisCache',
#         'LOCATION': 'redis://127.0.0.1:6379/1',
#     }
# }
```

---

## Usage

### Default Behavior

**PermissionCheckRateLimitMiddleware**:
- Enabled by default
- Limits: 100 checks/minute per user
- Applies to: All authenticated users (except superusers)
- Response: HTTP 429 με retry_after header

**APIRateLimitMiddleware**:
- Disabled by default (more aggressive)
- Limits: 60 requests/minute per user/IP
- Applies to: All API endpoints (except exempt paths)
- Response: HTTP 429

### Response Format

When rate limit is exceeded:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Πάρα πολλά αιτήματα. Μέγιστο όριο: 100 αιτήματα ανά λεπτό. Παρακαλώ δοκιμάστε ξανά σε λίγο.",
  "retry_after": 60
}
```

Status Code: `429 Too Many Requests`

---

## Testing

### Test 1: Basic Rate Limiting

```python
# backend/buildings/tests/test_rate_limiting.py
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()

class RateLimitingTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        cache.clear()
    
    def test_rate_limit_not_exceeded(self):
        """Test that requests under limit succeed"""
        self.client.force_login(self.user)
        
        # Make 50 requests (under limit of 100)
        for i in range(50):
            response = self.client.get('/api/buildings/')
            self.assertNotEqual(response.status_code, 429)
    
    def test_rate_limit_exceeded(self):
        """Test that requests over limit get 429"""
        self.client.force_login(self.user)
        
        # Make 101 requests (over limit of 100)
        for i in range(101):
            response = self.client.get('/api/buildings/')
        
        # Last request should be rate limited
        self.assertEqual(response.status_code, 429)
        
        data = response.json()
        self.assertEqual(data['error'], 'rate_limit_exceeded')
        self.assertEqual(data['retry_after'], 60)
    
    def test_superuser_exempt_from_rate_limit(self):
        """Test that superusers are not rate limited"""
        superuser = User.objects.create_superuser(
            username='admin',
            password='admin123'
        )
        self.client.force_login(superuser)
        
        # Make 150 requests (well over limit)
        for i in range(150):
            response = self.client.get('/api/buildings/')
            self.assertNotEqual(response.status_code, 429)
```

### Test 2: Manual Testing

```bash
# Run Django shell
cd /home/theo/project/backend
source venv/bin/activate
python manage.py shell

# Test rate limiting
from django.test import Client
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()
client = Client()

# Create test user
user = User.objects.create_user(username='test', password='test123')
client.force_login(user)

# Clear cache
cache.clear()

# Test requests
for i in range(105):
    response = client.get('/api/buildings/')
    print(f"Request {i+1}: Status {response.status_code}")
    if response.status_code == 429:
        print(f"Rate limited at request {i+1}")
        break
```

---

## Monitoring

### Logging

Rate limit events are logged:

```python
# In settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': 'logs/rate_limiting.log',
        },
    },
    'loggers': {
        'buildings.middleware': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': True,
        },
    },
}
```

### Log Entries

```
WARNING: Rate limit exceeded for user 123 (username): 101 checks in last minute (max: 100)
WARNING: Rate limit response sent to user 123 (username)
```

---

## Troubleshooting

### Issue 1: Rate limiting not working

**Symptom**: Requests not being rate limited

**Solutions**:
1. Check middleware is added to `settings.py`
2. Verify `ENABLE_PERMISSION_RATE_LIMITING = True`
3. Check cache is configured
4. Clear cache: `python manage.py shell` → `cache.clear()`

### Issue 2: False positives (legitimate users blocked)

**Symptom**: Users getting 429 too quickly

**Solutions**:
1. Increase limit: `PERMISSION_CHECK_MAX_PER_MINUTE = 200`
2. Check for loops in frontend code
3. Optimize API calls (use caching, reduce redundant requests)

### Issue 3: Cache errors

**Symptom**: "Cache backend not found" errors

**Solutions**:
1. Install cache backend: `pip install django-redis` (for Redis)
2. Configure cache in `settings.py`
3. Fallback to LocMemCache for development

---

## Best Practices

### 1. Start Conservative
```python
# Development
PERMISSION_CHECK_MAX_PER_MINUTE = 200  # More lenient

# Production
PERMISSION_CHECK_MAX_PER_MINUTE = 100  # Standard
```

### 2. Monitor First
- Enable logging
- Monitor for 1 week
- Adjust based on actual usage patterns

### 3. Use Redis in Production
```python
# Production settings
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

### 4. Exempt Internal Services
```python
# If you have internal services
class PermissionCheckRateLimitMiddleware:
    def __call__(self, request):
        # Skip for internal service accounts
        if request.user.username.startswith('service_'):
            return self.get_response(request)
        # ... rest of logic
```

---

## Performance Impact

### Overhead
- **Per Request**: ~0.1-0.5ms (LocMemCache)
- **Per Request**: ~1-3ms (Redis)
- **Memory**: ~1KB per user (cache entry)

### Scalability
- **LocMemCache**: Good for single-server setups
- **Redis**: Required for multi-server/load-balanced setups

---

## Migration Checklist

- [ ] Add middleware to `MIDDLEWARE` in settings.py
- [ ] Configure limits in settings.py
- [ ] Verify cache configuration
- [ ] Test locally
- [ ] Enable logging
- [ ] Deploy to staging
- [ ] Monitor for 1 week
- [ ] Adjust limits based on data
- [ ] Deploy to production

---

**Created**: 2025-11-19  
**Version**: 1.0  
**Status**: Production Ready


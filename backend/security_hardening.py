"""
Security Hardening Script
Automatically applies security fixes and hardening measures
"""

import os
import sys
import django
from pathlib import Path
import shutil
import secrets
import string

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.conf import settings
from django.core.management.utils import get_random_secret_key


class SecurityHardener:
    """Apply security hardening measures automatically"""
    
    def __init__(self):
        self.applied_fixes = []
        self.failed_fixes = []
        self.backup_dir = Path('security_backups')
        self.backup_dir.mkdir(exist_ok=True)
    
    def apply_all_hardening(self):
        """Apply all security hardening measures"""
        print("🔧 Starting Security Hardening...")
        print("=" * 50)
        
        # Create backups first
        self._create_backups()
        
        # Apply hardening measures
        self._harden_django_settings()
        self._harden_environment_files()
        self._apply_rate_limiting()
        self._configure_security_headers()
        self._harden_file_permissions()
        
        # Generate report
        self._generate_hardening_report()
    
    def _create_backups(self):
        """Create backups of important files before modification"""
        print("💾 Creating backups...")
        
        files_to_backup = [
            'new_concierge_backend/settings.py',
            '.env',
            'nginx/nginx.prod.conf',
            'docker-compose.prod.yml'
        ]
        
        for file_path in files_to_backup:
            source = Path(file_path)
            if source.exists():
                backup_path = self.backup_dir / f"{source.name}.backup"
                shutil.copy2(source, backup_path)
                print(f"   Backed up {file_path} ✅")
    
    def _harden_django_settings(self):
        """Apply Django security settings hardening"""
        print("🛡️ Hardening Django settings...")
        
        settings_file = Path('new_concierge_backend/settings.py')
        if not settings_file.exists():
            self.failed_fixes.append("Settings file not found")
            return
        
        content = settings_file.read_text()
        
        # Security settings to add/update
        security_additions = """
# Security Hardening Settings
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
X_FRAME_OPTIONS = 'DENY'

# File Upload Security
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
FILE_UPLOAD_PERMISSIONS = 0o644

# Session Security
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_SAVE_EVERY_REQUEST = True

# Password Security
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Rate Limiting
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "https:")
CSP_CONNECT_SRC = ("'self'",)
CSP_FRAME_ANCESTORS = ("'none'",)
"""
        
        # Add security settings if not already present
        if "# Security Hardening Settings" not in content:
            content += "\n" + security_additions
            settings_file.write_text(content)
            self.applied_fixes.append("Added Django security settings")
        else:
            print("   Security settings already present ✅")
    
    def _harden_environment_files(self):
        """Harden environment configuration"""
        print("⚙️ Hardening environment files...")
        
        env_file = Path('.env')
        if env_file.exists():
            # Fix file permissions
            env_file.chmod(0o600)
            self.applied_fixes.append("Fixed .env file permissions")
            
            # Check for weak secrets
            content = env_file.read_text()
            lines = content.split('\n')
            updated_lines = []
            
            for line in lines:
                if line.startswith('SECRET_KEY='):
                    # Generate new strong secret key
                    new_secret = get_random_secret_key()
                    updated_lines.append(f'SECRET_KEY={new_secret}')
                    self.applied_fixes.append("Generated new SECRET_KEY")
                elif line.startswith('DB_PASSWORD=') and ('postgres' in line or 'password' in line):
                    # Generate strong database password
                    new_password = self._generate_strong_password()
                    updated_lines.append(f'DB_PASSWORD={new_password}')
                    self.applied_fixes.append("Generated strong database password")
                    print(f"   ⚠️ New DB password: {new_password}")
                else:
                    updated_lines.append(line)
            
            env_file.write_text('\n'.join(updated_lines))
    
    def _apply_rate_limiting(self):
        """Apply rate limiting configuration"""
        print("🚦 Applying rate limiting...")
        
        # Create rate limiting middleware
        rate_limit_middleware = Path('core/middleware/rate_limiting.py')
        rate_limit_middleware.parent.mkdir(exist_ok=True)
        
        rate_limit_code = '''"""
Rate Limiting Middleware for API endpoints
"""

import time
from collections import defaultdict
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings


class RateLimitMiddleware:
    """Rate limiting middleware"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limits = {
            '/api/auth/': {'requests': 5, 'window': 300},  # 5 requests per 5 minutes
            '/api/financial/': {'requests': 100, 'window': 3600},  # 100 requests per hour
            '/api/maintenance/': {'requests': 50, 'window': 3600},  # 50 requests per hour
            '/api/projects/': {'requests': 50, 'window': 3600},  # 50 requests per hour
        }
    
    def __call__(self, request):
        if not getattr(settings, 'RATELIMIT_ENABLE', False):
            return self.get_response(request)
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Check rate limits
        for path_prefix, limits in self.rate_limits.items():
            if request.path.startswith(path_prefix):
                if self._is_rate_limited(client_ip, path_prefix, limits):
                    return JsonResponse({
                        'error': 'Rate limit exceeded',
                        'detail': f'Too many requests. Try again later.'
                    }, status=429)
        
        return self.get_response(request)
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '127.0.0.1')
    
    def _is_rate_limited(self, client_ip, path, limits):
        """Check if client is rate limited"""
        cache_key = f"rate_limit:{client_ip}:{path}"
        current_time = int(time.time())
        window_start = current_time - limits['window']
        
        # Get request times from cache
        request_times = cache.get(cache_key, [])
        
        # Remove old requests outside the window
        request_times = [t for t in request_times if t > window_start]
        
        # Check if limit exceeded
        if len(request_times) >= limits['requests']:
            return True
        
        # Add current request
        request_times.append(current_time)
        cache.set(cache_key, request_times, limits['window'])
        
        return False
'''
        
        rate_limit_middleware.write_text(rate_limit_code)
        self.applied_fixes.append("Created rate limiting middleware")
    
    def _configure_security_headers(self):
        """Configure security headers in Nginx"""
        print("🌐 Configuring security headers...")
        
        nginx_config = Path('nginx/nginx.prod.conf')
        if nginx_config.exists():
            content = nginx_config.read_text()
            
            # Security headers to add
            security_headers = """
        # Security Headers
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options DENY always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        
        # Content Security Policy
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self'; frame-ancestors 'none';" always;
"""
            
            if "# Security Headers" not in content:
                # Find location block and add headers
                content = content.replace(
                    "location / {",
                    f"location / {{{security_headers}"
                )
                nginx_config.write_text(content)
                self.applied_fixes.append("Added security headers to Nginx config")
            else:
                print("   Security headers already configured ✅")
    
    def _harden_file_permissions(self):
        """Harden file and directory permissions"""
        print("📁 Hardening file permissions...")
        
        # Set secure permissions for sensitive files
        sensitive_files = [
            ('.env', 0o600),
            ('docker-compose.prod.yml', 0o644),
            ('nginx/nginx.prod.conf', 0o644),
        ]
        
        for file_path, permissions in sensitive_files:
            file_obj = Path(file_path)
            if file_obj.exists():
                file_obj.chmod(permissions)
                self.applied_fixes.append(f"Set permissions for {file_path}")
        
        # Set secure permissions for directories
        sensitive_dirs = [
            ('logs', 0o750),
            ('media', 0o755),
            ('static', 0o755),
        ]
        
        for dir_path, permissions in sensitive_dirs:
            dir_obj = Path(dir_path)
            if dir_obj.exists():
                dir_obj.chmod(permissions)
                self.applied_fixes.append(f"Set permissions for {dir_path}/")
    
    def _generate_strong_password(self, length=16):
        """Generate a strong random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def _generate_hardening_report(self):
        """Generate security hardening report"""
        print("\n" + "=" * 50)
        print("🔧 SECURITY HARDENING REPORT")
        print("=" * 50)
        
        print(f"\n✅ APPLIED FIXES ({len(self.applied_fixes)})")
        print("-" * 25)
        for i, fix in enumerate(self.applied_fixes, 1):
            print(f"{i}. {fix}")
        
        if self.failed_fixes:
            print(f"\n❌ FAILED FIXES ({len(self.failed_fixes)})")
            print("-" * 20)
            for i, failure in enumerate(self.failed_fixes, 1):
                print(f"{i}. {failure}")
        
        print(f"\n💾 BACKUPS LOCATION")
        print("-" * 20)
        print(f"   {self.backup_dir.absolute()}")
        
        print(f"\n🚀 NEXT STEPS")
        print("-" * 15)
        print("1. Review and test all applied changes")
        print("2. Update database password in production environment")
        print("3. Restart services to apply new configurations")
        print("4. Run security audit to verify improvements")
        print("5. Monitor application logs for any issues")
        
        print(f"\n🎉 Security hardening completed!")
        print(f"   Applied {len(self.applied_fixes)} security fixes")


def main():
    """Run security hardening"""
    hardener = SecurityHardener()
    hardener.apply_all_hardening()


if __name__ == '__main__':
    main()

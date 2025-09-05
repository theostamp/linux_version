"""
Security Audit Tool
Comprehensive security analysis and hardening recommendations
"""

import os
import sys
import django
import re
import subprocess
from pathlib import Path

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.conf import settings
from django.core.management.utils import get_random_secret_key
from django_tenants.utils import schema_context


class SecurityAuditor:
    """Comprehensive security audit for Django application"""
    
    def __init__(self):
        self.vulnerabilities = []
        self.warnings = []
        self.recommendations = []
        self.passed_checks = []
    
    def run_full_audit(self):
        """Run complete security audit"""
        print("🔒 Starting Security Audit...")
        print("=" * 50)
        
        # Django Security Checks
        self._check_django_security_settings()
        
        # Authentication & Authorization
        self._check_authentication_security()
        
        # Database Security
        self._check_database_security()
        
        # File & Upload Security
        self._check_file_security()
        
        # Network & Communication Security
        self._check_network_security()
        
        # Environment & Configuration Security
        self._check_environment_security()
        
        # Dependencies Security
        self._check_dependencies_security()
        
        # Generate comprehensive report
        self._generate_security_report()
    
    def _check_django_security_settings(self):
        """Check Django security configuration"""
        print("🛡️ Checking Django security settings...")
        
        # DEBUG setting
        if settings.DEBUG:
            self.vulnerabilities.append({
                'category': 'Django Settings',
                'issue': 'DEBUG=True in production',
                'severity': 'HIGH',
                'description': 'DEBUG should be False in production',
                'fix': 'Set DEBUG=False in production environment'
            })
        else:
            self.passed_checks.append('DEBUG=False ✅')
        
        # SECRET_KEY
        if hasattr(settings, 'SECRET_KEY'):
            if len(settings.SECRET_KEY) < 50:
                self.vulnerabilities.append({
                    'category': 'Django Settings',
                    'issue': 'Weak SECRET_KEY',
                    'severity': 'HIGH',
                    'description': 'SECRET_KEY is too short or predictable',
                    'fix': 'Generate a new strong SECRET_KEY'
                })
            else:
                self.passed_checks.append('Strong SECRET_KEY ✅')
        
        # ALLOWED_HOSTS
        if not settings.ALLOWED_HOSTS or settings.ALLOWED_HOSTS == ['*']:
            self.vulnerabilities.append({
                'category': 'Django Settings',
                'issue': 'Insecure ALLOWED_HOSTS',
                'severity': 'HIGH',
                'description': 'ALLOWED_HOSTS is empty or allows all hosts',
                'fix': 'Set specific allowed hosts'
            })
        else:
            self.passed_checks.append('ALLOWED_HOSTS configured ✅')
        
        # Security Middleware
        security_middleware = [
            'django.middleware.security.SecurityMiddleware',
            'django.middleware.csrf.CsrfViewMiddleware',
            'django.middleware.clickjacking.XFrameOptionsMiddleware',
        ]
        
        for middleware in security_middleware:
            if middleware not in settings.MIDDLEWARE:
                self.warnings.append({
                    'category': 'Django Settings',
                    'issue': f'Missing {middleware}',
                    'severity': 'MEDIUM',
                    'description': f'{middleware} not found in MIDDLEWARE',
                    'fix': f'Add {middleware} to MIDDLEWARE'
                })
            else:
                self.passed_checks.append(f'{middleware.split(".")[-1]} ✅')
        
        # HTTPS Settings
        https_settings = {
            'SECURE_SSL_REDIRECT': True,
            'SECURE_HSTS_SECONDS': 31536000,  # 1 year
            'SECURE_HSTS_INCLUDE_SUBDOMAINS': True,
            'SECURE_HSTS_PRELOAD': True,
            'SECURE_CONTENT_TYPE_NOSNIFF': True,
            'SECURE_BROWSER_XSS_FILTER': True,
            'SESSION_COOKIE_SECURE': True,
            'CSRF_COOKIE_SECURE': True,
        }
        
        for setting, expected_value in https_settings.items():
            current_value = getattr(settings, setting, None)
            if current_value != expected_value:
                self.warnings.append({
                    'category': 'HTTPS Security',
                    'issue': f'Insecure {setting}',
                    'severity': 'MEDIUM',
                    'description': f'{setting} should be {expected_value}',
                    'fix': f'Set {setting}={expected_value}'
                })
            else:
                self.passed_checks.append(f'{setting} ✅')
    
    def _check_authentication_security(self):
        """Check authentication and authorization security"""
        print("🔐 Checking authentication security...")
        
        # Password validation
        if hasattr(settings, 'AUTH_PASSWORD_VALIDATORS'):
            validators = settings.AUTH_PASSWORD_VALIDATORS
            required_validators = [
                'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
                'django.contrib.auth.password_validation.MinimumLengthValidator',
                'django.contrib.auth.password_validation.CommonPasswordValidator',
                'django.contrib.auth.password_validation.NumericPasswordValidator',
            ]
            
            current_validators = [v.get('NAME', '') for v in validators]
            for required in required_validators:
                if required not in current_validators:
                    self.warnings.append({
                        'category': 'Authentication',
                        'issue': f'Missing password validator: {required}',
                        'severity': 'MEDIUM',
                        'description': 'Password validation is incomplete',
                        'fix': f'Add {required} to AUTH_PASSWORD_VALIDATORS'
                    })
                else:
                    self.passed_checks.append(f'Password validator: {required.split(".")[-1]} ✅')
        
        # JWT Settings
        if hasattr(settings, 'SIMPLE_JWT'):
            jwt_settings = settings.SIMPLE_JWT
            
            # Check token expiration
            access_token_lifetime = jwt_settings.get('ACCESS_TOKEN_LIFETIME')
            if access_token_lifetime and access_token_lifetime.total_seconds() > 3600:  # 1 hour
                self.warnings.append({
                    'category': 'JWT Security',
                    'issue': 'Long JWT access token lifetime',
                    'severity': 'MEDIUM',
                    'description': 'Access tokens should expire within 1 hour',
                    'fix': 'Reduce ACCESS_TOKEN_LIFETIME to 1 hour or less'
                })
            else:
                self.passed_checks.append('JWT access token lifetime ✅')
            
            # Check algorithm
            algorithm = jwt_settings.get('ALGORITHM', 'HS256')
            if algorithm not in ['HS256', 'RS256']:
                self.vulnerabilities.append({
                    'category': 'JWT Security',
                    'issue': f'Weak JWT algorithm: {algorithm}',
                    'severity': 'HIGH',
                    'description': 'JWT should use HS256 or RS256 algorithm',
                    'fix': 'Set ALGORITHM to HS256 or RS256'
                })
            else:
                self.passed_checks.append(f'JWT algorithm: {algorithm} ✅')
    
    def _check_database_security(self):
        """Check database security configuration"""
        print("🗄️ Checking database security...")
        
        db_config = settings.DATABASES.get('default', {})
        
        # Check for default passwords
        password = db_config.get('PASSWORD', '')
        if password in ['postgres', 'password', '123456', 'admin']:
            self.vulnerabilities.append({
                'category': 'Database Security',
                'issue': 'Weak database password',
                'severity': 'HIGH',
                'description': 'Database uses a common/weak password',
                'fix': 'Use a strong, unique database password'
            })
        elif len(password) < 12:
            self.warnings.append({
                'category': 'Database Security',
                'issue': 'Short database password',
                'severity': 'MEDIUM',
                'description': 'Database password should be at least 12 characters',
                'fix': 'Use a longer database password'
            })
        else:
            self.passed_checks.append('Strong database password ✅')
        
        # Check SSL/TLS
        options = db_config.get('OPTIONS', {})
        if 'sslmode' not in options or options['sslmode'] != 'require':
            self.warnings.append({
                'category': 'Database Security',
                'issue': 'Database SSL not enforced',
                'severity': 'MEDIUM',
                'description': 'Database connection should use SSL/TLS',
                'fix': "Add 'sslmode': 'require' to database OPTIONS"
            })
        else:
            self.passed_checks.append('Database SSL enabled ✅')
    
    def _check_file_security(self):
        """Check file upload and static file security"""
        print("📁 Checking file security...")
        
        # Check MEDIA_ROOT permissions
        if hasattr(settings, 'MEDIA_ROOT'):
            media_root = Path(settings.MEDIA_ROOT)
            if media_root.exists():
                # Check if media files are served securely
                self.recommendations.append({
                    'category': 'File Security',
                    'issue': 'Media file security',
                    'severity': 'INFO',
                    'description': 'Ensure media files are not executable',
                    'fix': 'Configure web server to prevent execution of uploaded files'
                })
        
        # Check for file upload size limits
        if not hasattr(settings, 'FILE_UPLOAD_MAX_MEMORY_SIZE'):
            self.warnings.append({
                'category': 'File Security',
                'issue': 'No file upload size limit',
                'severity': 'MEDIUM',
                'description': 'File upload size should be limited',
                'fix': 'Set FILE_UPLOAD_MAX_MEMORY_SIZE and DATA_UPLOAD_MAX_MEMORY_SIZE'
            })
        else:
            self.passed_checks.append('File upload limits configured ✅')
    
    def _check_network_security(self):
        """Check network and communication security"""
        print("🌐 Checking network security...")
        
        # CORS settings
        if hasattr(settings, 'CORS_ALLOWED_ORIGINS'):
            if '*' in str(settings.CORS_ALLOWED_ORIGINS):
                self.vulnerabilities.append({
                    'category': 'Network Security',
                    'issue': 'Permissive CORS configuration',
                    'severity': 'HIGH',
                    'description': 'CORS allows all origins',
                    'fix': 'Restrict CORS_ALLOWED_ORIGINS to specific domains'
                })
            else:
                self.passed_checks.append('CORS properly configured ✅')
        
        # Check for security headers
        security_headers = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Content-Security-Policy'
        ]
        
        self.recommendations.append({
            'category': 'Network Security',
            'issue': 'Security headers',
            'severity': 'INFO',
            'description': 'Ensure all security headers are configured in web server',
            'fix': f'Configure headers: {", ".join(security_headers)}'
        })
    
    def _check_environment_security(self):
        """Check environment and configuration security"""
        print("⚙️ Checking environment security...")
        
        # Check for hardcoded secrets
        sensitive_patterns = [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']',
            r'token\s*=\s*["\'][^"\']+["\']',
        ]
        
        # Check settings.py for hardcoded secrets
        settings_file = Path(__file__).parent / 'new_concierge_backend' / 'settings.py'
        if settings_file.exists():
            content = settings_file.read_text()
            for pattern in sensitive_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    self.vulnerabilities.append({
                        'category': 'Environment Security',
                        'issue': 'Hardcoded secrets in settings',
                        'severity': 'HIGH',
                        'description': 'Sensitive data found in settings file',
                        'fix': 'Move secrets to environment variables'
                    })
                    break
            else:
                self.passed_checks.append('No hardcoded secrets in settings ✅')
        
        # Check .env file permissions
        env_file = Path('.env')
        if env_file.exists():
            stat = env_file.stat()
            if stat.st_mode & 0o077:  # Check if readable by group/others
                self.warnings.append({
                    'category': 'Environment Security',
                    'issue': 'Insecure .env file permissions',
                    'severity': 'MEDIUM',
                    'description': '.env file is readable by group/others',
                    'fix': 'Set .env file permissions to 600 (chmod 600 .env)'
                })
            else:
                self.passed_checks.append('.env file permissions secure ✅')
    
    def _check_dependencies_security(self):
        """Check for vulnerable dependencies"""
        print("📦 Checking dependencies security...")
        
        try:
            # Run safety check if available
            result = subprocess.run(
                ['safety', 'check', '--json'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.passed_checks.append('No known vulnerable dependencies ✅')
            else:
                self.warnings.append({
                    'category': 'Dependencies',
                    'issue': 'Potentially vulnerable dependencies',
                    'severity': 'MEDIUM',
                    'description': 'Some dependencies may have security vulnerabilities',
                    'fix': 'Run: pip install safety && safety check'
                })
                
        except (subprocess.TimeoutExpired, FileNotFoundError):
            self.recommendations.append({
                'category': 'Dependencies',
                'issue': 'Dependency security scanning',
                'severity': 'INFO',
                'description': 'Install safety for dependency vulnerability scanning',
                'fix': 'pip install safety && safety check'
            })
    
    def _generate_security_report(self):
        """Generate comprehensive security report"""
        print("\n" + "=" * 50)
        print("🔒 SECURITY AUDIT REPORT")
        print("=" * 50)
        
        # Summary
        total_issues = len(self.vulnerabilities) + len(self.warnings)
        print(f"\n📊 SUMMARY")
        print(f"   High Severity: {len(self.vulnerabilities)}")
        print(f"   Medium Severity: {len(self.warnings)}")
        print(f"   Passed Checks: {len(self.passed_checks)}")
        print(f"   Recommendations: {len(self.recommendations)}")
        
        # High Severity Vulnerabilities
        if self.vulnerabilities:
            print(f"\n🚨 HIGH SEVERITY VULNERABILITIES")
            print("-" * 40)
            for i, vuln in enumerate(self.vulnerabilities, 1):
                print(f"{i}. {vuln['issue']} ({vuln['category']})")
                print(f"   Description: {vuln['description']}")
                print(f"   Fix: {vuln['fix']}")
                print()
        
        # Medium Severity Warnings
        if self.warnings:
            print(f"\n⚠️ MEDIUM SEVERITY WARNINGS")
            print("-" * 35)
            for i, warning in enumerate(self.warnings, 1):
                print(f"{i}. {warning['issue']} ({warning['category']})")
                print(f"   Description: {warning['description']}")
                print(f"   Fix: {warning['fix']}")
                print()
        
        # Passed Checks
        if self.passed_checks:
            print(f"\n✅ PASSED SECURITY CHECKS")
            print("-" * 30)
            for check in self.passed_checks:
                print(f"   {check}")
        
        # Recommendations
        if self.recommendations:
            print(f"\n💡 SECURITY RECOMMENDATIONS")
            print("-" * 35)
            for i, rec in enumerate(self.recommendations, 1):
                print(f"{i}. {rec['issue']} ({rec['category']})")
                print(f"   Description: {rec['description']}")
                print(f"   Action: {rec['fix']}")
                print()
        
        # Next Steps
        print(f"\n🚀 NEXT STEPS")
        print("-" * 15)
        if self.vulnerabilities:
            print("1. 🚨 Fix HIGH SEVERITY vulnerabilities immediately")
        if self.warnings:
            print("2. ⚠️ Address MEDIUM SEVERITY warnings")
        print("3. 🔧 Implement security hardening recommendations")
        print("4. 🔄 Run security audit regularly")
        print("5. 📚 Review Django security checklist")
        
        # Security Score
        total_checks = len(self.vulnerabilities) + len(self.warnings) + len(self.passed_checks)
        if total_checks > 0:
            score = (len(self.passed_checks) / total_checks) * 100
            print(f"\n🏆 SECURITY SCORE: {score:.1f}%")
            
            if score >= 90:
                print("   Excellent security posture! 🎉")
            elif score >= 75:
                print("   Good security, minor improvements needed 👍")
            elif score >= 60:
                print("   Moderate security, several issues to address ⚠️")
            else:
                print("   Poor security, immediate action required! 🚨")


def main():
    """Run the security audit"""
    auditor = SecurityAuditor()
    auditor.run_full_audit()


if __name__ == '__main__':
    main()

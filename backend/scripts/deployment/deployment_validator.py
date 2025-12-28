"""
Production Deployment Validator
Comprehensive validation script for production readiness
"""

import os
import sys
import django
import subprocess
import requests
import time
from pathlib import Path
from typing import Dict, List, Tuple, Any

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.conf import settings
from django.db import connection
from django_tenants.utils import schema_context
from django.test import Client
from django.contrib.auth import get_user_model

User = get_user_model()


class DeploymentValidator:
    """Comprehensive production deployment validation"""
    
    def __init__(self):
        self.passed_tests = []
        self.failed_tests = []
        self.warnings = []
        self.client = Client()
        
    def run_full_validation(self):
        """Run complete deployment validation"""
        print("🚀 Starting Production Deployment Validation...")
        print("=" * 60)
        
        # Infrastructure validation
        self._validate_infrastructure()
        
        # Database validation
        self._validate_database()
        
        # Application validation
        self._validate_application()
        
        # Security validation
        self._validate_security()
        
        # Performance validation
        self._validate_performance()
        
        # API validation
        self._validate_api_endpoints()
        
        # Frontend validation
        self._validate_frontend()
        
        # Monitoring validation
        self._validate_monitoring()
        
        # Generate final report
        self._generate_validation_report()
    
    def _validate_infrastructure(self):
        """Validate infrastructure components"""
        print("🏗️ Validating Infrastructure...")
        
        # Check Docker containers
        try:
            result = subprocess.run(['docker', 'ps'], capture_output=True, text=True)
            if result.returncode == 0:
                containers = result.stdout
                required_containers = ['postgres', 'redis', 'backend', 'frontend', 'nginx']
                
                for container in required_containers:
                    if container in containers:
                        self.passed_tests.append(f"Docker container '{container}' is running")
                    else:
                        self.failed_tests.append(f"Docker container '{container}' is not running")
            else:
                self.failed_tests.append("Docker is not accessible")
        except FileNotFoundError:
            self.failed_tests.append("Docker is not installed")
        
        # Check required files
        required_files = [
            'docker-compose.prod.yml',
            'nginx/nginx.prod.conf',
            'backend/Dockerfile.prod',
            'frontend/Dockerfile.prod',
            '.env'
        ]
        
        for file_path in required_files:
            if Path(file_path).exists():
                self.passed_tests.append(f"Required file '{file_path}' exists")
            else:
                self.failed_tests.append(f"Required file '{file_path}' is missing")
        
        # Check SSL certificates
        ssl_cert_path = Path('ssl/cert.pem')
        ssl_key_path = Path('ssl/private.key')
        
        if ssl_cert_path.exists() and ssl_key_path.exists():
            self.passed_tests.append("SSL certificates are present")
        else:
            self.warnings.append("SSL certificates not found - ensure they are configured")
    
    def _validate_database(self):
        """Validate database connectivity and schema"""
        print("🗄️ Validating Database...")
        
        try:
            # Test database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                self.passed_tests.append("Database connection successful")
            
            # Check tenant schema
            with schema_context('demo'):
                # Test basic queries
                cursor.execute("SELECT COUNT(*) FROM django_migrations")
                migration_count = cursor.fetchone()[0]
                
                if migration_count > 0:
                    self.passed_tests.append(f"Database migrations applied ({migration_count} migrations)")
                else:
                    self.failed_tests.append("No database migrations found")
                
                # Check critical tables
                critical_tables = [
                    'users_customuser',
                    'buildings_building',
                    'apartments_apartment',
                    'financial_transaction',
                    'maintenance_maintenanceticket',
                    'projects_project'
                ]
                
                for table in critical_tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table}")
                        count = cursor.fetchone()[0]
                        self.passed_tests.append(f"Table '{table}' exists with {count} records")
                    except Exception as e:
                        self.failed_tests.append(f"Table '{table}' is missing or inaccessible: {e}")
                
        except Exception as e:
            self.failed_tests.append(f"Database validation failed: {e}")
    
    def _validate_application(self):
        """Validate Django application configuration"""
        print("🐍 Validating Django Application...")
        
        # Check Django settings
        if not settings.DEBUG:
            self.passed_tests.append("DEBUG is disabled for production")
        else:
            self.failed_tests.append("DEBUG is enabled - should be False in production")
        
        if settings.SECRET_KEY and len(settings.SECRET_KEY) >= 50:
            self.passed_tests.append("SECRET_KEY is properly configured")
        else:
            self.failed_tests.append("SECRET_KEY is missing or too short")
        
        if settings.ALLOWED_HOSTS and '*' not in settings.ALLOWED_HOSTS:
            self.passed_tests.append("ALLOWED_HOSTS is properly configured")
        else:
            self.failed_tests.append("ALLOWED_HOSTS is not properly configured")
        
        # Check installed apps
        required_apps = [
            'django_tenants',
            'rest_framework',
            'corsheaders',
            'financial',
            'maintenance',
            'projects',
            'users'
        ]
        
        for app in required_apps:
            if app in settings.INSTALLED_APPS:
                self.passed_tests.append(f"Required app '{app}' is installed")
            else:
                self.failed_tests.append(f"Required app '{app}' is missing")
        
        # Test static files
        if hasattr(settings, 'STATIC_ROOT') and settings.STATIC_ROOT:
            self.passed_tests.append("STATIC_ROOT is configured")
        else:
            self.warnings.append("STATIC_ROOT should be configured for production")
    
    def _validate_security(self):
        """Validate security configuration"""
        print("🔒 Validating Security Configuration...")
        
        # Check security settings
        security_settings = {
            'SECURE_SSL_REDIRECT': True,
            'SECURE_HSTS_SECONDS': 31536000,
            'SECURE_HSTS_INCLUDE_SUBDOMAINS': True,
            'SESSION_COOKIE_SECURE': True,
            'CSRF_COOKIE_SECURE': True,
        }
        
        for setting, expected_value in security_settings.items():
            actual_value = getattr(settings, setting, None)
            if actual_value == expected_value or (setting.endswith('_SECURE') and not settings.DEBUG):
                self.passed_tests.append(f"Security setting '{setting}' is properly configured")
            else:
                self.warnings.append(f"Security setting '{setting}' should be {expected_value}")
        
        # Check CORS settings
        if hasattr(settings, 'CORS_ALLOWED_ORIGINS') and settings.CORS_ALLOWED_ORIGINS:
            if '*' not in str(settings.CORS_ALLOWED_ORIGINS):
                self.passed_tests.append("CORS is properly configured")
            else:
                self.failed_tests.append("CORS allows all origins - security risk")
        else:
            self.warnings.append("CORS configuration should be reviewed")
    
    def _validate_performance(self):
        """Validate performance optimizations"""
        print("⚡ Validating Performance Configuration...")
        
        # Check caching
        if 'default' in settings.CACHES:
            cache_backend = settings.CACHES['default']['BACKEND']
            if 'redis' in cache_backend.lower():
                self.passed_tests.append("Redis caching is configured")
            else:
                self.warnings.append("Consider using Redis for better caching performance")
        
        # Check database connection pooling
        db_config = settings.DATABASES.get('default', {})
        if 'CONN_MAX_AGE' in db_config:
            self.passed_tests.append("Database connection pooling is configured")
        else:
            self.warnings.append("Database connection pooling should be configured")
        
        # Check if performance monitoring is enabled
        if 'django_prometheus' in settings.INSTALLED_APPS:
            self.passed_tests.append("Prometheus monitoring is enabled")
        else:
            self.warnings.append("Consider enabling Prometheus monitoring")
    
    def _validate_api_endpoints(self):
        """Validate critical API endpoints"""
        print("🌐 Validating API Endpoints...")
        
        # Create test user for API testing
        with schema_context('demo'):
            try:
                test_user = User.objects.filter(email='test@example.com').first()
                if not test_user:
                    test_user = User.objects.create_user(
                        email='test@example.com',
                        password='testpass123',
                        role='admin'
                    )
                
                # Test authentication
                login_response = self.client.post('/api/auth/login/', {
                    'email': 'test@example.com',
                    'password': 'testpass123'
                })
                
                if login_response.status_code == 200:
                    self.passed_tests.append("Authentication endpoint is working")
                    
                    # Get token for authenticated requests
                    token_data = login_response.json()
                    if 'access' in token_data:
                        auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {token_data["access"]}'}
                        
                        # Test critical endpoints
                        endpoints = [
                            ('/api/financial/expenses/', 'Financial expenses endpoint'),
                            ('/api/maintenance/tickets/', 'Maintenance tickets endpoint'),
                            ('/api/projects/projects/', 'Projects endpoint'),
                            ('/api/buildings/', 'Buildings endpoint'),
                            ('/api/apartments/', 'Apartments endpoint')
                        ]
                        
                        for endpoint, description in endpoints:
                            try:
                                response = self.client.get(endpoint, **auth_headers)
                                if response.status_code in [200, 201]:
                                    self.passed_tests.append(f"{description} is accessible")
                                else:
                                    self.failed_tests.append(f"{description} returned status {response.status_code}")
                            except Exception as e:
                                self.failed_tests.append(f"{description} failed: {e}")
                    else:
                        self.failed_tests.append("Authentication response missing access token")
                else:
                    self.failed_tests.append(f"Authentication failed with status {login_response.status_code}")
                    
            except Exception as e:
                self.failed_tests.append(f"API endpoint validation failed: {e}")
    
    def _validate_frontend(self):
        """Validate frontend deployment"""
        print("🎨 Validating Frontend...")
        
        # Check if frontend is accessible
        try:
            # Try to access frontend (assuming it's running on port 3000)
            frontend_urls = [
                'http://localhost:3000',
                'http://frontend:3000'
            ]
            
            frontend_accessible = False
            for url in frontend_urls:
                try:
                    response = requests.get(url, timeout=5)
                    if response.status_code == 200:
                        self.passed_tests.append(f"Frontend is accessible at {url}")
                        frontend_accessible = True
                        break
                except:
                    continue
            
            if not frontend_accessible:
                self.warnings.append("Frontend is not accessible - ensure it's running")
                
        except Exception as e:
            self.warnings.append(f"Frontend validation failed: {e}")
        
        # Check frontend build files
        frontend_build_path = Path('frontend/.next')
        if frontend_build_path.exists():
            self.passed_tests.append("Frontend build files exist")
        else:
            self.warnings.append("Frontend build files not found - run 'npm run build'")
    
    def _validate_monitoring(self):
        """Validate monitoring and health checks"""
        print("📊 Validating Monitoring...")
        
        # Test health check endpoints
        health_endpoints = [
            '/health/',
            '/ready/',
            '/live/'
        ]
        
        for endpoint in health_endpoints:
            try:
                response = self.client.get(endpoint)
                if response.status_code == 200:
                    self.passed_tests.append(f"Health check endpoint '{endpoint}' is working")
                else:
                    self.failed_tests.append(f"Health check endpoint '{endpoint}' returned status {response.status_code}")
            except Exception as e:
                self.failed_tests.append(f"Health check endpoint '{endpoint}' failed: {e}")
        
        # Check monitoring configuration files
        monitoring_files = [
            'monitoring/prometheus.yml',
            'monitoring/alert_rules.yml',
            'monitoring/alertmanager.yml'
        ]
        
        for file_path in monitoring_files:
            if Path(file_path).exists():
                self.passed_tests.append(f"Monitoring file '{file_path}' exists")
            else:
                self.warnings.append(f"Monitoring file '{file_path}' is missing")
    
    def _generate_validation_report(self):
        """Generate comprehensive validation report"""
        print("\n" + "=" * 60)
        print("🚀 PRODUCTION DEPLOYMENT VALIDATION REPORT")
        print("=" * 60)
        
        # Summary
        total_tests = len(self.passed_tests) + len(self.failed_tests) + len(self.warnings)
        success_rate = (len(self.passed_tests) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📊 VALIDATION SUMMARY")
        print("-" * 25)
        print(f"   ✅ Passed: {len(self.passed_tests)}")
        print(f"   ❌ Failed: {len(self.failed_tests)}")
        print(f"   ⚠️ Warnings: {len(self.warnings)}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        # Failed tests (critical issues)
        if self.failed_tests:
            print(f"\n❌ CRITICAL ISSUES ({len(self.failed_tests)})")
            print("-" * 25)
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test}")
        
        # Warnings (non-critical issues)
        if self.warnings:
            print(f"\n⚠️ WARNINGS ({len(self.warnings)})")
            print("-" * 15)
            for i, warning in enumerate(self.warnings, 1):
                print(f"{i}. {warning}")
        
        # Passed tests
        if self.passed_tests:
            print(f"\n✅ PASSED VALIDATIONS ({len(self.passed_tests)})")
            print("-" * 30)
            for i, test in enumerate(self.passed_tests, 1):
                print(f"{i}. {test}")
        
        # Deployment readiness assessment
        print(f"\n🎯 DEPLOYMENT READINESS ASSESSMENT")
        print("-" * 40)
        
        if len(self.failed_tests) == 0:
            if len(self.warnings) == 0:
                print("🟢 READY FOR PRODUCTION DEPLOYMENT")
                print("   All validations passed successfully!")
            elif len(self.warnings) <= 3:
                print("🟡 READY FOR DEPLOYMENT WITH MINOR ISSUES")
                print("   Address warnings for optimal performance")
            else:
                print("🟠 DEPLOYMENT POSSIBLE BUT NOT RECOMMENDED")
                print("   Address warnings before production deployment")
        else:
            print("🔴 NOT READY FOR PRODUCTION DEPLOYMENT")
            print("   Critical issues must be resolved first")
        
        # Next steps
        print(f"\n🚀 NEXT STEPS")
        print("-" * 15)
        if self.failed_tests:
            print("1. 🚨 Fix all critical issues")
            print("2. ⚠️ Address warnings")
            print("3. 🔄 Re-run validation")
            print("4. 📋 Review deployment checklist")
        else:
            print("1. ⚠️ Address any remaining warnings")
            print("2. 🔧 Run final system tests")
            print("3. 📋 Complete deployment checklist")
            print("4. 🚀 Proceed with production deployment")
        
        # Final recommendation
        if len(self.failed_tests) == 0 and len(self.warnings) <= 2:
            print(f"\n🎉 VALIDATION COMPLETED SUCCESSFULLY!")
            print("   System is ready for production deployment")
        else:
            print(f"\n⚡ VALIDATION COMPLETED WITH ISSUES")
            print("   Review and address issues before deployment")


def main():
    """Run deployment validation"""
    validator = DeploymentValidator()
    validator.run_full_validation()


if __name__ == '__main__':
    main()

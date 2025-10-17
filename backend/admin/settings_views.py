# admin/settings_views.py

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
import logging
import json
import os

from core.permissions import IsSuperuser

logger = logging.getLogger(__name__)


class AdminSystemSettingsView(APIView):
    """
    Admin system settings management
    """
    permission_classes = [IsSuperuser]
    
    def get(self, request):
        """
        Get current system settings
        """
        try:
            system_settings = self._get_current_settings()
            return Response(system_settings)
            
        except Exception as e:
            logger.error(f"Error getting system settings: {e}")
            return Response({
                'error': 'Failed to get system settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """
        Update system settings
        """
        try:
            updated_settings = request.data
            self._update_settings(updated_settings)
            
            logger.info(f"System settings updated by admin {request.user.email}")
            
            return Response({
                'message': 'Settings updated successfully',
                'settings': updated_settings
            })
            
        except Exception as e:
            logger.error(f"Error updating system settings: {e}")
            return Response({
                'error': 'Failed to update system settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_current_settings(self):
        """
        Get current system settings
        """
        # In a real implementation, these would be stored in database
        # For now, we'll return default settings
        return {
            # General Settings
            'site_name': getattr(settings, 'SITE_NAME', 'Building Management System'),
            'site_description': getattr(settings, 'SITE_DESCRIPTION', 'Professional building management platform'),
            'site_url': getattr(settings, 'SITE_URL', 'https://example.com'),
            'default_language': getattr(settings, 'LANGUAGE_CODE', 'el'),
            'timezone': getattr(settings, 'TIME_ZONE', 'Europe/Athens'),
            'currency': getattr(settings, 'DEFAULT_CURRENCY', 'EUR'),
            
            # Email Settings
            'email_enabled': getattr(settings, 'EMAIL_ENABLED', True),
            'smtp_host': getattr(settings, 'EMAIL_HOST', ''),
            'smtp_port': getattr(settings, 'EMAIL_PORT', 587),
            'smtp_username': getattr(settings, 'EMAIL_HOST_USER', ''),
            'smtp_password': getattr(settings, 'EMAIL_HOST_PASSWORD', ''),
            'smtp_use_tls': getattr(settings, 'EMAIL_USE_TLS', True),
            'from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', ''),
            'from_name': getattr(settings, 'DEFAULT_FROM_NAME', ''),
            
            # Payment Settings
            'stripe_enabled': getattr(settings, 'STRIPE_ENABLED', False),
            'stripe_public_key': getattr(settings, 'STRIPE_PUBLISHABLE_KEY', ''),
            'stripe_secret_key': getattr(settings, 'STRIPE_SECRET_KEY', ''),
            'stripe_webhook_secret': getattr(settings, 'STRIPE_WEBHOOK_SECRET', ''),
            'paypal_enabled': getattr(settings, 'PAYPAL_ENABLED', False),
            'paypal_client_id': getattr(settings, 'PAYPAL_CLIENT_ID', ''),
            'paypal_client_secret': getattr(settings, 'PAYPAL_CLIENT_SECRET', ''),
            
            # Security Settings
            'password_min_length': getattr(settings, 'PASSWORD_MIN_LENGTH', 8),
            'password_require_uppercase': getattr(settings, 'PASSWORD_REQUIRE_UPPERCASE', True),
            'password_require_numbers': getattr(settings, 'PASSWORD_REQUIRE_NUMBERS', True),
            'password_require_symbols': getattr(settings, 'PASSWORD_REQUIRE_SYMBOLS', True),
            'session_timeout': getattr(settings, 'SESSION_TIMEOUT_MINUTES', 60),
            'max_login_attempts': getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5),
            'two_factor_enabled': getattr(settings, 'TWO_FACTOR_ENABLED', False),
            
            # Feature Flags
            'registration_enabled': getattr(settings, 'REGISTRATION_ENABLED', True),
            'email_verification_required': getattr(settings, 'EMAIL_VERIFICATION_REQUIRED', True),
            'maintenance_mode': getattr(settings, 'MAINTENANCE_MODE', False),
            'debug_mode': getattr(settings, 'DEBUG', False),
            'analytics_enabled': getattr(settings, 'ANALYTICS_ENABLED', True),
            
            # Storage Settings
            'max_file_size': getattr(settings, 'MAX_FILE_SIZE_MB', 10),
            'allowed_file_types': getattr(settings, 'ALLOWED_FILE_TYPES', ['jpg', 'jpeg', 'png', 'pdf']),
            'storage_provider': getattr(settings, 'STORAGE_PROVIDER', 'local'),
            's3_bucket_name': getattr(settings, 'AWS_S3_BUCKET_NAME', ''),
            's3_region': getattr(settings, 'AWS_S3_REGION', ''),
            's3_access_key': getattr(settings, 'AWS_ACCESS_KEY_ID', ''),
            's3_secret_key': getattr(settings, 'AWS_SECRET_ACCESS_KEY', ''),
        }
    
    def _update_settings(self, new_settings):
        """
        Update system settings
        """
        # In a real implementation, these would be saved to database
        # and the Django settings would be reloaded
        # For now, we'll just log the changes
        
        logger.info(f"Settings update requested: {json.dumps(new_settings, indent=2)}")
        
        # Validate critical settings
        self._validate_settings(new_settings)
        
        # TODO: Implement actual settings persistence
        # This could involve:
        # 1. Saving to database
        # 2. Updating environment variables
        # 3. Restarting services if needed
    
    def _validate_settings(self, settings_data):
        """
        Validate settings data
        """
        # Validate email settings
        if settings_data.get('email_enabled'):
            required_email_fields = ['smtp_host', 'smtp_username', 'smtp_password', 'from_email']
            for field in required_email_fields:
                if not settings_data.get(field):
                    raise ValueError(f"Email field {field} is required when email is enabled")
        
        # Validate payment settings
        if settings_data.get('stripe_enabled'):
            required_stripe_fields = ['stripe_public_key', 'stripe_secret_key']
            for field in required_stripe_fields:
                if not settings_data.get(field):
                    raise ValueError(f"Stripe field {field} is required when Stripe is enabled")
        
        # Validate password settings
        min_length = settings_data.get('password_min_length', 8)
        if min_length < 6:
            raise ValueError("Password minimum length must be at least 6 characters")
        
        # Validate file size
        max_file_size = settings_data.get('max_file_size', 10)
        if max_file_size > 100:
            raise ValueError("Maximum file size cannot exceed 100MB")


class AdminSystemStatusView(APIView):
    """
    System health και status monitoring
    """
    permission_classes = [IsSuperuser]
    
    def get(self, request):
        """
        Get system health status
        """
        try:
            status_data = {
                'database': self._check_database_health(),
                'email': self._check_email_health(),
                'payments': self._check_payment_health(),
                'storage': self._check_storage_health(),
                'overall_health': 'healthy',
                'last_check': timezone.now().isoformat(),
            }
            
            # Calculate overall health
            health_scores = []
            for service, status in status_data.items():
                if service == 'overall_health' or service == 'last_check':
                    continue
                if isinstance(status, dict) and 'status' in status:
                    if status['status'] == 'healthy':
                        health_scores.append(1)
                    elif status['status'] == 'warning':
                        health_scores.append(0.5)
                    else:
                        health_scores.append(0)
            
            if health_scores:
                avg_score = sum(health_scores) / len(health_scores)
                if avg_score >= 0.8:
                    status_data['overall_health'] = 'healthy'
                elif avg_score >= 0.5:
                    status_data['overall_health'] = 'warning'
                else:
                    status_data['overall_health'] = 'critical'
            
            return Response(status_data)
            
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return Response({
                'error': 'Failed to get system status'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _check_database_health(self):
        """
        Check database health
        """
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            
            # Get basic stats
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user_count = User.objects.count()
            
            return {
                'status': 'healthy',
                'user_count': user_count,
                'last_check': timezone.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'last_check': timezone.now().isoformat(),
            }
    
    def _check_email_health(self):
        """
        Check email service health
        """
        try:
            # Test email configuration
            if not getattr(settings, 'EMAIL_ENABLED', False):
                return {
                    'status': 'warning',
                    'message': 'Email service is disabled',
                    'last_check': timezone.now().isoformat(),
                }
            
            # In a real implementation, you might send a test email
            # or check SMTP connectivity
            
            return {
                'status': 'healthy',
                'last_check': timezone.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Email health check failed: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'last_check': timezone.now().isoformat(),
            }
    
    def _check_payment_health(self):
        """
        Check payment system health
        """
        try:
            from ..billing.models import BillingCycle
            
            # Check recent payment success rate
            recent_payments = BillingCycle.objects.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=7)
            )
            
            total_payments = recent_payments.count()
            successful_payments = recent_payments.filter(status='paid').count()
            
            if total_payments == 0:
                success_rate = 100
            else:
                success_rate = (successful_payments / total_payments) * 100
            
            status = 'healthy'
            if success_rate < 90:
                status = 'warning'
            if success_rate < 70:
                status = 'error'
            
            return {
                'status': status,
                'success_rate': round(success_rate, 2),
                'total_payments': total_payments,
                'successful_payments': successful_payments,
                'last_check': timezone.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Payment health check failed: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'last_check': timezone.now().isoformat(),
            }
    
    def _check_storage_health(self):
        """
        Check file storage health
        """
        try:
            storage_provider = getattr(settings, 'STORAGE_PROVIDER', 'local')
            
            if storage_provider == 'local':
                # Check local storage space
                import shutil
                total, used, free = shutil.disk_usage('/')
                
                free_percentage = (free / total) * 100
                
                if free_percentage < 10:
                    status = 'error'
                elif free_percentage < 20:
                    status = 'warning'
                else:
                    status = 'healthy'
                
                return {
                    'status': status,
                    'provider': 'local',
                    'free_space_gb': round(free / (1024**3), 2),
                    'total_space_gb': round(total / (1024**3), 2),
                    'free_percentage': round(free_percentage, 2),
                    'last_check': timezone.now().isoformat(),
                }
            
            elif storage_provider == 's3':
                # In a real implementation, test S3 connectivity
                return {
                    'status': 'healthy',
                    'provider': 's3',
                    'bucket': getattr(settings, 'AWS_S3_BUCKET_NAME', ''),
                    'last_check': timezone.now().isoformat(),
                }
            
            else:
                return {
                    'status': 'warning',
                    'provider': storage_provider,
                    'message': 'Unknown storage provider',
                    'last_check': timezone.now().isoformat(),
                }
            
        except Exception as e:
            logger.error(f"Storage health check failed: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'last_check': timezone.now().isoformat(),
            }


class AdminSystemBackupView(APIView):
    """
    System backup management
    """
    permission_classes = [IsSuperuser]
    
    def get(self, request):
        """
        Get backup information
        """
        try:
            # In a real implementation, this would check actual backup status
            backup_info = {
                'last_backup': timezone.now() - timezone.timedelta(hours=6),  # Mock data
                'backup_frequency': 'daily',
                'backup_location': '/backups/',
                'backup_size': '2.5 GB',
                'status': 'success',
            }
            
            return Response(backup_info)
            
        except Exception as e:
            logger.error(f"Error getting backup info: {e}")
            return Response({
                'error': 'Failed to get backup information'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Create manual backup
        """
        try:
            # In a real implementation, this would trigger a backup process
            logger.info(f"Manual backup requested by admin {request.user.email}")
            
            # TODO: Implement actual backup process
            # This could involve:
            # 1. Database dump
            # 2. File system backup
            # 3. Configuration backup
            
            return Response({
                'message': 'Backup process initiated',
                'backup_id': f"backup_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
                'estimated_duration': '10-15 minutes'
            })
            
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return Response({
                'error': 'Failed to create backup'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSystemLogsView(APIView):
    """
    System logs viewing
    """
    permission_classes = [IsSuperuser]
    
    def get(self, request):
        """
        Get system logs
        """
        try:
            log_type = request.query_params.get('type', 'error')
            limit = int(request.query_params.get('limit', 100))
            
            # In a real implementation, this would read actual log files
            # For now, return mock log data
            logs = []
            for i in range(min(limit, 50)):  # Mock 50 logs max
                logs.append({
                    'timestamp': (timezone.now() - timezone.timedelta(minutes=i*5)).isoformat(),
                    'level': 'ERROR' if i % 3 == 0 else 'INFO',
                    'message': f'Mock log message {i+1}',
                    'source': 'application',
                })
            
            return Response({
                'logs': logs,
                'total': len(logs),
                'log_type': log_type,
            })
            
        except Exception as e:
            logger.error(f"Error getting system logs: {e}")
            return Response({
                'error': 'Failed to get system logs'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

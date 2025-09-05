"""
Production Health Check System
Comprehensive health monitoring for all system components
"""

import os
import time
import psutil
from django.http import JsonResponse
from django.views import View
from django.conf import settings
from django.db import connections
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
import redis
import logging

logger = logging.getLogger(__name__)


@method_decorator([csrf_exempt, never_cache], name='dispatch')
class HealthCheckView(View):
    """
    Comprehensive health check endpoint for production monitoring
    Returns detailed system status and performance metrics
    """
    
    def get(self, request):
        """Perform comprehensive health checks"""
        start_time = time.time()
        
        health_data = {
            'status': 'healthy',
            'timestamp': time.time(),
            'checks': {},
            'metrics': {},
            'environment': os.environ.get('ENV', 'development')
        }
        
        # Database health check
        db_status = self._check_database()
        health_data['checks']['database'] = db_status
        
        # Cache health check
        cache_status = self._check_cache()
        health_data['checks']['cache'] = cache_status
        
        # Redis health check
        redis_status = self._check_redis()
        health_data['checks']['redis'] = redis_status
        
        # System metrics
        system_metrics = self._get_system_metrics()
        health_data['metrics']['system'] = system_metrics
        
        # Application metrics
        app_metrics = self._get_application_metrics()
        health_data['metrics']['application'] = app_metrics
        
        # Overall health determination
        all_checks = [db_status, cache_status, redis_status]
        if all(check['status'] == 'healthy' for check in all_checks):
            health_data['status'] = 'healthy'
            status_code = 200
        elif any(check['status'] == 'critical' for check in all_checks):
            health_data['status'] = 'critical'
            status_code = 503
        else:
            health_data['status'] = 'degraded'
            status_code = 200
        
        # Response time
        health_data['response_time_ms'] = round((time.time() - start_time) * 1000, 2)
        
        return JsonResponse(health_data, status=status_code)
    
    def _check_database(self):
        """Check database connectivity and performance"""
        try:
            start_time = time.time()
            
            # Test database connection
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            # Test tenant database
            from django_tenants.utils import schema_context
            with schema_context('demo'):
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user_count = User.objects.count()
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                'status': 'healthy',
                'response_time_ms': response_time,
                'tenant_users': user_count,
                'connection_status': 'connected'
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'critical',
                'error': str(e),
                'connection_status': 'failed'
            }
    
    def _check_cache(self):
        """Check Django cache system"""
        try:
            start_time = time.time()
            
            # Test cache write/read
            test_key = 'health_check_test'
            test_value = f'test_{int(time.time())}'
            
            cache.set(test_key, test_value, 30)
            cached_value = cache.get(test_key)
            
            if cached_value != test_value:
                raise Exception("Cache read/write mismatch")
            
            # Clean up
            cache.delete(test_key)
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                'status': 'healthy',
                'response_time_ms': response_time,
                'backend': getattr(settings, 'CACHES', {}).get('default', {}).get('BACKEND', 'unknown')
            }
            
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                'status': 'degraded',
                'error': str(e)
            }
    
    def _check_redis(self):
        """Check Redis connectivity"""
        try:
            start_time = time.time()
            
            # Connect to Redis
            redis_client = redis.Redis.from_url(
                os.environ.get('REDIS_URL', 'redis://redis:6379')
            )
            
            # Test Redis ping
            redis_client.ping()
            
            # Test Redis operations
            test_key = 'health_check_redis_test'
            redis_client.set(test_key, 'test_value', ex=30)
            value = redis_client.get(test_key)
            redis_client.delete(test_key)
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            # Get Redis info
            redis_info = redis_client.info()
            
            return {
                'status': 'healthy',
                'response_time_ms': response_time,
                'version': redis_info.get('redis_version'),
                'connected_clients': redis_info.get('connected_clients'),
                'used_memory_human': redis_info.get('used_memory_human')
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                'status': 'degraded',
                'error': str(e)
            }
    
    def _get_system_metrics(self):
        """Get system performance metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Load average (Linux/Unix only)
            try:
                load_avg = os.getloadavg()
            except (OSError, AttributeError):
                load_avg = [0, 0, 0]
            
            return {
                'cpu_percent': cpu_percent,
                'memory': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'available_gb': round(memory.available / (1024**3), 2),
                    'percent_used': memory.percent
                },
                'disk': {
                    'total_gb': round(disk.total / (1024**3), 2),
                    'free_gb': round(disk.free / (1024**3), 2),
                    'percent_used': round((disk.used / disk.total) * 100, 2)
                },
                'load_average': {
                    '1min': load_avg[0],
                    '5min': load_avg[1],
                    '15min': load_avg[2]
                }
            }
            
        except Exception as e:
            logger.error(f"System metrics collection failed: {e}")
            return {'error': str(e)}
    
    def _get_application_metrics(self):
        """Get application-specific metrics"""
        try:
            from django_tenants.utils import schema_context
            
            metrics = {
                'uptime_seconds': time.time() - getattr(settings, 'START_TIME', time.time()),
                'django_version': getattr(settings, 'DJANGO_VERSION', 'unknown'),
                'debug_mode': settings.DEBUG
            }
            
            # Get tenant-specific metrics
            try:
                with schema_context('demo'):
                    from buildings.models import Building
                    from maintenance.models import MaintenanceTicket
                    from projects.models import Project
                    
                    metrics['tenant_data'] = {
                        'buildings_count': Building.objects.count(),
                        'maintenance_tickets_count': MaintenanceTicket.objects.count(),
                        'projects_count': Project.objects.count()
                    }
            except Exception as e:
                logger.warning(f"Could not collect tenant metrics: {e}")
                metrics['tenant_data'] = {'error': str(e)}
            
            return metrics
            
        except Exception as e:
            logger.error(f"Application metrics collection failed: {e}")
            return {'error': str(e)}


@method_decorator([csrf_exempt, never_cache], name='dispatch')
class ReadinessCheckView(View):
    """
    Readiness check for Kubernetes/Docker health probes
    Returns 200 if application is ready to serve traffic
    """
    
    def get(self, request):
        """Quick readiness check"""
        try:
            # Quick database check
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            
            return JsonResponse({
                'status': 'ready',
                'timestamp': time.time()
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'not_ready',
                'error': str(e),
                'timestamp': time.time()
            }, status=503)


@method_decorator([csrf_exempt, never_cache], name='dispatch')
class LivenessCheckView(View):
    """
    Liveness check for Kubernetes/Docker health probes
    Returns 200 if application process is alive
    """
    
    def get(self, request):
        """Simple liveness check"""
        return JsonResponse({
            'status': 'alive',
            'timestamp': time.time(),
            'pid': os.getpid()
        })

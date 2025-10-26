# backend/core/health_views.py

from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from django_tenants.utils import schema_context, get_public_schema_name
import logging

logger = logging.getLogger('django')


def health_check(request):
    """
    GET /api/health/
    Βασικό health check endpoint - επιστρέφει 200 OK αν το backend είναι online
    """
    return JsonResponse({
        'status': 'healthy',
        'service': 'linux-version-backend'
    }, status=200)


def health_oauth(request):
    """
    GET /api/health/oauth/
    Έλεγχος αν οι OAuth environment variables είναι ορισμένες
    Επιστρέφει:
    - 200: Αν υπάρχουν GOOGLE_CLIENT_ID και GOOGLE_CLIENT_SECRET
    - 503: Αν λείπουν τα credentials
    """
    has_client_id = bool(getattr(settings, 'GOOGLE_CLIENT_ID', ''))
    has_client_secret = bool(getattr(settings, 'GOOGLE_CLIENT_SECRET', ''))
    
    is_configured = has_client_id and has_client_secret
    
    response_data = {
        'status': 'configured' if is_configured else 'not_configured',
        'google_oauth': {
            'client_id_exists': has_client_id,
            'client_secret_exists': has_client_secret
        }
    }
    
    status_code = 200 if is_configured else 503
    
    logger.info(f"[HEALTH] OAuth check - Status: {response_data['status']}")
    
    return JsonResponse(response_data, status=status_code)


def health_db(request):
    """
    GET /api/health/db/
    Έλεγχος της σύνδεσης με τη βάση δεδομένων
    Επιστρέφει:
    - 200: Αν η σύνδεση λειτουργεί
    - 503: Αν υπάρχει πρόβλημα
    """
    try:
        # Δοκιμή απλού query
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        
        is_connected = result == (1,)
        
        response_data = {
            'status': 'connected' if is_connected else 'disconnected',
            'database': settings.DATABASES['default']['NAME'],
            'engine': settings.DATABASES['default']['ENGINE']
        }
        
        logger.info(f"[HEALTH] DB check - Status: {response_data['status']}")
        
        return JsonResponse(response_data, status=200 if is_connected else 503)
        
    except Exception as e:
        logger.error(f"[HEALTH] DB check failed - Error: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=503)


def health_schema(request):
    """
    GET /api/health/schema/
    Επιστρέφει το τρέχον active schema
    Χρήσιμο για debugging tenant isolation issues
    """
    try:
        current_schema = getattr(connection, 'schema_name', 'unknown')
        public_schema = get_public_schema_name()
        
        response_data = {
            'current_schema': current_schema,
            'public_schema_name': public_schema,
            'is_public': current_schema == public_schema
        }
        
        logger.info(f"[HEALTH] Schema check - Current: {current_schema}, Public: {public_schema}")
        
        return JsonResponse(response_data, status=200)
        
    except Exception as e:
        logger.error(f"[HEALTH] Schema check failed - Error: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'error': str(e)
        }, status=500)

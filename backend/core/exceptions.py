# backend/core/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
import logging

logger = logging.getLogger(__name__)

class ResourceNotFoundException(Exception):
    """Custom exception for when a resource is not found"""
    def __init__(self, resource_type: str, resource_id: str, message: str = None):
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.message = message or f"{resource_type} with id {resource_id} not found"
        super().__init__(self.message)

class PermissionDeniedException(Exception):
    """Custom exception for permission denied errors"""
    def __init__(self, action: str, resource: str, message: str = None):
        self.action = action
        self.resource = resource
        self.message = message or f"Permission denied for {action} on {resource}"
        super().__init__(self.message)

class ValidationException(Exception):
    """Custom exception for validation errors"""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(self.message)

def custom_exception_handler(exc, context):
    """
    Custom exception handler for better error responses
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log the error for debugging
        logger.error(f"API Error: {exc.__class__.__name__}: {str(exc)}")
        logger.error(f"Request: {context['request'].method} {context['request'].path}")
        logger.error(f"User: {context['request'].user}")
        
        # Customize error response
        if isinstance(exc, ObjectDoesNotExist):
            response.data = {
                'detail': 'Ο πόρος που ζητήσατε δεν βρέθηκε.',
                'code': 'NOT_FOUND',
                'resource_type': exc.__class__.__name__.replace('DoesNotExist', ''),
                'status': status.HTTP_404_NOT_FOUND
            }
            response.status_code = status.HTTP_404_NOT_FOUND
            
        elif isinstance(exc, Http404):
            response.data = {
                'detail': 'Η σελίδα που ζητήσατε δεν βρέθηκε.',
                'code': 'PAGE_NOT_FOUND',
                'status': status.HTTP_404_NOT_FOUND
            }
            response.status_code = status.HTTP_404_NOT_FOUND
            
        elif isinstance(exc, ResourceNotFoundException):
            response.data = {
                'detail': exc.message,
                'code': 'RESOURCE_NOT_FOUND',
                'resource_type': exc.resource_type,
                'resource_id': exc.resource_id,
                'status': status.HTTP_404_NOT_FOUND
            }
            response.status_code = status.HTTP_404_NOT_FOUND
            
        elif isinstance(exc, PermissionDeniedException):
            response.data = {
                'detail': exc.message,
                'code': 'PERMISSION_DENIED',
                'action': exc.action,
                'resource': exc.resource,
                'status': status.HTTP_403_FORBIDDEN
            }
            response.status_code = status.HTTP_403_FORBIDDEN
            
        elif isinstance(exc, ValidationException):
            response.data = {
                'detail': exc.message,
                'code': 'VALIDATION_ERROR',
                'field': exc.field,
                'status': status.HTTP_400_BAD_REQUEST
            }
            response.status_code = status.HTTP_400_BAD_REQUEST
    
    return response

def handle_404_error(request, exception):
    """
    Custom 404 handler for better error pages
    """
    logger.warning(f"404 Error: {request.path} - User: {request.user}")
    
    if request.path.startswith('/api/'):
        # API 404 - return JSON response
        return Response({
            'detail': 'Ο πόρος που ζητήσατε δεν βρέθηκε.',
            'code': 'NOT_FOUND',
            'path': request.path,
            'method': request.method
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Frontend 404 - could return a custom 404 page
    # For now, let Django handle it
    return None 
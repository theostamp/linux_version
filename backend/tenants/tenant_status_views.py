# backend/tenants/tenant_status_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
import logging

from core.permissions import IsInternalService
from tenants.models import Client
from users.models import CustomUser

logger = logging.getLogger(__name__)


class TenantStatusView(APIView):
    """
    GET /api/tenants/{tenant_subdomain}/status/
    
    Returns tenant creation and email verification status.
    """
    
    authentication_classes = []
    permission_classes = [IsInternalService]
    
    def get(self, request, tenant_subdomain):
        """
        Get tenant status including email verification status.
        """
        try:
            # Get tenant
            tenant = Client.objects.get(schema_name=tenant_subdomain)
            
            # Get user associated with tenant
            try:
                user = CustomUser.objects.get(tenant=tenant)
            except CustomUser.DoesNotExist:
                return Response({
                    'tenant_ready': True,
                    'email_verified': False,
                    'email_sent': False,
                    'tenant_url': f"{tenant_subdomain}.newconcierge.app",
                    'error': 'User not found for tenant'
                }, status=status.HTTP_200_OK)
            
            # Check email verification status
            email_verified = user.email_verified and user.is_active
            email_sent = bool(user.email_verification_token) or user.email_verified
            
            return Response({
                'tenant_ready': True,
                'email_verified': email_verified,
                'email_sent': email_sent,
                'tenant_url': f"{tenant_subdomain}.newconcierge.app",
                'user_email': user.email,
                'user_active': user.is_active
            }, status=status.HTTP_200_OK)
            
        except Client.DoesNotExist:
            return Response({
                'tenant_ready': False,
                'email_verified': False,
                'email_sent': False,
                'tenant_url': None,
                'error': 'Tenant not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting tenant status: {e}")
            return Response({
                'tenant_ready': False,
                'email_verified': False,
                'email_sent': False,
                'tenant_url': None,
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


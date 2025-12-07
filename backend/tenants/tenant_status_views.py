# backend/tenants/tenant_status_views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
import logging

from core.permissions import IsInternalService
from tenants.models import Client
from users.models import CustomUser
from users.services import EmailService

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
        logger.info(f"[TENANT_STATUS] Request received for tenant: {tenant_subdomain}")
        api_key_header = request.META.get('HTTP_X_INTERNAL_API_KEY', 'NOT_FOUND')
        logger.info(f"[TENANT_STATUS] X-Internal-API-Key header: {'PRESENT' if api_key_header != 'NOT_FOUND' else 'NOT_FOUND'}")
        logger.info(f"[TENANT_STATUS] Request method: {request.method}")
        
        try:
            # Get tenant
            logger.info(f"[TENANT_STATUS] Looking up tenant with schema_name: {tenant_subdomain}")
            tenant = Client.objects.get(schema_name=tenant_subdomain)
            logger.info(f"[TENANT_STATUS] Tenant found: {tenant.schema_name}")
            
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
            # Return 200 with tenant_ready=False instead of 404
            # This allows the frontend to continue polling
            logger.info(f"[TENANT_STATUS] Tenant not found yet: {tenant_subdomain}")
            return Response({
                'tenant_ready': False,
                'email_verified': False,
                'email_sent': False,
                'tenant_url': None,
                'status': 'pending',
                'message': 'Tenant creation in progress'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error getting tenant status: {e}")
            return Response({
                'tenant_ready': False,
                'email_verified': False,
                'email_sent': False,
                'tenant_url': None,
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResendVerificationView(APIView):
    """
    POST /api/internal/tenants/{tenant_subdomain}/resend-verification/
    
    Resends verification email to the user associated with a tenant.
    This is called from the verify-payment page when user clicks "Resend Email".
    """
    
    authentication_classes = []
    permission_classes = [IsInternalService]
    
    def post(self, request, tenant_subdomain):
        """
        Resend verification email to tenant's user.
        """
        logger.info(f"[RESEND_VERIFICATION] Request received for tenant: {tenant_subdomain}")
        
        user = None
        
        try:
            # Try to find tenant first
            try:
                tenant = Client.objects.get(schema_name=tenant_subdomain)
                logger.info(f"[RESEND_VERIFICATION] Tenant found: {tenant.schema_name}")
                
                # Get user associated with tenant
                user = CustomUser.objects.filter(tenant=tenant).first()
                if user:
                    logger.info(f"[RESEND_VERIFICATION] Found user via tenant: {user.email}")
            except Client.DoesNotExist:
                logger.warning(f"[RESEND_VERIFICATION] Tenant not found: {tenant_subdomain}")
            
            # If no user found via tenant, try to find recently created unverified user
            # This handles the case where tenant creation failed but user was created
            if not user:
                from django.utils import timezone
                from datetime import timedelta
                
                # Look for unverified users created in last 24 hours
                recent_cutoff = timezone.now() - timedelta(hours=24)
                
                # Try to find user whose pending subscription matches this tenant
                unverified_users = CustomUser.objects.filter(
                    email_verified=False,
                    date_joined__gte=recent_cutoff,
                    tenant__isnull=True  # User without tenant (failed provisioning)
                ).order_by('-date_joined')
                
                for candidate in unverified_users:
                    logger.info(f"[RESEND_VERIFICATION] Checking candidate: {candidate.email}")
                    # Check if this user's Stripe metadata matches the tenant
                    if candidate.stripe_customer_id:
                        user = candidate
                        logger.info(f"[RESEND_VERIFICATION] Found orphan user: {user.email}")
                        break
            
            if not user:
                logger.error(f"[RESEND_VERIFICATION] No user found for tenant: {tenant_subdomain}")
                return Response({
                    'error': 'User not found for tenant'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if email is already verified
            if user.email_verified:
                logger.info(f"[RESEND_VERIFICATION] Email already verified for: {user.email}")
                return Response({
                    'message': 'Email is already verified',
                    'email_verified': True
                }, status=status.HTTP_200_OK)
            
            # Send verification email
            try:
                success = EmailService.send_verification_email(user)
                if success:
                    logger.info(f"[RESEND_VERIFICATION] Verification email sent to: {user.email}")
                    return Response({
                        'success': True,
                        'message': 'Verification email sent successfully',
                        'email': user.email
                    }, status=status.HTTP_200_OK)
                else:
                    logger.error(f"[RESEND_VERIFICATION] Failed to send email to: {user.email}")
                    return Response({
                        'error': 'Failed to send verification email'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                logger.error(f"[RESEND_VERIFICATION] Error sending email: {e}")
                return Response({
                    'error': f'Email service error: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"[RESEND_VERIFICATION] Error: {e}")
            return Response({
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


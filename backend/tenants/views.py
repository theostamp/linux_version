# backend/tenants/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import CustomUser
from .models import Client
import logging

logger = logging.getLogger(__name__)


class AcceptTenantInviteView(APIView):
    """
    Accept tenant invitation via secure token.
    Validates token and returns JWT for tenant access.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return Response({
                'error': 'Token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify token (24h expiry)
            signer = TimestampSigner()
            unsigned_data = signer.unsign(token, max_age=86400)  # 24 hours
            
            # Parse token data: "user_id:tenant_id:domain"
            user_id, tenant_id, domain = unsigned_data.split(':')
            
            # Validate user and tenant
            user = CustomUser.objects.get(id=user_id)
            tenant = Client.objects.get(id=tenant_id)
            
            # Verify user is linked to this tenant
            if user.tenant_id != int(tenant_id):
                return Response({
                    'error': 'Invalid tenant access'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            
            return Response({
                'status': 'success',
                'tenant': {
                    'schema_name': tenant.schema_name,
                    'name': tenant.name,
                    'domain': domain
                },
                'tokens': {
                    'access': access_token,
                    'refresh': str(refresh)
                },
                'user': {
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role
                }
            })
            
        except SignatureExpired:
            return Response({
                'error': 'Token has expired. Please login normally.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except (BadSignature, ValueError):
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)
        except (CustomUser.DoesNotExist, Client.DoesNotExist):
            return Response({
                'error': 'User or tenant not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error accepting tenant invite: {e}")
            return Response({
                'error': 'Failed to process invitation'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
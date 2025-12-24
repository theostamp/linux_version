# backend/tenants/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
from rest_framework_simplejwt.tokens import RefreshToken
from django_tenants.utils import schema_context
from users.models import CustomUser
from .models import Client, Domain
from core.permissions import IsUltraAdmin
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
                'access': access_token,
                'refresh': str(refresh),
                'tenant': {
                    'schema_name': tenant.schema_name,
                    'name': tenant.name,
                    'domain': domain
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


class TenantListView(APIView):
    """
    Ultra Admin only: List all tenants with their primary domains.
    Used by the building selector to allow Ultra Admin to switch between tenants.
    Runs in PUBLIC schema.
    """
    permission_classes = [IsAuthenticated, IsUltraAdmin]

    def get(self, request):
        """
        Returns list of tenants with their domains and building counts.
        """
        logger.info(f"TenantListView.get called by user: {request.user.email} (ID: {request.user.id})")
        
        try:
            with schema_context("public"):
                # Temporarily remove is_active filter to see if that's the issue
                tenants_query = Client.objects.exclude(schema_name="public")
                logger.info(f"TenantListView: Total tenants in public schema (excluding public): {tenants_query.count()}")
                
                tenants = list(
                    tenants_query.order_by("name", "schema_name")
                    .values("id", "schema_name", "name", "on_trial", "paid_until", "is_active")
                )

                by_id = {t["id"]: t for t in tenants}
                
                # Get primary domains for each tenant
                domains = (
                    Domain.objects.filter(tenant_id__in=by_id.keys())
                    .order_by("tenant_id", "-is_primary", "id")
                    .values("tenant_id", "domain", "is_primary")
                )
                
                for d in domains:
                    t = by_id.get(d["tenant_id"])
                    if not t:
                        continue
                    # First domain encountered becomes primary_domain
                    if "primary_domain" not in t:
                        t["primary_domain"] = d["domain"]
                        t["is_primary_domain"] = bool(d.get("is_primary"))

                # Set default domains for tenants without any and count buildings
                for t in tenants:
                    if "primary_domain" not in t:
                        t["primary_domain"] = f'{t["schema_name"]}.newconcierge.app'
                        t["is_primary_domain"] = False
                    
                    # Count buildings in each tenant schema
                    t["buildings_count"] = self._count_buildings(t["schema_name"])

                logger.info(f"Returning {len(tenants)} tenants to frontend")
                return Response({
                    "tenants": tenants,
                    "count": len(tenants)
                })
        except Exception as e:
            logger.error(f"Error in TenantListView: {e}", exc_info=True)
            return Response({
                "error": str(e),
                "tenants": [],
                "count": 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _count_buildings(self, schema_name: str) -> int:
        """Count buildings in a tenant schema."""
        try:
            with schema_context(schema_name):
                from buildings.models import Building
                return Building.objects.count()
        except Exception as e:
            logger.warning(f"Could not count buildings for tenant {schema_name}: {e}")
            return 0
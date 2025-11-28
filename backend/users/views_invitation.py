"""
Views for Tenant Invitation System
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from django_tenants.utils import schema_context, get_public_schema_name
import logging

from .models_invitation import TenantInvitation
from .models import CustomUser
from .serializers_invitation import (
    TenantInvitationSerializer,
    CreateInvitationSerializer,
    BulkInvitationSerializer,
    AcceptInvitationSerializer,
    DeclineInvitationSerializer
)
from .services import EmailService

logger = logging.getLogger(__name__)


class TenantInvitationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tenant invitations.
    Only accessible by tenant admins/managers.
    """
    serializer_class = TenantInvitationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get invitations for current tenant"""
        user = self.request.user
        
        # Admins can see all invitations they sent
        if user.role in ['manager', 'admin']:
            return TenantInvitation.objects.filter(invited_by=user)
        
        # Regular users can only see their own invitations (if any)
        return TenantInvitation.objects.filter(email=user.email)
    
    def perform_create(self, serializer):
        """Create invitation and send email"""
        serializer.save(invited_by=self.request.user)
    
    @action(detail=False, methods=['post'], url_path='create-single')
    def create_single(self, request):
        """
        Create a single invitation.
        
        POST /api/users/invitations/create-single/
        {
            "email": "user@example.com",
            "invited_role": "resident",
            "apartment_id": 123,
            "message": "Welcome!",
            "expires_in_days": 7
        }
        """
        serializer = CreateInvitationSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create invitation
            invitation = TenantInvitation.objects.create(
                email=serializer.validated_data['email'],
                invited_role=serializer.validated_data['invited_role'],
                apartment_id=serializer.validated_data.get('apartment_id'),
                message=serializer.validated_data.get('message', ''),
                invited_by=request.user,
                expires_at=timezone.now() + timezone.timedelta(
                    days=serializer.validated_data.get('expires_in_days', 7)
                )
            )
            
            # Send invitation email
            self._send_invitation_email(invitation)
            
            return Response(
                TenantInvitationSerializer(invitation).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Failed to create invitation: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='create-bulk')
    def create_bulk(self, request):
        """
        Create multiple invitations at once.
        
        POST /api/users/invitations/create-bulk/
        {
            "emails": ["user1@example.com", "user2@example.com"],
            "invited_role": "resident",
            "message": "Welcome!",
            "expires_in_days": 7
        }
        """
        serializer = BulkInvitationSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            invitations = []
            expires_at = timezone.now() + timezone.timedelta(
                days=serializer.validated_data.get('expires_in_days', 7)
            )
            
            for email in serializer.validated_data['emails']:
                invitation = TenantInvitation.objects.create(
                    email=email,
                    invited_role=serializer.validated_data['invited_role'],
                    message=serializer.validated_data.get('message', ''),
                    invited_by=request.user,
                    expires_at=expires_at
                )
                invitations.append(invitation)
                
                # Send invitation email
                self._send_invitation_email(invitation)
            
            return Response(
                {
                    'message': f'Δημιουργήθηκαν {len(invitations)} προσκλήσεις',
                    'invitations': TenantInvitationSerializer(invitations, many=True).data
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Failed to create bulk invitations: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending invitation"""
        invitation = self.get_object()
        
        try:
            invitation.cancel()
            return Response({'message': 'Η πρόσκληση ακυρώθηκε'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend invitation email"""
        invitation = self.get_object()
        
        if not invitation.can_be_accepted():
            return Response(
                {'error': 'Η πρόσκληση δεν μπορεί να σταλεί ξανά'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            self._send_invitation_email(invitation)
            return Response({'message': 'Η πρόσκληση στάλθηκε ξανά'})
        except Exception as e:
            logger.error(f"Failed to resend invitation: {e}")
            return Response(
                {'error': 'Αποτυχία αποστολής email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _send_invitation_email(self, invitation):
        """Send invitation email to user"""
        try:
            EmailService.send_tenant_invitation_email(invitation)
            logger.info(f"Sent invitation email to {invitation.email}")
        except Exception as e:
            logger.error(f"Failed to send invitation email: {e}")
            raise


class AcceptInvitationView(APIView):
    """
    Public endpoint for accepting invitations.
    Creates user account and adds them to tenant.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Accept invitation and create user account.
        
        POST /api/users/invitations/accept/
        {
            "token": "...",
            "password": "...",
            "first_name": "...",
            "last_name": "..."
        }
        """
        serializer = AcceptInvitationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        invitation = serializer.context['invitation']
        
        try:
            with transaction.atomic():
                # Get tenant from invitation sender
                tenant = invitation.invited_by.tenant
                if not tenant:
                    return Response(
                        {'error': 'Το tenant δεν βρέθηκε'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create user in public schema first
                with schema_context(get_public_schema_name()):
                    public_user = CustomUser.objects.create_user(
                        email=invitation.email,
                        password=serializer.validated_data['password'],
                        first_name=serializer.validated_data.get('first_name', ''),
                        last_name=serializer.validated_data.get('last_name', ''),
                        is_active=True,
                        email_verified=True,  # Auto-verify invited users
                        tenant=tenant,
                        role=invitation.invited_role
                    )
                
                # Create user in tenant schema
                with schema_context(tenant.schema_name):
                    tenant_user = CustomUser.objects.create(
                        email=invitation.email,
                        password=public_user.password,  # Copy hashed password
                        first_name=serializer.validated_data.get('first_name', ''),
                        last_name=serializer.validated_data.get('last_name', ''),
                        is_active=True,
                        email_verified=True,
                        role=invitation.invited_role
                    )
                    
                    # Link to apartment if specified
                    if invitation.apartment:
                        apartment = invitation.apartment
                        role = invitation.invited_role.lower() if invitation.invited_role else ''

                        # Ορισμός χρήστη στο διαμέρισμα ανάλογα με τον ρόλο
                        if role in ['resident', 'ένοικος', 'tenant']:
                            # Ένοικος - θέτουμε tenant_user
                            apartment.tenant_user = tenant_user
                            apartment.is_rented = True
                            logger.info(f"Set tenant_user for apartment {apartment.id} to user {tenant_user.email}")
                        elif role in ['owner', 'ιδιοκτήτης']:
                            # Ιδιοκτήτης - θέτουμε owner_user
                            apartment.owner_user = tenant_user
                            logger.info(f"Set owner_user for apartment {apartment.id} to user {tenant_user.email}")
                        elif role == 'internal_manager':
                            # Internal manager - θέτουμε ως tenant_user και ορίζουμε building.internal_manager
                            apartment.tenant_user = tenant_user
                            apartment.is_rented = True
                            apartment.save(update_fields=['tenant_user', 'is_rented'])

                            building = apartment.building
                            if building:
                                building.internal_manager = tenant_user
                                building.save(update_fields=['internal_manager'])

                                # Δημιουργία BuildingMembership με role='internal_manager'
                                from buildings.models import BuildingMembership
                                BuildingMembership.objects.get_or_create(
                                    resident=tenant_user,
                                    building=building,
                                    defaults={'role': 'internal_manager'}
                                )
                            logger.info(f"Set internal_manager for building {building.id} to user {tenant_user.email}")
                        else:
                            # Default: θεωρούμε ένοικο
                            apartment.tenant_user = tenant_user
                            apartment.is_rented = True
                            logger.info(f"Set tenant_user (default) for apartment {apartment.id} to user {tenant_user.email}")

                        # Αποθήκευση διαμερίσματος (εκτός αν ήδη αποθηκεύτηκε για internal_manager)
                        if role != 'internal_manager':
                            apartment.save(update_fields=['tenant_user', 'owner_user', 'is_rented'])
                
                # Mark invitation as accepted
                invitation.accept(public_user)
                
                logger.info(f"User {invitation.email} accepted invitation and joined tenant {tenant.schema_name}")
                
                return Response({
                    'message': 'Η πρόσκληση έγινε αποδεκτή',
                    'tenant': {
                        'name': tenant.name,
                        'schema_name': tenant.schema_name
                    },
                    'user': {
                        'email': public_user.email,
                        'role': public_user.role
                    }
                })
                
        except Exception as e:
            logger.error(f"Failed to accept invitation: {e}", exc_info=True)
            return Response(
                {'error': f'Αποτυχία αποδοχής πρόσκλησης: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeclineInvitationView(APIView):
    """Public endpoint for declining invitations"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Decline invitation.
        
        POST /api/users/invitations/decline/
        {
            "token": "...",
            "reason": "..."
        }
        """
        serializer = DeclineInvitationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        invitation = serializer.context['invitation']
        
        try:
            invitation.decline()
            logger.info(f"User {invitation.email} declined invitation")
            
            return Response({'message': 'Η πρόσκληση απορρίφθηκε'})
            
        except Exception as e:
            logger.error(f"Failed to decline invitation: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyInvitationView(APIView):
    """Public endpoint to verify invitation token without accepting"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Verify invitation token.
        
        GET /api/users/invitations/verify/?token=...
        """
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitation = TenantInvitation.verify_token(token)
            
            return Response({
                'valid': True,
                'invitation': TenantInvitationSerializer(invitation).data
            })
            
        except Exception as e:
            return Response(
                {
                    'valid': False,
                    'error': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )


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
    
    def list(self, request, *args, **kwargs):
        """List invitations - ensure empty queryset returns 200 with empty list"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
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
                # Get tenant from invitation sender (manager is in tenant schema)
                from django_tenants.utils import get_tenant_model
                TenantModel = get_tenant_model()
                
                # Get current tenant schema from request
                from django_tenants.utils import get_public_schema_name
                current_schema = get_public_schema_name()
                
                # Try to get tenant from the invitation context
                # Managers are created in tenant schemas, so we need to find the tenant
                # by checking which tenant schema the invitation.invited_by user is in
                # Since we're in a multi-tenant context, we'll get tenant from the request
                from django_tenants.middleware import get_current_tenant
                try:
                    tenant = get_current_tenant(request)
                except:
                    # Fallback: try to get tenant from invitation sender's email domain or schema
                    # For now, we'll assume the invitation is being accepted in the correct tenant context
                    tenant = None
                
                if not tenant:
                    # Try to find tenant by schema name from invitation context
                    # Since managers are in tenant schemas, we need another way
                    # For now, we'll create user in public schema and let them access via invitation link
                    pass
                
                # Create user in public schema first (if doesn't exist)
                with schema_context(get_public_schema_name()):
                    public_user, created = CustomUser.objects.get_or_create(
                        email=invitation.email,
                        defaults={
                            'password': serializer.validated_data['password'],
                            'first_name': serializer.validated_data.get('first_name', ''),
                            'last_name': serializer.validated_data.get('last_name', ''),
                            'is_active': True,
                            'email_verified': True,  # Auto-verify invited users
                            'role': None  # Residents don't have system role
                        }
                    )
                    if created:
                        public_user.set_password(serializer.validated_data['password'])
                        public_user.save()
                
                # Get tenant schema from invitation sender's context
                # We need to find which tenant the invitation.invited_by belongs to
                # Since invitations are created in tenant schemas, we need to handle this differently
                # For now, accept in current tenant context (request tenant)
                from django.db import connection
                tenant_schema = connection.schema_name if hasattr(connection, 'schema_name') else get_public_schema_name()
                
                if tenant_schema != get_public_schema_name():
                    # Create user in tenant schema
                    with schema_context(tenant_schema):
                        tenant_user, created = CustomUser.objects.get_or_create(
                            email=invitation.email,
                            defaults={
                                'password': public_user.password,  # Copy hashed password
                                'first_name': serializer.validated_data.get('first_name', ''),
                                'last_name': serializer.validated_data.get('last_name', ''),
                                'is_active': True,
                                'email_verified': True,
                                'role': None  # Residents don't have system role
                            }
                        )
                        if created:
                            tenant_user.set_password(serializer.validated_data['password'])
                            tenant_user.save()
                        
                        # Create Resident profile if invited_role is RESIDENT
                        if invitation.invited_role == 'resident':
                            from residents.models import Resident
                            from buildings.models import Building, BuildingMembership, Apartment
                            
                            # Get building from invitation context (from manager's building)
                            building = None
                            apartment = None
                            
                            if invitation.apartment_id:
                                try:
                                    apartment = Apartment.objects.get(id=invitation.apartment_id)
                                    building = apartment.building
                                except Apartment.DoesNotExist:
                                    logger.warning(f"Apartment {invitation.apartment_id} not found for invitation {invitation.id}")
                            
                            # If no building found, try to get from manager's context
                            if not building:
                                # Get manager's building membership
                                manager_building_membership = BuildingMembership.objects.filter(
                                    resident=invitation.invited_by
                                ).first()
                                if manager_building_membership:
                                    building = manager_building_membership.building
                            
                            if building:
                                # Create Resident entry
                                resident_role = 'tenant' if invitation.invited_role == 'resident' else 'owner'
                                
                                # Check if resident already exists for this (building, apartment) combination
                                # The unique constraint is (building, apartment), not (user, building)
                                apartment_number = apartment.number if apartment else ''
                                existing_resident = Resident.objects.filter(
                                    building=building,
                                    apartment=apartment_number
                                ).first()
                                
                                if existing_resident:
                                    # Resident already exists for this apartment
                                    logger.warning(
                                        f"Resident already exists for apartment {apartment_number} in building {building.name} "
                                        f"(existing user: {existing_resident.user.email}). "
                                        f"Linking new user {tenant_user.email} instead."
                                    )
                                    # Update existing resident to link to new user
                                    existing_resident.user = tenant_user
                                    existing_resident.role = resident_role
                                    if serializer.validated_data.get('phone'):
                                        existing_resident.phone = serializer.validated_data.get('phone')
                                    existing_resident.save()
                                    resident = existing_resident
                                else:
                                    # Create new Resident entry
                                    resident, created = Resident.objects.get_or_create(
                                        user=tenant_user,
                                        building=building,
                                        defaults={
                                            'apartment': apartment_number,
                                            'role': resident_role,
                                            'phone': serializer.validated_data.get('phone', '')
                                        }
                                    )
                                    if created:
                                        logger.info(f"Created Resident entry: {tenant_user.email} ({resident_role}) -> Apartment {apartment_number}")
                                
                                # Create BuildingMembership (this doesn't have a unique constraint, so safe to use get_or_create)
                                BuildingMembership.objects.get_or_create(
                                    building=building,
                                    resident=tenant_user,
                                    defaults={'role': resident_role}
                                )
                                
                                logger.info(f"Linked Resident profile and BuildingMembership for {tenant_user.email} in building {building.name}")
                            else:
                                logger.warning(f"No building found for invitation {invitation.id}, Resident profile not created")
                
                # Mark invitation as accepted
                invitation.accept(public_user)
                
                logger.info(f"User {invitation.email} accepted invitation and joined tenant {tenant_schema}")
                
                return Response({
                    'message': 'Η πρόσκληση έγινε αποδεκτή. Μπορείτε τώρα να συνδεθείτε στην εφαρμογή.',
                    'user': {
                        'email': public_user.email,
                        'role': invitation.invited_role
                    },
                    'tenant': {
                        'schema_name': tenant_schema
                    }
                }, status=status.HTTP_201_CREATED)
                
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


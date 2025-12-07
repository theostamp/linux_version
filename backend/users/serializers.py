# users/serializers.py

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from django_tenants.utils import schema_context
from .models import CustomUser, UserInvitation, PasswordResetToken, UserLoginAttempt
from .audit import SecurityAuditLogger
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that uses email instead of username
    """
    username_field = 'email'
    
    # Override the field definitions to use email instead of username
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace username field with email field
        self.fields['email'] = serializers.EmailField()
        if 'username' in self.fields:
            del self.fields['username']
    
    def validate(self, attrs):
        # Get email and password from the request
        email = attrs.get('email')
        password = attrs.get('password')
        
        print(f"DEBUG: Attempting authentication for email: {email}")
        print(f"DEBUG: Current users in database: {list(User.objects.values('email'))}")
        
        if email and password:
            request = self.context['request']
            
            # Get IP address and user agent
            ip_address = self.get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            try:
                user = User.objects.get(email=email)
                
                # Check if account is locked
                if user.is_locked:
                    remaining_time = user.locked_until - timezone.now()
                    minutes_left = int(remaining_time.total_seconds() / 60)
                    
                    # Log failed attempt
                    UserLoginAttempt.objects.create(
                        user=user,
                        email=email,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        success=False,
                        failure_reason='Account locked'
                    )
                    
                    raise serializers.ValidationError(f'Account locked. Try again in {minutes_left} minutes.')
                
                # Use the custom email backend for authentication
                authenticated_user = authenticate(request, email=email, password=password)
                print(f"DEBUG: Authentication result: {authenticated_user}")
                
                if not authenticated_user:
                    # Increment failed login attempts
                    user.increment_failed_login()
                    
                    # Log failed attempt
                    UserLoginAttempt.objects.create(
                        user=user,
                        email=email,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        success=False,
                        failure_reason='Invalid credentials'
                    )
                    
                    # Security audit logging
                    SecurityAuditLogger.log_login_failure(email, ip_address, user_agent, 'Invalid credentials')
                    
                    raise serializers.ValidationError('No active account found with the given credentials')
                
                if not authenticated_user.is_active:
                    # Log failed attempt
                    UserLoginAttempt.objects.create(
                        user=authenticated_user,
                        email=email,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        success=False,
                        failure_reason='Account disabled'
                    )
                    
                    raise serializers.ValidationError('User account is disabled')
                
                # Reset failed login attempts on successful login
                authenticated_user.reset_failed_login()
                
                # Log successful attempt
                UserLoginAttempt.objects.create(
                    user=authenticated_user,
                    email=email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=True
                )
                
                # Security audit logging
                SecurityAuditLogger.log_login_success(authenticated_user, ip_address, user_agent)
                
                user = authenticated_user
                
            except User.DoesNotExist:
                # Log failed attempt for non-existent user
                UserLoginAttempt.objects.create(
                    email=email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason='User not found'
                )
                
                # Security audit logging
                SecurityAuditLogger.log_login_failure(email, ip_address, user_agent, 'User not found')
                
                raise serializers.ValidationError('No active account found with the given credentials')
            
            refresh = self.get_token(user)
            
            # Include user data in response (matching frontend expectations)
            user_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'office_name': user.office_name,
                'office_phone': user.office_phone,
                'office_address': user.office_address,
                'office_logo': user.office_logo.url if user.office_logo else None,
                'office_bank_name': user.office_bank_name,
                'office_bank_account': user.office_bank_account,
                'office_bank_iban': user.office_bank_iban,
                'office_bank_beneficiary': user.office_bank_beneficiary,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'is_active': user.is_active,
            }
            
            data = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': user_data,
            }
            return data
        else:
            raise serializers.ValidationError('Must include "email" and "password"')
    
    def get_client_ip(self, request):
        """Επιστρέφει το IP address του client"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Custom TokenRefreshSerializer that looks up users in the public schema.
    This is necessary because CustomUser is a SHARED_APP and lives in the public schema,
    but the tenant middleware may have set a different schema context.
    """
    
    def validate(self, attrs):
        refresh = attrs.get('refresh')
        
        if not refresh:
            raise InvalidToken('No valid refresh token provided')
        
        try:
            # Decode the refresh token to get the user_id
            token = RefreshToken(refresh)
            user_id = token.get('user_id')
            
            if not user_id:
                raise InvalidToken('Token contains no user_id')
            
            # Look up the user in the public schema where CustomUser lives
            with schema_context('public'):
                try:
                    user = User.objects.get(id=user_id)
                    logger.info(f"[TokenRefresh] Found user {user.email} in public schema")
                except User.DoesNotExist:
                    logger.error(f"[TokenRefresh] User with id={user_id} not found in public schema")
                    raise InvalidToken('User not found')
            
            # Check if user is active
            if not user.is_active:
                raise InvalidToken('User account is disabled')
            
            # Generate new tokens
            data = {
                'access': str(token.access_token),
            }
            
            # If rotating refresh tokens, include the new refresh token
            if hasattr(token, 'set_jti') or hasattr(token, 'blacklist'):
                # Blacklist the old token if using blacklist
                try:
                    token.blacklist()
                except AttributeError:
                    pass
                
                # Create new refresh token
                refresh_token = RefreshToken.for_user(user)
                data['refresh'] = str(refresh_token)
                data['access'] = str(refresh_token.access_token)
            
            return data
            
        except TokenError as e:
            logger.error(f"[TokenRefresh] Token error: {str(e)}")
            raise InvalidToken(str(e))
        except Exception as e:
            logger.error(f"[TokenRefresh] Unexpected error: {str(e)}")
            raise InvalidToken(f'Token refresh failed: {str(e)}')


class StaffPermissionsSerializer(serializers.Serializer):
    """Serializer for staff permissions (read-only for frontend)"""
    job_title = serializers.CharField(read_only=True)
    can_view_financials = serializers.BooleanField(read_only=True)
    can_access_office_finance = serializers.BooleanField(read_only=True)
    can_record_payments = serializers.BooleanField(read_only=True)
    can_create_expenses = serializers.BooleanField(read_only=True)
    can_edit_expenses = serializers.BooleanField(read_only=True)
    can_create_announcements = serializers.BooleanField(read_only=True)
    can_send_notifications = serializers.BooleanField(read_only=True)
    can_manage_requests = serializers.BooleanField(read_only=True)
    can_manage_maintenance = serializers.BooleanField(read_only=True)
    can_view_apartments = serializers.BooleanField(read_only=True)
    can_edit_apartments = serializers.BooleanField(read_only=True)
    can_view_residents = serializers.BooleanField(read_only=True)
    can_invite_residents = serializers.BooleanField(read_only=True)
    can_upload_documents = serializers.BooleanField(read_only=True)
    can_delete_documents = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)


class UserSerializer(serializers.ModelSerializer):
    staff_permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 
            'email', 
            'first_name', 
            'last_name', 
            'role',
            'is_active', 
            'is_staff',
            'is_superuser',
            'staff_permissions',  # Νέο πεδίο
            'office_name',
            'office_phone',
            'office_address',
            'office_logo',
            'office_bank_name',
            'office_bank_account',
            'office_bank_iban',
            'office_bank_beneficiary',
            'tenant'
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'staff_permissions']
    
    def get_staff_permissions(self, obj):
        """Return staff permissions if user is staff"""
        if obj.role != 'staff':
            return None
        
        try:
            if hasattr(obj, 'staff_permissions'):
                permissions = obj.staff_permissions
                return StaffPermissionsSerializer(permissions).data
        except Exception:
            pass
        
        return None

class OfficeDetailsSerializer(serializers.ModelSerializer):
    """
    Serializer for updating office management details
    """
    office_logo = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'office_name', 
            'office_phone',
            'office_phone_emergency',
            'office_address', 
            'office_logo',
            'office_bank_name',
            'office_bank_account',
            'office_bank_iban',
            'office_bank_beneficiary'
        ]
        
    def validate_office_phone(self, value):
        """Validate phone number format"""
        if value and not value.replace('-', '').replace(' ', '').replace('+', '').isdigit():
            raise serializers.ValidationError("Το τηλέφωνο πρέπει να περιέχει μόνο αριθμούς, παύλες και κενά.")
        return value
    
    def validate_office_logo(self, value):
        """Validate logo file"""
        import logging
        logger = logging.getLogger('django')
        
        if value:
            logger.info(f"[OfficeDetailsSerializer] Validating logo file: {value.name}, size: {value.size}, type: {getattr(value, 'content_type', 'unknown')}")
            # Check file size (2MB limit)
            if value.size > 2 * 1024 * 1024:  # 2MB in bytes
                raise serializers.ValidationError("Το αρχείο πρέπει να είναι μικρότερο από 2MB.")
            
            # Check file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Επιτρέπονται μόνο αρχεία τύπου JPEG, PNG ή SVG.")
        else:
            logger.info("[OfficeDetailsSerializer] No logo file provided in validation")
        
        return value
    
    def save(self, **kwargs):
        """Override save to log logo saving"""
        import logging
        logger = logging.getLogger('django')
        
        logo_file = self.validated_data.get('office_logo')
        if logo_file:
            logger.info(f"[OfficeDetailsSerializer] Saving logo file: {logo_file.name}, size: {logo_file.size}")
        else:
            logger.info("[OfficeDetailsSerializer] No logo file in validated_data, keeping existing logo")
        
        instance = super().save(**kwargs)
        
        if logo_file:
            logger.info(f"[OfficeDetailsSerializer] Logo saved successfully. New logo URL: {instance.office_logo.url if instance.office_logo else 'None'}")
        
        return instance
    
    def to_representation(self, instance):
        """Override to return logo URL instead of file path"""
        representation = super().to_representation(instance)
        if instance.office_logo:
            representation['office_logo'] = instance.office_logo.url
        return representation


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer για την εγγραφή νέων χρηστών
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ('email', 'first_name', 'last_name', 'password', 'password_confirm')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate_email(self, value):
        """Έλεγχος αν το email υπάρχει ήδη"""
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Χρήστης με αυτό το email υπάρχει ήδη.")
        return value
    
    def validate(self, attrs):
        """Έλεγχος ότι οι κωδικοί ταιριάζουν"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Οι κωδικοί δεν ταιριάζουν."})
        return attrs
    
    def create(self, validated_data):
        """Δημιουργία νέου χρήστη"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Always require email verification for security
        user = CustomUser.objects.create_user(
            password=password,
            is_active=False,  # User must verify email before activation
            email_verified=False,  # Email verification required
            **validated_data
        )
        
        return user


class UserInvitationSerializer(serializers.ModelSerializer):
    """
    Serializer για τις προσκλήσεις χρηστών
    """
    invited_by_name = serializers.SerializerMethodField()
    building_name = serializers.SerializerMethodField()
    apartment_number = serializers.SerializerMethodField()
    created_user_id = serializers.SerializerMethodField()
    created_user_active = serializers.SerializerMethodField()
    
    class Meta:
        model = UserInvitation
        fields = (
            'id', 'email', 'first_name', 'last_name', 'invitation_type',
            'status', 'expires_at', 'invited_by', 'invited_by_name',
            'building_id', 'building_name', 'apartment_id', 'apartment_number',
            'assigned_role', 'created_at', 'created_user_id', 'created_user_active'
        )
        read_only_fields = ('id', 'token', 'invited_by', 'status', 'created_at')
    
    def get_invited_by_name(self, obj):
        return f"{obj.invited_by.first_name} {obj.invited_by.last_name}".strip()
    
    def get_building_name(self, obj):
        if obj.building_id:
            try:
                from buildings.models import Building
                building = Building.objects.get(id=obj.building_id)
                return building.name
            except:
                return None
        return None
    
    def get_apartment_number(self, obj):
        if obj.apartment_id:
            try:
                from apartments.models import Apartment
                apartment = Apartment.objects.get(id=obj.apartment_id)
                return apartment.number
            except:
                return None
        return None
    
    def get_created_user_id(self, obj):
        """Επιστρέφει το ID του χρήστη που δημιουργήθηκε από την πρόσκληση"""
        if obj.created_user:
            return obj.created_user.id
        return None
    
    def get_created_user_active(self, obj):
        """Επιστρέφει αν ο χρήστης είναι ενεργός"""
        if obj.created_user:
            return obj.created_user.is_active
        return None


class UserInvitationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer για τη δημιουργία νέων προσκλήσεων
    """
    assigned_role = serializers.ChoiceField(
        choices=['resident', 'internal_manager', 'manager', 'staff'],
        required=False,
        allow_null=True,
        help_text='Ρόλος που θα ανατεθεί στον χρήστη (resident, internal_manager, manager, staff)'
    )
    apartment_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='ID του διαμερίσματος στο οποίο θα συνδεθεί ο χρήστης'
    )
    
    class Meta:
        model = UserInvitation
        fields = ('email', 'first_name', 'last_name', 'invitation_type', 'building_id', 'apartment_id', 'assigned_role')
    
    def validate(self, data):
        """Validation για building_id, apartment_id και assigned_role"""
        building_id = data.get('building_id')
        apartment_id = data.get('apartment_id')
        assigned_role = data.get('assigned_role')
        
        # Αν assigned_role είναι internal_manager, building_id είναι υποχρεωτικό
        if assigned_role == 'internal_manager' and not building_id:
            raise serializers.ValidationError({
                'building_id': 'Το building_id είναι υποχρεωτικό όταν ο ρόλος είναι internal_manager'
            })
        
        # Αν assigned_role είναι resident, συνιστάται apartment_id
        if assigned_role == 'resident' and not apartment_id:
            # Δεν είναι υποχρεωτικό, αλλά καλό είναι να υπάρχει
            pass
        
        # Επαλήθευση ότι το apartment ανήκει στο building
        if apartment_id and building_id:
            try:
                from apartments.models import Apartment
                apartment = Apartment.objects.get(id=apartment_id)
                if apartment.building_id != building_id:
                    raise serializers.ValidationError({
                        'apartment_id': 'Το διαμέρισμα δεν ανήκει στο επιλεγμένο κτίριο'
                    })
            except Apartment.DoesNotExist:
                raise serializers.ValidationError({
                    'apartment_id': 'Το διαμέρισμα δεν βρέθηκε'
                })
        
        return data
    
    def validate_email(self, value):
        """Έλεγχος αν το email υπάρχει ήδη"""
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Χρήστης με αυτό το email υπάρχει ήδη.")
        
        # Έλεγχος για pending invitations
        if UserInvitation.objects.filter(email=value, status='pending').exists():
            raise serializers.ValidationError("Υπάρχει ήδη ενεργή πρόσκληση για αυτό το email.")
        
        return value


class InvitationAcceptanceSerializer(serializers.Serializer):
    """
    Serializer για την αποδοχή προσκλήσεων
    """
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False)
    # Optional fields for kiosk self-registration
    first_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    def validate_password_confirm(self, value):
        password = self.initial_data.get('password')
        # Password confirm is now optional (for kiosk registrations that handle it client-side)
        if value and password and value != password:
            raise serializers.ValidationError("Οι κωδικοί δεν ταιριάζουν.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer για την αίτηση επαναφοράς κωδικού
    """
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("Δεν βρέθηκε ενεργός χρήστης με αυτό το email.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer για την επιβεβαίωση επαναφοράς κωδικού
    """
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    def validate_password_confirm(self, value):
        password = self.initial_data.get('password')
        if password and value != password:
            raise serializers.ValidationError("Οι κωδικοί δεν ταιριάζουν.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer για την αλλαγή κωδικού από ενεργό χρήστη
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Ο τρέχων κωδικός δεν είναι σωστός.")
        return value
    
    def validate_new_password_confirm(self, value):
        new_password = self.initial_data.get('new_password')
        if new_password and value != new_password:
            raise serializers.ValidationError("Οι νέοι κωδικοί δεν ταιριάζουν.")
        return value


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer για την επιβεβαίωση email
    """
    token = serializers.CharField(max_length=100)


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer για το user profile
    """
    full_name = serializers.SerializerMethodField()
    groups = serializers.StringRelatedField(many=True, read_only=True)
    
    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'is_active', 'email_verified', 'date_joined', 'groups',
            'role', 'office_name', 'office_address', 'office_phone',
            'office_logo', 'office_bank_account',
            'email_notifications_enabled', 'sms_notifications_enabled',
            'notify_financial_updates', 'notify_maintenance_updates',
            'notify_announcements', 'notify_votes'
        )
        read_only_fields = ('id', 'email', 'is_active', 'email_verified', 'date_joined')
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

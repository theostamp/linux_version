# users/serializers.py

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import CustomUser, UserInvitation, PasswordResetToken

User = get_user_model()

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
            # Use the custom email backend for authentication
            user = authenticate(self.context['request'], email=email, password=password)
            print(f"DEBUG: Authentication result: {user}")
            
            if not user:
                raise serializers.ValidationError('No active account found with the given credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            
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

class UserSerializer(serializers.ModelSerializer):
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
            'office_name',
            'office_phone',
            'office_address',
            'office_logo',
            'office_bank_name',
            'office_bank_account',
            'office_bank_iban',
            'office_bank_beneficiary'
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser']

class OfficeDetailsSerializer(serializers.ModelSerializer):
    """
    Serializer for updating office management details
    """
    class Meta:
        model = CustomUser
        fields = [
            'office_name', 
            'office_phone', 
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
        if value:
            # Check file size (2MB limit)
            if value.size > 2 * 1024 * 1024:  # 2MB in bytes
                raise serializers.ValidationError("Το αρχείο πρέπει να είναι μικρότερο από 2MB.")
            
            # Check file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Επιτρέπονται μόνο αρχεία τύπου JPEG, PNG ή SVG.")
        
        return value


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
        
        user = CustomUser.objects.create_user(
            password=password,
            is_active=False,  # Απαιτείται email verification
            email_verified=False,
            **validated_data
        )
        
        return user


class UserInvitationSerializer(serializers.ModelSerializer):
    """
    Serializer για τις προσκλήσεις χρηστών
    """
    invited_by_name = serializers.SerializerMethodField()
    building_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserInvitation
        fields = (
            'id', 'email', 'first_name', 'last_name', 'invitation_type',
            'status', 'expires_at', 'invited_by', 'invited_by_name',
            'building_id', 'building_name', 'assigned_role', 'created_at'
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


class UserInvitationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer για τη δημιουργία νέων προσκλήσεων
    """
    class Meta:
        model = UserInvitation
        fields = ('email', 'first_name', 'last_name', 'invitation_type', 'building_id', 'assigned_role')
    
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
    password_confirm = serializers.CharField(write_only=True)
    
    def validate_password_confirm(self, value):
        password = self.initial_data.get('password')
        if password and value != password:
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
            'office_logo', 'office_bank_account'
        )
        read_only_fields = ('id', 'email', 'is_active', 'email_verified', 'date_joined')
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

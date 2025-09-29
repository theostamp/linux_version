# users/serializers.py

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from .models import CustomUser

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

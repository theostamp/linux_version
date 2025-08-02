# users/serializers.py

from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id', 
            'email', 
            'first_name', 
            'last_name', 
            'is_active', 
            'is_staff',
            'office_name',
            'office_phone',
            'office_address'
        ]
        read_only_fields = ['id', 'is_staff']

class OfficeDetailsSerializer(serializers.ModelSerializer):
    """
    Serializer for updating office management details
    """
    class Meta:
        model = CustomUser
        fields = ['office_name', 'office_phone', 'office_address']
        
    def validate_office_phone(self, value):
        """Validate phone number format"""
        if value and not value.replace('-', '').replace(' ', '').replace('+', '').isdigit():
            raise serializers.ValidationError("Το τηλέφωνο πρέπει να περιέχει μόνο αριθμούς, παύλες και κενά.")
        return value

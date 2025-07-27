# backend/buildings/serializers.py
from rest_framework import serializers 
from .models import Building
from users.models import CustomUser
from .models import BuildingMembership
from decimal import Decimal, InvalidOperation

class BuildingMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildingMembership
        fields = ["id", "building", "resident", "role", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        email = validated_data.pop('user_email')
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError({'user_email': 'Δεν βρέθηκε χρήστης με αυτό το email.'})

        return BuildingMembership.objects.create(user=user, **validated_data)

class CoordinateField(serializers.Field):
    """Custom field to handle coordinate conversion from float to Decimal"""
    
    def to_internal_value(self, data):
        print(f"🔍 CoordinateField.to_internal_value called with: {data} (type: {type(data)})")
        
        if data is None:
            return None
            
        try:
            # Convert to Decimal
            if isinstance(data, (int, float)):
                return Decimal(str(data))
            elif isinstance(data, str):
                return Decimal(data)
            else:
                raise serializers.ValidationError("Η τιμή πρέπει να είναι αριθμός.")
        except (ValueError, InvalidOperation) as e:
            print(f"❌ CoordinateField conversion failed: {e}")
            raise serializers.ValidationError("Η τιμή πρέπει να είναι έγκυρος αριθμός.")
    
    def to_representation(self, value):
        if value is None:
            return None
        return str(value)

class BuildingSerializer(serializers.ModelSerializer):
    # Ορίζουμε κρυφό πεδίο manager ως τον τρέχον χρήστη
    manager = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )
    
    # Use custom coordinate fields
    latitude = CoordinateField(required=False, allow_null=True)
    longitude = CoordinateField(required=False, allow_null=True)

    class Meta:
        model = Building
        fields = [
            'id',
            'name',
            'address',
            'city',
            'postal_code',
            'apartments_count',
            'internal_manager_name',
            'internal_manager_phone',
            'street_view_image',
            'latitude',
            'longitude',
            'created_at',
            'updated_at',
            'manager'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_latitude(self, value):
        """Validate latitude field"""
        print(f"🔍 Validating latitude: {value} (type: {type(value)})")
        
        if value is None:
            return value
        
        # Check if it's a valid latitude range (-90 to 90)
        if value < -90 or value > 90:
            raise serializers.ValidationError("Το γεωγραφικό πλάτος πρέπει να είναι μεταξύ -90 και 90 μοιρών.")
        
        print(f"✅ Latitude validation passed: {value}")
        return value

    def validate_longitude(self, value):
        """Validate longitude field"""
        print(f"🔍 Validating longitude: {value} (type: {type(value)})")
        
        if value is None:
            return value
        
        # Check if it's a valid longitude range (-180 to 180)
        if value < -180 or value > 180:
            raise serializers.ValidationError("Το γεωγραφικό μήκος πρέπει να είναι μεταξύ -180 και 180 μοιρών.")
        
        print(f"✅ Longitude validation passed: {value}")
        return value

    def validate(self, data):
        """Additional validation for the entire building data"""
        print(f"🔍 BuildingSerializer.validate() called with data: {data}")
        
        # If both latitude and longitude are provided, ensure they're both valid
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        print(f"🔍 Latitude: {latitude} (type: {type(latitude)})")
        print(f"🔍 Longitude: {longitude} (type: {type(longitude)})")
        
        if (latitude is not None and longitude is None) or (latitude is None and longitude is not None):
            raise serializers.ValidationError("Τα γεωγραφικά πλάτος και μήκος πρέπει να παρέχονται μαζί ή κανένα από τα δύο.")
        
        print("✅ BuildingSerializer.validate() completed successfully")
        return data
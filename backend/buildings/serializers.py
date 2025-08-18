# backend/buildings/serializers.py
from rest_framework import serializers 
from .models import Building, ServicePackage
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
            
        # Handle case where data is a list/array (take first element)
        if isinstance(data, (list, tuple)) and len(data) > 0:
            print(f"⚠️  CoordinateField received array data: {data}, using first element: {data[0]}")
            data = data[0]
            
        try:
            # Convert to Decimal
            if isinstance(data, (int, float)):
                decimal_value = Decimal(str(data))
            elif isinstance(data, str):
                decimal_value = Decimal(data)
            else:
                raise serializers.ValidationError("Η τιμή πρέπει να είναι αριθμός.")
            
            # Validate range based on field name
            field_name = self.field_name if hasattr(self, 'field_name') else ''
            if 'latitude' in field_name:
                if decimal_value < -90 or decimal_value > 90:
                    raise serializers.ValidationError("Το γεωγραφικό πλάτος πρέπει να είναι μεταξύ -90 και 90 μοιρών.")
            elif 'longitude' in field_name:
                if decimal_value < -180 or decimal_value > 180:
                    raise serializers.ValidationError("Το γεωγραφικό μήκος πρέπει να είναι μεταξύ -180 και 180 μοιρών.")
            
            return decimal_value
        except (ValueError, InvalidOperation) as e:
            print(f"❌ CoordinateField conversion failed: {e}")
            raise serializers.ValidationError("Η τιμή πρέπει να είναι έγκυρος αριθμός.")
    
    def to_representation(self, value):
        if value is None:
            return None
        return str(value)

class ServicePackageSerializer(serializers.ModelSerializer):
    """Serializer για τα πακέτα υπηρεσιών"""
    
    services_list = serializers.SerializerMethodField()
    total_cost_for_building = serializers.SerializerMethodField()
    
    class Meta:
        model = ServicePackage
        fields = [
            'id', 'name', 'description', 'fee_per_apartment', 
            'services_included', 'services_list', 'total_cost_for_building',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_services_list(self, obj):
        """Επιστρέφει τη λίστα υπηρεσιών ως string"""
        return obj.get_services_list()
    
    def get_total_cost_for_building(self, obj):
        """Υπολογίζει το συνολικό κόστος για το κτίριο"""
        building_id = self.context.get('building_id')
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
                apartments_count = building.apartments_count or 0
                return obj.get_total_cost_for_building(apartments_count)
            except Building.DoesNotExist:
                return 0
        return 0

class BuildingSerializer(serializers.ModelSerializer):
    # Ορίζουμε κρυφό πεδίο manager ως τον τρέχον χρήστη
    manager = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    # Προσθήκη nested serializer για το service_package
    service_package = ServicePackageSerializer(read_only=True)
    service_package_id = serializers.PrimaryKeyRelatedField(
        queryset=ServicePackage.objects.filter(is_active=True),
        source='service_package',
        required=False,
        allow_null=True,
        write_only=True
    )
    
    # Use CoordinateField for latitude and longitude to handle proper conversion
    latitude = CoordinateField(required=False, allow_null=True)
    longitude = CoordinateField(required=False, allow_null=True)
    
    class Meta:
        model = Building
        fields = [
            'id', 'name', 'address', 'city', 'postal_code', 
            'apartments_count', 'internal_manager_name', 'internal_manager_phone',
            'management_office_name', 'management_office_phone', 'management_office_address',
            'management_fee_per_apartment', 'service_package', 'service_package_id',
            'current_reserve', 'heating_fixed_percentage', 'reserve_contribution_per_apartment',
            'reserve_fund_goal', 'reserve_fund_duration_months', 'reserve_fund_start_date', 'reserve_fund_target_date',
            'street_view_image', 'latitude', 'longitude', 'manager',
            'grace_day_of_month',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_reserve']

    def create(self, validated_data):
        """
        Override create method to automatically populate office details from current user
        """
        print(f"🔍 BuildingSerializer.create() called with validated_data: {validated_data}")
        print(f"🔍 Street view image in validated_data: {validated_data.get('street_view_image')}")
        
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user = request.user
            
            # Auto-populate office details from user if not provided
            if not validated_data.get('management_office_name') and user.office_name:
                validated_data['management_office_name'] = user.office_name
            
            if not validated_data.get('management_office_phone') and user.office_phone:
                validated_data['management_office_phone'] = user.office_phone
            
            if not validated_data.get('management_office_address') and user.office_address:
                validated_data['management_office_address'] = user.office_address
        
        result = super().create(validated_data)
        print(f"🔍 BuildingSerializer.create() result: {result}")
        print(f"🔍 Result street view image: {result.street_view_image}")
        return result



    def validate(self, data):
        """Additional validation for the entire building data"""
        print(f"🔍 BuildingSerializer.validate() called with data: {data}")
        
        # If both latitude and longitude are provided, ensure they're both valid
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        street_view_image = data.get('street_view_image')
        
        print(f"🔍 Latitude: {latitude} (type: {type(latitude)})")
        print(f"🔍 Longitude: {longitude} (type: {type(longitude)})")
        print(f"🔍 Street view image: {street_view_image} (type: {type(street_view_image)})")
        
        if (latitude is not None and longitude is None) or (latitude is None and longitude is not None):
            raise serializers.ValidationError("Τα γεωγραφικά πλάτος και μήκος πρέπει να παρέχονται μαζί ή κανένα από τα δύο.")
        
        print("✅ BuildingSerializer.validate() completed successfully")
        return data
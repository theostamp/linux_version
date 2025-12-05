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

class InternalManagerSerializer(serializers.ModelSerializer):
    """Serializer για τον εσωτερικό διαχειριστή (nested)"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = ['id', 'email', 'first_name', 'last_name', 'full_name']


class BuildingSerializer(serializers.ModelSerializer):
    # Manager field - allow updates but default to current user
    manager = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        required=False,
        allow_null=True,
        default=serializers.CurrentUserDefault()
    )
    
    # Εσωτερικός Διαχειριστής - ForeignKey
    internal_manager = InternalManagerSerializer(read_only=True)
    internal_manager_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='internal_manager',
        required=False,
        allow_null=True,
        write_only=True
    )
    
    # Δικαίωμα καταχώρησης πληρωμών για τον εσωτερικό διαχειριστή
    internal_manager_can_record_payments = serializers.BooleanField(required=False, default=False)
    
    # Computed field: Όνομα εμφάνισης του εσωτερικού διαχειριστή
    internal_manager_display_name = serializers.SerializerMethodField()
    
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
            'apartments_count', 
            # Internal Manager - νέα πεδία
            'internal_manager', 'internal_manager_id', 'internal_manager_can_record_payments',
            'internal_manager_display_name',
            # Legacy internal manager fields (για backward compatibility)
            'internal_manager_name', 'internal_manager_phone',
            'internal_manager_apartment', 'internal_manager_collection_schedule',
            # Management Office
            'management_office_name', 'management_office_phone', 'management_office_address',
            'management_fee_per_apartment', 'service_package', 'service_package_id', 'service_package_start_date',
            'current_reserve', 'heating_system', 'heating_fixed_percentage', 'reserve_contribution_per_apartment',
            'reserve_fund_goal', 'reserve_fund_duration_months', 'reserve_fund_start_date', 'reserve_fund_target_date',
            'financial_system_start_date', 'street_view_image', 'latitude', 'longitude', 'manager',
            'grace_day_of_month',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_reserve']

    def get_internal_manager_display_name(self, obj):
        """Επιστρέφει το όνομα εμφάνισης του εσωτερικού διαχειριστή"""
        return obj.get_internal_manager_display_name()

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

    def update(self, instance, validated_data):
        """
        Override update method to handle internal_manager role assignment.
        Όταν ορίζεται νέος internal_manager, ενημερώνεται αυτόματα ο ρόλος του χρήστη.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Debug logging
        logger.info(f"[BuildingSerializer.update] validated_data keys: {list(validated_data.keys())}")
        logger.info(f"[BuildingSerializer.update] internal_manager in validated_data: {'internal_manager' in validated_data}")
        logger.info(f"[BuildingSerializer.update] internal_manager value: {validated_data.get('internal_manager')}")
        
        # Ελέγχουμε αν αλλάζει ο internal_manager
        new_internal_manager = validated_data.get('internal_manager')
        old_internal_manager = instance.internal_manager
        
        logger.info(f"[BuildingSerializer.update] Old internal_manager: {old_internal_manager}")
        logger.info(f"[BuildingSerializer.update] New internal_manager: {new_internal_manager}")
        
        # Αν αλλάζει ο internal_manager
        if 'internal_manager' in validated_data:
            # Αφαίρεση ρόλου από τον προηγούμενο internal_manager (αν υπήρχε)
            if old_internal_manager and old_internal_manager != new_internal_manager:
                # Αν ο παλιός internal_manager δεν είναι internal_manager σε άλλο κτίριο,
                # επαναφέρουμε τον ρόλο του σε 'resident'
                from buildings.models import Building
                other_buildings = Building.objects.filter(internal_manager=old_internal_manager).exclude(id=instance.id)
                if not other_buildings.exists():
                    if old_internal_manager.role == 'internal_manager':
                        old_internal_manager.role = 'resident'
                        old_internal_manager.save(update_fields=['role'])
                        logger.info(f"Removed internal_manager role from user {old_internal_manager.email}")
            
            # Ανάθεση ρόλου στον νέο internal_manager
            if new_internal_manager:
                # Αλλαγή ρόλου σε internal_manager
                if new_internal_manager.role != 'internal_manager':
                    new_internal_manager.role = 'internal_manager'
                
                # Αντιγραφή στοιχείων γραφείου από τον manager του κτιρίου
                # ώστε ο internal_manager να βλέπει σωστά το logo και τα στοιχεία
                manager = instance.manager
                if manager:
                    update_fields = ['role']
                    if manager.office_name and not new_internal_manager.office_name:
                        new_internal_manager.office_name = manager.office_name
                        update_fields.append('office_name')
                    if manager.office_phone and not new_internal_manager.office_phone:
                        new_internal_manager.office_phone = manager.office_phone
                        update_fields.append('office_phone')
                    if manager.office_address and not new_internal_manager.office_address:
                        new_internal_manager.office_address = manager.office_address
                        update_fields.append('office_address')
                    if manager.office_logo and not new_internal_manager.office_logo:
                        new_internal_manager.office_logo = manager.office_logo
                        update_fields.append('office_logo')
                    new_internal_manager.save(update_fields=update_fields)
                    logger.info(f"Assigned internal_manager role to user {new_internal_manager.email} with office details")
                else:
                    new_internal_manager.save(update_fields=['role'])
                    logger.info(f"Assigned internal_manager role to user {new_internal_manager.email}")
                
                # Δημιουργία BuildingMembership αν δεν υπάρχει
                from buildings.models import BuildingMembership
                membership, created = BuildingMembership.objects.get_or_create(
                    resident=new_internal_manager,
                    building=instance,
                    defaults={'role': 'internal_manager'}
                )
                if not created and membership.role != 'internal_manager':
                    membership.role = 'internal_manager'
                    membership.save(update_fields=['role'])
                    logger.info(f"Updated BuildingMembership role to internal_manager for user {new_internal_manager.email}")
                elif created:
                    logger.info(f"Created BuildingMembership for internal_manager {new_internal_manager.email}")
        
        return super().update(instance, validated_data)


# ========================================================================
# BuildingContext Serializers - For New Unified Building Context System
# ========================================================================

class BuildingPermissionsSerializer(serializers.Serializer):
    """
    Serializer για το BuildingPermissions DTO.
    Επιστρέφει τα permissions του user για το συγκεκριμένο building.
    
    Ιεραρχία Ρόλων:
    - is_admin_level: Superuser/Staff/Office Manager
    - is_internal_manager: Εσωτερικός διαχειριστής
    - is_resident: Ένοικος
    """
    # Basic permissions
    can_view = serializers.BooleanField(
        default=True,
        help_text="Δικαίωμα προβολής"
    )
    can_edit = serializers.BooleanField(
        help_text="Δικαίωμα επεξεργασίας του κτιρίου"
    )
    can_delete = serializers.BooleanField(
        help_text="Δικαίωμα διαγραφής του κτιρίου"
    )
    
    # Financial permissions
    can_manage_financials = serializers.BooleanField(
        help_text="Δικαίωμα πλήρους διαχείρισης οικονομικών (Office Manager only)"
    )
    can_view_financials = serializers.BooleanField(
        default=True,
        help_text="Δικαίωμα προβολής οικονομικών (όλοι οι ρόλοι)"
    )
    can_record_payments = serializers.BooleanField(
        default=False,
        help_text="Δικαίωμα καταχώρησης πληρωμών (Office Manager ή Internal Manager με opt-in)"
    )
    
    # Assembly/Meeting permissions
    can_create_assembly = serializers.BooleanField(
        default=False,
        help_text="Δικαίωμα δημιουργίας συνελεύσεων"
    )
    
    # Offers/Projects permissions
    can_manage_offers = serializers.BooleanField(
        default=False,
        help_text="Δικαίωμα διαχείρισης προσφορών/έργων"
    )
    
    # Role indicators
    is_admin_level = serializers.BooleanField(
        default=False,
        help_text="Αν ο χρήστης είναι admin-level (Superuser/Staff/Office Manager)"
    )
    is_internal_manager = serializers.BooleanField(
        default=False,
        help_text="Αν ο χρήστης είναι εσωτερικός διαχειριστής αυτής της πολυκατοικίας"
    )
    is_resident = serializers.BooleanField(
        default=False,
        help_text="Αν ο χρήστης είναι ένοικος αυτής της πολυκατοικίας"
    )


class BuildingContextSerializer(serializers.Serializer):
    """
    Serializer για το BuildingDTO που επιστρέφεται στο frontend.
    
    Αυτός ο serializer:
    - Επιστρέφει το canonical building context με permissions
    - Χρησιμοποιείται από τα API endpoints current-context, my-buildings
    - Περιέχει όλα τα απαραίτητα πεδία για business logic στο frontend
    
    Usage:
        from buildings.dto import BuildingDTO
        from buildings.serializers import BuildingContextSerializer
        
        building_dto = BuildingDTO.from_model(building, user=request.user)
        serializer = BuildingContextSerializer(building_dto.to_dict())
        return Response(serializer.data)
    """
    
    # Core identification
    id = serializers.IntegerField(
        help_text="Building ID"
    )
    name = serializers.CharField(
        max_length=255,
        help_text="Όνομα κτιρίου"
    )
    
    # Building details
    apartments_count = serializers.IntegerField(
        help_text="Αριθμός διαμερισμάτων"
    )
    address = serializers.CharField(
        max_length=255,
        allow_blank=True,
        help_text="Διεύθυνση"
    )
    city = serializers.CharField(
        max_length=100,
        allow_blank=True,
        help_text="Πόλη"
    )
    postal_code = serializers.CharField(
        max_length=10,
        allow_blank=True,
        help_text="Ταχυδρομικός κώδικας"
    )
    
    # Management
    manager_id = serializers.IntegerField(
        allow_null=True,
        required=False,
        help_text="User ID του διαχειριστή"
    )
    
    # Internal Manager - νέα πεδία
    internal_manager_id = serializers.IntegerField(
        allow_null=True,
        required=False,
        help_text="User ID του εσωτερικού διαχειριστή"
    )
    internal_manager_can_record_payments = serializers.BooleanField(
        default=False,
        help_text="Αν ο εσωτερικός διαχειριστής μπορεί να καταχωρεί πληρωμές"
    )
    internal_manager_display_name = serializers.CharField(
        max_length=255,
        allow_blank=True,
        required=False,
        help_text="Όνομα εμφάνισης εσωτερικού διαχειριστή"
    )
    
    # Legacy internal manager fields (για backward compatibility)
    internal_manager_name = serializers.CharField(
        max_length=255,
        allow_blank=True,
        help_text="Όνομα εσωτερικού διαχειριστή (legacy)"
    )
    internal_manager_phone = serializers.CharField(
        max_length=20,
        allow_blank=True,
        help_text="Τηλέφωνο εσωτερικού διαχειριστή"
    )
    management_office_name = serializers.CharField(
        max_length=255,
        allow_blank=True,
        help_text="Όνομα γραφείου διαχείρισης"
    )
    management_office_phone = serializers.CharField(
        max_length=20,
        allow_blank=True,
        help_text="Τηλέφωνο γραφείου διαχείρισης"
    )
    
    # Financial settings
    current_reserve = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Τρέχον αποθεματικό σε €"
    )
    management_fee_per_apartment = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Αμοιβή διαχείρισης ανά διαμέρισμα"
    )
    reserve_contribution_per_apartment = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Εισφορά αποθεματικού ανά διαμέρισμα"
    )
    
    # Heating system configuration
    heating_system = serializers.CharField(
        max_length=20,
        help_text="Σύστημα θέρμανσης (none/conventional/hour_meters/heat_meters)"
    )
    heating_fixed_percentage = serializers.IntegerField(
        help_text="Ποσοστό παγίου θέρμανσης (%)"
    )
    
    # Reserve fund goal settings
    reserve_fund_goal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        required=False,
        help_text="Στόχος αποθεματικού σε €"
    )
    reserve_fund_duration_months = serializers.IntegerField(
        allow_null=True,
        required=False,
        help_text="Διάρκεια συλλογής αποθεματικού σε μήνες"
    )
    
    # Grace period for payments
    grace_day_of_month = serializers.IntegerField(
        help_text="Ημέρα έναρξης οφειλής (1-31)"
    )
    
    # Permissions (nested serializer)
    permissions = BuildingPermissionsSerializer(
        help_text="Δικαιώματα του τρέχοντος χρήστη για αυτό το κτίριο"
    )
    
    class Meta:
        # This is a read-only serializer (no create/update)
        read_only = True


class BuildingContextListSerializer(serializers.Serializer):
    """
    Lightweight serializer για λίστες κτιρίων.
    Περιέχει μόνο τα βασικά πεδία για dropdown selections κλπ.
    
    Usage:
        buildings = BuildingService.get_user_buildings(request.user)
        serializer = BuildingContextListSerializer(
            [b.to_dict() for b in buildings],
            many=True
        )
        return Response(serializer.data)
    """
    
    id = serializers.IntegerField()
    name = serializers.CharField()
    apartments_count = serializers.IntegerField()
    address = serializers.CharField()
    city = serializers.CharField()
    
    # Simplified permissions (just the key ones)
    permissions = serializers.DictField(
        child=serializers.BooleanField()
    )
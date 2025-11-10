from rest_framework import serializers
from .models import Apartment
from buildings.models import Building


class ApartmentSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    occupant_name = serializers.CharField(read_only=True)
    occupant_phone = serializers.CharField(read_only=True)
    occupant_phone2 = serializers.CharField(read_only=True)
    occupant_email = serializers.CharField(read_only=True)
    status_display = serializers.CharField(read_only=True)
    
    # Πεδία για εύκολη αναζήτηση χρηστών
    owner_user_email = serializers.EmailField(source='owner_user.email', read_only=True)
    tenant_user_email = serializers.EmailField(source='tenant_user.email', read_only=True)
    
    class Meta:
        model = Apartment
        fields = [
            'id',
            'building',
            'building_name',
            'number',
            'identifier',
            'floor',
            'owner_name',
            'owner_phone',
            'owner_phone2',
            'owner_email',
            'owner_user',
            'owner_user_email',
            'ownership_percentage',
            'participation_mills',
            'heating_mills',
            'elevator_mills',
            'tenant_name',
            'tenant_phone',
            'tenant_phone2',
            'tenant_email',
            'tenant_user',
            'tenant_user_email',
            'is_rented',
            'is_closed',
            'rent_start_date',
            'rent_end_date',
            'square_meters',
            'bedrooms',
            'notes',
            'occupant_name',
            'occupant_phone',
            'occupant_phone2',
            'occupant_email',
            'status_display',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ApartmentListSerializer(serializers.ModelSerializer):
    """Απλοποιημένο serializer για λίστες διαμερισμάτων"""
    building_name = serializers.CharField(source='building.name', read_only=True)
    occupant_name = serializers.CharField(read_only=True)
    occupant_phone = serializers.CharField(read_only=True)
    occupant_phone2 = serializers.CharField(read_only=True)
    occupant_email = serializers.CharField(read_only=True)
    status_display = serializers.CharField(read_only=True)
    
    class Meta:
        model = Apartment
        fields = [
            'id',
            'building',
            'building_name',
            'number',
            'identifier',
            'floor',
            'owner_name',
            'owner_phone',
            'owner_phone2',
            'owner_email',
            'ownership_percentage',
            'participation_mills',
            'heating_mills',
            'elevator_mills',
            'tenant_name',
            'tenant_phone',
            'tenant_phone2',
            'tenant_email',
            'occupant_name',
            'occupant_phone',
            'occupant_phone2',
            'occupant_email',
            'status_display',
            'is_rented',
            'is_closed'
        ]


class CreateApartmentSerializer(serializers.ModelSerializer):
    """Serializer για δημιουργία διαμερίσματος"""
    
    class Meta:
        model = Apartment
        fields = [
            'building',
            'number',
            'identifier',
            'floor',
            'owner_name',
            'owner_phone',
            'owner_phone2',
            'owner_email',
            'ownership_percentage',
            'participation_mills',
            'heating_mills',
            'elevator_mills',
            'tenant_name',
            'tenant_phone',
            'tenant_phone2',
            'tenant_email',
            'is_rented',
            'is_closed',
            'rent_start_date',
            'rent_end_date',
            'square_meters',
            'bedrooms',
            'notes'
        ]
    
    def validate(self, data):
        """Επικύρωση δεδομένων"""
        building = data.get('building')
        number = data.get('number')
        
        # Έλεγχος αν υπάρχει ήδη το διαμέρισμα
        if self.instance is None:  # Νέα δημιουργία
            if Apartment.objects.filter(building=building, number=number).exists():
                raise serializers.ValidationError(
                    f'Το διαμέρισμα {number} υπάρχει ήδη στο κτίριο {building.name}'
                )
        
        # Αν είναι ενοικιασμένο, πρέπει να έχει στοιχεία ενοίκου
        if data.get('is_rented') and not data.get('tenant_name'):
            raise serializers.ValidationError(
                'Για ενοικιασμένο διαμέρισμα απαιτείται το όνομα του ενοίκου'
            )
        
        return data


class BulkCreateApartmentsSerializer(serializers.Serializer):
    """Serializer για μαζική δημιουργία διαμερισμάτων"""
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())
    start_number = serializers.IntegerField(min_value=1)
    end_number = serializers.IntegerField(min_value=1)
    floor_mapping = serializers.DictField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Mapping από αριθμό διαμερίσματος σε όροφο, π.χ. {'101': 1, '201': 2}"
    )
    
    def validate(self, data):
        if data['start_number'] > data['end_number']:
            raise serializers.ValidationError(
                'Ο αρχικός αριθμός πρέπει να είναι μικρότερος από τον τελικό'
            )
        
        # Έλεγχος αν υπάρχουν ήδη διαμερίσματα
        building = data['building']
        existing_numbers = set(
            Apartment.objects.filter(
                building=building,
                number__in=[str(i) for i in range(data['start_number'], data['end_number'] + 1)]
            ).values_list('number', flat=True)
        )
        
        if existing_numbers:
            raise serializers.ValidationError(
                f'Τα διαμερίσματα {", ".join(existing_numbers)} υπάρχουν ήδη'
            )
        
        return data 
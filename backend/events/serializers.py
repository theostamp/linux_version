from rest_framework import serializers
from .models import Event, EventNote
from buildings.serializers import BuildingSerializer
from apartments.serializers import ApartmentSerializer
from users.serializers import UserSerializer


class EventNoteSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = EventNote
        fields = [
            'id', 'event', 'author', 'content', 
            'created_at', 'is_internal'
        ]
        read_only_fields = ['author', 'created_at']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class EventSerializer(serializers.ModelSerializer):
    building = BuildingSerializer(read_only=True)
    building_id = serializers.IntegerField(write_only=True)
    
    apartments = ApartmentSerializer(many=True, read_only=True)
    apartment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    event_notes = EventNoteSerializer(many=True, read_only=True)
    
    # Read-only computed fields
    is_overdue = serializers.ReadOnlyField()
    days_until_due = serializers.ReadOnlyField()
    is_urgent_priority = serializers.ReadOnlyField()
    status_icon = serializers.ReadOnlyField()
    type_icon = serializers.ReadOnlyField()
    
    # Display fields for choices
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_type', 'priority', 'status',
            'building', 'building_id', 'apartments', 'apartment_ids',
            'created_by', 'assigned_to', 'assigned_to_id',
            'scheduled_date', 'due_date', 'completed_at',
            'notes', 'contact_phone', 'contact_email',
            'created_at', 'updated_at', 'is_recurring', 'recurrence_pattern',
            'event_notes', 'is_overdue', 'days_until_due', 'is_urgent_priority',
            'status_icon', 'type_icon', 'event_type_display', 
            'priority_display', 'status_display'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'completed_at']

    def create(self, validated_data):
        apartment_ids = validated_data.pop('apartment_ids', [])
        validated_data['created_by'] = self.context['request'].user
        
        event = super().create(validated_data)
        
        if apartment_ids:
            event.apartments.set(apartment_ids)
        
        return event

    def update(self, instance, validated_data):
        apartment_ids = validated_data.pop('apartment_ids', None)
        
        event = super().update(instance, validated_data)
        
        if apartment_ids is not None:
            event.apartments.set(apartment_ids)
        
        return event

    def validate(self, data):
        scheduled_date = data.get('scheduled_date')
        due_date = data.get('due_date')
        
        if scheduled_date and due_date and scheduled_date > due_date:
            raise serializers.ValidationError(
                "Η προγραμματισμένη ημερομηνία δεν μπορεί να είναι μετά την ημερομηνία λήξης"
            )
        
        return data


class EventListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    
    status_icon = serializers.ReadOnlyField()
    type_icon = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    is_urgent_priority = serializers.ReadOnlyField()
    
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_type', 'priority', 'status',
            'building_name', 'scheduled_date', 'due_date',
            'created_by_name', 'assigned_to_name', 'created_at',
            'status_icon', 'type_icon', 'is_overdue', 'is_urgent_priority',
            'event_type_display', 'priority_display', 'status_display'
        ]


class EventCalendarSerializer(serializers.ModelSerializer):
    """Minimal serializer for calendar views"""
    building_name = serializers.CharField(source='building.name', read_only=True)
    status_icon = serializers.ReadOnlyField()
    type_icon = serializers.ReadOnlyField()
    is_urgent_priority = serializers.ReadOnlyField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'event_type', 'priority', 'status',
            'building_name', 'scheduled_date', 'due_date',
            'status_icon', 'type_icon', 'is_urgent_priority'
        ]
from rest_framework import serializers
from django.utils import timezone
from .models import UserRequest
from buildings.models import Building
from django.utils import timezone

class UserRequestSerializer(serializers.ModelSerializer):
    # Expose building as a writable PK for creating/updating UserRequests
    building = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all(),
    )

    # Display username of the creator, read-only
    created_by_username = serializers.CharField(source='created_by.username', read_only=True) 
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    
    # Use SerializerMethodField for supporter_count to handle annotated field
    supporter_count = serializers.SerializerMethodField()
    supporter_usernames = serializers.SerializerMethodField()
    is_urgent = serializers.SerializerMethodField()
    is_supported = serializers.SerializerMethodField()
    days_since_creation = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    priority_display = serializers.SerializerMethodField()

    class Meta:
        model = UserRequest
        fields = [
            'id',
            'building',
            'title',
            'description',
            'type',
            'status',
            'priority',
            'created_at',
            'updated_at',
            'completed_at',
            'assigned_to',
            'assigned_to_username',
            'estimated_completion',
            'notes',
            'created_by_username',
            'supporter_count',
            'supporter_usernames',
            'is_urgent',
            'is_supported',
            'days_since_creation',
            'is_overdue',
            'status_display',
            'priority_display',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'completed_at',
            'created_by_username',
            'assigned_to_username',
        ]

    def get_supporter_count(self, obj: UserRequest) -> int:
        """
        Returns the supporter count.
        Uses 'annotated_supporter_count' if available (from 'top' action's annotation),
        otherwise calculates it from the 'supporters' many-to-many field.
        """
        if hasattr(obj, 'annotated_supporter_count'):
            return obj.annotated_supporter_count
        if hasattr(obj, 'supporters'):
            return obj.supporters.count()
        return 0

    def get_supporter_usernames(self, obj):
        """Get list of supporter usernames."""
        return [supporter.username for supporter in obj.supporters.all()]

    def get_is_urgent(self, obj):
        return obj.is_urgent

    def get_is_supported(self, obj):
        """Check if the current user supports this request."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return request.user in obj.supporters.all()
        return False

    def get_days_since_creation(self, obj):
        return obj.days_since_creation

    def get_is_overdue(self, obj):
        return obj.is_overdue

    def get_status_display(self, obj):
        return obj.status_display

    def get_priority_display(self, obj):
        return obj.priority_display

    def validate_building(self, building: Building):
        user = self.context['request'].user
        if not user.is_authenticated:
             raise serializers.ValidationError("User not authenticated.")

        # Superusers μπορούν πάντα
        if user.is_superuser:
            return building

        # Staff users μπορούν σε όλα τα κτίρια
        if user.is_staff:
            return building

        # Κάτοικοι μπορούν για την πολυκατοικία στην οποία ανήκουν
        if hasattr(user, 'resident_profile') and user.resident_profile.building == building:
            return building

        raise serializers.ValidationError("Δεν έχετε δικαίωμα δημιουργίας αιτήματος για αυτό το κτήριο.")

    def validate(self, data):
        """Validation για το αίτημα"""
        status = data.get('status')
        completed_at = data.get('completed_at')
        estimated_completion = data.get('estimated_completion')

        if completed_at and status != 'completed':
            raise serializers.ValidationError("Η ημερομηνία ολοκλήρωσης μπορεί να οριστεί μόνο για ολοκληρωμένα αιτήματα")

        if estimated_completion and estimated_completion < timezone.now().date():
            raise serializers.ValidationError("Η εκτιμώμενη ημερομηνία ολοκλήρωσης δεν μπορεί να είναι στο παρελθόν")

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class UserRequestListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    supporter_count = serializers.SerializerMethodField()
    supporter_usernames = serializers.SerializerMethodField()
    is_supported = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRequest
        fields = [
            'id', 'title', 'type', 'status', 'priority', 'created_at',
            'created_by_username', 'building_name', 'supporter_count',
            'supporter_usernames', 'is_urgent', 'is_supported', 'days_since_creation'
        ]

    def get_supporter_count(self, obj):
        if hasattr(obj, 'annotated_supporter_count'):
            return obj.annotated_supporter_count
        return obj.supporters.count()

    def get_supporter_usernames(self, obj):
        """Get list of supporter usernames."""
        return [supporter.username for supporter in obj.supporters.all()]

    def get_is_supported(self, obj):
        """Check if the current user supports this request."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return request.user in obj.supporters.all()
        return False

class UserRequestSupportSerializer(serializers.Serializer):
    """Serializer για υποστήριξη/απόσυρση υποστήριξης αιτήματος"""
    action = serializers.ChoiceField(choices=['support', 'unsupport'])
    
    def validate_action(self, value):
        if value not in ['support', 'unsupport']:
            raise serializers.ValidationError("Μη έγκυρη ενέργεια")
        return value
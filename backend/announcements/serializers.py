from rest_framework import serializers 
from buildings.models import Building
from .models import Announcement

class AnnouncementSerializer(serializers.ModelSerializer):
    building = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all()
    )
    author = serializers.HiddenField(default=serializers.CurrentUserDefault())
    is_currently_active = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'description',
            'created_at',
            'updated_at',
            'author',
            'author_name',
            'building',
            'file',
            'start_date',
            'end_date',
            'is_active',
            'is_urgent',
            'priority',
            'published',
            'is_currently_active',
            'days_remaining',
            'status_display',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'author', 'author_name']

    def validate_building(self, value):
        user = self.context['request'].user
        if hasattr(value, 'manager') and value.manager is not None:
            if not (user.is_superuser or value.manager == user):
                raise serializers.ValidationError("Δεν έχετε δικαίωμα διαχείρισης για αυτό το κτήριο.")
        elif not user.is_superuser:
            raise serializers.ValidationError("Μόνο διαχειριστές ή superusers μπορούν να αντιστοιχίσουν ανακοίνωση σε αυτό το κτήριο.")
        return value

    def validate(self, data):
        """Validation για τις ημερομηνίες και την επείγουσα κατάσταση"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        is_urgent = data.get('is_urgent', False)
        published = data.get('published', False)

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Η ημερομηνία έναρξης δεν μπορεί να είναι μετά την ημερομηνία λήξης")
        
        if is_urgent and not published:
            raise serializers.ValidationError("Οι επείγουσες ανακοινώσεις πρέπει να είναι δημοσιευμένες")

        return data

    def get_is_currently_active(self, obj):
        return obj.is_currently_active

    def get_days_remaining(self, obj):
        return obj.days_remaining

    def get_status_display(self, obj):
        return obj.status_display

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['author'] = request.user
        return super().create(validated_data)

class AnnouncementListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    author_name = serializers.SerializerMethodField()
    building_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'created_at', 'is_urgent', 'priority',
            'author_name', 'building_name', 'is_currently_active'
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username

    def get_building_name(self, obj):
        return obj.building.name

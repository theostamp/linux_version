from rest_framework import serializers
from .models import HeatingDevice, HeatingSession, HeatingControlProfile

class HeatingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeatingSession
        fields = '__all__'

class HeatingDeviceSerializer(serializers.ModelSerializer):
    current_session = serializers.SerializerMethodField()

    class Meta:
        model = HeatingDevice
        fields = ['id', 'name', 'device_id', 'device_type', 'is_active', 'last_seen', 'current_status', 'current_session']

    def get_current_session(self, obj):
        if obj.current_status:
            session = obj.sessions.filter(ended_at__isnull=True).last()
            if session:
                return HeatingSessionSerializer(session).data
        return None


class HeatingControlProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeatingControlProfile
        fields = ['building', 'curve_value', 'min_external_temp', 'schedule', 'created_at', 'updated_at']
        read_only_fields = ['building', 'created_at', 'updated_at']

    def validate_curve_value(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('curve_value must be between 0 and 100.')
        return value

    def validate_min_external_temp(self, value):
        if value < -30 or value > 30:
            raise serializers.ValidationError('min_external_temp must be between -30 and 30.')
        return value

    def validate_schedule(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('schedule must be a list.')
        return value

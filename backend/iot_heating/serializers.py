from rest_framework import serializers
from .models import HeatingDevice, HeatingSession

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


from rest_framework import serializers
from .models import KioskWidgetConfig


class KioskWidgetConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for KioskWidgetConfig
    """
    building_name = serializers.CharField(source='building.name', read_only=True)
    building_address = serializers.CharField(source='building.address', read_only=True)
    widgets = serializers.SerializerMethodField()
    settings = serializers.SerializerMethodField()
    enabled_widgets_count = serializers.SerializerMethodField()
    total_widgets_count = serializers.SerializerMethodField()

    class Meta:
        model = KioskWidgetConfig
        fields = [
            'id',
            'building',
            'building_name',
            'building_address',
            'config',
            'widgets',
            'settings',
            'enabled_widgets_count',
            'total_widgets_count',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        read_only_fields = [
            'id',
            'building_name',
            'building_address',
            'widgets',
            'settings',
            'enabled_widgets_count',
            'total_widgets_count',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]

    def get_widgets(self, obj):
        """Get widgets from config"""
        return obj.widgets

    def get_settings(self, obj):
        """Get settings from config"""
        return obj.settings

    def get_enabled_widgets_count(self, obj):
        """Get count of enabled widgets"""
        return len(obj.get_enabled_widgets())

    def get_total_widgets_count(self, obj):
        """Get total count of widgets"""
        return len(obj.widgets)

    def validate_config(self, value):
        """Validate config structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Config must be a dictionary")
        
        # Validate widgets structure
        widgets = value.get('widgets', [])
        if not isinstance(widgets, list):
            raise serializers.ValidationError("Widgets must be a list")
        
        for widget in widgets:
            if not isinstance(widget, dict):
                raise serializers.ValidationError("Each widget must be a dictionary")
            
            required_fields = ['id', 'name', 'category', 'enabled', 'order']
            for field in required_fields:
                if field not in widget:
                    raise serializers.ValidationError(f"Widget missing required field: {field}")
        
        # Validate settings structure
        settings = value.get('settings', {})
        if not isinstance(settings, dict):
            raise serializers.ValidationError("Settings must be a dictionary")
        
        return value


class KioskWidgetSerializer(serializers.Serializer):
    """
    Serializer for individual kiosk widgets
    """
    id = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=[
        ('main_slides', 'Main Slides'),
        ('sidebar_widgets', 'Sidebar Widgets'),
        ('top_bar_widgets', 'Top Bar Widgets'),
        ('special_widgets', 'Special Widgets'),
    ])
    enabled = serializers.BooleanField(default=True)
    order = serializers.IntegerField(min_value=0)
    settings = serializers.DictField(required=False, default=dict)
    gridPosition = serializers.DictField(required=False, allow_null=True)

    def validate_gridPosition(self, value):
        """Validate grid position if provided"""
        if value is None:
            return value
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("Grid position must be a dictionary")
        
        required_fields = ['row', 'col', 'rowSpan', 'colSpan']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Grid position missing required field: {field}")
            
            if not isinstance(value[field], int) or value[field] < 0:
                raise serializers.ValidationError(f"Grid position {field} must be a non-negative integer")
        
        return value


class KioskSettingsSerializer(serializers.Serializer):
    """
    Serializer for kiosk global settings
    """
    slideDuration = serializers.IntegerField(min_value=5, max_value=60, default=10)
    refreshInterval = serializers.IntegerField(min_value=10, max_value=300, default=30)
    autoRefresh = serializers.BooleanField(default=True)
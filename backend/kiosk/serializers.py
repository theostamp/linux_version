from rest_framework import serializers
from .models import KioskWidget, KioskDisplaySettings, KioskScene, WidgetPlacement


class KioskWidgetSerializer(serializers.ModelSerializer):
    """
    Serializer for KioskWidget model
    """
    class Meta:
        model = KioskWidget
        fields = [
            'widget_id', 'name', 'greek_name', 'description', 'greek_description',
            'category', 'icon', 'enabled', 'order', 'settings', 'component',
            'data_source', 'is_custom', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def to_representation(self, instance):
        """Convert to API-friendly format"""
        data = super().to_representation(instance)
        
        # Rename fields to match frontend expectations
        return {
            'id': data['widget_id'],  # Use widget_id as the main ID for frontend
            'db_id': instance.id,     # Include database ID for edit operations
            'name': data['name'],
            'greekName': data['greek_name'],
            'description': data['description'],
            'greekDescription': data['greek_description'],
            'category': data['category'],
            'icon': data['icon'],
            'enabled': data['enabled'],
            'order': data['order'],
            'settings': data['settings'],
            'component': data['component'],
            'dataSource': data['data_source'],
            'isCustom': data['is_custom'],
            'lastModified': data['updated_at'],
            'createdAt': data['created_at'],
            'buildingId': instance.building_id if instance.building else None,
        }


class KioskDisplaySettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for KioskDisplaySettings model
    """
    class Meta:
        model = KioskDisplaySettings
        fields = [
            'building', 'slide_duration', 'auto_slide', 'show_navigation',
            'background_image', 'theme', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def to_representation(self, instance):
        """Convert to API-friendly format"""
        data = super().to_representation(instance)
        
        return {
            'buildingId': data['building'],
            'slideDuration': data['slide_duration'],
            'autoSlide': data['auto_slide'],
            'showNavigation': data['show_navigation'],
            'backgroundImage': data['background_image'],
            'theme': data['theme'],
            'updatedAt': data['updated_at'],
            'createdAt': data['created_at'],
        }


class WidgetPlacementSerializer(serializers.ModelSerializer):
    """
    Serializer for WidgetPlacement model with nested widget data
    """
    widget = KioskWidgetSerializer(read_only=True)
    widget_id = serializers.CharField(write_only=True, source='widget.widget_id')
    
    class Meta:
        model = WidgetPlacement
        fields = [
            'id', 'scene', 'widget', 'widget_id',
            'grid_row_start', 'grid_col_start', 'grid_row_end', 'grid_col_end',
            'z_index', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def to_representation(self, instance):
        """Convert to API-friendly format"""
        return {
            'id': instance.id,
            'sceneId': instance.scene.id,
            'widgetId': instance.widget.widget_id,
            'gridRowStart': instance.grid_row_start,
            'gridColStart': instance.grid_col_start,
            'gridRowEnd': instance.grid_row_end,
            'gridColEnd': instance.grid_col_end,
            'zIndex': instance.z_index,
            'widget': KioskWidgetSerializer(instance.widget).data,
        }


class KioskSceneSerializer(serializers.ModelSerializer):
    """
    Serializer for KioskScene model with nested placements
    """
    placements = WidgetPlacementSerializer(many=True, read_only=True)
    
    class Meta:
        model = KioskScene
        fields = [
            'id', 'building', 'name', 'order', 'duration_seconds', 'transition',
            'is_enabled', 'active_start_time', 'active_end_time',
            'placements', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to API-friendly format"""
        return {
            'id': instance.id,
            'buildingId': instance.building.id if instance.building else None,
            'name': instance.name,
            'order': instance.order,
            'durationSeconds': instance.duration_seconds,
            'transition': instance.transition,
            'isEnabled': instance.is_enabled,
            'activeStartTime': instance.active_start_time.isoformat() if instance.active_start_time else None,
            'activeEndTime': instance.active_end_time.isoformat() if instance.active_end_time else None,
            'placements': [WidgetPlacementSerializer(p).data for p in instance.placements.all()],
            'createdAt': instance.created_at.isoformat(),
            'updatedAt': instance.updated_at.isoformat(),
        }


class KioskSceneListSerializer(serializers.ModelSerializer):
    """
    Optimized serializer for listing scenes without full placement details
    """
    placement_count = serializers.SerializerMethodField()
    
    class Meta:
        model = KioskScene
        fields = [
            'id', 'building', 'name', 'order', 'duration_seconds', 'transition',
            'is_enabled', 'active_start_time', 'active_end_time',
            'placement_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_placement_count(self, obj):
        return obj.placements.count()
    
    def to_representation(self, instance):
        """Convert to API-friendly format"""
        return {
            'id': instance.id,
            'buildingId': instance.building.id if instance.building else None,
            'name': instance.name,
            'order': instance.order,
            'durationSeconds': instance.duration_seconds,
            'transition': instance.transition,
            'isEnabled': instance.is_enabled,
            'activeStartTime': instance.active_start_time.isoformat() if instance.active_start_time else None,
            'activeEndTime': instance.active_end_time.isoformat() if instance.active_end_time else None,
            'placementCount': self.get_placement_count(instance),
            'createdAt': instance.created_at.isoformat(),
            'updatedAt': instance.updated_at.isoformat(),
        }
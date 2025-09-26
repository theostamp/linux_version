from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django_tenants.utils import schema_context
from .models import KioskWidgetConfig
from .serializers import KioskWidgetConfigSerializer
from buildings.models import Building


class KioskWidgetConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing kiosk widget configurations
    """
    serializer_class = KioskWidgetConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get configurations for the current building"""
        building_id = self.request.query_params.get('building_id')
        if building_id:
            return KioskWidgetConfig.objects.filter(building_id=building_id)
        return KioskWidgetConfig.objects.all()

    def get_object(self):
        """Get configuration for specific building"""
        building_id = self.kwargs.get('pk')
        return get_object_or_404(KioskWidgetConfig, building_id=building_id)

    def create(self, request, *args, **kwargs):
        """Create or update configuration for a building"""
        building_id = request.data.get('building_id')
        if not building_id:
            return Response(
                {'error': 'building_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        config, created = KioskWidgetConfig.objects.get_or_create(
            building=building,
            defaults={
                'config': request.data.get('config', {}),
                'created_by': request.user,
                'updated_by': request.user
            }
        )

        if not created:
            config.config = request.data.get('config', config.config)
            config.updated_by = request.user
            config.save()

        serializer = self.get_serializer(config)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update configuration"""
        instance = self.get_object()
        instance.config = request.data.get('config', instance.config)
        instance.updated_by = request.user
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_widget(self, request, pk=None):
        """Toggle widget enabled/disabled state"""
        config = self.get_object()
        widget_id = request.data.get('widget_id')
        enabled = request.data.get('enabled', True)

        if not widget_id:
            return Response(
                {'error': 'widget_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        config.toggle_widget(widget_id, enabled)
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_widget_order(self, request, pk=None):
        """Update widget order within category"""
        config = self.get_object()
        widget_id = request.data.get('widget_id')
        new_order = request.data.get('order')

        if not widget_id or new_order is None:
            return Response(
                {'error': 'widget_id and order are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        config.update_widget_order(widget_id, new_order)
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_widget_settings(self, request, pk=None):
        """Update widget-specific settings"""
        config = self.get_object()
        widget_id = request.data.get('widget_id')
        settings = request.data.get('settings', {})

        if not widget_id:
            return Response(
                {'error': 'widget_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        config.update_widget(widget_id, {'settings': settings})
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_global_settings(self, request, pk=None):
        """Update global kiosk settings"""
        config = self.get_object()
        settings_updates = request.data.get('settings', {})

        config.update_global_settings(settings_updates)
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reset_to_default(self, request, pk=None):
        """Reset configuration to default values"""
        config = self.get_object()
        config.reset_to_default()
        config.updated_by = request.user
        config.save()
        
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def get_by_building(self, request):
        """Get configuration by building ID"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'building_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = KioskWidgetConfig.objects.get(building_id=building_id)
            serializer = self.get_serializer(config)
            return Response(serializer.data)
        except KioskWidgetConfig.DoesNotExist:
            # Return default configuration if none exists
            default_config = {
                'building_id': int(building_id),
                'config': {
                    'widgets': KioskWidgetConfig()._get_default_widgets(),
                    'settings': {
                        'slideDuration': 10,
                        'refreshInterval': 30,
                        'autoRefresh': True
                    }
                }
            }
            return Response(default_config)
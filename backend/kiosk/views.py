from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django_tenants.utils import schema_context

from .models import KioskWidget, KioskDisplaySettings, KioskScene, WidgetPlacement
from .serializers import (
    KioskWidgetSerializer, 
    KioskDisplaySettingsSerializer,
    KioskSceneSerializer,
    KioskSceneListSerializer,
    WidgetPlacementSerializer
)
from buildings.models import Building
from datetime import datetime


class KioskWidgetConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing kiosk widget configurations
    """
    queryset = KioskWidget.objects.all()
    serializer_class = KioskWidgetSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'widget_id'

    def get_queryset(self):
        """Filter widgets by building if specified"""
        queryset = super().get_queryset()
        building_id = self.request.query_params.get('building_id')
        
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
                queryset = queryset.filter(building=building)
            except Building.DoesNotExist:
                queryset = queryset.none()
        
        return queryset.order_by('order', 'name')

    def list(self, request, *args, **kwargs):
        """List all widgets with optional building filter"""
        with schema_context('demo'):
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'widgets': serializer.data,
                'count': queryset.count()
            })

    def create(self, request, *args, **kwargs):
        """Create a new widget configuration"""
        with schema_context('demo'):
            # Get building from request
            building_id = request.data.get('buildingId')
            building = None
            if building_id:
                try:
                    building = Building.objects.get(id=building_id)
                except Building.DoesNotExist:
                    pass

            # Check if widget already exists
            widget_id = request.data.get('id')
            if KioskWidget.objects.filter(widget_id=widget_id).exists():
                return Response(
                    {'error': 'Widget with this ID already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create widget
            widget_data = request.data.copy()
            widget_data['building'] = building.id if building else None
            widget_data['created_by'] = request.user.id
            
            serializer = self.get_serializer(data=widget_data)
            serializer.is_valid(raise_exception=True)
            widget = serializer.save(
                building=building,
                created_by=request.user
            )
            
            return Response(widget.to_dict(), status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update widget configuration"""
        with schema_context('demo'):
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            # Refresh from DB to get updated data
            instance.refresh_from_db()
            return Response(instance.to_dict())

    def partial_update(self, request, *args, **kwargs):
        """Partial update widget configuration (PATCH)"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete widget configuration"""
        with schema_context('demo'):
            widget = self.get_object()
            widget.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def sync(self, request):
        """Sync multiple widgets at once"""
        with schema_context('demo'):
            widgets_data = request.data.get('widgets', [])
            building_id = request.data.get('buildingId')
            
            building = None
            if building_id:
                try:
                    building = Building.objects.get(id=building_id)
                except Building.DoesNotExist:
                    pass

            synced_widgets = []
            
            for widget_data in widgets_data:
                widget_id = widget_data.get('id')
                if not widget_id:
                    continue
                
                # Try to get existing widget
                try:
                    widget = KioskWidget.objects.get(widget_id=widget_id)
                    # Update existing widget
                    for field, value in widget_data.items():
                        if hasattr(widget, field) and field not in ['id', 'created_at']:
                            setattr(widget, field, value)
                    widget.updated_at = timezone.now()
                    widget.save()
                except KioskWidget.DoesNotExist:
                    # Create new widget
                    widget_data['building'] = building.id if building else None
                    widget_data['created_by'] = request.user.id
                    widget = KioskWidget.from_dict(widget_data, request.user, building)
                    widget.save()
                
                synced_widgets.append(widget.to_dict())
            
            return Response({
                'synced': len(synced_widgets),
                'widgets': synced_widgets
            })

    @action(detail=False, methods=['get'])
    def get_by_building(self, request):
        """Get widgets for a specific building"""
        with schema_context('demo'):
            building_id = request.query_params.get('building_id')
            if not building_id:
                return Response(
                    {'error': 'building_id parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                building = Building.objects.get(id=building_id)
                widgets = KioskWidget.objects.filter(building=building)
                serializer = self.get_serializer(widgets, many=True)
                
                return Response({
                    'widgets': serializer.data,
                    'building': {
                        'id': building.id,
                        'name': building.name
                    }
                })
            except Building.DoesNotExist:
                return Response(
                    {'error': 'Building not found'},
                    status=status.HTTP_404_NOT_FOUND
                )


class KioskDisplayConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing kiosk display configurations
    """
    queryset = KioskDisplaySettings.objects.all()
    serializer_class = KioskDisplaySettingsSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'building_id'

    def get_queryset(self):
        """Filter by building if specified"""
        queryset = super().get_queryset()
        building_id = self.request.query_params.get('building_id')
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        return queryset

    def create(self, request, *args, **kwargs):
        """Create or update display configuration"""
        with schema_context('demo'):
            building_id = request.data.get('buildingId')
            if not building_id:
                return Response(
                    {'error': 'buildingId is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                building = Building.objects.get(id=building_id)
                
                # Try to get existing config
                try:
                    config = KioskDisplaySettings.objects.get(building=building)
                    # Update existing
                    serializer = self.get_serializer(config, data=request.data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    config = serializer.save(updated_by=request.user)
                except KioskDisplaySettings.DoesNotExist:
                    # Create new
                    serializer = self.get_serializer(data=request.data)
                    serializer.is_valid(raise_exception=True)
                    config = serializer.save(
                        building=building,
                        updated_by=request.user
                    )
                
                return Response(config.to_dict())
                
            except Building.DoesNotExist:
                return Response(
                    {'error': 'Building not found'},
                    status=status.HTTP_404_NOT_FOUND
                )


# Public views (no authentication required)
class PublicKioskWidgetConfigViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for reading kiosk widget configurations
    """
    queryset = KioskWidget.objects.all()
    serializer_class = KioskWidgetSerializer
    permission_classes = []  # No authentication required
    lookup_field = 'widget_id'

    def get_queryset(self):
        """Filter by building if specified"""
        queryset = super().get_queryset()
        building_id = self.request.query_params.get('building_id')
        
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
                queryset = queryset.filter(building=building, enabled=True)
            except Building.DoesNotExist:
                # Return default widgets if building not found
                queryset = queryset.filter(enabled=True, is_custom=False)
        else:
            queryset = queryset.filter(enabled=True)
        
        return queryset.order_by('order', 'name')

    def list(self, request, *args, **kwargs):
        """List all enabled widgets"""
        with schema_context('demo'):
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'widgets': serializer.data,
                'count': queryset.count(),
                'timestamp': timezone.now().isoformat()
            })


class KioskSceneViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing kiosk scenes (authenticated)
    """
    queryset = KioskScene.objects.all()
    serializer_class = KioskSceneSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter scenes by building if specified"""
        queryset = super().get_queryset()
        building_id = self.request.query_params.get('building_id')
        
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
                queryset = queryset.filter(building=building)
            except Building.DoesNotExist:
                queryset = queryset.none()
        
        return queryset.prefetch_related('placements__widget')
    
    def get_serializer_class(self):
        """Use list serializer for list action"""
        if self.action == 'list':
            return KioskSceneListSerializer
        return KioskSceneSerializer
    
    def list(self, request, *args, **kwargs):
        """List all scenes with optional building filter"""
        with schema_context('demo'):
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'scenes': serializer.data,
                'count': queryset.count()
            })
    
    def retrieve(self, request, *args, **kwargs):
        """Get a single scene with full details"""
        with schema_context('demo'):
            scene = self.get_object()
            serializer = KioskSceneSerializer(scene)
            return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new scene"""
        with schema_context('demo'):
            building_id = request.data.get('buildingId')
            if not building_id:
                return Response(
                    {'error': 'buildingId is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return Response(
                    {'error': 'Building not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create scene
            scene = KioskScene.objects.create(
                building=building,
                name=request.data.get('name', 'New Scene'),
                order=request.data.get('order', 0),
                duration_seconds=request.data.get('durationSeconds', 30),
                transition=request.data.get('transition', 'fade'),
                is_enabled=request.data.get('isEnabled', True),
                active_start_time=request.data.get('activeStartTime'),
                active_end_time=request.data.get('activeEndTime'),
                created_by=request.user
            )
            
            # Create placements if provided
            placements_data = request.data.get('placements', [])
            for placement_data in placements_data:
                widget_id = placement_data.get('widgetId')
                try:
                    widget = KioskWidget.objects.get(widget_id=widget_id)
                    WidgetPlacement.objects.create(
                        scene=scene,
                        widget=widget,
                        grid_row_start=placement_data.get('gridRowStart', 1),
                        grid_col_start=placement_data.get('gridColStart', 1),
                        grid_row_end=placement_data.get('gridRowEnd', 2),
                        grid_col_end=placement_data.get('gridColEnd', 2),
                        z_index=placement_data.get('zIndex', 0)
                    )
                except KioskWidget.DoesNotExist:
                    pass
            
            serializer = KioskSceneSerializer(scene)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update a scene"""
        with schema_context('demo'):
            scene = self.get_object()
            
            # Update scene fields
            scene.name = request.data.get('name', scene.name)
            scene.order = request.data.get('order', scene.order)
            scene.duration_seconds = request.data.get('durationSeconds', scene.duration_seconds)
            scene.transition = request.data.get('transition', scene.transition)
            scene.is_enabled = request.data.get('isEnabled', scene.is_enabled)
            scene.active_start_time = request.data.get('activeStartTime', scene.active_start_time)
            scene.active_end_time = request.data.get('activeEndTime', scene.active_end_time)
            scene.save()
            
            # Update placements if provided
            if 'placements' in request.data:
                # Delete existing placements
                scene.placements.all().delete()
                
                # Create new placements
                placements_data = request.data.get('placements', [])
                for placement_data in placements_data:
                    widget_id = placement_data.get('widgetId')
                    try:
                        widget = KioskWidget.objects.get(widget_id=widget_id)
                        WidgetPlacement.objects.create(
                            scene=scene,
                            widget=widget,
                            grid_row_start=placement_data.get('gridRowStart', 1),
                            grid_col_start=placement_data.get('gridColStart', 1),
                            grid_row_end=placement_data.get('gridRowEnd', 2),
                            grid_col_end=placement_data.get('gridColEnd', 2),
                            z_index=placement_data.get('zIndex', 0)
                        )
                    except KioskWidget.DoesNotExist:
                        pass
            
            serializer = KioskSceneSerializer(scene)
            return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a scene"""
        with schema_context('demo'):
            scene = self.get_object()
            scene.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder scenes by providing an array of scene IDs"""
        with schema_context('demo'):
            scene_ids = request.data.get('sceneIds', [])
            
            for index, scene_id in enumerate(scene_ids):
                try:
                    scene = KioskScene.objects.get(id=scene_id)
                    scene.order = index
                    scene.save()
                except KioskScene.DoesNotExist:
                    pass
            
            return Response({'success': True})


class PublicKioskSceneViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for reading active kiosk scenes (no authentication)
    """
    queryset = KioskScene.objects.all()
    serializer_class = KioskSceneSerializer
    permission_classes = []  # No authentication required
    
    def get_queryset(self):
        """Filter active scenes by building and time constraints"""
        queryset = super().get_queryset()
        building_id = self.request.query_params.get('building_id')
        
        # Filter by building
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
                queryset = queryset.filter(building=building)
            except Building.DoesNotExist:
                queryset = queryset.none()
        
        # Filter by enabled status
        queryset = queryset.filter(is_enabled=True)
        
        # Filter by time constraints if specified
        current_time = datetime.now().time()
        
        # Include scenes with no time constraints or scenes within their active time
        queryset = queryset.filter(
            models.Q(active_start_time__isnull=True, active_end_time__isnull=True) |
            models.Q(active_start_time__lte=current_time, active_end_time__gte=current_time) |
            models.Q(active_start_time__isnull=True, active_end_time__gte=current_time) |
            models.Q(active_start_time__lte=current_time, active_end_time__isnull=True)
        )
        
        return queryset.prefetch_related('placements__widget').order_by('order')
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active scenes for current time"""
        with schema_context('demo'):
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'scenes': serializer.data,
                'count': queryset.count(),
                'timestamp': timezone.now().isoformat()
            })
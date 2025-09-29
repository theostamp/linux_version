from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_tenants.utils import schema_context

from .models import KioskWidget, KioskDisplaySettings
from .serializers import KioskWidgetSerializer, KioskDisplaySettingsSerializer
from buildings.models import Building


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
            widget = self.get_object()
            widget_data = request.data.copy()
            
            # Update fields
            for field, value in widget_data.items():
                if hasattr(widget, field):
                    setattr(widget, field, value)
            
            widget.updated_at = timezone.now()
            widget.save()
            
            return Response(widget.to_dict())

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
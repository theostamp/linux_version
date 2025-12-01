from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models, connection

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
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'widgets': serializer.data,
            'count': queryset.count()
        })

    def create(self, request, *args, **kwargs):
        """Create a new widget configuration"""
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
            created_by=None  # Public endpoint - no authenticated user
        )
        
        return Response(widget.to_dict(), status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update widget configuration"""
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
        widget = self.get_object()
        widget.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def sync(self, request):
        """Sync multiple widgets at once"""
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
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'scenes': serializer.data,
            'count': queryset.count()
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Get a single scene with full details"""
        scene = self.get_object()
        serializer = KioskSceneSerializer(scene)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new scene"""
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
            created_by=None  # Public endpoint - no authenticated user
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
        scene = self.get_object()
        scene.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder scenes by providing an array of scene IDs"""
        scene_ids = request.data.get('sceneIds', [])
        
        for index, scene_id in enumerate(scene_ids):
            try:
                scene = KioskScene.objects.get(id=scene_id)
                scene.order = index
                scene.save()
            except KioskScene.DoesNotExist:
                pass
        
        return Response({'success': True})
    
    @action(detail=False, methods=['post'])
    def create_default_scene(self, request):
        """Create default morning overview scene"""
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
        
        # Check if scenes already exist
        existing_scenes = KioskScene.objects.filter(building=building).count()
        if existing_scenes > 0:
            return Response(
                {'error': 'Scenes already exist for this building'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the default "Πρωινή Επισκόπηση" scene
        scene = KioskScene.objects.create(
            building=building,
            name='Πρωινή Επισκόπηση',
            order=0,
            duration_seconds=30,
            transition='fade',
            is_enabled=True,
            created_by=None  # Public endpoint - no authenticated user
        )
        
        # Create a default widget for the scene if none exist
        default_widget = None
        try:
            # Try to find the Dashboard Overview widget first
            default_widget = KioskWidget.objects.filter(
                building=building,
                widget_id='dashboard_overview'
            ).first()
            
            if not default_widget:
                # Try to find any enabled main_slides widget
                default_widget = KioskWidget.objects.filter(
                    building=building,
                    enabled=True,
                    category='main_slides'
                ).first()
            
            if not default_widget:
                # Create a default morning overview widget
                default_widget = KioskWidget.objects.create(
                    widget_id='dashboard_overview',
                    name='Dashboard Overview',
                    greek_name='Επισκόπηση Κτιρίου',
                    description='Building overview with key statistics',
                    greek_description='Επισκόπηση κτιρίου με βασικά στατιστικά',
                    category='main_slides',
                    icon='Home',
                    enabled=True,
                    order=1,
                    settings={'title': 'Επισκόπηση Κτιρίου', 'showTitle': True},
                    component='DashboardOverview',
                    data_source='/api/public-info',
                    is_custom=False,
                    building=building,
                    created_by=None  # Public endpoint - no authenticated user
                )
            
            # Create placement for the widget (full screen)
            WidgetPlacement.objects.create(
                scene=scene,
                widget=default_widget,
                grid_row_start=1,
                grid_col_start=1,
                grid_row_end=9,  # Full height
                grid_col_end=13,  # Full width
                z_index=0
            )
            
        except Exception:
            # If widget creation fails, still create the scene
            pass
        
        serializer = KioskSceneSerializer(scene)
        return Response({
            'scene': serializer.data,
            'message': 'Default scene created successfully'
        }, status=status.HTTP_201_CREATED)


# ============================================================================
# KIOSK RESIDENT REGISTRATION
# ============================================================================

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from users.models import UserInvitation, CustomUser
from users.services import EmailService
from apartments.models import Apartment
import logging
import base64
import unicodedata
import re

kiosk_logger = logging.getLogger(__name__)


def normalize_greek_name(name: str) -> str:
    """
    Normalize Greek name for fuzzy matching.
    - Remove accents/diacritics
    - Convert to uppercase
    - Remove extra spaces
    - Handle common Greek name variations
    """
    if not name:
        return ''
    
    # Convert to uppercase
    name = name.upper()
    
    # Remove accents (tonos) - NFD decomposition separates base char from accent
    name = unicodedata.normalize('NFD', name)
    name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
    
    # Remove extra whitespace
    name = ' '.join(name.split())
    
    return name


def names_match(input_name: str, stored_name: str, threshold: float = 0.7) -> bool:
    """
    Check if two Greek names match with fuzzy logic.
    
    Handles:
    - Case insensitivity (ΓΙΩΡΓΟΣ = γιώργος)
    - Accent insensitivity (Γιώργος = Γιωργος)
    - Common name variations (Γεώργιος = Γιώργος)
    - First name only matching (Γιώργος Παπαδόπουλος matches if user enters just Γιώργος)
    - Partial matching (Γιωργ matches Γιώργος)
    
    Returns True if names match within threshold.
    """
    if not input_name or not stored_name:
        return False
    
    # Normalize both names
    input_norm = normalize_greek_name(input_name)
    stored_norm = normalize_greek_name(stored_name)
    
    # Exact match after normalization
    if input_norm == stored_norm:
        return True
    
    # Split into words (first name, last name)
    input_parts = input_norm.split()
    stored_parts = stored_norm.split()
    
    # Check if any input word matches any stored word (for first name or last name match)
    for input_part in input_parts:
        for stored_part in stored_parts:
            # Exact word match
            if input_part == stored_part:
                return True
            # Partial match (input is contained in stored or vice versa) - min 3 chars
            if len(input_part) >= 3 and (input_part in stored_part or stored_part in input_part):
                return True
    
    # Check common Greek name variations
    greek_name_variants = {
        'ΓΕΩΡΓΙΟΣ': ['ΓΙΩΡΓΟΣ', 'ΓΙΩΡΓΗΣ', 'ΓΚΕΟΡΓΚ'],
        'ΓΙΩΡΓΟΣ': ['ΓΕΩΡΓΙΟΣ', 'ΓΙΩΡΓΗΣ'],
        'ΚΩΝΣΤΑΝΤΙΝΟΣ': ['ΚΩΣΤΑΣ', 'ΝΤΙΝΟΣ', 'ΚΩΣΤΑΝΤΙΝΟΣ'],
        'ΚΩΣΤΑΣ': ['ΚΩΝΣΤΑΝΤΙΝΟΣ'],
        'ΔΗΜΗΤΡΙΟΣ': ['ΔΗΜΗΤΡΗΣ', 'ΜΗΤΣΟΣ', 'ΤΑΚΗΣ'],
        'ΔΗΜΗΤΡΗΣ': ['ΔΗΜΗΤΡΙΟΣ'],
        'ΝΙΚΟΛΑΟΣ': ['ΝΙΚΟΣ', 'ΝΙΚΟΛΑΣ'],
        'ΝΙΚΟΣ': ['ΝΙΚΟΛΑΟΣ'],
        'ΙΩΑΝΝΗΣ': ['ΓΙΑΝΝΗΣ', 'ΓΙΑΝΝΑΚΗΣ'],
        'ΓΙΑΝΝΗΣ': ['ΙΩΑΝΝΗΣ'],
        'ΑΙΚΑΤΕΡΙΝΗ': ['ΚΑΤΕΡΙΝΑ', 'ΚΑΙΤΗ', 'ΚΑΤΙΑ'],
        'ΚΑΤΕΡΙΝΑ': ['ΑΙΚΑΤΕΡΙΝΗ'],
        'ΕΛΕΝΗ': ['ΛΕΝΑ', 'ΕΛΕΝΙΤΣΑ'],
        'ΜΑΡΙΑ': ['ΜΑΙΡΗ', 'ΜΑΡΙΓΟΥΛΑ'],
        'ΑΝΑΣΤΑΣΙΟΣ': ['ΤΑΣΟΣ', 'ΑΝΑΣΤΑΣΗΣ'],
        'ΑΝΑΣΤΑΣΙΑ': ['ΝΑΤΑΣΑ', 'ΤΑΣΙΑ'],
        'ΕΥΑΓΓΕΛΟΣ': ['ΒΑΓΓΕΛΗΣ', 'ΑΓΓΕΛΟΣ'],
        'ΘΕΟΔΩΡΟΣ': ['ΘΟΔΩΡΗΣ', 'ΘΟΔΩΡΑΚΗΣ'],
        'ΘΟΔΩΡΗΣ': ['ΘΕΟΔΩΡΟΣ'],
        'ΠΑΝΑΓΙΩΤΗΣ': ['ΠΑΝΟΣ', 'ΠΑΝΑΓΟΣ', 'ΤΑΚΗΣ'],
        'ΣΤΑΜΑΤΙΟΣ': ['ΣΤΑΜΑΤΗΣ', 'ΣΤΑΜΟΣ'],
        'ΣΤΑΜΑΤΗΣ': ['ΣΤΑΜΑΤΙΟΣ'],
    }
    
    # Check for variant matches
    for input_part in input_parts:
        for stored_part in stored_parts:
            # Check if input is a variant of stored
            if input_part in greek_name_variants:
                if stored_part in greek_name_variants[input_part]:
                    return True
            # Check if stored is a variant of input
            if stored_part in greek_name_variants:
                if input_part in greek_name_variants[stored_part]:
                    return True
    
    return False


def normalize_phone(phone: str) -> str:
    """
    Normalize phone number for comparison.
    Removes spaces, dashes, dots, parentheses and leading country codes.
    """
    if not phone:
        return ''
    
    # Remove common separators
    phone = re.sub(r'[\s\-\.\(\)]+', '', phone)
    
    # Remove leading + and country code (30 for Greece)
    if phone.startswith('+30'):
        phone = phone[3:]
    elif phone.startswith('0030'):
        phone = phone[4:]
    elif phone.startswith('30') and len(phone) > 10:
        phone = phone[2:]
    
    # Remove leading zero if present (Greek mobile numbers)
    if phone.startswith('0') and len(phone) == 11:
        phone = phone[1:]
    
    return phone


def verify_by_phone(building_id: int, phone: str) -> dict:
    """
    Verify a person by their phone number.
    Searches all apartments in the building for matching owner_phone or tenant_phone.
    Now returns ALL matching apartments (for owners with multiple properties).
    
    Returns:
        dict with keys:
        - 'verified': bool - True if phone matches owner or tenant
        - 'apartment': Apartment object or None (primary/first match)
        - 'apartments': list of dicts with all matching apartments
        - 'match_type': 'owner' | 'tenant' | None (for primary)
        - 'owner_name': str - Name of the matched owner/tenant (for primary)
        - 'error': str or None
    """
    if not phone:
        return {
            'verified': False,
            'apartment': None,
            'apartments': [],
            'match_type': None,
            'owner_name': None,
            'error': 'Το τηλέφωνο είναι υποχρεωτικό'
        }
    
    normalized_input = normalize_phone(phone)
    
    if len(normalized_input) < 10:
        return {
            'verified': False,
            'apartment': None,
            'apartments': [],
            'match_type': None,
            'owner_name': None,
            'error': 'Παρακαλώ εισάγετε έγκυρο αριθμό τηλεφώνου (10 ψηφία)'
        }
    
    try:
        # Get all apartments for this building
        apartments = Apartment.objects.filter(building_id=building_id)
        
        # Collect ALL matching apartments
        matches = []
        
        for apartment in apartments:
            # Check owner phone
            if apartment.owner_phone:
                normalized_owner = normalize_phone(apartment.owner_phone)
                if normalized_owner == normalized_input:
                    matches.append({
                        'apartment': apartment,
                        'match_type': 'owner',
                        'name': apartment.owner_name or ''
                    })
                    continue  # Don't check tenant if owner matches
            
            # Check tenant phone (if rented)
            if apartment.is_rented and apartment.tenant_phone:
                normalized_tenant = normalize_phone(apartment.tenant_phone)
                if normalized_tenant == normalized_input:
                    matches.append({
                        'apartment': apartment,
                        'match_type': 'tenant',
                        'name': apartment.tenant_name or ''
                    })
        
        if matches:
            # Return first match as primary, but include all matches
            primary = matches[0]
            apartment_numbers = ', '.join([m['apartment'].number for m in matches])
            kiosk_logger.info(f"Phone {phone} matched {len(matches)} apartment(s): {apartment_numbers}")
            
            return {
                'verified': True,
                'apartment': primary['apartment'],
                'apartments': matches,  # All matching apartments
                'match_type': primary['match_type'],
                'owner_name': primary['name'],
                'error': None
            }
        
        # Phone not found
        return {
            'verified': False,
            'apartment': None,
            'apartments': [],
            'match_type': None,
            'owner_name': None,
            'error': 'Το τηλέφωνο δεν βρέθηκε στα καταχωρημένα στοιχεία του κτιρίου. Παρακαλώ επικοινωνήστε με τη διαχείριση.'
        }
        
    except Exception as e:
        kiosk_logger.error(f"Error verifying by phone: {e}")
        return {
            'verified': False,
            'apartment': None,
            'apartments': [],
            'match_type': None,
            'owner_name': None,
            'error': 'Σφάλμα κατά τον έλεγχο του τηλεφώνου'
        }


def verify_apartment_resident(building_id: int, apartment_number: str, full_name: str) -> dict:
    """
    Verify if a person is the owner or tenant of an apartment.
    (Legacy function - kept for backwards compatibility)
    
    Returns:
        dict with keys:
        - 'verified': bool - True if name matches owner or tenant
        - 'apartment': Apartment object or None
        - 'match_type': 'owner' | 'tenant' | None
        - 'error': str or None
    """
    try:
        apartment = Apartment.objects.filter(
            building_id=building_id,
            number__iexact=apartment_number.strip()
        ).first()
        
        if not apartment:
            # Try with normalized number (remove spaces, convert to uppercase)
            normalized_number = apartment_number.strip().upper().replace(' ', '')
            apartment = Apartment.objects.filter(
                building_id=building_id
            ).extra(
                where=["UPPER(REPLACE(number, ' ', '')) = %s"],
                params=[normalized_number]
            ).first()
        
        if not apartment:
            return {
                'verified': False,
                'apartment': None,
                'match_type': None,
                'error': f'Το διαμέρισμα "{apartment_number}" δεν βρέθηκε στο κτίριο'
            }
        
        # Check owner name
        if apartment.owner_name and names_match(full_name, apartment.owner_name):
            return {
                'verified': True,
                'apartment': apartment,
                'match_type': 'owner',
                'error': None
            }
        
        # Check tenant name (if rented)
        if apartment.is_rented and apartment.tenant_name and names_match(full_name, apartment.tenant_name):
            return {
                'verified': True,
                'apartment': apartment,
                'match_type': 'tenant',
                'error': None
            }
        
        # Name doesn't match - provide helpful message
        registered_names = []
        if apartment.owner_name:
            registered_names.append(f"Ιδιοκτήτης: {apartment.owner_name}")
        if apartment.is_rented and apartment.tenant_name:
            registered_names.append(f"Ένοικος: {apartment.tenant_name}")
        
        return {
            'verified': False,
            'apartment': apartment,
            'match_type': None,
            'error': f'Το όνομα "{full_name}" δεν ταιριάζει με τα καταχωρημένα στοιχεία του διαμερίσματος {apartment_number}'
        }
        
    except Exception as e:
        kiosk_logger.error(f"Error verifying apartment resident: {e}")
        return {
            'verified': False,
            'apartment': None,
            'match_type': None,
            'error': 'Σφάλμα κατά τον έλεγχο του διαμερίσματος'
        }


def validate_kiosk_token(building_id: str, token: str) -> bool:
    """
    Validate the kiosk token.
    The token is a base64 encoded string containing building_id and timestamp.
    For security, we only verify that the building_id matches.
    """
    try:
        # Decode the token
        decoded = base64.b64decode(token).decode('utf-8')
        # Token format: "building_id-timestamp"
        parts = decoded.split('-')
        if len(parts) >= 1:
            token_building_id = parts[0]
            return str(building_id) == token_building_id
    except Exception as e:
        kiosk_logger.warning(f"Invalid kiosk token: {e}")
    return False


@api_view(['POST'])
@permission_classes([AllowAny])
def kiosk_register(request):
    """
    Kiosk resident self-registration endpoint.
    
    Allows a resident to register themselves by scanning the QR code
    displayed on the building's kiosk. The registration is auto-approved
    when the provided phone matches the registered owner or tenant phone.
    
    Flow:
    1. User scans QR code on kiosk
    2. User enters: email + phone number
    3. Backend verifies phone against building's owner/tenant phones
    4. If match → auto-approved invitation is created
    5. User receives email with registration link
    6. User completes registration (sets password)
    7. User is automatically linked to their apartment
    """
    email = request.data.get('email', '').strip().lower()
    building_id = request.data.get('building_id')
    token = request.data.get('token', '')
    phone = request.data.get('phone', '').strip()
    
    # Validation
    if not email:
        return Response(
            {'error': 'Το email είναι υποχρεωτικό'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not building_id:
        return Response(
            {'error': 'Μη έγκυρο αίτημα - λείπει το building_id'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not phone:
        return Response(
            {'error': 'Το τηλέφωνο είναι υποχρεωτικό'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate the kiosk token
    if not validate_kiosk_token(building_id, token):
        return Response(
            {'error': 'Μη έγκυρο token. Παρακαλώ σαρώστε ξανά το QR code.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if building exists
    try:
        building = Building.objects.get(id=building_id)
    except Building.DoesNotExist:
        return Response(
            {'error': 'Το κτίριο δεν βρέθηκε'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Verify phone number against building apartments
    verification = verify_by_phone(building_id, phone)
    
    if not verification['verified']:
        kiosk_logger.warning(f"Phone verification failed for {email}: {verification['error']}")
        return Response(
            {'error': verification['error']},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get all matching apartments (owner might have multiple properties)
    all_matches = verification.get('apartments', [])
    apartment = verification['apartment']  # Primary apartment
    match_type = verification['match_type']  # 'owner' or 'tenant'
    owner_name = verification['owner_name']  # Name from matched record
    
    # Log all matched apartments
    if len(all_matches) > 1:
        apt_numbers = ', '.join([m['apartment'].number for m in all_matches])
        kiosk_logger.info(f"Phone verified: {email} owns/rents {len(all_matches)} apartments: {apt_numbers}")
    else:
        kiosk_logger.info(f"Phone verified: {email} is {match_type} of apartment {apartment.number}")
    
    # Auto-register email for ALL matching apartments
    # Phone is the "truth evidence" - if it matches, we trust the user
    email_updated = False
    for match in all_matches:
        apt = match['apartment']
        apt_match_type = match['match_type']
        
        if apt_match_type == 'owner':
            if not apt.owner_email:
                apt.owner_email = email
                apt.save(update_fields=['owner_email'])
                email_updated = True
                kiosk_logger.info(f"Auto-registered owner email {email} for apartment {apt.number}")
            elif apt.owner_email.lower() != email.lower():
                old_email = apt.owner_email
                apt.owner_email = email
                apt.save(update_fields=['owner_email'])
                email_updated = True
                kiosk_logger.info(f"Updated owner email from {old_email} to {email} for apartment {apt.number}")
        elif apt_match_type == 'tenant':
            if not apt.tenant_email:
                apt.tenant_email = email
                apt.save(update_fields=['tenant_email'])
                email_updated = True
                kiosk_logger.info(f"Auto-registered tenant email {email} for apartment {apt.number}")
            elif apt.tenant_email.lower() != email.lower():
                old_email = apt.tenant_email
                apt.tenant_email = email
                apt.save(update_fields=['tenant_email'])
                email_updated = True
                kiosk_logger.info(f"Updated tenant email from {old_email} to {email} for apartment {apt.number}")
    
    # Check if there are already registered users for this apartment (Option C)
    from buildings.models import BuildingMembership
    existing_apartment_users = BuildingMembership.objects.filter(
        building_id=building_id,
        apartment=apartment.number
    ).select_related('resident')
    
    has_existing_apartment_users = existing_apartment_users.exists()
    if has_existing_apartment_users:
        kiosk_logger.info(f"Apartment {apartment.number} already has {existing_apartment_users.count()} registered user(s)")
    
    # Check if user already exists
    existing_user = CustomUser.objects.filter(email=email).first()
    if existing_user:
        # User exists - ensure they have access to this building and ALL their apartments
        kiosk_logger.info(f"User {email} already exists, ensuring building access for {len(all_matches)} apartment(s)")
        
        try:
            from django_tenants.utils import schema_context
            from buildings.models import BuildingMembership
            
            # Get tenant from current connection or user
            tenant = None
            if hasattr(existing_user, 'tenant') and existing_user.tenant:
                tenant = existing_user.tenant
            elif hasattr(connection, 'tenant') and connection.tenant:
                tenant = connection.tenant
            
            if tenant:
                with schema_context(tenant.schema_name):
                    # Check/Create BuildingMembership
                    membership, created = BuildingMembership.objects.get_or_create(
                        resident=existing_user,
                        building=building,
                        defaults={'role': 'resident'}
                    )
                    if created:
                        kiosk_logger.info(f"Created BuildingMembership for {email} in building {building.name}")
                    
                    # Link user to ALL matching apartments
                    linked_apartments = []
                    for match in all_matches:
                        apt = match['apartment']
                        apt_match_type = match['match_type']
                        
                        if apt_match_type == 'owner':
                            if apt.owner_user != existing_user:
                                apt.owner_user = existing_user
                                apt.save(update_fields=['owner_user'])
                                kiosk_logger.info(f"Linked {email} as owner_user of apartment {apt.number}")
                            linked_apartments.append(apt.number)
                        elif apt_match_type == 'tenant':
                            if apt.tenant_user != existing_user:
                                apt.tenant_user = existing_user
                                apt.is_rented = True
                                apt.save(update_fields=['tenant_user', 'is_rented'])
                                kiosk_logger.info(f"Linked {email} as tenant_user of apartment {apt.number}")
                            linked_apartments.append(apt.number)
            else:
                kiosk_logger.warning(f"No tenant found for user {email}, skipping building/apartment linking")
                linked_apartments = [apartment.number]
            
            # Send magic login email with direct link to my-apartment
            EmailService.send_magic_login_email(existing_user, building, apartment)
            
            # Build response message based on number of apartments
            if len(all_matches) > 1:
                apt_list = ', '.join([m['apartment'].number for m in all_matches])
                message = f'Έχετε ήδη λογαριασμό! Συνδεθήκατε με {len(all_matches)} διαμερίσματα ({apt_list}). Ελέγξτε το email σας.'
            else:
                message = 'Έχετε ήδη λογαριασμό! Ελέγξτε το email σας για να μεταβείτε απευθείας στο διαμέρισμά σας.'
            
            return Response({
                'message': message,
                'status': 'existing_user',
                'apartment': apartment.number,
                'apartments': [m['apartment'].number for m in all_matches]
            })
        except Exception as e:
            kiosk_logger.error(f"Error processing existing user: {e}")
            return Response({
                'message': 'Έχετε ήδη λογαριασμό. Χρησιμοποιήστε την επιλογή "Ξέχασα τον κωδικό μου" για να συνδεθείτε.',
                'status': 'existing_user'
            })
    
    # Check for pending invitation
    pending_invitation = UserInvitation.objects.filter(
        email=email,
        building_id=building_id,
        status=UserInvitation.InvitationStatus.PENDING
    ).first()
    
    if pending_invitation:
        # Update apartment_id if not set
        if not pending_invitation.apartment_id:
            pending_invitation.apartment_id = apartment.id
            pending_invitation.save(update_fields=['apartment_id'])
        
        # Resend the invitation email
        kiosk_logger.info(f"Pending invitation exists for {email}, resending")
        try:
            EmailService.send_kiosk_registration_email(pending_invitation, building, apartment)
            return Response({
                'message': 'Έχετε ήδη αίτημα εγγραφής. Ελέγξτε το email σας για να ολοκληρώσετε την εγγραφή.',
                'status': 'resent'
            })
        except Exception as e:
            kiosk_logger.error(f"Error resending invitation: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την αποστολή email. Παρακαλώ δοκιμάστε ξανά.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Get building manager as the "invited_by" user
    # Fall back to any staff/superuser if no manager exists
    invited_by = None
    
    # Try to get the building's internal manager first
    if hasattr(building, 'internal_manager') and building.internal_manager:
        invited_by = building.internal_manager
    
    # If no internal manager, try to get the first staff user
    if not invited_by:
        invited_by = CustomUser.objects.filter(
            is_staff=True, 
            is_active=True
        ).first()
    
    # If still no user, create as system user (for kiosk registrations)
    if not invited_by:
        invited_by = CustomUser.objects.filter(
            is_superuser=True, 
            is_active=True
        ).first()
    
    if not invited_by:
        kiosk_logger.error("No staff/superuser found for kiosk registration")
        return Response(
            {'error': 'Σφάλμα ρύθμισης συστήματος. Παρακαλώ επικοινωνήστε με τη διαχείριση.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Parse owner_name into first_name and last_name
    name_parts = owner_name.split() if owner_name else []
    first_name = name_parts[0] if name_parts else ''
    last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
    
    # Create auto-approved invitation (verified by apartment matching)
    try:
        invitation = UserInvitation.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            invitation_type=UserInvitation.InvitationType.KIOSK_REGISTRATION,
            building_id=building_id,
            apartment_id=apartment.id,  # Link to verified apartment
            assigned_role='resident',
            source=UserInvitation.InvitationSource.KIOSK,
            auto_approved=True,
            invited_by=invited_by,
            expires_at=timezone.now() + timezone.timedelta(days=7)
        )
        
        kiosk_logger.info(f"Created kiosk registration invitation for {email} ({match_type}) in apt {apartment.number}")
        
        # Send registration email
        try:
            EmailService.send_kiosk_registration_email(invitation, building, apartment)
        except Exception as e:
            kiosk_logger.error(f"Error sending kiosk registration email: {e}")
            # Delete the invitation if email fails
            invitation.delete()
            return Response(
                {'error': 'Σφάλμα κατά την αποστολή email. Παρακαλώ δοκιμάστε ξανά.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Notify admin if apartment already has registered users (Option C)
        if has_existing_apartment_users:
            existing_names = [m.resident.get_full_name() or m.resident.email for m in existing_apartment_users]
            kiosk_logger.info(f"Notifying admin about new registration for apartment {apartment.number} with existing users: {existing_names}")
            try:
                EmailService.send_new_apartment_user_notification(
                    invitation=invitation,
                    building=building,
                    apartment=apartment,
                    existing_users=list(existing_apartment_users),
                    manager=invited_by
                )
            except Exception as e:
                kiosk_logger.error(f"Error sending admin notification: {e}")
                # Don't fail the registration, just log the error
        
        # Build response message based on number of apartments
        all_apt_numbers = [m['apartment'].number for m in all_matches]
        if len(all_matches) > 1:
            apt_list = ', '.join(all_apt_numbers)
            message = f'Επιτυχία! Βρέθηκαν {len(all_matches)} διαμερίσματα ({apt_list}) με το τηλέφωνό σας. Ελέγξτε το email σας για να ολοκληρώσετε την εγγραφή.'
        else:
            message = f'Επιτυχία! Βρέθηκε το τηλέφωνό σας στο διαμέρισμα {apartment.number}. Ελέγξτε το email σας για να ολοκληρώσετε την εγγραφή.'
        
        return Response({
            'message': message,
            'status': 'created',
            'apartment': apartment.number,
            'apartments': all_apt_numbers,
            'match_type': match_type
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        kiosk_logger.error(f"Error creating kiosk registration: {e}")
        return Response(
            {'error': 'Σφάλμα κατά τη δημιουργία εγγραφής. Παρακαλώ δοκιμάστε ξανά.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    @action(detail=False, methods=['get'])
    def check_scenes_exist(self, request):
        """Check if scenes exist for a building"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'building_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            building = Building.objects.get(id=building_id)
            scenes_count = KioskScene.objects.filter(building=building).count()
            
            return Response({
                'buildingId': building.id,
                'buildingName': building.name,
                'scenesExist': scenes_count > 0,
                'scenesCount': scenes_count
            })
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )


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
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'scenes': serializer.data,
            'count': queryset.count(),
            'timestamp': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def check_scenes_exist(self, request):
        """Check if scenes exist for a building"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'building_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            building = Building.objects.get(id=building_id)
            scenes_count = KioskScene.objects.filter(building=building).count()
            
            return Response({
                'buildingId': building.id,
                'buildingName': building.name,
                'scenesExist': scenes_count > 0,
                'scenesCount': scenes_count
            })
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def create_default_scene(self, request):
        """Create default morning overview scene"""
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
        
        # Check if scenes already exist
        existing_scenes = KioskScene.objects.filter(building=building).count()
        if existing_scenes > 0:
            return Response(
                {'error': 'Scenes already exist for this building'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the default "Πρωινή Επισκόπηση" scene
        scene = KioskScene.objects.create(
            building=building,
            name='Πρωινή Επισκόπηση',
            order=0,
            duration_seconds=30,
            transition='fade',
            is_enabled=True,
            created_by=None  # Public endpoint - no authenticated user
        )
        
        # Create a default widget for the scene if none exist
        default_widget = None
        try:
            # Try to find the Dashboard Overview widget first
            default_widget = KioskWidget.objects.filter(
                building=building,
                widget_id='dashboard_overview'
            ).first()
            
            if not default_widget:
                # Try to find any enabled main_slides widget
                default_widget = KioskWidget.objects.filter(
                    building=building,
                    enabled=True,
                    category='main_slides'
                ).first()
            
            if not default_widget:
                # Create a default morning overview widget
                default_widget = KioskWidget.objects.create(
                    widget_id='dashboard_overview',
                    name='Dashboard Overview',
                    greek_name='Επισκόπηση Κτιρίου',
                    description='Building overview with key statistics',
                    greek_description='Επισκόπηση κτιρίου με βασικά στατιστικά',
                    category='main_slides',
                    icon='Home',
                    enabled=True,
                    order=1,
                    settings={'title': 'Επισκόπηση Κτιρίου', 'showTitle': True},
                    component='DashboardOverview',
                    data_source='/api/public-info',
                    is_custom=False,
                    building=building,
                    created_by=None  # Public endpoint - no authenticated user
                )
            
            # Create placement for the widget (full screen)
            WidgetPlacement.objects.create(
                scene=scene,
                widget=default_widget,
                grid_row_start=1,
                grid_col_start=1,
                grid_row_end=9,  # Full height
                grid_col_end=13,  # Full width
                z_index=0
            )
            
        except Exception:
            # If widget creation fails, still create the scene
            pass
        
        serializer = KioskSceneSerializer(scene)
        return Response({
            'scene': serializer.data,
            'message': 'Default scene created successfully'
        }, status=status.HTTP_201_CREATED)

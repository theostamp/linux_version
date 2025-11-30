from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models

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
import logging
import base64

kiosk_logger = logging.getLogger(__name__)


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
    since physical presence at the kiosk implies legitimate access.
    
    Flow:
    1. User scans QR code on kiosk
    2. User enters their email on the kiosk connect page
    3. This endpoint creates an auto-approved invitation
    4. User receives email with registration link
    5. User completes registration (sets password)
    6. User is automatically added as resident to the building
    """
    email = request.data.get('email', '').strip().lower()
    building_id = request.data.get('building_id')
    token = request.data.get('token', '')
    
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
    
    # Check if user already exists
    existing_user = CustomUser.objects.filter(email=email).first()
    if existing_user:
        # User exists - send login link instead
        kiosk_logger.info(f"User {email} already exists, sending login link")
        try:
            # Send login reminder email
            EmailService.send_login_reminder_email(existing_user, building)
            return Response({
                'message': 'Έχετε ήδη λογαριασμό! Ελέγξτε το email σας για οδηγίες σύνδεσης.',
                'status': 'existing_user'
            })
        except Exception as e:
            kiosk_logger.error(f"Error sending login reminder: {e}")
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
        # Resend the invitation email
        kiosk_logger.info(f"Pending invitation exists for {email}, resending")
        try:
            EmailService.send_kiosk_registration_email(pending_invitation, building)
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
    
    # Create auto-approved invitation
    try:
        invitation = UserInvitation.objects.create(
            email=email,
            first_name='',  # Will be filled during registration
            last_name='',
            invitation_type=UserInvitation.InvitationType.KIOSK_REGISTRATION,
            building_id=building_id,
            assigned_role='resident',
            source=UserInvitation.InvitationSource.KIOSK,
            auto_approved=True,
            invited_by=invited_by,
            expires_at=timezone.now() + timezone.timedelta(days=7)
        )
        
        kiosk_logger.info(f"Created kiosk registration invitation for {email} in building {building.name}")
        
        # Send registration email
        try:
            EmailService.send_kiosk_registration_email(invitation, building)
        except Exception as e:
            kiosk_logger.error(f"Error sending kiosk registration email: {e}")
            # Delete the invitation if email fails
            invitation.delete()
            return Response(
                {'error': 'Σφάλμα κατά την αποστολή email. Παρακαλώ δοκιμάστε ξανά.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': 'Επιτυχία! Ελέγξτε το email σας για να ολοκληρώσετε την εγγραφή.',
            'status': 'created'
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

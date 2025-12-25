"""
Assembly Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import (
    Assembly, AgendaItem, AgendaItemAttachment,
    AssemblyAttendee, AssemblyVote, AssemblyMinutesTemplate,
    CommunityPoll, PollOption, PollVote
)
from .serializers import (
    AssemblyListSerializer, AssemblyDetailSerializer, AssemblyCreateSerializer,
    AgendaItemSerializer, AgendaItemCreateSerializer,
    AssemblyAttendeeSerializer, AssemblyVoteSerializer,
    AssemblyMinutesTemplateSerializer,
    CheckInSerializer, RSVPSerializer, CastVoteSerializer,
    StartAssemblySerializer, EndAssemblySerializer, AdjournAssemblySerializer,
    EndAgendaItemSerializer, GenerateMinutesSerializer,
    CommunityPollSerializer, PollVoteSerializer
)
from .services import AssemblyMinutesService
from core.permissions import CanCreateAssembly, CanAccessBuilding, IsOfficeManagerOrInternalManager
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import connection
from django.template.loader import render_to_string
from django.http import HttpResponse

import logging
logger = logging.getLogger(__name__)

# Keep Assembly attendees in sync with apartments.
# Assemblies are expected to include one attendee per apartment (1 vote / apartment).
def sync_assembly_attendees_from_apartments(assembly: Assembly) -> int:
    """
    Ensure the assembly has AssemblyAttendee rows for all apartments of its building.
    Returns the number of created attendees (best-effort, idempotent).
    """
    try:
        from apartments.models import Apartment

        existing_apartment_ids = set(
            AssemblyAttendee.objects.filter(assembly=assembly).values_list('apartment_id', flat=True)
        )
        if not existing_apartment_ids:
            existing_apartment_ids = set()

        apartments = Apartment.objects.filter(building=assembly.building).values_list(
            'id',
            'owner_user_id',
            'tenant_user_id',
            'participation_mills',
        )

        attendees_to_create = []
        for apartment_id, owner_user_id, tenant_user_id, participation_mills in apartments:
            if apartment_id in existing_apartment_ids:
                continue
            attendees_to_create.append(
                AssemblyAttendee(
                    assembly=assembly,
                    apartment_id=apartment_id,
                    user_id=owner_user_id or tenant_user_id,
                    mills=participation_mills or 0,
                )
            )

        if attendees_to_create:
            AssemblyAttendee.objects.bulk_create(attendees_to_create, ignore_conflicts=True)

        return len(attendees_to_create)
    except Exception:
        logger.exception("Failed to sync attendees from apartments for assembly %s", getattr(assembly, 'id', None))
        return 0

# Helper για real-time ενημερώσεις
def broadcast_assembly_event(assembly_id, event_type, payload):
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning(f"Channel layer not available for assembly {assembly_id}")
            return
            
        schema_name = getattr(connection, "schema_name", None) or "public"
        async_to_sync(channel_layer.group_send)(
            f'assembly_{schema_name}_{assembly_id}',
            {
                'type': event_type,
                **payload
            }
        )
    except Exception as e:
        logger.error(f"Error broadcasting assembly event: {str(e)}")
        # Δεν θέλουμε να σταματήσουμε τη ροή αν αποτύχει το WebSocket update
        pass


class AssemblyViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση Γενικών Συνελεύσεων
    
    Endpoints:
    - GET /api/assemblies/ - Λίστα συνελεύσεων
    - POST /api/assemblies/ - Δημιουργία συνέλευσης
    - GET /api/assemblies/{id}/ - Λεπτομέρειες συνέλευσης
    - PUT/PATCH /api/assemblies/{id}/ - Ενημέρωση συνέλευσης
    - DELETE /api/assemblies/{id}/ - Διαγραφή συνέλευσης
    
    Actions:
    - POST /api/assemblies/{id}/start/ - Έναρξη συνέλευσης
    - POST /api/assemblies/{id}/end/ - Λήξη συνέλευσης
    - POST /api/assemblies/{id}/adjourn/ - Αναβολή συνέλευσης
    - POST /api/assemblies/{id}/send_invitation/ - Αποστολή πρόσκλησης
    - GET /api/assemblies/{id}/quorum/ - Κατάσταση απαρτίας
    - GET /api/assemblies/{id}/generate_minutes/ - Δημιουργία πρακτικών
    - POST /api/assemblies/{id}/approve_minutes/ - Έγκριση πρακτικών
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'status', 'assembly_type', 'scheduled_date']
    search_fields = ['title', 'description']
    ordering_fields = ['scheduled_date', 'created_at', 'status']
    ordering = ['-scheduled_date']

    def get_permissions(self):
        """
        Εφαρμογή permissions ανά action:
        - Διαχειριστικές ενέργειες: Managers/Internal Managers
        - Προβολή: Όλοι όσοι έχουν πρόσβαση στο κτίριο
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'start', 'end', 'adjourn', 'send_invitation', 'generate_minutes', 'approve_minutes']:
            return [IsAuthenticated(), CanCreateAssembly()]
        return [IsAuthenticated(), CanAccessBuilding()]
    
    def get_queryset(self):
        return Assembly.objects.filter(
            building__id__in=self._get_user_building_ids()
        ).select_related('building', 'created_by').prefetch_related(
            'agenda_items', 'attendees'
        )
    
    def _get_user_building_ids(self):
        """Επιστρέφει τα building IDs που έχει πρόσβαση ο χρήστης"""
        user = self.request.user
        
        # Superuser ή Manager βλέπει όλα τα buildings
        if user.is_superuser or (hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff']):
            from buildings.models import Building
            return Building.objects.values_list('id', flat=True)
        
        # Residents βλέπουν μόνο τα δικά τους buildings
        from buildings.models import BuildingMembership
        return BuildingMembership.objects.filter(
            resident=user
        ).values_list('building_id', flat=True)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AssemblyListSerializer
        elif self.action == 'create':
            return AssemblyCreateSerializer
        return AssemblyDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'], serializer_class=StartAssemblySerializer)
    def start(self, request, pk=None):
        """Έναρξη συνέλευσης"""
        assembly = self.get_object()
        
        if assembly.status not in ['scheduled', 'convened']:
            return Response(
                {'error': 'Η συνέλευση δεν μπορεί να ξεκινήσει από αυτή την κατάσταση'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure attendee roster is up to date before starting (apartments may change after scheduling).
        sync_assembly_attendees_from_apartments(assembly)

        assembly.start_assembly()
        try:
            assembly.check_quorum()
        except Exception:
            logger.exception("Failed to refresh quorum on assembly start")

        try:
            current_item = assembly.agenda_items.filter(status='in_progress').order_by('order').first()
            if not current_item:
                first_item = assembly.agenda_items.order_by('order').first()
                if first_item and first_item.status == 'pending':
                    first_item.start_item()
                    broadcast_assembly_event(assembly.id, 'item_update', {
                        'item_id': str(first_item.id),
                        'item_type': 'agenda_item_started'
                    })
        except Exception:
            logger.exception("Failed to auto-start first agenda item for assembly %s", assembly.id)
        
        # Broadcast real-time update
        broadcast_assembly_event(assembly.id, 'item_update', {
            'item_id': None,
            'item_type': 'assembly_started'
        })
        
        return Response({
            'message': 'Η συνέλευση ξεκίνησε',
            'started_at': assembly.actual_start_time
        })
    
    @action(detail=True, methods=['post'], serializer_class=EndAssemblySerializer)
    def end(self, request, pk=None):
        """Λήξη συνέλευσης"""
        assembly = self.get_object()
        
        if assembly.status != 'in_progress':
            return Response(
                {'error': 'Η συνέλευση δεν είναι σε εξέλιξη'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assembly.end_assembly()
        return Response({
            'message': 'Η συνέλευση ολοκληρώθηκε',
            'ended_at': assembly.actual_end_time
        })
    
    @action(detail=True, methods=['post'], serializer_class=AdjournAssemblySerializer)
    def adjourn(self, request, pk=None):
        """Αναβολή συνέλευσης για συνέχιση"""
        assembly = self.get_object()
        serializer = AdjournAssemblySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        continuation = assembly.adjourn_assembly(
            continuation_date=serializer.validated_data.get('continuation_date')
        )
        
        response_data = {
            'message': 'Η συνέλευση αναβλήθηκε',
            'adjourned_at': assembly.actual_end_time
        }
        
        if continuation:
            response_data['continuation_assembly'] = {
                'id': str(continuation.id),
                'title': continuation.title,
                'scheduled_date': continuation.scheduled_date
            }
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def quorum(self, request, pk=None):
        """Κατάσταση απαρτίας"""
        assembly = self.get_object()
        assembly.check_quorum()
        
        return Response({
            'total_building_mills': assembly.total_building_mills,
            'required_quorum_mills': assembly.required_quorum_mills,
            'required_quorum_percentage': float(assembly.required_quorum_percentage),
            'achieved_quorum_mills': assembly.achieved_quorum_mills,
            'quorum_percentage': float(assembly.quorum_percentage),
            'quorum_achieved': assembly.quorum_achieved,
            'quorum_achieved_at': assembly.quorum_achieved_at,
            'quorum_status': assembly.quorum_status,
            'present_attendees': assembly.attendees.filter(is_present=True).count()
        })
    
    @action(detail=True, methods=['post'])
    def send_invitation(self, request, pk=None):
        """Αποστολή πρόσκλησης/ανακοίνωσης"""
        assembly = self.get_object()
        
        if assembly.invitation_sent:
            return Response(
                {'warning': 'Η πρόσκληση έχει ήδη σταλεί'},
                status=status.HTTP_200_OK
            )
        
        # TODO: Create announcement and send notifications
        # This will be implemented with the announcement integration
        
        assembly.invitation_sent = True
        assembly.invitation_sent_at = timezone.now()
        assembly.status = 'convened'
        assembly.save(update_fields=['invitation_sent', 'invitation_sent_at', 'status'])
        
        return Response({
            'message': 'Η πρόσκληση στάλθηκε',
            'sent_at': assembly.invitation_sent_at
        })
    
    @action(detail=True, methods=['get', 'post'], serializer_class=GenerateMinutesSerializer)
    def generate_minutes(self, request, pk=None):
        """Δημιουργία πρακτικών"""
        assembly = self.get_object()
        
        if request.method == 'GET':
            # Return saved minutes if they exist, otherwise generate a draft.
            # Optional: force_generate=1 to always regenerate.
            force_generate = str(request.query_params.get('force_generate', '')).lower() in ('1', 'true', 'yes')
            if not force_generate and assembly.minutes_text and assembly.minutes_text.strip():
                return Response({
                    'minutes_text': assembly.minutes_text,
                    'approved': assembly.minutes_approved
                })

            minutes_service = AssemblyMinutesService(assembly)
            minutes_text = minutes_service.generate()
            return Response({
                'minutes_text': minutes_text,
                'approved': assembly.minutes_approved
            })
        
        # POST - Generate and save
        serializer = GenerateMinutesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template_id = serializer.validated_data.get('template_id')
        template = None
        if template_id:
            template = get_object_or_404(AssemblyMinutesTemplate, id=template_id)
        
        minutes_service = AssemblyMinutesService(
            assembly,
            template=template,
            secretary_name=serializer.validated_data.get('secretary_name'),
            chairman_name=serializer.validated_data.get('chairman_name')
        )
        minutes_text = minutes_service.generate()
        
        assembly.minutes_text = minutes_text
        assembly.save(update_fields=['minutes_text'])
        
        return Response({
            'message': 'Τα πρακτικά δημιουργήθηκαν',
            'minutes_text': minutes_text
        })
    
    @action(detail=True, methods=['post'])
    def approve_minutes(self, request, pk=None):
        """Έγκριση πρακτικών"""
        assembly = self.get_object()
        
        if not assembly.minutes_text:
            return Response(
                {'error': 'Δεν υπάρχουν πρακτικά για έγκριση'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assembly.minutes_approved = True
        assembly.minutes_approved_at = timezone.now()
        assembly.minutes_approved_by = request.user
        assembly.save(update_fields=['minutes_approved', 'minutes_approved_at', 'minutes_approved_by'])
        
        return Response({
            'message': 'Τα πρακτικά εγκρίθηκαν',
            'approved_at': assembly.minutes_approved_at
        })
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Λήψη πρακτικών σε μορφή PDF"""
        assembly = self.get_object()
        
        try:
            # Prefer saved minutes_text so edits are reflected in the exported PDF.
            saved_text = (assembly.minutes_text or '').strip()
            if saved_text:
                pdf_bytes = AssemblyMinutesService.render_markdown_to_pdf(saved_text)
            else:
                service = AssemblyMinutesService(assembly)
                pdf_bytes = service.generate_pdf()
            
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"praktika_{assembly.scheduled_date}_{assembly.id}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Σφάλμα κατά τη δημιουργία PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download_working_sheet(self, request, pk=None):
        """Λήψη φύλλου εργασίας (working sheet) σε μορφή PDF"""
        assembly = self.get_object()
        
        try:
            service = AssemblyMinutesService(assembly)
            pdf_bytes = service.generate_working_sheet_pdf()
            
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = f"working_sheet_{assembly.scheduled_date}_{assembly.id}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            logger.error(f"Error generating working sheet PDF: {str(e)}")
            return Response(
                {'error': f'Σφάλμα κατά τη δημιουργία PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def live_status(self, request, pk=None):
        """Live status για real-time updates κατά τη διάρκεια της συνέλευσης"""
        assembly = self.get_object()
        
        current_item = assembly.agenda_items.filter(status='in_progress').first()
        
        return Response({
            'status': assembly.status,
            'quorum_achieved': assembly.quorum_achieved,
            'quorum_percentage': float(assembly.quorum_percentage),
            'present_count': assembly.attendees.filter(is_present=True).count(),
            'current_agenda_item': AgendaItemSerializer(current_item).data if current_item else None,
            'completed_items': assembly.agenda_items.filter(status='completed').count(),
            'total_items': assembly.agenda_items.count(),
            'elapsed_time': (timezone.now() - assembly.actual_start_time).total_seconds() / 60 if assembly.actual_start_time else 0
        })


class AgendaItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση θεμάτων ημερήσιας διάταξης
    
    Actions:
    - POST /api/agenda-items/{id}/start/ - Έναρξη θέματος
    - POST /api/agenda-items/{id}/end/ - Ολοκλήρωση θέματος
    - POST /api/agenda-items/{id}/defer/ - Αναβολή θέματος
    - GET /api/agenda-items/{id}/vote_results/ - Αποτελέσματα ψηφοφορίας
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['assembly', 'item_type', 'status']
    search_fields = ['title', 'description']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'start', 'end', 'defer']:
            return [IsAuthenticated(), CanCreateAssembly()]
        return [IsAuthenticated(), CanAccessBuilding()]
    
    def get_queryset(self):
        return AgendaItem.objects.filter(
            assembly__building__id__in=self._get_user_building_ids()
        ).select_related('assembly', 'presenter', 'linked_project')
    
    def _get_user_building_ids(self):
        user = self.request.user
        if user.is_superuser or (hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff']):
            from buildings.models import Building
            return Building.objects.values_list('id', flat=True)
        from buildings.models import BuildingMembership
        return BuildingMembership.objects.filter(
            resident=user
        ).values_list('building_id', flat=True)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AgendaItemCreateSerializer
        return AgendaItemSerializer
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Έναρξη συζήτησης θέματος"""
        item = self.get_object()
        
        if item.status != 'pending':
            return Response(
                {'error': 'Το θέμα δεν μπορεί να ξεκινήσει'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ολοκλήρωσε το προηγούμενο θέμα αν υπάρχει
        current = item.assembly.agenda_items.filter(status='in_progress').first()
        if current:
            current.end_item()
        
        item.start_item()
        
        # Broadcast real-time update
        broadcast_assembly_event(item.assembly.id, 'item_update', {
            'item_id': str(item.id),
            'item_type': item.item_type
        })
        
        return Response({
            'message': f'Ξεκίνησε το θέμα: {item.title}',
            'started_at': item.started_at
        })
    
    @action(detail=True, methods=['post'], serializer_class=EndAgendaItemSerializer)
    def end(self, request, pk=None):
        """Ολοκλήρωση θέματος"""
        item = self.get_object()
        serializer = EndAgendaItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if item.status != 'in_progress':
            return Response(
                {'error': 'Το θέμα δεν είναι σε εξέλιξη'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        item.end_item(
            decision=serializer.validated_data.get('decision'),
            decision_type=serializer.validated_data.get('decision_type')
        )
        
        # Στείλε ειδοποίηση απόφασης αν υπάρχει κείμενο απόφασης
        if item.decision:
            try:
                from .tasks import send_agenda_item_decision_notification
                schema_name = getattr(connection, "schema_name", "public")
                send_agenda_item_decision_notification.delay(str(item.id), schema_name)
            except Exception as e:
                logger.error(f"Failed to trigger decision notification: {e}")

        return Response({
            'message': f'Ολοκληρώθηκε το θέμα: {item.title}',
            'ended_at': item.ended_at,
            'actual_duration': item.actual_duration
        })
    
    @action(detail=True, methods=['post'])
    def defer(self, request, pk=None):
        """Αναβολή θέματος"""
        item = self.get_object()
        reason = request.data.get('reason', '')
        
        item.defer_item(reason)
        return Response({
            'message': f'Το θέμα αναβλήθηκε: {item.title}'
        })
    
    @action(detail=True, methods=['get'])
    def vote_results(self, request, pk=None):
        """Λεπτομερή αποτελέσματα ψηφοφορίας"""
        item = self.get_object()
        
        if not item.is_voting_item:
            return Response(
                {'error': 'Αυτό το θέμα δεν είναι ψηφοφορία'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure votes cast via the linked Votes module are reflected here too.
        try:
            if getattr(item, 'linked_vote_id', None):
                from .services import VoteIntegrationService

                VoteIntegrationService(item).sync_vote_results()
        except Exception:
            logger.exception("Failed to sync VoteSubmission -> AssemblyVote for agenda item %s", item.id)

        votes = item.assembly_votes.all().select_related('attendee', 'attendee__apartment')
        
        # Group by vote type
        approve_votes = [v for v in votes if v.vote == 'approve']
        reject_votes = [v for v in votes if v.vote == 'reject']
        abstain_votes = [v for v in votes if v.vote == 'abstain']
        
        return Response({
            'agenda_item': {
                'id': str(item.id),
                'title': item.title,
                'voting_type': item.voting_type
            },
            'summary': {
                'approve': {
                    'count': len(approve_votes),
                    'mills': sum(v.mills for v in approve_votes)
                },
                'reject': {
                    'count': len(reject_votes),
                    'mills': sum(v.mills for v in reject_votes)
                },
                'abstain': {
                    'count': len(abstain_votes),
                    'mills': sum(v.mills for v in abstain_votes)
                },
                'total': {
                    'count': len(votes),
                    'mills': sum(v.mills for v in votes)
                }
            },
            'votes': AssemblyVoteSerializer(votes, many=True).data
        })


class AssemblyAttendeeViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση παρόντων συνέλευσης
    
    Actions:
    - POST /api/assembly-attendees/{id}/check_in/ - Check-in
    - POST /api/assembly-attendees/{id}/check_out/ - Check-out
    - POST /api/assembly-attendees/{id}/rsvp/ - RSVP
    - POST /api/assembly-attendees/{id}/vote/ - Ψηφοφορία
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AssemblyAttendeeSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['assembly', 'is_present', 'rsvp_status', 'attendance_type']
    search_fields = ['attendee_name', 'apartment__number']
    ordering = ['apartment__number']
    
    def get_queryset(self):
        building_ids = self._get_user_building_ids()

        assembly_id = self.request.query_params.get('assembly')
        if assembly_id:
            try:
                assembly = Assembly.objects.select_related('building').get(
                    id=assembly_id,
                    building__id__in=building_ids,
                )
                sync_assembly_attendees_from_apartments(assembly)
            except Assembly.DoesNotExist:
                pass
            except Exception:
                logger.exception("Failed to sync attendees for assembly %s", assembly_id)

        return (
            AssemblyAttendee.objects.filter(assembly__building__id__in=building_ids)
            .select_related('assembly', 'apartment', 'user')
        )
    
    def _get_user_building_ids(self):
        user = self.request.user
        if user.is_superuser or (hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff']):
            from buildings.models import Building
            return Building.objects.values_list('id', flat=True)
        from buildings.models import BuildingMembership
        return BuildingMembership.objects.filter(
            resident=user
        ).values_list('building_id', flat=True)
    
    @action(detail=True, methods=['post'], serializer_class=CheckInSerializer)
    def check_in(self, request, pk=None):
        """Check-in παρόντος"""
        attendee = self.get_object()
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        attendee.check_in(
            attendance_type=serializer.validated_data.get('attendance_type', 'in_person')
        )
        
        return Response({
            'message': f'{attendee.display_name} checked in',
            'checked_in_at': attendee.checked_in_at,
            'assembly_quorum': {
                'achieved_mills': attendee.assembly.achieved_quorum_mills,
                'quorum_achieved': attendee.assembly.quorum_achieved
            }
        })
    
    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        """Check-out παρόντος"""
        attendee = self.get_object()
        attendee.check_out()
        
        return Response({
            'message': f'{attendee.display_name} checked out',
            'checked_out_at': attendee.checked_out_at
        })
    
    @action(detail=True, methods=['post'], serializer_class=RSVPSerializer)
    def rsvp(self, request, pk=None):
        """RSVP απάντηση"""
        attendee = self.get_object()
        serializer = RSVPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        attendee.rsvp(
            status=serializer.validated_data['rsvp_status'],
            notes=serializer.validated_data.get('notes', '')
        )
        
        return Response({
            'message': 'RSVP καταγράφηκε',
            'rsvp_status': attendee.rsvp_status,
            'rsvp_at': attendee.rsvp_at
        })
    
    @action(detail=True, methods=['post'], serializer_class=CastVoteSerializer)
    def vote(self, request, pk=None):
        """
        Ψηφοφορία σε θέμα
        
        Επιτρέπει:
        - Pre-voting (πριν τη συνέλευση)
        - Live voting (κατά τη συνέλευση)
        - Update ψήφου (διαχειριστής μπορεί να αλλάξει ψήφο κατά τη live)
        """
        attendee = self.get_object()
        serializer = CastVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        agenda_item_id = request.data.get('agenda_item_id')
        if not agenda_item_id:
            return Response(
                {'error': 'Απαιτείται agenda_item_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        agenda_item = get_object_or_404(
            AgendaItem,
            id=agenda_item_id,
            assembly=attendee.assembly
        )
        
        if not agenda_item.is_voting_item:
            return Response(
                {'error': 'Αυτό το θέμα δεν είναι ψηφοφορία'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine vote source
        assembly = attendee.assembly
        user = request.user
        is_manager = user.is_superuser or (hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff', 'internal_manager'])
        
        if assembly.status == 'in_progress':
            vote_source = 'live'
        elif assembly.is_pre_voting_active:
            vote_source = 'pre_vote'
        else:
            return Response(
                {'error': 'Η ψηφοφορία δεν είναι ενεργή'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already voted
        existing_vote = AssemblyVote.objects.filter(
            agenda_item=agenda_item,
            attendee=attendee
        ).first()
        
        if existing_vote:
            # Αν η συνέλευση είναι live ΚΑΙ ο χρήστης είναι διαχειριστής, επιτρέπεται η αλλαγή
            if assembly.status == 'in_progress' and is_manager:
                old_vote = existing_vote.vote
                existing_vote.vote = serializer.validated_data['vote']
                existing_vote.vote_source = 'live'  # Override σε live αφού άλλαξε κατά τη συνέλευση
                existing_vote.voted_by = user  # Ποιος έκανε την αλλαγή
                existing_vote.notes = serializer.validated_data.get('notes', '') or f"Αλλαγή από {old_vote} κατά τη συνέλευση"
                existing_vote.save()
                
                logger.info(f"Manager {user.id} changed vote for attendee {attendee.id} from {old_vote} to {existing_vote.vote}")
                
                # Broadcast updated results
                results = agenda_item.get_voting_results()
                broadcast_assembly_event(assembly.id, 'vote_update', {
                    'agenda_item_id': str(agenda_item.id),
                    'results': results
                })
                
                return Response({
                    'message': 'Η ψήφος ενημερώθηκε',
                    'vote': AssemblyVoteSerializer(existing_vote).data,
                    'updated': True,
                    'previous_vote': old_vote
                })
            else:
                return Response(
                    {'error': 'Έχει ήδη καταχωρηθεί ψήφος για αυτό το θέμα'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create new vote
        vote = AssemblyVote.objects.create(
            agenda_item=agenda_item,
            attendee=attendee,
            vote=serializer.validated_data['vote'],
            mills=attendee.mills,
            vote_source=vote_source,
            voted_by=user if is_manager and attendee.user != user else None,
            notes=serializer.validated_data.get('notes', '')
        )
        
        # Update pre-voting status
        if vote_source == 'pre_vote':
            attendee.has_pre_voted = True
            attendee.pre_voted_at = timezone.now()
            attendee.save(update_fields=['has_pre_voted', 'pre_voted_at'])
        
        # Broadcast real-time results if it's a live vote
        if vote_source == 'live':
            results = agenda_item.get_voting_results()
            broadcast_assembly_event(assembly.id, 'vote_update', {
                'agenda_item_id': str(agenda_item.id),
                'results': results
            })
        
        return Response({
            'message': 'Η ψήφος καταγράφηκε',
            'vote': AssemblyVoteSerializer(vote).data,
            'created': True
        })


class AssemblyVoteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet για προβολή ψήφων (read-only)
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AssemblyVoteSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['agenda_item', 'vote', 'vote_source']
    
    def get_queryset(self):
        return AssemblyVote.objects.filter(
            agenda_item__assembly__building__id__in=self._get_user_building_ids()
        ).select_related('agenda_item', 'attendee', 'attendee__apartment')
    
    def _get_user_building_ids(self):
        user = self.request.user
        if user.is_superuser or (hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff']):
            from buildings.models import Building
            return Building.objects.values_list('id', flat=True)
        from buildings.models import BuildingMembership
        return BuildingMembership.objects.filter(
            resident=user
        ).values_list('building_id', flat=True)


class AssemblyMinutesTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση templates πρακτικών
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AssemblyMinutesTemplateSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['building', 'is_default']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        return AssemblyMinutesTemplate.objects.filter(
            building__id__in=self._get_user_building_ids()
        ) | AssemblyMinutesTemplate.objects.filter(building__isnull=True)
    
    def _get_user_building_ids(self):
        user = self.request.user
        if user.is_superuser or (hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff']):
            from buildings.models import Building
            return Building.objects.values_list('id', flat=True)
        from buildings.models import BuildingMembership
        return BuildingMembership.objects.filter(
            resident=user
        ).values_list('building_id', flat=True)


# ============================================================
# Public Endpoints (No Auth Required)
# ============================================================

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from datetime import timedelta


class UpcomingAssemblyView(APIView):
    """
    Public endpoint για το kiosk display.
    Επιστρέφει την επερχόμενη συνέλευση του κτιρίου.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        building_id = request.query_params.get('building_id')
        
        if not building_id:
            return Response(
                {'error': 'building_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            building_id = int(building_id)
        except ValueError:
            return Response(
                {'error': 'Invalid building_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        today = timezone.now().date()
        
        # Debug: Log all assemblies for this building
        all_assemblies = Assembly.objects.filter(building_id=building_id)
        print(f"[UpcomingAssembly] Building {building_id}: Found {all_assemblies.count()} total assemblies")
        for a in all_assemblies:
            print(f"  - ID: {a.id}, Title: {a.title[:30]}, Status: {a.status}, Date: {a.scheduled_date}")
        
        # Get assembly for today or upcoming (within 7 days)
        assembly = Assembly.objects.filter(
            building_id=building_id,
            status__in=['scheduled', 'convened', 'in_progress'],
            scheduled_date__gte=today,
            scheduled_date__lte=today + timedelta(days=7)
        ).select_related('building').prefetch_related(
            'agenda_items',
            'attendees'
        ).order_by('scheduled_date', 'scheduled_time').first()
        
        print(f"[UpcomingAssembly] Today: {today}, Found assembly: {assembly}")
        
        if not assembly:
            return Response({'assembly': None})
        
        # Calculate stats
        attendees = assembly.attendees.all()
        total_invited = attendees.count()
        rsvp_attending = attendees.filter(rsvp_status='attending').count()
        rsvp_not_attending = attendees.filter(rsvp_status='not_attending').count()
        rsvp_pending = attendees.filter(rsvp_status='pending').count()
        pre_voted = attendees.filter(has_pre_voted=True).count()
        
        # Serialize agenda items
        agenda_items = []
        for item in assembly.agenda_items.order_by('order'):
            agenda_items.append({
                'id': str(item.id),
                'order': item.order,
                'title': item.title,
                'item_type': item.item_type,
                'estimated_duration': item.estimated_duration,
            })
        
        response_data = {
            'assembly': {
                'id': str(assembly.id),
                'title': assembly.title,
                'scheduled_date': assembly.scheduled_date.isoformat(),
                'scheduled_time': assembly.scheduled_time.strftime('%H:%M'),
                'location': assembly.location,
                'is_online': assembly.is_online,
                'is_physical': assembly.is_physical,
                'meeting_link': assembly.meeting_link if assembly.is_online else None,
                'status': assembly.status,
                'building_name': assembly.building.name if assembly.building else '',
                'is_pre_voting_active': assembly.is_pre_voting_active,
                'quorum_percentage': assembly.quorum_percentage,
                'agenda_items': agenda_items,
                'stats': {
                    'total_apartments_invited': total_invited,
                    'rsvp_attending': rsvp_attending,
                    'rsvp_not_attending': rsvp_not_attending,
                    'rsvp_pending': rsvp_pending,
                    'pre_voted_count': pre_voted,
                    'pre_voted_percentage': round((pre_voted / total_invited * 100) if total_invited > 0 else 0, 1),
                }
            }
        }
        
        return Response(response_data)


class EmailVoteView(APIView):
    """
    Public endpoint για ψηφοφορία μέσω email link.
    Επαληθεύει το token και επιστρέφει τα στοιχεία ψηφοφορίας.
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        """Επαλήθευση token και επιστροφή στοιχείων ψηφοφορίας"""
        from .email_service import verify_vote_token
        
        result = verify_vote_token(token)
        if not result:
            return Response(
                {'error': 'Μη έγκυρος ή ληγμένος σύνδεσμος ψηφοφορίας'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendee_id, assembly_id = result
        
        try:
            attendee = AssemblyAttendee.objects.select_related(
                'assembly', 'apartment', 'user'
            ).get(id=attendee_id, assembly_id=assembly_id)
        except AssemblyAttendee.DoesNotExist:
            return Response(
                {'error': 'Δεν βρέθηκε η εγγραφή συμμετοχής'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        assembly = attendee.assembly
        
        # Check if pre-voting is active
        if not assembly.is_pre_voting_active and assembly.status != 'in_progress':
            return Response(
                {'error': 'Η ψηφοφορία δεν είναι ενεργή αυτή τη στιγμή'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get voting items
        voting_items = assembly.agenda_items.filter(
            item_type='voting',
            allows_pre_voting=True
        ).order_by('order')
        
        # Get already voted items
        voted_item_ids = set(
            AssemblyVote.objects.filter(
                attendee=attendee
            ).values_list('agenda_item_id', flat=True)
        )
        
        items_data = []
        for item in voting_items:
            items_data.append({
                'id': str(item.id),
                'order': item.order,
                'title': item.title,
                'description': item.description,
                'voting_type': item.voting_type,
                'has_voted': item.id in voted_item_ids,
            })
        
        return Response({
            'valid': True,
            'assembly': {
                'id': str(assembly.id),
                'title': assembly.title,
                'scheduled_date': assembly.scheduled_date.isoformat(),
                'total_building_mills': assembly.total_building_mills,
                'required_quorum_percentage': assembly.required_quorum_percentage,
            },
            'attendee': {
                'id': str(attendee.id),
                'apartment_number': attendee.apartment.number if attendee.apartment else '',
                'mills': attendee.mills,
            },
            'voting_items': items_data,
            'all_voted': len(voted_item_ids) >= len(items_data),
        })
    
    def post(self, request, token):
        """Καταχώρηση ψήφου μέσω email link"""
        from .email_service import verify_vote_token, queue_vote_confirmation
        
        result = verify_vote_token(token)
        if not result:
            return Response(
                {'error': 'Μη έγκυρος ή ληγμένος σύνδεσμος ψηφοφορίας'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendee_id, assembly_id = result
        
        try:
            attendee = AssemblyAttendee.objects.select_related(
                'assembly', 'apartment'
            ).get(id=attendee_id, assembly_id=assembly_id)
        except AssemblyAttendee.DoesNotExist:
            return Response(
                {'error': 'Δεν βρέθηκε η εγγραφή συμμετοχής'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        assembly = attendee.assembly
        
        # Validate request data
        votes_data = request.data.get('votes', [])
        if not votes_data:
            return Response(
                {'error': 'Δεν παρασχέθηκαν ψήφοι'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_votes = []
        
        with transaction.atomic():
            for vote_data in votes_data:
                agenda_item_id = vote_data.get('agenda_item_id')
                vote_choice = vote_data.get('vote')
                
                if not agenda_item_id or not vote_choice:
                    continue
                
                try:
                    agenda_item = AgendaItem.objects.get(
                        id=agenda_item_id,
                        assembly=assembly
                    )
                except AgendaItem.DoesNotExist:
                    continue
                
                # Check if already voted
                if AssemblyVote.objects.filter(
                    attendee=attendee,
                    agenda_item=agenda_item
                ).exists():
                    continue
                
                # Create vote
                vote = AssemblyVote.objects.create(
                    agenda_item=agenda_item,
                    attendee=attendee,
                    vote=vote_choice,
                    mills=attendee.mills,
                    vote_source='pre_vote',
                    notes=f'Ψήφος μέσω email link'
                )
                created_votes.append(vote)
            
            # Mark attendee as pre-voted
            if created_votes:
                attendee.has_pre_voted = True
                attendee.pre_voted_at = timezone.now()
                attendee.save(update_fields=['has_pre_voted', 'pre_voted_at'])
        
        # Queue confirmation email (async via Celery)
        if created_votes:
            queue_vote_confirmation(attendee, created_votes)
        
        return Response({
            'success': True,
            'votes_recorded': len(created_votes),
            'message': f'Καταχωρήθηκαν {len(created_votes)} ψήφοι επιτυχώς'
        })


class CommunityPollViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση δημοσκοπήσεων κοινότητας.
    """
    queryset = CommunityPoll.objects.all().prefetch_related('options', 'votes')
    serializer_class = CommunityPollSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'is_active', 'author']
    search_fields = ['title', 'description']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanCreateAssembly()]
        return [IsAuthenticated(), CanAccessBuilding()]

    def get_queryset(self):
        user = self.request.user
        # Filter by buildings the user has access to
        if hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff']:
            return self.queryset
        
        from buildings.models import BuildingMembership
        accessible_buildings = BuildingMembership.objects.filter(resident=user).values_list('building_id', flat=True)
        return self.queryset.filter(building__id__in=accessible_buildings)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def vote(self, request, pk=None):
        """Ψηφοφορία σε δημοσκόπηση"""
        poll = self.get_object()
        user = request.user
        
        if poll.is_expired:
            return Response({'error': 'Η δημοσκόπηση έχει λήξει'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not poll.is_active:
            return Response({'error': 'Η δημοσκόπηση δεν είναι ενεργή'}, status=status.HTTP_400_BAD_REQUEST)

        option_id = request.data.get('option_id')
        if not option_id:
            return Response({'error': 'Απαιτείται option_id'}, status=status.HTTP_400_BAD_REQUEST)

        option = get_object_or_404(PollOption, id=option_id, poll=poll)

        # Check for multiple choices
        if not poll.allow_multiple_choices:
            if PollVote.objects.filter(poll=poll, user=user).exists():
                return Response({'error': 'Έχετε ήδη ψηφίσει σε αυτή τη δημοσκόπηση'}, status=status.HTTP_400_BAD_REQUEST)

        # Create vote (idempotent για multi-choice ώστε να μην δημιουργούνται διπλοεγγραφές)
        vote, created = PollVote.objects.get_or_create(poll=poll, option=option, user=user)

        return Response(
            PollVoteSerializer(vote).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PollVoteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet για προβολή ψήφων (read-only)
    """
    queryset = PollVote.objects.all().select_related('poll', 'option', 'user')
    serializer_class = PollVoteSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Περιορισμός ψήφων σε polls/buildings που έχει πρόσβαση ο χρήστης (αποφυγή data leak).
        """
        user = self.request.user
        qs = super().get_queryset()

        if hasattr(user, 'role') and user.role in ['admin', 'manager', 'office_staff']:
            return qs

        from buildings.models import BuildingMembership
        accessible_buildings = BuildingMembership.objects.filter(resident=user).values_list('building_id', flat=True)
        return qs.filter(poll__building__id__in=accessible_buildings)

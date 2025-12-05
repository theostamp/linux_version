from rest_framework import viewsets, permissions, status  
from rest_framework.decorators import action  
from rest_framework.response import Response  
from django.utils import timezone
from django.db.models import Q
import logging

from .models import Vote, VoteSubmission
from .serializers import VoteSerializer, VoteSubmissionSerializer, VoteListSerializer
from core.permissions import IsManagerOrSuperuser, IsBuildingAdmin, IsOfficeManagerOrInternalManager
from core.utils import filter_queryset_by_user_and_building

logger = logging.getLogger(__name__)


class VoteViewSet(viewsets.ModelViewSet):
    """
    CRUD για Vote + custom actions:
      - POST   /api/votes/{pk}/vote/           -> υποβολή ψήφου
      - GET    /api/votes/{pk}/my-submission/  -> η ψήφος του τρέχοντα χρήστη
      - GET    /api/votes/{pk}/results/        -> αποτελέσματα
    """
    permission_classes = [permissions.IsAuthenticated, IsBuildingAdmin]
    queryset = Vote.objects.all().order_by('-created_at')
    serializer_class = VoteSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'my_submission', 'results', 'vote']:
            return [permissions.IsAuthenticated()]
        # create, update, destroy: επιτρέπεται σε office managers και internal managers
        return [permissions.IsAuthenticated(), IsOfficeManagerOrInternalManager()]

    def get_queryset(self):
        """
        Φέρνει μόνο τα votes που δικαιούται να δει ο χρήστης (με βάση το κτήριο και τον ρόλο).
        """
        qs = Vote.objects.select_related('creator', 'building').order_by('-created_at')
        
        # Debug logging
        building_param = self.request.query_params.get('building')
        logger.info(f"[VoteViewSet.get_queryset] Building param: {building_param}")
        logger.info(f"[VoteViewSet.get_queryset] User: {self.request.user}, is_superuser: {self.request.user.is_superuser}")
        logger.info(f"[VoteViewSet.get_queryset] Total votes before filtering: {qs.count()}")
        
        try:
            filtered_qs = filter_queryset_by_user_and_building(self.request, qs)
            logger.info(f"[VoteViewSet.get_queryset] Votes after filtering: {filtered_qs.count()}")
            return filtered_qs
        except Exception as e:
            logger.error(f"Error in get_queryset: {e}")
            # Επιστρέφουμε empty queryset για να μην εμφανίζεται 500 στο frontend
            return Vote.objects.none()


    def get_serializer_class(self):
        if self.action == 'list':
            return VoteListSerializer
        elif self.action in ['retrieve', 'results']:
            return VoteSerializer
        elif self.action in ['vote', 'my_submission']:
            return VoteSubmissionSerializer
        return super().get_serializer_class()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_update(self, serializer):
        building = serializer.validated_data.get('building')
        serializer.save(building=building) if building else serializer.save()

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to return custom confirmation message"""
        instance = self.get_object()
        title = instance.title
        is_global = instance.building is None
        
        # Store building info before deletion
        building_name = instance.building.name if instance.building else None
        
        # Perform the actual deletion
        instance.delete()
        logger.info(f"Vote deleted: {title} by {request.user}")
        
        # Return appropriate confirmation message
        if is_global:
            message = f"Η καθολική ψηφοφορία '{title}' διαγράφηκε επιτυχώς από όλα τα κτίρια."
        else:
            message = f"Η ψηφοφορία '{title}' διαγράφηκε επιτυχώς από το κτίριο '{building_name}'."
        
        return Response({"message": message}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='vote')
    def vote(self, request, pk=None):
        vote = self.get_object()
        serializer = VoteSubmissionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(vote=vote, user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='my-submission')
    def my_submission(self, request, pk=None):
        vote = self.get_object()
        try:
            sub = VoteSubmission.objects.get(vote=vote, user=request.user)
            ser = VoteSubmissionSerializer(sub)
            return Response(ser.data)
        except VoteSubmission.DoesNotExist:
            return Response({'choice': None})

    @action(detail=True, methods=['get'], url_path='results')
    def results(self, request, pk=None):
        """Αποτελέσματα ψηφοφορίας με επιπλέον πληροφορίες"""
        try:
            vote = self.get_object()
            results = vote.get_results()
            results['min_participation'] = vote.min_participation
            return Response(results)
        except Exception as e:
            logger.error(f"Error fetching vote results: {e}")
            return Response(
                {"error": "Αποτυχία φόρτωσης αποτελεσμάτων"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """Ενεργές ψηφοφορίες"""
        try:
            today = timezone.now().date()
            qs = self.get_queryset().filter(
                is_active=True
            ).filter(
                Q(start_date__lte=today) | Q(start_date__isnull=True)
            ).filter(
                Q(end_date__gte=today) | Q(end_date__isnull=True)
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching active votes: {e}")
            return Response(
                {"error": "Αποτυχία φόρτωσης ενεργών ψηφοφοριών"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='urgent')
    def urgent(self, request):
        """Επείγουσες ψηφοφορίες"""
        try:
            qs = self.get_queryset().filter(
                is_urgent=True,
                is_active=True
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching urgent votes: {e}")
            return Response(
                {"error": "Αποτυχία φόρτωσης επείγουσων ψηφοφοριών"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        """Ενεργοποίηση ψηφοφορίας"""
        vote = self.get_object()
        vote.is_active = True
        vote.save()
        logger.info(f"Vote activated: {vote.title} by {request.user}")
        return Response({"message": "Η ψηφοφορία ενεργοποιήθηκε επιτυχώς"})

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """Απενεργοποίηση ψηφοφορίας"""
        vote = self.get_object()
        vote.is_active = False
        vote.save()
        logger.info(f"Vote deactivated: {vote.title} by {request.user}")
        return Response({"message": "Η ψηφοφορία απενεργοποιήθηκε επιτυχώς"})

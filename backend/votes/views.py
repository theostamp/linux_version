from rest_framework import viewsets, permissions, status  
from rest_framework.decorators import action  
from rest_framework.response import Response  
from django.utils import timezone
from django.db.models import Q
from django.http import Http404
import logging

from core.mixins import RBACQuerySetMixin
from core.permissions import IsAdmin, IsInternalManager, IsEnikos
from .models import Vote, VoteSubmission
from .serializers import VoteSerializer, VoteSubmissionSerializer, VoteListSerializer
from core.permissions import IsManagerOrSuperuser, IsBuildingAdmin, IsOfficeManagerOrInternalManager
from core.utils import filter_queryset_by_user_and_building

logger = logging.getLogger(__name__)


class VoteViewSet(RBACQuerySetMixin, viewsets.ModelViewSet):
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
        if self.action in ['list', 'retrieve', 'my_submission', 'results', 'vote', 'submit']:
            return [permissions.IsAuthenticated()]
        # create, update, destroy: επιτρέπεται σε office managers και internal managers
        return [permissions.IsAuthenticated(), IsOfficeManagerOrInternalManager()]

    def get_queryset(self):
        """Φιλτράρισμα με βάση τα δικαιώματα χρήστη (RBAC)"""
        queryset = super().get_queryset().select_related('creator', 'building')
        building_id = self.request.query_params.get('building')
        if building_id:
            try:
                queryset = queryset.filter(building_id=int(building_id))
            except (ValueError, TypeError):
                pass
        return queryset

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
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = VoteSubmissionSerializer(
            data=request.data,
            context={'request': request, 'vote': vote}
        )
        serializer.is_valid(raise_exception=True)
        
        # Calculate mills from user's apartment
        mills = 0
        try:
            from apartments.models import Apartment
            # Find apartment where user is owner OR resident (renter)
            # Note: tenant_user = ενοικιαστής διαμερίσματος, ΟΧΙ django-tenants tenant
            apartment = Apartment.objects.filter(
                Q(owner_user=request.user) | Q(tenant_user=request.user),
                building=vote.building
            ).first()
            if apartment:
                mills = apartment.participation_mills or 0
                logger.info(f"User {request.user.id} voting with {mills} mills from apartment {apartment.id}")
        except Exception as e:
            logger.warning(f"Could not get mills for user {request.user.id}: {e}")
        
        serializer.save(vote=vote, user=request.user, mills=mills)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """Alias for vote action - used by frontend"""
        return self.vote(request, pk)

    @action(detail=True, methods=['get'], url_path='my-submission')
    def my_submission(self, request, pk=None):
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            sub = VoteSubmission.objects.get(vote=vote, user=request.user)
            ser = VoteSubmissionSerializer(sub)
            return Response(ser.data)
        except VoteSubmission.DoesNotExist:
            # Important: when there's no submission, return 404 so the frontend can treat it as "not voted"
            return Response(
                {"detail": "No submission found for this user and vote."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=['get'], url_path='results')
    def results(self, request, pk=None):
        """Αποτελέσματα ψηφοφορίας με επιπλέον πληροφορίες"""
        try:
            vote = self.get_object()
            results = vote.get_results()
            results['min_participation'] = vote.min_participation
            return Response(results)
        except Http404:
            # Το vote δεν βρέθηκε στο filtered queryset (πιθανώς δεν έχει πρόσβαση ο χρήστης)
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception:
            logger.exception("Error fetching vote results")
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
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        vote.is_active = True
        vote.save()
        logger.info(f"Vote activated: {vote.title} by {request.user}")
        return Response({"message": "Η ψηφοφορία ενεργοποιήθηκε επιτυχώς"})

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """Απενεργοποίηση ψηφοφορίας"""
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        vote.is_active = False
        vote.save()
        logger.info(f"Vote deactivated: {vote.title} by {request.user}")
        return Response({"message": "Η ψηφοφορία απενεργοποιήθηκε επιτυχώς"})

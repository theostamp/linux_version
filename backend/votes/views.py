from rest_framework import viewsets, permissions, status  
from rest_framework.decorators import action  
from rest_framework.response import Response  
from django.utils import timezone
from django.db.models import Q
from django.http import Http404
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
        if self.action in ['list', 'retrieve', 'my_submission', 'results', 'vote', 'submit']:
            return [permissions.IsAuthenticated()]
        # create, update, destroy: επιτρέπεται σε office managers και internal managers
        return [permissions.IsAuthenticated(), IsOfficeManagerOrInternalManager()]

    def get_queryset(self):
        """
        Φέρνει μόνο τα votes που δικαιούται να δει ο χρήστης (με βάση το κτήριο και τον ρόλο).
        """
        qs = Vote.objects.select_related('creator', 'building').order_by('-created_at')

        # IMPORTANT: Avoid evaluating the queryset here (e.g. qs.count()).
        # Any DB issue/migration mismatch would surface as a 500 *before* filtering,
        # and it also adds unnecessary load on every request.
        try:
            building_param = self.request.query_params.get('building')
            logger.info(f"[VoteViewSet.get_queryset] Building param: {building_param}")
            logger.info(
                "[VoteViewSet.get_queryset] User: %s, is_superuser: %s, is_staff: %s",
                getattr(self.request, "user", None),
                getattr(getattr(self.request, "user", None), "is_superuser", None),
                getattr(getattr(self.request, "user", None), "is_staff", None),
            )

            return filter_queryset_by_user_and_building(self.request, qs)
        except Exception:
            logger.exception("Error in VoteViewSet.get_queryset")
            # Επιστρέφουμε empty queryset για να μην εμφανίζεται 500 στο frontend
            return Vote.objects.none()


    def get_serializer_class(self):
        if self.action == 'list':
            return VoteListSerializer
        elif self.action in ['retrieve', 'results']:
            return VoteSerializer
        elif self.action in ['vote', 'my_submission', 'submit']:
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
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 🔒 IMPORTANT: Check if user is eligible to vote (must own/rent an apartment in the building)
        from apartments.models import Apartment
        apartment = None
        try:
            # Find apartment where user is owner OR resident (renter)
            # Note: tenant_user = ενοικιαστής διαμερίσματος, ΟΧΙ django-tenants tenant
            apartment = Apartment.objects.filter(
                Q(owner_user=request.user) | Q(tenant_user=request.user),
                building=vote.building
            ).first()
        except Exception as e:
            logger.warning(f"Could not check apartment eligibility for user {request.user.id}: {e}")
        
        # If user has no apartment in this building, they cannot vote
        if not apartment:
            logger.warning(f"User {request.user.id} ({request.user.email}) tried to vote without apartment in building {vote.building_id}")
            return Response(
                {"error": "Δεν έχετε δικαίωμα ψήφου σε αυτή την ψηφοφορία. Μόνο ιδιοκτήτες ή ένοικοι διαμερισμάτων μπορούν να ψηφίσουν."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check for existing submission (additional safeguard)
        if VoteSubmission.objects.filter(vote=vote, user=request.user).exists():
            return Response(
                {"error": "Έχετε ήδη ψηφίσει σε αυτή τη ψηφοφορία."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = VoteSubmissionSerializer(
            data=request.data,
            context={'request': request, 'vote': vote}
        )
        serializer.is_valid(raise_exception=True)
        
        # Get mills from apartment
        mills = apartment.participation_mills or 0
        logger.info(f"User {request.user.id} voting with {mills} mills from apartment {apartment.id}")
        
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

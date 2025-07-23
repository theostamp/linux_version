from rest_framework import viewsets, permissions, status, exceptions  
from rest_framework.decorators import action  
from rest_framework.response import Response  
from .models import Vote, VoteSubmission
from .serializers import VoteSerializer, VoteSubmissionSerializer
from buildings.models import Building
from core.permissions import IsManagerOrSuperuser, IsBuildingAdmin
from core.utils import filter_queryset_by_user_and_building


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
        if self.action in ['list', 'retrieve', 'my_submission', 'results']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        """
        Φέρνει μόνο τα votes που δικαιούται να δει ο χρήστης (με βάση το κτήριο και τον ρόλο).
        """
        qs = Vote.objects.all().order_by('-created_at')
        try:
            return filter_queryset_by_user_and_building(self.request, qs)
        except Exception as e:
            print("ERROR in get_queryset:", e)
            import traceback; traceback.print_exc()
            # Επιστρέφουμε empty queryset για να μην εμφανίζεται 500 στο frontend
            return Vote.objects.none()


    def get_serializer_class(self):
        if self.action in ['list', 'retrieve', 'results']:
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
        vote = self.get_object()
        subs = vote.submissions.all()
        yes = subs.filter(choice='ΝΑΙ').count()
        no = subs.filter(choice='ΟΧΙ').count()
        white = subs.filter(choice='ΛΕΥΚΟ').count()
        total = yes + no + white
        return Response({
            'ΝΑΙ': yes,
            'ΟΧΙ': no,
            'ΛΕΥΚΟ': white,
            'total': total
        })

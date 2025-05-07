# backend/votes/views.py

from rest_framework import viewsets, permissions, status, exceptions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Vote, VoteSubmission
from .serializers import VoteSerializer, VoteSubmissionSerializer
from buildings.models import Building
from core.permissions import IsManagerOrSuperuser


class VoteViewSet(viewsets.ModelViewSet):
    """
    CRUD για Vote + custom actions:
      - POST   /api/votes/{pk}/vote/           -> υποβολή ψήφου
      - GET    /api/votes/{pk}/my-submission/  -> η ψήφος του τρέχοντα χρήστη
      - GET    /api/votes/{pk}/results/        -> αποτελέσματα
    """
    queryset = Vote.objects.all().order_by('-created_at')
    serializer_class = VoteSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'my_submission', 'results']:
            return [permissions.IsAuthenticated()]
        # create/update/delete/vote
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        user = self.request.user
        qs = Vote.objects.all().order_by('-created_at')
        if user.is_superuser:
            return qs
        return qs.filter(building__manager=user)

    def perform_create(self, serializer):
        # Το building έρχεται από το validated_data του serializer
        serializer.save()

    @action(detail=True, methods=['post'], url_path='vote')
    def vote(self, request, pk=None):
        vote = self.get_object()
        serializer = VoteSubmissionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        # Δηλώνουμε ρητά vote και user για να αποθηκευτεί η υποβολή
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
        yes   = subs.filter(choice='ΝΑΙ').count()
        no    = subs.filter(choice='ΟΧΙ').count()
        white = subs.filter(choice='ΛΕΥΚΟ').count()
        total = yes + no + white
        return Response({
            'ΝΑΙ': yes,
            'ΟΧΙ': no,
            'ΛΕΥΚΟ': white,
            'total': total
        })

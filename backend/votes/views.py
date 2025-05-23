# backend/votes/views.py

from rest_framework import viewsets, permissions, status, exceptions  # type: ignore
from rest_framework.decorators import action  # type: ignore
from rest_framework.response import Response  # type: ignore
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
        qs = Vote.objects.all().order_by('-start_date')

        print(">>> [get_queryset] Auth user:", self.request.user)
        print(">>> [get_queryset] Is authenticated:", self.request.user.is_authenticated)
        print(">>> [get_queryset] Query params:", self.request.query_params)

        building_id = self.request.query_params.get('building')
        if building_id:
            try:
                building_id = int(building_id)
                qs = qs.filter(building_id=building_id)
                print(f">>> [get_queryset] Filtered by building_id: {building_id}")
            except (ValueError, TypeError):
                print(">>> [get_queryset] Invalid building_id")
                return Vote.objects.none()

        user = self.request.user
        if user.is_superuser:
            print(">>> [get_queryset] Superuser access")
            return qs
        elif hasattr(user, "manager_buildings"):
            buildings = list(user.manager_buildings.all())
            print(f">>> [get_queryset] Manager buildings: {buildings}")
            return qs.filter(building__in=buildings)
        elif hasattr(user, "resident_buildings"):
            buildings = list(user.resident_buildings.all())
            print(f">>> [get_queryset] Resident buildings: {buildings}")
            return qs.filter(building__in=buildings)

        print(">>> [get_queryset] No matching user role")
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
        if building:
            serializer.save(building=building)
        else:
            serializer.save()

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


# backend/user_requests/views.py
from rest_framework import viewsets, permissions, exceptions
from rest_framework.response import Response
from core.permissions import IsManagerOrSuperuser
from .models import UserRequest
from .serializers import UserRequestSerializer
from buildings.models import Building
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from django.core.exceptions import ObjectDoesNotExist

class UserRequestViewSet(viewsets.ModelViewSet):
    queryset = UserRequest.objects.all().order_by('-created_at')
    serializer_class = UserRequestSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]



    def get_queryset(self):
        user = self.request.user
        building_id_param = self.request.query_params.get("building")

        if not user.is_authenticated:
            return UserRequest.objects.none()

        base_queryset = UserRequest.objects.all()

        if building_id_param:
            try:
                building_id = int(building_id_param)
                base_queryset = base_queryset.filter(building_id=building_id)
            except (ValueError, TypeError):
                raise exceptions.ValidationError({"building": "Το ID του κτηρίου πρέπει να είναι αριθμός."})

        if user.is_superuser:
            return base_queryset.order_by('-created_at')

        if user.is_staff:
            managed_ids = Building.objects.filter(manager=user).values_list("id", flat=True)
            return base_queryset.filter(building_id__in=managed_ids).order_by('-created_at')

        # κατοικος
        try:
            profile = getattr(user, "profile", None)
            if not profile or not getattr(profile, "building", None):
                return UserRequest.objects.none()
            return base_queryset.filter(building=profile.building).order_by("-created_at")
        except (AttributeError, ObjectDoesNotExist):
            return UserRequest.objects.none()



    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        


    @action(detail=False, methods=["get"], url_path="top")
    def top_requests(self, request):
        building_id = request.query_params.get("building")
        if not building_id:
            return Response({"detail": "Missing 'building' parameter."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            building_id = int(building_id)
        except ValueError:
            return Response({"detail": "Invalid 'building' ID."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            qs = (
                UserRequest.objects
                .filter(building_id=building_id)
                .annotate(supporters_count=Count("supporters"))
                .order_by("-supporters_count")
                .distinct()[:5]
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

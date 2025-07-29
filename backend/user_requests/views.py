
# backend/user_requests/views.py
from rest_framework import viewsets, permissions, exceptions 
from rest_framework.response import Response 
from core.permissions import IsManagerOrSuperuser
from .models import UserRequest
from .serializers import UserRequestSerializer, UserRequestListSerializer
from buildings.models import Building
from rest_framework.decorators import action 
from rest_framework.response import Response 
from rest_framework import status 
from django.db.models import Count 
from core.utils import filter_queryset_by_user_and_building
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.utils import timezone
   

class UserRequestViewSet(viewsets.ModelViewSet):
    queryset = UserRequest.objects.all().order_by('-created_at')
    serializer_class = UserRequestSerializer

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'list':
            return UserRequestListSerializer
        return UserRequestSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['create']:
            return [permissions.IsAuthenticated()]
        else:
            return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        """
        Φέρνει μόνο τα user requests που δικαιούται να δει ο χρήστης (με βάση το κτήριο και τον ρόλο).
        """
        qs = UserRequest.objects.all().order_by('-created_at')
        
        # Για retrieve actions (individual request detail), χρησιμοποιούμε διαφορετική λογική
        if self.action == 'retrieve':
            # Για superuser: όλα τα requests
            if self.request.user.is_superuser:
                return qs
            # Για manager: μόνο requests από κτήρια που διαχειρίζεται
            elif self.request.user.is_staff:
                managed_building_ids = Building.objects.filter(manager=self.request.user).values_list("id", flat=True)
                return qs.filter(building_id__in=managed_building_ids)
            # Για resident: μόνο τα δικά του requests ή requests από το κτήριό του
            else:
                try:
                    profile = getattr(self.request.user, "profile", None)
                    if profile and getattr(profile, "building", None):
                        return qs.filter(
                            models.Q(created_by=self.request.user) |
                            models.Q(building=profile.building)
                        )
                    else:
                        return qs.filter(created_by=self.request.user)
                except (AttributeError, ObjectDoesNotExist):
                    return qs.filter(created_by=self.request.user)
        
        # Για όλες τις άλλες actions (list, create, etc.) χρησιμοποιούμε το κανονικό filtering
        try:
            return filter_queryset_by_user_and_building(self.request, qs)
        except Exception as e:
            print("ERROR in get_queryset:", e)
            import traceback; traceback.print_exc()
            # Επιστρέφουμε empty queryset για να μην εμφανίζεται 500 στο frontend
            return UserRequest.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
    @action(detail=False, methods=["get"], url_path="top")
    def top_requests(self, request):
        building_id = request.query_params.get("building")
        
        # Χειρισμός για "όλα τα κτίρια" (building=null)
        if building_id == 'null':
            # Για superuser: όλα τα κτίρια
            if request.user.is_superuser:
                qs = UserRequest.objects.all()
            # Για manager: μόνο τα κτίρια που διαχειρίζεται
            elif request.user.is_staff:
                managed_ids = Building.objects.filter(manager=request.user).values_list("id", flat=True)
                qs = UserRequest.objects.filter(building_id__in=managed_ids)
            # Για resident: μόνο το κτίριο του
            else:
                try:
                    profile = getattr(request.user, "profile", None)
                    if not profile or not getattr(profile, "building", None):
                        return Response({"detail": "No building assigned."}, status=status.HTTP_400_BAD_REQUEST)
                    qs = UserRequest.objects.filter(building=profile.building)
                except (AttributeError, ObjectDoesNotExist):
                    return Response({"detail": "No building assigned."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if not building_id:
                return Response({"detail": "Missing 'building' parameter."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                building_id = int(building_id)
                qs = UserRequest.objects.filter(building_id=building_id)
            except ValueError:
                return Response({"detail": "Invalid 'building' ID."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            qs = (
                qs
                .annotate(supporters_count=Count("supporters"))
                .order_by("-supporters_count")
                .distinct()[:5]
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], permission_classes=[IsManagerOrSuperuser])
    def change_status(self, request, pk=None):
        user_request = self.get_object()
        new_status = request.data.get("status")

        if new_status not in dict(UserRequest.STATUS_CHOICES):
            return Response({"detail": "Μη αποδεκτή κατάσταση."}, status=status.HTTP_400_BAD_REQUEST)

        # Update status
        user_request.status = new_status
        
        # Handle completed_at field based on new status
        if new_status == 'completed':
            if not user_request.completed_at:
                user_request.completed_at = timezone.now()
        else:
            # Clear completed_at if status is not completed
            user_request.completed_at = None
            
        user_request.save()
        serializer = self.get_serializer(user_request)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def support(self, request, pk=None):
        """Toggle support for a user request."""
        user_request = self.get_object()
        user = request.user
        
        # Check if user can support this request
        if user == user_request.created_by:
            return Response(
                {"detail": "Δεν μπορείτε να υποστηρίξετε το δικό σας αίτημα."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Toggle support
        if user in user_request.supporters.all():
            user_request.supporters.remove(user)
            supported = False
            status_message = "Η υποστήριξη αφαιρέθηκε επιτυχώς."
        else:
            user_request.supporters.add(user)
            supported = True
            status_message = "Η υποστήριξη προστέθηκε επιτυχώς."
        
        return Response({
            "status": status_message,
            "supporter_count": user_request.supporters.count(),
            "supported": supported
        })

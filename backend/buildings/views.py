# backend/buildings/views.py

from rest_framework import viewsets, permissions, status  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.decorators import action  # type: ignore
from django.views.decorators.csrf import ensure_csrf_cookie  # type: ignore  # type: ignore  # type: ignore
from django.http import JsonResponse  # type: ignore  # type: ignore  # type: ignore
from django.utils import timezone # type: ignore  # type: ignore  # type: ignore
from .models import Building, BuildingMembership
from .serializers import BuildingSerializer, BuildingMembershipSerializer
from users.models import CustomUser
from rest_framework import viewsets # type: ignore
from .models import Building
from .serializers import BuildingSerializer
from rest_framework.permissions import IsAuthenticated # type: ignore



@ensure_csrf_cookie
def get_csrf_token(request):
    """Δίνει CSRF cookie χωρίς να απαιτείται login"""
    return JsonResponse({"message": "CSRF cookie set"})


class BuildingViewSet(viewsets.ModelViewSet):  # <-- ΟΧΙ ReadOnlyModelViewSet
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Superusers & staff -> όλα τα κτίρια
        if user.is_superuser or user.is_staff:
            return Building.objects.all()

        # Managers -> μόνο τα κτίρια που διαχειρίζονται
        if hasattr(user, "is_manager") and user.is_manager:
            return Building.objects.filter(manager=user)

        # Residents -> μόνο τα κτίρια στα οποία ανήκουν
        if BuildingMembership.objects.filter(resident=user).exists():
            return Building.objects.filter(buildingmembership__resident=user)

        # Αν δεν υπάρχει ρόλος ή δεν υπάρχει αντιστοίχιση
        return Building.objects.none()


    def perform_create(self, serializer):
        """
        Κατά τη δημιουργία ενός κτιρίου:
        - Αν είναι staff αλλά όχι superuser, το πεδίο 'manager' γίνεται ο τρέχων χρήστης.
        - Αν είναι superuser, μπορεί να καθορίσει οποιονδήποτε manager μέσω του payload.
        """
        if not self.request.user.is_superuser and self.request.user.is_staff:
            serializer.save(manager=self.request.user)
        else:
            serializer.save()

    @action(detail=False, methods=["post"], url_path="assign-resident")
    def assign_resident(self, request):
        """
        Επιτρέπει σε staff/superusers να αντιστοιχίσουν έναν κάτοικο σε κτίριο.
        Payload: { user_email: "", building: id, role: "resident" }
        """
        user_email = request.data.get("user_email")
        building_id = request.data.get("building")
        role = request.data.get("role", "resident")

        if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
            return Response({"detail": "Απαγορεύεται."}, status=status.HTTP_403_FORBIDDEN)

        if not user_email or not building_id:
            return Response({"detail": "Απαιτείται email και ID κτιρίου."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=user_email)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Ο χρήστης δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)

        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response({"detail": "Το κτίριο δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)

        membership, created = BuildingMembership.objects.update_or_create(
            resident=user,
            building=building,
            defaults={"role": role}
        )
        if not created:
            return Response({"detail": "Η αντιστοίχιση υπάρχει ήδη."}, status=status.HTTP_200_OK)   
        # Αν η αντιστοίχιση δημιουργήθηκε, ενημερώνουμε το πεδίο 'created_at'
        membership.created_at = membership.created_at or timezone.now()
        membership.save()
        # Επιστρέφουμε την απάντηση
       


        return Response({
            "message": "Η αντιστοίχιση ολοκληρώθηκε επιτυχώς.",
            "membership_id": membership.id,
            "created": created
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="memberships")
    def list_memberships(self, request):
        """
        Λίστα μελών κτιρίου για managers.
        GET payload: { building_id: id }
        """
        user = request.user
        building_id = request.query_params.get("building_id")

        if not (user.is_staff or user.is_superuser):
            # Manager -> μόνο τα δικά του κτίρια
            queryset = BuildingMembership.objects.filter(building__manager=user)
        else:
            queryset = BuildingMembership.objects.all()

        if building_id:
            queryset = queryset.filter(building_id=building_id)

        serializer = BuildingMembershipSerializer(queryset, many=True)
        return Response(serializer.data)

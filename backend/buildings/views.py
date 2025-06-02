# backend/buildings/views.py

from rest_framework import viewsets, permissions, status  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.decorators import action  # type: ignore
from django.views.decorators.csrf import ensure_csrf_cookie  # type: ignore
from django.http import JsonResponse  # type: ignore
from django.utils import timezone  # type: ignore

from .models import Building, BuildingMembership
from .serializers import BuildingSerializer, BuildingMembershipSerializer
from users.models import CustomUser
from rest_framework.permissions import IsAuthenticated  # type: ignore


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
        Επιτρέπει σε superusers ή office managers να αντιστοιχίσουν κάτοικο σε δικό τους κτίριο.
        """
        user_email = request.data.get("user_email")
        building_id = request.data.get("building")
        role = request.data.get("role", "resident")

        if not request.user.is_authenticated or not (
            request.user.is_superuser or request.user.is_office_manager
        ):
            return Response({"detail": "Απαγορεύεται."}, status=status.HTTP_403_FORBIDDEN)

        if not user_email or not building_id:
            return Response({"detail": "Απαιτείται email και ID κτιρίου."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=user_email)
            building = Building.objects.get(id=building_id)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Ο χρήστης δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)
        except Building.DoesNotExist:
            return Response({"detail": "Το κτίριο δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)

        # Αν δεν είναι superuser, να ελέγξουμε αν είναι manager του συγκεκριμένου κτιρίου
        if not request.user.is_superuser and not request.user.is_manager_of(building):
            return Response({"detail": "Δεν έχετε δικαίωμα σε αυτό το κτίριο."}, status=status.HTTP_403_FORBIDDEN)

        membership, created = BuildingMembership.objects.update_or_create(
            resident=user,
            building=building,
            defaults={"role": role}
        )
        membership.created_at = membership.created_at or timezone.now()
        membership.save()

        return Response({
            "message": "Η αντιστοίχιση ολοκληρώθηκε επιτυχώς.",
            "membership_id": membership.id,
            "created": created
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="memberships")
    def list_memberships(self, request):
        """
        Επιστρέφει τα μέλη κτιρίου για τον τρέχοντα χρήστη.
        - Superuser: όλα
        - Office manager: μόνο όσα ανήκουν σε κτίρια που διαχειρίζεται
        """
        user = request.user
        building_id = request.query_params.get("building_id")

        if not user.is_authenticated:
            return Response({"detail": "Μη εξουσιοδοτημένος."}, status=status.HTTP_401_UNAUTHORIZED)

        queryset = BuildingMembership.objects.all()

        # Περιορισμός για office managers
        if user.is_office_manager and not user.is_superuser:
            queryset = queryset.filter(building__manager=user)

        if building_id:
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return Response({"detail": "Το κτίριο δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)

            if user.is_office_manager and not user.is_manager_of(building) and not user.is_superuser:
                return Response({"detail": "Δεν έχετε δικαίωμα σε αυτό το κτίριο."}, status=status.HTTP_403_FORBIDDEN)

            queryset = queryset.filter(building_id=building_id)

        serializer = BuildingMembershipSerializer(queryset, many=True)
        return Response(serializer.data)

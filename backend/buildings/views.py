# backend/buildings/views.py
from rest_framework.authentication import SessionAuthentication, BasicAuthentication # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.viewsets import ModelViewSet # type: ignore
from django.views.decorators.csrf import ensure_csrf_cookie # type: ignore
from django.http import JsonResponse # type: ignore

from .models import Building
from .serializers import BuildingSerializer
from core.permissions import IsManagerOrSuperuser


@ensure_csrf_cookie
def get_csrf_token(request):
    """Δίνει CSRF cookie χωρίς να χρειάζεται login"""
    return JsonResponse({"message": "CSRF cookie set"})


class BuildingViewSet(ModelViewSet):
    """
    • Superuser ⇒ βλέπει/γράφει τα πάντα  
    • Office-manager ⇒ μόνο τα δικά του κτίρια  
    """
    queryset = Building.objects.all().select_related("manager")  # 🔍 λίγο πιο αποδοτικό
    serializer_class = BuildingSerializer

    # DRF setup
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes     = [IsAuthenticated, IsManagerOrSuperuser]

    # -- helper ώστε ο manager να μπαίνει αυτόματα στο create --
    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            serializer.save(manager=self.request.user)
        else:
            # superuser μπορεί να περάσει όποιον manager θέλει
            serializer.save()

    # -- περιορίζουμε το queryset για non-superusers --
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        return self.queryset.filter(manager=user)

from rest_framework import viewsets, permissions
from .models import Client
from .serializers import TenantSerializer
from core.permissions import IsManagerOrSuperuser   # δικό σου custom

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.select_related("building")
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrSuperuser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        return self.queryset.filter(building__manager=user)

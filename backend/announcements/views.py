from rest_framework import viewsets, permissions
from .models import Announcement
from .serializers import AnnouncementSerializer
from core.permissions import IsManagerOrSuperuser

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by('-created_at')
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_superuser:
            return qs
        return qs.filter(building__manager=user)

    def perform_create(self, serializer):
        serializer.save()

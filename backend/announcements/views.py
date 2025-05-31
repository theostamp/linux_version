# backend/announcements/views.py
from rest_framework import viewsets, permissions, status  # type: ignore
from rest_framework.response import Response  # type: ignore
from django.core.exceptions import ObjectDoesNotExist  # type: ignore  # type: ignore

from .models import Announcement
from .serializers import AnnouncementSerializer
from core.permissions import IsManagerOrSuperuser
from buildings.models import Building
from core.utils import filter_queryset_by_user_and_building
from users.permissions import IsBuildingAdmin

class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    CRUD για Announcement
    - GET    /api/announcements/?building=<id> -> φιλτραρισμένη λίστα
    - POST   /api/announcements/               -> δημιουργία (μόνο διαχειριστές)
    - GET    /api/announcements/<id>/          -> λεπτομέρειες (μόνο στο δικό σου κτήριο/ρόλο)
    """
    permission_classes = [IsBuildingAdmin]
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        # Ανάγνωση: όλοι authenticated. Τροποποίηση: μόνο manager/superuser
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        """
        Φέρνει μόνο τα announcements που δικαιούται να δει ο χρήστης (με βάση το κτήριο και τον ρόλο).
        """
        qs = Announcement.objects.all().order_by('-start_date')
        try:
            return filter_queryset_by_user_and_building(self.request, qs)
        except Exception as e:
            print("ERROR in get_queryset:", e)
            import traceback; traceback.print_exc()
            # Επιστρέφουμε empty queryset για να μην εμφανίζεται 500 στο frontend
            return Announcement.objects.none()

    def perform_create(self, serializer):
        # Ο manager μπορεί να δημιουργήσει για το κτήριο του
        serializer.save()

    def perform_update(self, serializer):
        # Περνάμε ρητά το building αν υπάρχει στο validated_data
        building = serializer.validated_data.get('building')
        if building:
            serializer.save(building=building)
        else:
            serializer.save()

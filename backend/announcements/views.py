# backend/announcements/views.py
from rest_framework import viewsets, permissions, status  
from rest_framework.response import Response  
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache
import logging

from .models import Announcement
from .serializers import AnnouncementSerializer, AnnouncementListSerializer
from core.permissions import IsManagerOrSuperuser
from core.utils import filter_queryset_by_user_and_building
from users.permissions import IsBuildingAdmin

logger = logging.getLogger(__name__)

class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    CRUD για Announcement
    - GET    /api/announcements/?building=<id> -> φιλτραρισμένη λίστα
    - POST   /api/announcements/               -> δημιουργία (μόνο διαχειριστές)
    - GET    /api/announcements/<id>/          -> λεπτομέρειες (μόνο στο δικό σου κτήριο/ρόλο)
    - GET    /api/announcements/urgent/        -> επείγουσες ανακοινώσεις
    - GET    /api/announcements/active/        -> ενεργές ανακοινώσεις
    """
    permission_classes = [IsBuildingAdmin]
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        # Ανάγνωση: όλοι authenticated. Τροποποίηση: μόνο manager/superuser
        if self.action in ['list', 'retrieve', 'urgent', 'active']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_serializer_class(self):
        if self.action == 'list':
            return AnnouncementListSerializer
        return AnnouncementSerializer

    def get_queryset(self):
        """
        Φέρνει μόνο τα announcements που δικαιούται να δει ο χρήστης (με βάση το κτήριο και τον ρόλο).
        """
        qs = Announcement.objects.select_related('author', 'building').order_by('-priority', '-created_at')
        try:
            return filter_queryset_by_user_and_building(self.request, qs)
        except Exception as e:
            logger.error(f"Error in get_queryset: {e}")
            # Επιστρέφουμε empty queryset για να μην εμφανίζεται 500 στο frontend
            return Announcement.objects.none()

    def perform_create(self, serializer):
        """Δημιουργία ανακοίνωσης με καλύτερο logging"""
        announcement = serializer.save()
        logger.info(f"Announcement created: {announcement.title} by {self.request.user}")
        
        # Invalidate cache
        if announcement.building:
            cache_key = f"announcements_building_{announcement.building.id}"
            cache.delete(cache_key)
        else:
            # For global announcements, invalidate all building caches
            # This ensures global announcements appear in all building views
            from buildings.models import Building
            for building in Building.objects.all():
                cache_key = f"announcements_building_{building.id}"
                cache.delete(cache_key)

    def perform_update(self, serializer):
        """Ενημέρωση ανακοίνωσης με cache invalidation"""
        announcement = serializer.save()
        logger.info(f"Announcement updated: {announcement.title} by {self.request.user}")
        
        # Invalidate cache
        if announcement.building:
            cache_key = f"announcements_building_{announcement.building.id}"
            cache.delete(cache_key)
        else:
            # For global announcements, invalidate all building caches
            from buildings.models import Building
            for building in Building.objects.all():
                cache_key = f"announcements_building_{building.id}"
                cache.delete(cache_key)

    def perform_destroy(self, instance):
        """Διαγραφή ανακοίνωσης με cache invalidation"""
        title = instance.title
        building = instance.building
        is_global = building is None
        
        instance.delete()
        logger.info(f"Announcement deleted: {title} by {self.request.user}")
        
        # Invalidate cache
        if building:
            cache_key = f"announcements_building_{building.id}"
            cache.delete(cache_key)
        else:
            # For global announcements, invalidate all building caches
            from buildings.models import Building
            for building_obj in Building.objects.all():
                cache_key = f"announcements_building_{building_obj.id}"
                cache.delete(cache_key)
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to return custom confirmation message"""
        instance = self.get_object()
        title = instance.title
        is_global = instance.building is None
        
        self.perform_destroy(instance)
        
        if is_global:
            message = f"Η καθολική ανακοίνωση '{title}' διαγράφηκε επιτυχώς από όλα τα κτίρια."
        else:
            building_name = instance.building.name if instance.building else "Άγνωστο κτίριο"
            message = f"Η ανακοίνωση '{title}' διαγράφηκε επιτυχώς από το κτίριο '{building_name}'."
        
        return Response({"message": message}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='urgent')
    def urgent(self, request):
        """Επείγουσες ανακοινώσεις"""
        try:
            qs = self.get_queryset().filter(
                is_urgent=True,
                is_active=True,
                published=True
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching urgent announcements: {e}")
            return Response(
                {"error": "Αποτυχία φόρτωσης επείγουσων ανακοινώσεων"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """Ενεργές ανακοινώσεις"""
        try:
            today = timezone.now().date()
            qs = self.get_queryset().filter(
                is_active=True,
                published=True
            ).filter(
                Q(start_date__lte=today) | Q(start_date__isnull=True)
            ).filter(
                Q(end_date__gte=today) | Q(end_date__isnull=True)
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching active announcements: {e}")
            return Response(
                {"error": "Αποτυχία φόρτωσης ενεργών ανακοινώσεων"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        """Δημοσίευση ανακοίνωσης"""
        announcement = self.get_object()
        announcement.published = True
        announcement.save()
        logger.info(f"Announcement published: {announcement.title} by {request.user}")
        return Response({"message": "Η ανακοίνωση δημοσιεύθηκε επιτυχώς"})

    @action(detail=True, methods=['post'], url_path='unpublish')
    def unpublish(self, request, pk=None):
        """Αποσυρθή ανακοίνωσης"""
        announcement = self.get_object()
        announcement.published = False
        announcement.save()
        logger.info(f"Announcement unpublished: {announcement.title} by {request.user}")
        return Response({"message": "Η ανακοίνωση αποσύρθηκε επιτυχώς"})

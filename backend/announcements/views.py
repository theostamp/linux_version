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
from core.permissions import IsManagerOrSuperuser, IsOfficeManagerOrInternalManager
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
        # Read access for all
        if self.action in ['list', 'retrieve', 'urgent', 'active']:
            return [permissions.AllowAny()]
        # Create, update, destroy: επιτρέπεται σε office managers και internal managers
        return [permissions.IsAuthenticated(), IsOfficeManagerOrInternalManager()]

    def get_serializer_class(self):
        if self.action == 'list':
            return AnnouncementListSerializer
        return AnnouncementSerializer

    def get_queryset(self):
        """
        Filter announcements by building parameter if provided.
        Returns all announcements if no building parameter is provided.
        """
        queryset = Announcement.objects.select_related('author', 'building').order_by('-priority', '-created_at')
        
        # Filter by building if provided in query params
        building_id = self.request.query_params.get('building')
        if building_id:
            try:
                building_id = int(building_id)
                # Include announcements for this building OR global announcements (building=null)
                queryset = queryset.filter(Q(building_id=building_id) | Q(building__isnull=True))
            except (ValueError, TypeError):
                # Invalid building_id, return empty queryset
                queryset = queryset.none()
        
        return queryset

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
        try:
            if building:
                cache_key = f"announcements_building_{building.id}"
                cache.delete(cache_key)
            else:
                # For global announcements, invalidate all building caches
                from buildings.models import Building
                try:
                    for building_obj in Building.objects.all():
                        cache_key = f"announcements_building_{building_obj.id}"
                        cache.delete(cache_key)
                except Exception as e:
                    logger.warning(f"Error invalidating cache for global announcement: {e}")
        except Exception as e:
            logger.warning(f"Error invalidating cache during announcement deletion: {e}")
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to return custom confirmation message"""
        try:
            instance = self.get_object()
            title = instance.title
            is_global = instance.building is None
            
            # Αποθήκευση building_name πριν τη διαγραφή
            try:
                building_name = instance.building.name if instance.building else "Όλα τα κτίρια"
            except Exception as e:
                logger.warning(f"Error getting building name: {e}")
                building_name = "Άγνωστο κτίριο"

            logger.info(f"Attempting to delete announcement ID={instance.id}, title='{title}', is_global={is_global}")
            
            self.perform_destroy(instance)

            if is_global:
                message = f"Η καθολική ανακοίνωση '{title}' διαγράφηκε επιτυχώς από όλα τα κτίρια."
            else:
                message = f"Η ανακοίνωση '{title}' διαγράφηκε επιτυχώς από το κτίριο '{building_name}'."

            logger.info(f"Successfully deleted announcement ID={instance.id}")
            return Response({"message": message}, status=status.HTTP_200_OK)
        except Announcement.DoesNotExist:
            logger.error(f"Announcement not found: {kwargs.get('pk')}")
            return Response(
                {"error": "Η ανακοίνωση δεν βρέθηκε."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting announcement: {e}", exc_info=True)
            return Response(
                {"error": f"Σφάλμα κατά τη διαγραφή της ανακοίνωσης: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

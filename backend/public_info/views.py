from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django_tenants.utils import schema_context
from announcements.models import Announcement
from votes.models import Vote
from buildings.models import Building
from .serializers import AnnouncementPublicSerializer, VotePublicSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def building_info(request, building_id: int):
    today = timezone.now().date()
    
    # Use demo tenant schema since the data is there
    with schema_context('demo'):
        # Get building information
        try:
            building = Building.objects.get(id=building_id)
            building_info = {
                'id': building.id,
                'name': building.name,
                'address': building.address,
                'city': building.city,
                'postal_code': building.postal_code,
                'apartments_count': building.apartments_count,
                'internal_manager_name': building.internal_manager_name,
                'internal_manager_phone': building.internal_manager_phone,
                'management_office_name': building.management_office_name,
                'management_office_phone': building.management_office_phone,
                'management_office_address': building.management_office_address,
            }
        except Building.DoesNotExist:
            building_info = None

        announcements = Announcement.objects.filter(
            building_id=building_id,
            is_active=True,
            start_date__lte=today,
            end_date__gte=today,
        ).order_by('-start_date')

        votes = Vote.objects.filter(
            building_id=building_id,
            is_active=True,
            start_date__lte=today,
            end_date__gte=today,
        ).order_by('-start_date')

        return Response({
            'announcements': AnnouncementPublicSerializer(announcements, many=True).data,
            'votes': VotePublicSerializer(votes, many=True).data,
            'building_info': building_info,
        })
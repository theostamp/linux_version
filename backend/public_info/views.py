from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from announcements.models import Announcement
from votes.models import Vote
from .serializers import AnnouncementPublicSerializer, VotePublicSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def building_info(request, building_id: int):
    today = timezone.now().date()
    announcements = Announcement.objects.filter(
        building_id=building_id,
        is_active=True,
        start_date__lte=today,
        end_date__gte=today,
    ).order_by('-start_date')

    votes = Vote.objects.filter(
        building_id=building_id,
        start_date__lte=today,
        end_date__gte=today,
    ).order_by('-start_date')

    return Response({
        'announcements': AnnouncementPublicSerializer(announcements, many=True).data,
        'votes': VotePublicSerializer(votes, many=True).data,
    })
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Vote


class PublicVoteResultsView(APIView):
    """
    Public endpoint για kiosk display (no auth).
    Επιστρέφει αποτελέσματα για μία ψηφοφορία.
    """

    permission_classes = [AllowAny]

    def get(self, request, vote_id: int):
        try:
            vote = Vote.objects.get(id=vote_id)
        except Vote.DoesNotExist:
            return Response({'error': 'Vote not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            results = vote.get_results()
        except Exception:
            results = None

        return Response({
            'id': vote.id,
            'title': vote.title,
            'min_participation': vote.min_participation,
            'total_votes': vote.total_votes,
            'participation_percentage': vote.participation_percentage,
            'is_valid': vote.is_valid_result,
            'results': results,
        })



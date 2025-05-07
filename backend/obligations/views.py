# backend/obligations/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def obligations_summary(request):
    data = {
        "pending_payments": 3,
        "maintenance_tickets": 2,
    }
    return Response(data)

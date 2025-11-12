# backend/obligations/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

# Import models
from billing.models import BillingCycle
from maintenance.models import MaintenanceTicket
from buildings.models import Building


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def obligations_summary(request):
    """
    Returns summary of pending obligations for the current user:
    - pending_payments: Count of unpaid billing cycles for user's subscriptions
    - maintenance_tickets: Count of open/pending maintenance tickets for user's buildings
    """
    user = request.user
    
    # Count pending payments (billing cycles that are not paid)
    # Filter by user's subscriptions
    pending_payments = BillingCycle.objects.filter(
        subscription__user=user,
        status__in=['pending', 'failed']
    ).count()
    
    # Count maintenance tickets
    # Get user's buildings (if user is building manager or has access)
    # Option 1: If user has direct building relationships
    user_buildings = Building.objects.filter(
        Q(manager=user) | Q(residents__user=user)
    ).distinct()
    
    # Option 2: If user is superuser/staff, count all open tickets
    if user.is_staff or user.is_superuser:
        maintenance_tickets = MaintenanceTicket.objects.filter(
            status__in=['open', 'triaged', 'in_progress', 'waiting_vendor', 'blocked']
        ).count()
    else:
        # Count tickets for user's buildings or tickets reported by user
        maintenance_tickets = MaintenanceTicket.objects.filter(
            Q(building__in=user_buildings) | Q(reporter=user),
            status__in=['open', 'triaged', 'in_progress', 'waiting_vendor', 'blocked']
        ).distinct().count()
    
    data = {
        "pending_payments": pending_payments,
        "maintenance_tickets": maintenance_tickets,
    }
    return Response(data)

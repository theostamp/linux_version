"""
Public API endpoints for apartment personal kiosk access.
No authentication required - access via unique kiosk_token.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_tenants.utils import schema_context
from datetime import datetime, timedelta
from decimal import Decimal

from apartments.models import Apartment
from financial.models import CommonExpensePeriod, ApartmentShare, Transaction
from announcements.models import Announcement
from maintenance.models import MaintenanceTicket
from core.throttles import KioskPublicThrottle


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([KioskPublicThrottle])
def apartment_personal_dashboard(request, token):
    """
    Get personal dashboard data for apartment by kiosk token.
    Public endpoint - no authentication required.

    Returns:
        - apartment info
        - current common expenses
        - recent announcements
        - balance & transactions
        - maintenance requests
    """
    with schema_context('demo'):  # TODO: Dynamic tenant detection
        apartment = get_object_or_404(Apartment, kiosk_token=token)

        # Basic apartment info
        apartment_data = {
            'id': apartment.id,
            'number': apartment.number,
            'building': {
                'id': apartment.building.id,
                'name': apartment.building.name,
                'address': apartment.building.address,
            },
            'owner_name': apartment.owner_name,
            'floor': apartment.floor,
            'square_meters': apartment.square_meters,
        }

        # Current common expenses (latest period)
        current_period = CommonExpensePeriod.objects.filter(
            building=apartment.building,
            end_date__gte=timezone.now().date()
        ).order_by('-start_date').first()

        common_expenses = None
        if current_period:
            share = ApartmentShare.objects.filter(
                period=current_period,
                apartment=apartment
            ).first()

            if share:
                common_expenses = {
                    'period': current_period.start_date.strftime('%m/%Y'),
                    'amount': float(share.total_amount),
                    'previous_balance': float(share.previous_balance),
                    'total_due': float(share.total_due),
                    'due_date': (current_period.end_date + timedelta(days=10)).strftime('%d/%m/%Y'),
                    'breakdown': share.breakdown,
                }

        # Recent announcements (last 30 days)
        announcements = Announcement.objects.filter(
            building=apartment.building,
            created_at__gte=timezone.now() - timedelta(days=30)
        ).order_by('-created_at')[:10]

        announcements_data = [
            {
                'id': ann.id,
                'title': ann.title,
                'description': ann.description,
                'is_urgent': ann.is_urgent,
                'priority': ann.priority,
                'created_at': ann.created_at.isoformat(),
            }
            for ann in announcements
        ]

        # Balance & recent transactions
        recent_transactions = Transaction.objects.filter(
            apartment=apartment
        ).order_by('-date')[:10]

        transactions_data = [
            {
                'id': trans.id,
                'date': trans.date.strftime('%d/%m/%Y'),
                'description': trans.description,
                'amount': float(trans.amount),
                'type': trans.transaction_type,
                'balance_after': float(trans.balance_after) if trans.balance_after else None,
            }
            for trans in recent_transactions
        ]

        # Calculate current balance from latest transaction
        current_balance = 0
        if recent_transactions:
            latest = recent_transactions[0]
            if latest.balance_after is not None:
                current_balance = float(latest.balance_after)

        # Maintenance tickets (if app exists)
        maintenance_requests = []
        try:
            tickets = MaintenanceTicket.objects.filter(
                apartment=apartment,
                status__in=['open', 'in_progress']
            ).order_by('-created_at')[:5]

            maintenance_requests = [
                {
                    'id': ticket.id,
                    'title': ticket.title,
                    'description': ticket.description,
                    'status': ticket.status,
                    'created_at': ticket.created_at.isoformat(),
                }
                for ticket in tickets
            ]
        except Exception:
            pass  # Maintenance app may not exist

        return Response({
            'apartment': apartment_data,
            'common_expenses': common_expenses,
            'current_balance': current_balance,
            'announcements': announcements_data,
            'transactions': transactions_data,
            'maintenance_requests': maintenance_requests,
        })


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([KioskPublicThrottle])
def apartment_common_expenses_history(request, token):
    """
    Get common expenses history for apartment.
    Public endpoint - no authentication required.
    """
    with schema_context('demo'):
        apartment = get_object_or_404(Apartment, kiosk_token=token)

        # Get all apartment shares
        shares = ApartmentShare.objects.filter(
            apartment=apartment
        ).select_related('period').order_by('-period__start_date')[:12]  # Last 12 months

        history = [
            {
                'period': share.period.start_date.strftime('%m/%Y'),
                'amount': float(share.total_amount),
                'previous_balance': float(share.previous_balance),
                'total_due': float(share.total_due),
                'breakdown': share.breakdown,
            }
            for share in shares
        ]

        return Response({'history': history})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([KioskPublicThrottle])
def apartment_validate_token(request):
    """
    Validate apartment kiosk token.
    Returns apartment number and building if valid.
    """
    token = request.data.get('token')

    if not token:
        return Response(
            {'error': 'Token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    with schema_context('demo'):
        try:
            apartment = Apartment.objects.get(kiosk_token=token)
            return Response({
                'valid': True,
                'apartment_number': apartment.number,
                'building_name': apartment.building.name or apartment.building.address,
            })
        except Apartment.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Invalid token'},
                status=status.HTTP_404_NOT_FOUND
            )

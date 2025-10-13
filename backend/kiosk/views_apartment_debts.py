"""
Custom view για την εμφάνιση οφειλών διαμερισμάτων στο kiosk
Επιστρέφει απευθείας το apartment.current_balance από τη βάση
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from financial.models import Apartment
from decimal import Decimal


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint for kiosk
def apartment_debts(request):
    """
    Επιστρέφει τις οφειλές διαμερισμάτων για το kiosk widget
    Χρησιμοποιεί απευθείας το apartment.current_balance field
    """
    building_id = request.query_params.get('building_id')
    
    if not building_id:
        return Response(
            {'error': 'Building ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        debts = []
        total_debt = Decimal('0.00')
        
        for apt in apartments:
            current_balance = apt.current_balance or Decimal('0.00')
            
            # Φιλτράρουμε μόνο διαμερίσματα με οφειλές
            if current_balance > 0:
                debt_data = {
                    'apartment_id': apt.id,
                    'apartment_number': apt.number,
                    'owner_name': apt.owner_name or 'Μη καταχωρημένος',
                    'current_balance': float(current_balance),
                    'net_obligation': float(current_balance),  # Για compatibility
                    'previous_balance': float(apt.previous_balance or 0),
                    'participation_mills': apt.participation_mills or 0,
                    'status': 'Οφειλή' if current_balance < 300 else 'Κρίσιμο'
                }
                debts.append(debt_data)
                total_debt += current_balance
        
        return Response({
            'success': True,
            'apartments': debts,
            'summary': {
                'total_debt': float(total_debt),
                'apartments_with_debts': len(debts),
                'average_debt': float(total_debt / len(debts)) if debts else 0
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error fetching apartment debts: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


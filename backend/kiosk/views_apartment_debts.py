"""
Custom view για την εμφάνιση κοινοχρήστων διαμερισμάτων στο kiosk
Επιστρέφει τα υπολογισμένα ποσά από το φύλλο κοινοχρήστων του τρέχοντος μήνα
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from financial.models import Apartment
from financial.services import CommonExpenseCalculator
from decimal import Decimal
from datetime import date


@api_view(['GET'])
@permission_classes([AllowAny])  # Public endpoint for kiosk
def apartment_debts(request):
    """
    Επιστρέφει τα κοινόχρηστα διαμερισμάτων για το kiosk widget
    Χρησιμοποιεί τον CommonExpenseCalculator για τον τρέχοντα μήνα
    """
    building_id = request.query_params.get('building_id')
    month = request.query_params.get('month')  # Optional, format: YYYY-MM
    
    if not building_id:
        return Response(
            {'error': 'Building ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Use current month if not specified
        if not month:
            today = date.today()
            month = f'{today.year}-{today.month:02d}'
        
        # Calculate common expenses for the specified month
        calculator = CommonExpenseCalculator(building_id=int(building_id), month=month)
        shares = calculator.calculate_shares()
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        debts = []
        total_debt = Decimal('0.00')
        
        for apt in apartments:
            # Get calculated share for this apartment
            if apt.id in shares:
                share_data = shares[apt.id]
                share_amount = Decimal(str(share_data.get('total_amount', 0)))
                
                # Include all apartments (not just those with debts)
                debt_data = {
                    'apartment_id': apt.id,
                    'apartment_number': apt.number,
                    'owner_name': apt.owner_name or 'Μη καταχωρημένος',
                    'current_balance': float(share_amount),
                    'net_obligation': float(share_amount),
                    'previous_balance': float(apt.previous_balance or 0),
                    'participation_mills': apt.participation_mills or 0,
                    'breakdown': share_data.get('breakdown', {}),
                    'month': month
                }
                debts.append(debt_data)
                total_debt += share_amount
        
        # Calculate payment coverage for the month
        from financial.models import Payment
        from datetime import datetime
        
        # Get payments for the current month
        year, mon = map(int, month.split('-'))
        payments = Payment.objects.filter(
            apartment__building_id=building_id,
            date__year=year,
            date__month=mon
        )
        
        total_paid = sum(float(p.amount) for p in payments)
        payment_coverage = (total_paid / float(total_debt) * 100) if total_debt > 0 else 0
        
        # Check if warning needed (after 15th of month and coverage < 75%)
        current_day = datetime.now().day
        show_warning = current_day > 15 and payment_coverage < 75
        
        return Response({
            'success': True,
            'apartments': debts,
            'summary': {
                'total_expenses': float(total_debt),
                'apartments_count': len(debts),
                'average_expense': float(total_debt / len(debts)) if debts else 0,
                'month': month,
                'calculation_source': 'CommonExpenseCalculator',
                'total_paid': total_paid,
                'payment_coverage': round(payment_coverage, 1),
                'show_warning': show_warning,
                'current_day': current_day
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error fetching apartment debts: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


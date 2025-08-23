# backend/financial/views.py

# Προσθήκη στις ήδη υπάρχουσες imports
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime

# Στο PaymentViewSet, προσθήκη του νέου action verify
@action(detail=True, methods=['post'])
def verify(self, request, pk=None):
    """Επιβεβαίωση πληρωμής"""
    try:
        payment = self.get_object()
        
        if payment.is_verified:
            return Response({
                'success': False,
                'message': 'Η πληρωμή είναι ήδη επιβεβαιωμένη'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment.is_verified = True
        payment.save()
        
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='VERIFY',
            payment=payment,
            request=self.request
        )
        
        return Response({
            'success': True,
            'message': 'Η πληρωμή επιβεβαιώθηκε επιτυχώς'
        })
        
    except Payment.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Η πληρωμή δεν βρέθηκε'
        }, status=status.HTTP_404_NOT_FOUND)
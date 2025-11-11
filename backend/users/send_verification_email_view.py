# backend/users/send_verification_email_view.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
import logging

from core.permissions import IsInternalService
from users.models import CustomUser
from users.services import EmailService

logger = logging.getLogger(__name__)


class SendVerificationEmailView(APIView):
    """
    POST /api/users/send-verification-email/
    
    Sends verification email to user.
    Body: { "user_id": int } or { "email": "user@example.com" }
    """
    
    authentication_classes = []
    permission_classes = [IsInternalService]
    
    def post(self, request):
        """
        Send verification email to user.
        """
        user_id = request.data.get('user_id')
        email = request.data.get('email')
        
        if not user_id and not email:
            return Response({
                'error': 'Either user_id or email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if user_id:
                user = CustomUser.objects.get(id=user_id)
            else:
                user = CustomUser.objects.get(email=email)
            
            # Send verification email
            email_sent = EmailService.send_verification_email(user)
            
            if email_sent:
                return Response({
                    'success': True,
                    'message': 'Verification email sent successfully',
                    'user_id': user.id,
                    'email': user.email
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Failed to send verification email'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except CustomUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error sending verification email: {e}")
            return Response({
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


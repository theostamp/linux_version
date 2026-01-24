from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import AIService
from maintenance.models import MaintenanceTicket  # Corrected from MaintenanceRequest
from django.utils.translation import gettext as _
from users.models import CustomUser

class AIChatView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Handle chat messages to the AI Agent.
        Analyzes intent and performs actions if necessary.
        """
        allowed_roles = {
            CustomUser.SystemRole.OFFICE_MANAGER,
            CustomUser.SystemRole.OFFICE_STAFF,
            CustomUser.SystemRole.ADMIN,
        }
        if not (
            request.user.is_superuser
            or request.user.is_staff
            or (request.user.role in allowed_roles)
        ):
            return Response(
                {'error': _('Ο βοηθός είναι διαθέσιμος μόνο για το γραφείο διαχείρισης.')},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_message = request.data.get('message', '')
        if not user_message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        ai_service = AIService()


        # 1. Check for Maintenance Intent
        maintenance_analysis = ai_service.analyze_maintenance_intent(user_message)

        if maintenance_analysis and maintenance_analysis.get('is_maintenance'):
            # It's a maintenance request
            return Response({
                'type': 'maintenance_proposal',
                'message': _("Κατάλαβα ότι αναφέρετε μια βλάβη. Θέλετε να δημιουργήσω ένα επίσημο αίτημα;"),
                'proposal': {
                    'title': maintenance_analysis.get('title'),
                    'description': maintenance_analysis.get('description'),
                    'category': maintenance_analysis.get('category'),
                    'severity': maintenance_analysis.get('severity')
                }
            })

        # 2. General Conversation
        user_role = request.user.role or ('superuser' if request.user.is_superuser else 'staff' if request.user.is_staff else 'resident')
        context = {
            'user_role': user_role,
            'building_name': request.tenant.name if hasattr(request, 'tenant') else 'Unknown'
        }

        response_text = ai_service.generate_response(user_message, context)

        return Response({
            'type': 'text',
            'message': response_text
        })

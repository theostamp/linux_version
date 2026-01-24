from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import AIService
from maintenance.models import MaintenanceTicket  # Corrected from MaintenanceRequest
from django.utils.translation import gettext as _
from django.http import QueryDict
from django.utils import timezone
from users.models import CustomUser
from core.utils import filter_queryset_by_user_and_building
from todo_management.models import TodoItem

class AIChatView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Handle chat messages to the AI Agent.
        Analyzes intent and performs actions if necessary.
        """
        def _is_todo_summary_request(text: str) -> bool:
            lower = (text or "").lower()
            return any(token in lower for token in ["εκκρεμ", "εργασ", "todo", "pending"])

        def _build_todo_summary(building_id: int | None) -> str:
            if not building_id:
                return "Δεν βλέπω επιλεγμένο κτίριο. Διάλεξε κτίριο και ξαναρώτησε για τις εκκρεμότητες."

            # Build a lightweight request-like object for permission filtering.
            q = QueryDict(mutable=True)
            q.update({"building": str(building_id)})

            class _Req:
                def __init__(self, user, query_params):
                    self.user = user
                    self.query_params = query_params

            req = _Req(request.user, q)
            base_qs = TodoItem.objects.select_related("apartment", "assigned_to").exclude(status="completed")
            qs = filter_queryset_by_user_and_building(req, base_qs)

            if not qs.exists():
                return "Δεν υπάρχουν εκκρεμότητες για το επιλεγμένο κτίριο."

            now = timezone.localtime(timezone.now())
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            from datetime import timedelta
            end = start + timedelta(days=1)

            due_today = qs.filter(due_date__gte=start, due_date__lt=end)
            overdue = qs.filter(due_date__lt=start)
            no_due = qs.filter(due_date__isnull=True)

            def _format_items(items, limit=5):
                lines = []
                for todo in items[:limit]:
                    apt = f" (Διαμ. {todo.apartment.number})" if todo.apartment else ""
                    assignee = f" • Ανάθεση: {todo.assigned_to.first_name or todo.assigned_to.email}" if todo.assigned_to else ""
                    lines.append(f"• {todo.title}{apt}{assignee}")
                return "\n".join(lines)

            parts = []
            if due_today.exists():
                parts.append(
                    f"Εκκρεμότητες σήμερα ({due_today.count()}):\n{_format_items(due_today)}"
                )
            if overdue.exists():
                parts.append(
                    f"Ληξιπρόθεσμες ({overdue.count()}):\n{_format_items(overdue)}"
                )
            if no_due.exists():
                parts.append(
                    f"Χωρίς προθεσμία ({no_due.count()}):\n{_format_items(no_due)}"
                )

            return "\n\n".join(parts) if parts else "Δεν υπάρχουν εκκρεμότητες για σήμερα."

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

        if _is_todo_summary_request(user_message):
            building_id = request.data.get('building_id')
            try:
                building_id = int(building_id) if building_id else None
            except (TypeError, ValueError):
                building_id = None
            summary = _build_todo_summary(building_id)
            return Response({'type': 'text', 'message': summary})

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

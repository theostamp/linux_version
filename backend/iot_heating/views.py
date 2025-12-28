from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import HeatingDevice, HeatingSession, TelemetryLog
from .serializers import HeatingDeviceSerializer, HeatingSessionSerializer
from core.permissions import IsUltraAdmin

class IsPremiumIotEnabled(permissions.BasePermission):
    """
    Custom permission: Επιτρέπει πρόσβαση ΜΟΝΟ αν το κτίριο έχει ενεργό Premium IoT Plan.
    Για την ώρα, περιορίζεται σε Ultra Admins και Demo Buildings.
    """
    def has_permission(self, request, view):
        # 1. Ultra Admins bypass checks
        if request.user.is_superuser or getattr(request.user, 'is_staff', False):
            return True

        # 2. Check Plan Features (Mock implementation for now)
        # TODO: Integrate with billing.PlanFeatureMiddleware
        return False  # Default deny for now as requested

class HeatingDeviceViewSet(viewsets.ModelViewSet):
    queryset = HeatingDevice.objects.all()
    serializer_class = HeatingDeviceSerializer
    permission_classes = [permissions.IsAuthenticated, IsPremiumIotEnabled]

    def get_queryset(self):
        # Filter by user's building access
        return HeatingDevice.objects.filter(building__in=self.request.user.buildings.all())

    @action(detail=True, methods=['post'])
    def report_status(self, request, pk=None):
        """
        Endpoint για τις συσκευές (Webhook).
        Καλέιται όταν η συσκευή αλλάζει state (ON/OFF).
        """
        device = self.get_object()
        state = request.data.get('state', '').lower() == 'on'
        timestamp = timezone.now()

        # Log telemetry
        TelemetryLog.objects.create(device=device, payload=request.data)

        device.last_seen = timestamp

        if state and not device.current_status:
            # Turned ON -> Start Session
            HeatingSession.objects.create(device=device, started_at=timestamp)
            device.current_status = True

        elif not state and device.current_status:
            # Turned OFF -> End Session
            active_session = device.sessions.filter(ended_at__isnull=True).last()
            if active_session:
                active_session.ended_at = timestamp
                active_session.save()
            device.current_status = False

        device.save()
        return Response({'status': 'ok', 'current_state': device.current_status})


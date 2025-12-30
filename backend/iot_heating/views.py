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
    Επιτρέπει staff/superuser και ενεργά IoT κτίρια με ενεργή συνδρομή tenant.
    """
    def has_permission(self, request, view):
        # 1. Admins bypass checks
        if request.user.is_superuser or getattr(request.user, 'is_staff', False):
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        if not self._tenant_subscription_active(request):
            return False

        # Allow if user has access to at least one IoT-enabled building
        try:
            return request.user.buildings.filter(premium_enabled=True, iot_enabled=True).exists()
        except Exception:
            return False

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser or getattr(request.user, 'is_staff', False):
            return True

        if not self._tenant_subscription_active(request):
            return False

        building = getattr(obj, 'building', None)
        if building is None and hasattr(obj, 'device'):
            building = getattr(obj.device, 'building', None)
        if building is None:
            return False

        return bool(getattr(building, 'premium_enabled', False)) and bool(getattr(building, 'iot_enabled', False))

    def _tenant_subscription_active(self, request) -> bool:
        tenant = getattr(request, 'tenant', None)
        if not tenant or getattr(tenant, 'schema_name', None) == 'public':
            return False
        today = timezone.now().date()
        return bool(getattr(tenant, 'is_active', False)) and (
            getattr(tenant, 'on_trial', False)
            or (getattr(tenant, 'paid_until', None) and tenant.paid_until >= today)
        )

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

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import HeatingDevice, HeatingSession, TelemetryLog
from .serializers import HeatingDeviceSerializer, HeatingSessionSerializer
from core.permissions import IsUltraAdmin
from buildings.entitlements import resolve_building_entitlements, resolve_tenant_state

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
            buildings = request.user.buildings.only(
                'id', 'premium_enabled', 'iot_enabled', 'apartments_count', 'trial_ends_at'
            )
            for building in buildings:
                entitlements = resolve_building_entitlements(building, getattr(request, 'tenant', None))
                if entitlements.get('iot_access'):
                    return True
            return False
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

        entitlements = resolve_building_entitlements(building, getattr(request, 'tenant', None))
        return bool(entitlements.get('iot_access'))

    def _tenant_subscription_active(self, request) -> bool:
        tenant_state = resolve_tenant_state(getattr(request, 'tenant', None))
        return bool(tenant_state.get('tenant_subscription_active'))

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

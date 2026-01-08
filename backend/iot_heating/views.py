from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import HeatingDevice, HeatingSession, TelemetryLog, HeatingControlProfile
from .serializers import HeatingDeviceSerializer, HeatingSessionSerializer, HeatingControlProfileSerializer
from buildings.models import Building
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


def _resolve_device_state(payload: dict) -> bool | None:
    raw_value = (
        payload.get('state')
        or payload.get('status')
        or payload.get('is_on')
        or payload.get('current_status')
    )
    if raw_value is None:
        return None
    if isinstance(raw_value, bool):
        return raw_value
    if isinstance(raw_value, (int, float)):
        return bool(raw_value)
    value = str(raw_value).strip().lower()
    if value in {'on', 'true', '1', 'enabled', 'yes'}:
        return True
    if value in {'off', 'false', '0', 'disabled', 'no'}:
        return False
    return None


def _apply_device_state(device: HeatingDevice, is_on: bool | None, timestamp) -> None:
    if is_on is None:
        return
    if is_on and not device.current_status:
        HeatingSession.objects.create(device=device, started_at=timestamp)
        device.current_status = True
        return
    if not is_on and device.current_status:
        active_session = device.sessions.filter(ended_at__isnull=True).last()
        if active_session:
            active_session.ended_at = timestamp
            active_session.save()
        device.current_status = False


def _get_or_create_profile(building: Building) -> HeatingControlProfile:
    profile, _created = HeatingControlProfile.objects.get_or_create(
        building=building,
        defaults={
            'curve_value': 60,
            'min_external_temp': 8,
            'schedule': [],
        },
    )
    return profile


def _build_device_config(device: HeatingDevice, request) -> dict:
    profile = _get_or_create_profile(device.building)
    entitlements = resolve_building_entitlements(device.building, getattr(request, 'tenant', None))
    return {
        'protocol_version': 1,
        'device_id': device.device_id,
        'building_id': device.building_id,
        'iot_enabled': bool(entitlements.get('iot_access')),
        'curve': {
            'value': profile.curve_value,
            'min_external_temp': profile.min_external_temp,
        },
        'schedule': profile.schedule or [],
        'updated_at': profile.updated_at.isoformat() if profile.updated_at else None,
        'server_time': timezone.now().isoformat(),
    }

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
        timestamp = timezone.now()
        payload = request.data if isinstance(request.data, dict) else dict(request.data)

        TelemetryLog.objects.create(device=device, payload=payload)
        device.last_seen = timestamp

        state = _resolve_device_state(payload)
        _apply_device_state(device, state, timestamp)
        device.save()
        return Response({'status': 'ok', 'current_state': device.current_status})


class HeatingControlProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPremiumIotEnabled]

    def get(self, request, building_id):
        building = get_object_or_404(
            Building.objects.filter(id=building_id, id__in=request.user.buildings.values_list('id', flat=True))
        )
        entitlements = resolve_building_entitlements(building, getattr(request, 'tenant', None))
        if not entitlements.get('iot_access'):
            return Response({'detail': 'Η πρόσβαση IoT δεν είναι ενεργή για το κτίριο.'}, status=status.HTTP_403_FORBIDDEN)

        profile = _get_or_create_profile(building)
        serializer = HeatingControlProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request, building_id):
        building = get_object_or_404(
            Building.objects.filter(id=building_id, id__in=request.user.buildings.values_list('id', flat=True))
        )
        entitlements = resolve_building_entitlements(building, getattr(request, 'tenant', None))
        if not entitlements.get('iot_access'):
            return Response({'detail': 'Η πρόσβαση IoT δεν είναι ενεργή για το κτίριο.'}, status=status.HTTP_403_FORBIDDEN)

        profile = _get_or_create_profile(building)
        serializer = HeatingControlProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DeviceSyncView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, device_id):
        device = self._authenticate_device(request, device_id)
        if not device:
            return Response({'detail': 'Unauthorized device.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'config': _build_device_config(device, request)})

    def post(self, request, device_id):
        device = self._authenticate_device(request, device_id)
        if not device:
            return Response({'detail': 'Unauthorized device.'}, status=status.HTTP_401_UNAUTHORIZED)

        timestamp = timezone.now()
        payload = request.data if isinstance(request.data, dict) else dict(request.data)

        payload.pop('api_key', None)
        payload.pop('key', None)

        TelemetryLog.objects.create(device=device, payload=payload)
        device.last_seen = timestamp

        state = _resolve_device_state(payload)
        _apply_device_state(device, state, timestamp)
        device.save()

        return Response({'status': 'ok', 'config': _build_device_config(device, request)})

    def _authenticate_device(self, request, device_id) -> HeatingDevice | None:
        api_key = request.headers.get('X-Device-Key') or request.query_params.get('api_key') or request.data.get('api_key')
        auth_header = request.headers.get('Authorization', '')
        if not api_key and auth_header.lower().startswith('bearer '):
            api_key = auth_header.split(' ', 1)[1].strip()

        if not api_key:
            return None
        try:
            return HeatingDevice.objects.select_related('building').get(device_id=device_id, api_key=api_key)
        except HeatingDevice.DoesNotExist:
            return None

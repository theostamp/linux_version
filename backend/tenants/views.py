# backend/tenants/views.py

from rest_framework import viewsets
from .models import Tenant
from .serializers import TenantSerializer
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsManagerOrSuperuser

from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"message": "CSRF cookie set"})


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, IsManagerOrSuperuser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Tenant.objects.all()
        return Tenant.objects.filter(building__manager=user)

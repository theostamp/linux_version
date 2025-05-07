# backend/buildings/views.py
"""Views for Building management and CSRF token endpoint"""
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated

from .models import Building
from .serializers import BuildingSerializer
from core.permissions import IsManagerOrSuperuser

@ensure_csrf_cookie
def get_csrf_token(request):
    """View to set CSRF cookie in browser"""
    return JsonResponse({"message": "CSRF cookie set"})

class BuildingViewSet(ModelViewSet):
    """CRUD operations for Building model"""
    serializer_class = BuildingSerializer
    permission_classes = [IsAuthenticated, IsManagerOrSuperuser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Building.objects.all()
        # Manager office sees only buildings created by themselves
        return Building.objects.filter(manager=user)
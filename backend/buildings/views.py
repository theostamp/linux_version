from django.shortcuts import render

# Create your views here.
# backend/buildings/views.py

from rest_framework import viewsets
from .models import Building
from .serializers import BuildingSerializer
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsManagerOrSuperuser
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"message": "CSRF cookie set"})



class BuildingViewSet(viewsets.ModelViewSet):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [IsAuthenticated, IsManagerOrSuperuser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        # Ο Manager Office βλέπει μόνο τα κτίρια που έχει δημιουργήσει
        return self.queryset.filter(manager=user)

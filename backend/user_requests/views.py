from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from .models import UserRequest
from .serializers import UserRequestSerializer
from core.permissions import IsResidentOrSuperuser

class UserRequestViewSet(viewsets.ModelViewSet):
    queryset = UserRequest.objects.all()
    serializer_class = UserRequestSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-created_at']  # ✅ πρόσθεσε αυτό
    permission_classes = [IsResidentOrSuperuser]


    def perform_create(self, serializer):
        # attach the creator automatically
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='top')
    def top(self, request):
        """
        GET /api/user-requests/top/
        Returns the 10 requests with the most supporters.
        """
        qs = (
            self.get_queryset()
            .annotate(supporter_count=Count('supporters'))
            .order_by('-supporter_count')[:10]
        )
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

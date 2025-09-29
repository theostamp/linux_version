from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Team, TeamRole, TeamMember, TeamTask, TeamMeeting, TeamPerformance
from .serializers import (
    TeamSerializer, TeamRoleSerializer, TeamMemberSerializer,
    TeamTaskSerializer, TeamMeetingSerializer, TeamPerformanceSerializer
)


class TeamViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['team_type', 'status', 'building']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'member_count']
    ordering = ['name']

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Λήψη μελών ομάδας"""
        team = self.get_object()
        members = team.members.filter(is_active=True)
        serializer = TeamMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Λήψη εργασιών ομάδας"""
        team = self.get_object()
        tasks = team.tasks.all()
        serializer = TeamTaskSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def meetings(self, request, pk=None):
        """Λήψη συναντήσεων ομάδας"""
        team = self.get_object()
        meetings = team.meetings.all()
        serializer = TeamMeetingSerializer(meetings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """Λήψη απόδοσης ομάδας"""
        team = self.get_object()
        performance = team.performance_records.all()
        serializer = TeamPerformanceSerializer(performance, many=True)
        return Response(serializer.data)


class TeamRoleViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = TeamRole.objects.all()
    serializer_class = TeamRoleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role_type', 'is_default']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class TeamMemberViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['team', 'status', 'is_active', 'role']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering_fields = ['joined_at', 'created_at']
    ordering = ['-joined_at']


class TeamTaskViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = TeamTask.objects.all()
    serializer_class = TeamTaskSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['team', 'priority', 'status', 'assigned_to']
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'created_at', 'priority']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Ολοκλήρωση εργασίας"""
        task = self.get_object()
        task.status = 'completed'
        task.save()
        serializer = self.get_serializer(task)
        return Response(serializer.data)


class TeamMeetingViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = TeamMeeting.objects.all()
    serializer_class = TeamMeetingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['team', 'meeting_type', 'is_online']
    search_fields = ['title', 'description']
    ordering_fields = ['scheduled_at', 'created_at']
    ordering = ['-scheduled_at']


class TeamPerformanceViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = TeamPerformance.objects.all()
    serializer_class = TeamPerformanceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['team', 'period_start', 'period_end']
    ordering_fields = ['period_end', 'created_at']
    ordering = ['-period_end'] 
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count, Case, When, IntegerField
from datetime import datetime, timedelta

from .models import Event, EventNote
from .serializers import (
    EventSerializer, EventListSerializer, EventCalendarSerializer,
    EventNoteSerializer
)


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'event_type', 'priority', 'status', 'building', 
        'assigned_to', 'is_recurring'
    ]
    search_fields = ['title', 'description', 'notes']
    ordering_fields = ['created_at', 'scheduled_date', 'due_date', 'priority']
    ordering = ['-priority', 'scheduled_date', '-created_at']

    def get_queryset(self):
        return Event.objects.select_related(
            'building', 'created_by', 'assigned_to'
        ).prefetch_related(
            'apartments', 'event_notes__author'
        ).all()

    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        elif self.action in ['calendar_view', 'upcoming']:
            return EventCalendarSerializer
        return EventSerializer

    @action(detail=False, methods=['get'])
    def pending_count(self, request):
        """Get count of pending events for notification badge"""
        building_id = request.query_params.get('building')
        
        queryset = self.get_queryset().filter(status='pending')
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        count = queryset.count()
        
        return Response({'pending_count': count})

    @action(detail=False, methods=['get'])
    def calendar_view(self, request):
        """Get events for calendar display"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        building_id = request.query_params.get('building')
        
        queryset = self.get_queryset()
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                
                queryset = queryset.filter(
                    Q(scheduled_date__range=(start, end)) |
                    Q(due_date__range=(start, end))
                )
            except ValueError:
                return Response(
                    {'error': 'Invalid date format'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming events (next 7 days)"""
        building_id = request.query_params.get('building')
        days = int(request.query_params.get('days', 7))
        
        end_date = timezone.now() + timedelta(days=days)
        
        queryset = self.get_queryset().filter(
            Q(scheduled_date__lte=end_date) | Q(due_date__lte=end_date),
            status__in=['pending', 'in_progress']
        )
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue events"""
        building_id = request.query_params.get('building')
        
        now = timezone.now()
        queryset = self.get_queryset().filter(
            due_date__lt=now,
            status__in=['pending', 'in_progress']
        )
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        serializer = EventListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get event statistics"""
        building_id = request.query_params.get('building')
        
        queryset = self.get_queryset()
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        stats = queryset.aggregate(
            total=Count('id'),
            pending=Count(Case(When(status='pending', then=1), output_field=IntegerField())),
            in_progress=Count(Case(When(status='in_progress', then=1), output_field=IntegerField())),
            completed=Count(Case(When(status='completed', then=1), output_field=IntegerField())),
            overdue=Count(Case(
                When(due_date__lt=timezone.now(), status__in=['pending', 'in_progress'], then=1), 
                output_field=IntegerField()
            ))
        )
        
        # Event type breakdown
        type_stats = queryset.values('event_type').annotate(count=Count('id'))
        
        return Response({
            'overview': stats,
            'by_type': type_stats
        })

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark event as completed"""
        event = self.get_object()
        event.status = 'completed'
        event.completed_at = timezone.now()
        event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_in_progress(self, request, pk=None):
        """Mark event as in progress"""
        event = self.get_object()
        event.status = 'in_progress'
        event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule an event"""
        event = self.get_object()
        new_date = request.data.get('scheduled_date')
        
        if not new_date:
            return Response(
                {'error': 'scheduled_date is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            event.scheduled_date = datetime.fromisoformat(new_date.replace('Z', '+00:00'))
            event.save()
            
            serializer = self.get_serializer(event)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {'error': 'Invalid date format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EventNoteViewSet(viewsets.ModelViewSet):
    serializer_class = EventNoteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['event', 'is_internal']
    ordering = ['-created_at']

    def get_queryset(self):
        return EventNote.objects.select_related('event', 'author').all()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
from django.contrib import admin
from .models import Event, EventNote


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'event_type', 'priority', 'status', 
        'building', 'scheduled_date', 'due_date', 
        'created_by', 'assigned_to', 'created_at'
    ]
    list_filter = [
        'event_type', 'priority', 'status', 'building', 
        'is_recurring', 'created_at', 'scheduled_date'
    ]
    search_fields = ['title', 'description', 'notes', 'building__name']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'event_type', 'priority', 'status')
        }),
        ('Κτίριο & Διαμερίσματα', {
            'fields': ('building', 'apartments')
        }),
        ('Χρήστες', {
            'fields': ('created_by', 'assigned_to')
        }),
        ('Ημερομηνίες', {
            'fields': ('scheduled_date', 'due_date', 'completed_at')
        }),
        ('Επικοινωνία', {
            'fields': ('contact_phone', 'contact_email')
        }),
        ('Επανάληψη', {
            'fields': ('is_recurring', 'recurrence_pattern'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Σύστημα', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    filter_horizontal = ['apartments']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'building', 'created_by', 'assigned_to'
        ).prefetch_related('apartments')


@admin.register(EventNote)
class EventNoteAdmin(admin.ModelAdmin):
    list_display = ['event', 'author', 'created_at', 'is_internal']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['content', 'event__title', 'author__email']
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('event', 'author')
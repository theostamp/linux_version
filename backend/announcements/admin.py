# backend/announcements/admin.py

from django.contrib import admin 
from .models import Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'building', 'author', 'priority', 'is_urgent', 'published', 'is_active', 'status_display', 'created_at')
    list_filter = ('building', 'published', 'is_active', 'is_urgent', 'priority', 'created_at')
    search_fields = ('title', 'description', 'author__email', 'building__name')
    ordering = ('-priority', '-created_at')
    readonly_fields = ('created_at', 'updated_at', 'is_currently_active', 'days_remaining')
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'author')
        }),
        ('Κατάσταση', {
            'fields': ('published', 'is_active', 'is_urgent', 'priority')
        }),
        ('Ημερομηνίες', {
            'fields': ('start_date', 'end_date', 'created_at', 'updated_at')
        }),
        ('Επισύναψη', {
            'fields': ('file',),
            'classes': ('collapse',)
        }),
        ('Πληροφορίες', {
            'fields': ('is_currently_active', 'days_remaining'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(building__manager=request.user)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "building" and not request.user.is_superuser:
            if "queryset" in kwargs:
                kwargs["queryset"] = kwargs["queryset"].filter(manager=request.user)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if not change:  # Αν είναι νέα ανακοίνωση
            obj.author = request.user
        super().save_model(request, obj, form, change)

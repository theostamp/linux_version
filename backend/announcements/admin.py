# backend/announcements/admin.py

from django.contrib import admin # type: ignore  # type: ignore  # type: ignore
from .models import Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'building', 'published', 'created_at')
    list_filter = ('building', 'published')
    search_fields = ('title', 'description')
    ordering = ('-created_at',)

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

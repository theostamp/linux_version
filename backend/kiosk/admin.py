from django.contrib import admin
from .models import KioskWidget, KioskDisplaySettings


@admin.register(KioskWidget)
class KioskWidgetAdmin(admin.ModelAdmin):
    list_display = [
        'widget_id',
        'greek_name',
        'category',
        'enabled',
        'is_custom',
        'building',
        'created_at',
        'updated_at'
    ]
    list_filter = ['enabled', 'is_custom', 'category', 'created_at', 'updated_at']
    search_fields = ['widget_id', 'name', 'greek_name', 'building__name']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Widget Information', {
            'fields': ('widget_id', 'name', 'greek_name', 'description', 'greek_description')
        }),
        ('Configuration', {
            'fields': ('category', 'icon', 'enabled', 'order', 'component', 'data_source')
        }),
        ('Settings', {
            'fields': ('settings',),
            'classes': ('wide',)
        }),
        ('Metadata', {
            'fields': ('is_custom', 'building', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(KioskDisplaySettings)
class KioskDisplaySettingsAdmin(admin.ModelAdmin):
    list_display = [
        'building',
        'slide_duration',
        'auto_slide',
        'show_navigation',
        'theme',
        'updated_at'
    ]
    list_filter = ['auto_slide', 'show_navigation', 'theme', 'updated_at']
    search_fields = ['building__name', 'building__address']
    readonly_fields = ['created_at', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Building', {
            'fields': ('building',)
        }),
        ('Display Settings', {
            'fields': ('slide_duration', 'auto_slide', 'show_navigation')
        }),
        ('Appearance', {
            'fields': ('background_image', 'theme')
        }),
        ('Metadata', {
            'fields': ('updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
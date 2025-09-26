from django.contrib import admin
from .models import KioskWidgetConfig


@admin.register(KioskWidgetConfig)
class KioskWidgetConfigAdmin(admin.ModelAdmin):
    list_display = [
        'building',
        'building_name',
        'enabled_widgets_count',
        'total_widgets_count',
        'created_at',
        'updated_at'
    ]
    list_filter = ['created_at', 'updated_at']
    search_fields = ['building__name', 'building__address']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
    
    fieldsets = (
        ('Building', {
            'fields': ('building',)
        }),
        ('Configuration', {
            'fields': ('config',),
            'classes': ('wide',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def building_name(self, obj):
        return obj.building.name
    building_name.short_description = 'Building Name'

    def enabled_widgets_count(self, obj):
        return len(obj.get_enabled_widgets())
    enabled_widgets_count.short_description = 'Enabled Widgets'

    def total_widgets_count(self, obj):
        return len(obj.widgets)
    total_widgets_count.short_description = 'Total Widgets'

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
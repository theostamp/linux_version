# backend/buildings/admin.py
# backend/buildings/admin.py

from django.contrib import admin
from .models import Building

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'city', 'postal_code', 'manager')
    search_fields = ('name', 'address', 'city')
    list_filter = ('city',)

    exclude = ('manager',)

    fieldsets = (
        ('Βασικά Στοιχεία Κτιρίου', {
            'fields': ('name', 'address', 'city', 'postal_code', 'apartments_count')
        }),
        ('Στοιχεία Εσωτερικού Διαχειριστή', {
            'fields': ('internal_manager_name', 'internal_manager_phone'),
            'classes': ('collapse',),  # Κάνει το section collapsible
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(manager=request.user)

    def save_model(self, request, obj, form, change):
        if not change or not obj.manager:
            obj.manager = request.user
        obj.save()

from django.contrib import admin
from .models import Apartment


@admin.register(Apartment)
class ApartmentAdmin(admin.ModelAdmin):
    list_display = [
        'building',
        'number',
        'identifier',
        'floor',
        'owner_name',
        'ownership_percentage',
        'occupant_name',
        'status_display',
        'created_at'
    ]
    
    list_filter = [
        'building',
        'floor',
        'is_rented',
        'created_at'
    ]
    
    search_fields = [
        'number',
        'identifier',
        'owner_name',
        'tenant_name',
        'owner_email',
        'tenant_email'
    ]
    
    fieldsets = (
        ('Βασικά Στοιχεία', {
            'fields': ('building', 'number', 'identifier', 'floor', 'square_meters', 'bedrooms')
        }),
        ('Στοιχεία Ιδιοκτήτη', {
            'fields': ('owner_name', 'owner_phone', 'owner_email', 'owner_user', 'ownership_percentage')
        }),
        ('Στοιχεία Ενοικίασης', {
            'fields': ('is_rented', 'tenant_name', 'tenant_phone', 'tenant_email', 'tenant_user', 'rent_start_date', 'rent_end_date')
        }),
        ('Επιπλέον Πληροφορίες', {
            'fields': ('notes',),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def occupant_name(self, obj):
        return obj.occupant_name
    occupant_name.short_description = 'Κάτοικος'
    
    def status_display(self, obj):
        return obj.status_display
    status_display.short_description = 'Κατάσταση' 
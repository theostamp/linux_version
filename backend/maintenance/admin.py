from django.contrib import admin
from .models import Contractor, ServiceReceipt, ScheduledMaintenance

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'contact_person', 'phone', 'rating', 'is_active']
    list_filter = ['service_type', 'is_active', 'rating']
    search_fields = ['name', 'contact_person', 'phone', 'email']
    list_editable = ['is_active', 'rating']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('name', 'service_type', 'contact_person', 'phone', 'email')
        }),
        ('Επιπλέον Πληροφορίες', {
            'fields': ('address', 'tax_number', 'rating', 'notes')
        }),
        ('Κατάσταση', {
            'fields': ('is_active',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ServiceReceipt)
class ServiceReceiptAdmin(admin.ModelAdmin):
    list_display = ['contractor', 'building', 'service_date', 'amount', 'payment_status', 'created_by']
    list_filter = ['payment_status', 'service_date', 'contractor__service_type']
    search_fields = ['contractor__name', 'building__name', 'description', 'invoice_number']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'service_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('contractor', 'building', 'service_date', 'amount')
        }),
        ('Περιγραφή', {
            'fields': ('description', 'invoice_number')
        }),
        ('Αρχείο', {
            'fields': ('receipt_file',)
        }),
        ('Κατάσταση Εισπράξεως', {
            'fields': ('payment_status', 'payment_date')
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ScheduledMaintenance)
class ScheduledMaintenanceAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'scheduled_date', 'priority', 'status', 'contractor']
    list_filter = ['status', 'priority', 'scheduled_date', 'building']
    search_fields = ['title', 'building__name', 'contractor__name', 'location']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'scheduled_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'scheduled_date')
        }),
        ('Συνεργείο & Προτεραιότητα', {
            'fields': ('contractor', 'priority', 'status')
        }),
        ('Χρόνος & Κόστος', {
            'fields': ('estimated_duration', 'estimated_cost', 'actual_cost')
        }),
        ('Τοποθεσία & Σημειώσεις', {
            'fields': ('location', 'notes')
        }),
        ('Ολοκλήρωση', {
            'fields': ('completed_at',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

from django.contrib import admin
from .models import Project, Offer, Contract

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'project_type', 'status', 'budget', 'start_date']
    list_filter = ['project_type', 'status', 'start_date', 'building']
    search_fields = ['title', 'building__name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'project_type')
        }),
        ('Κατάσταση & Ημερομηνίες', {
            'fields': ('status', 'start_date', 'end_date', 'estimated_duration')
        }),
        ('Οικονομικά', {
            'fields': ('budget', 'actual_cost')
        }),
        ('Περιγραφή', {
            'fields': ('location', 'specifications', 'requirements', 'notes')
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ['project', 'contractor', 'amount', 'delivery_time', 'status', 'submitted_date']
    list_filter = ['status', 'submitted_date', 'project__project_type']
    search_fields = ['project__title', 'contractor__name', 'description']
    readonly_fields = ['submitted_date']
    date_hierarchy = 'submitted_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('project', 'contractor', 'amount', 'description')
        }),
        ('Τεχνικές Προδιαγραφές', {
            'fields': ('technical_specifications', 'delivery_time', 'warranty_period')
        }),
        ('Κατάσταση & Αξιολόγηση', {
            'fields': ('status', 'evaluation_date', 'evaluation_notes', 'evaluation_score')
        }),
        ('Αρχείο', {
            'fields': ('offer_file',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'submitted_date'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['contract_number', 'title', 'contractor', 'contract_type', 'status', 'amount']
    list_filter = ['contract_type', 'status', 'start_date', 'end_date']
    search_fields = ['contract_number', 'title', 'contractor__name', 'project__title']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('contract_number', 'title', 'description', 'project', 'contractor')
        }),
        ('Συμβόλαιο', {
            'fields': ('offer', 'contract_type', 'amount')
        }),
        ('Ημερομηνίες & Κατάσταση', {
            'fields': ('start_date', 'end_date', 'status')
        }),
        ('Όροι', {
            'fields': ('payment_terms', 'warranty_terms')
        }),
        ('Αρχείο', {
            'fields': ('contract_file',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

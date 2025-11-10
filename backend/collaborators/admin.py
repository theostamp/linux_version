from django.contrib import admin
from .models import (
    Collaborator, CollaborationProject, CollaborationContract, 
    CollaborationInvoice, CollaborationMeeting, CollaboratorPerformance
)


@admin.register(Collaborator)
class CollaboratorAdmin(admin.ModelAdmin):
    list_display = ['name', 'collaborator_type', 'status', 'rating', 'availability', 'created_at']
    list_filter = ['collaborator_type', 'status', 'availability', 'created_at']
    search_fields = ['name', 'contact_person', 'email', 'phone']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('name', 'collaborator_type', 'description')
        }),
        ('Επικοινωνία', {
            'fields': ('contact_person', 'phone', 'email', 'address')
        }),
        ('Επιχειρηματικά Στοιχεία', {
            'fields': ('tax_number', 'vat_number', 'website'),
            'classes': ('collapse',)
        }),
        ('Κατάσταση & Αξιολόγηση', {
            'fields': ('status', 'rating', 'availability', 'hourly_rate')
        }),
        ('Εξειδικεύσεις', {
            'fields': ('expertise_areas',),
            'classes': ('collapse',)
        }),
        ('Χρονικές Στοιχείες', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )


@admin.register(CollaborationProject)
class CollaborationProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'collaborator', 'project_type', 'status', 'start_date', 'end_date', 'budget']
    list_filter = ['project_type', 'status', 'start_date', 'end_date']
    search_fields = ['title', 'description', 'collaborator__name']
    readonly_fields = ['progress_percentage', 'created_at', 'updated_at']
    date_hierarchy = 'start_date'
    fieldsets = (
        ('Έργο', {
            'fields': ('title', 'description', 'project_type', 'building', 'collaborator')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'progress_percentage')
        }),
        ('Ημερομηνίες', {
            'fields': ('start_date', 'end_date')
        }),
        ('Οικονομικά', {
            'fields': ('budget', 'actual_cost'),
            'classes': ('collapse',)
        }),
        ('Διαχείριση', {
            'fields': ('project_manager', 'deliverables', 'milestones'),
            'classes': ('collapse',)
        }),
        ('Χρονικές Στοιχείες', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )


@admin.register(CollaborationContract)
class CollaborationContractAdmin(admin.ModelAdmin):
    list_display = ['contract_number', 'title', 'collaborator', 'contract_type', 'status', 'total_value', 'is_active']
    list_filter = ['contract_type', 'status', 'start_date', 'end_date']
    search_fields = ['contract_number', 'title', 'collaborator__name']
    readonly_fields = ['is_active', 'days_remaining', 'created_at', 'updated_at']
    date_hierarchy = 'start_date'
    fieldsets = (
        ('Συμβόλαιο', {
            'fields': ('contract_number', 'title', 'contract_type', 'collaborator', 'building')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'is_active', 'days_remaining')
        }),
        ('Ημερομηνίες', {
            'fields': ('start_date', 'end_date')
        }),
        ('Οικονομικά', {
            'fields': ('total_value', 'payment_terms'),
            'classes': ('collapse',)
        }),
        ('Περιεχόμενο', {
            'fields': ('scope_of_work', 'deliverables', 'terms_conditions'),
            'classes': ('collapse',)
        }),
        ('Αρχεία', {
            'fields': ('contract_file',),
            'classes': ('collapse',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )


@admin.register(CollaborationInvoice)
class CollaborationInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'collaborator', 'contract', 'issue_date', 'due_date', 'total_amount', 'status']
    list_filter = ['status', 'issue_date', 'due_date']
    search_fields = ['invoice_number', 'collaborator__name', 'contract__contract_number']
    readonly_fields = ['total_amount', 'created_at', 'updated_at']
    date_hierarchy = 'issue_date'
    fieldsets = (
        ('Τιμολόγιο', {
            'fields': ('invoice_number', 'contract', 'collaborator')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'payment_date')
        }),
        ('Ημερομηνίες', {
            'fields': ('issue_date', 'due_date')
        }),
        ('Οικονομικά', {
            'fields': ('amount', 'vat_amount', 'total_amount')
        }),
        ('Περιγραφή', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Αρχεία', {
            'fields': ('invoice_file',),
            'classes': ('collapse',)
        }),
        ('Χρονικές Στοιχείες', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )


@admin.register(CollaborationMeeting)
class CollaborationMeetingAdmin(admin.ModelAdmin):
    list_display = ['title', 'collaborator', 'meeting_type', 'scheduled_at', 'duration', 'is_online', 'created_at']
    list_filter = ['meeting_type', 'is_online', 'scheduled_at']
    search_fields = ['title', 'collaborator__name', 'project__title']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'scheduled_at'
    fieldsets = (
        ('Συνάντηση', {
            'fields': ('title', 'meeting_type', 'collaborator', 'project')
        }),
        ('Προγραμματισμός', {
            'fields': ('scheduled_at', 'duration', 'location')
        }),
        ('Διαδικτυακή', {
            'fields': ('is_online', 'meeting_link'),
            'classes': ('collapse',)
        }),
        ('Περιεχόμενο', {
            'fields': ('agenda', 'minutes'),
            'classes': ('collapse',)
        }),
        ('Παρευρισκόμενοι', {
            'fields': ('attendees',),
            'classes': ('collapse',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CollaboratorPerformance)
class CollaboratorPerformanceAdmin(admin.ModelAdmin):
    list_display = ['collaborator', 'period_start', 'period_end', 'completion_rate', 'average_rating', 'created_at']
    list_filter = ['period_start', 'period_end', 'created_at']
    search_fields = ['collaborator__name', 'notes']
    readonly_fields = ['completion_rate', 'created_at']
    date_hierarchy = 'period_end'
    fieldsets = (
        ('Συνεργάτης & Περίοδος', {
            'fields': ('collaborator', 'period_start', 'period_end')
        }),
        ('Αποτελέσματα', {
            'fields': ('projects_completed', 'projects_total', 'completion_rate')
        }),
        ('Αξιολογήσεις', {
            'fields': ('average_rating', 'on_time_delivery_rate', 'quality_score', 'communication_score'),
            'classes': ('collapse',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes', 'created_at'),
            'classes': ('collapse',)
        }),
    ) 
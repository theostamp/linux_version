from django.contrib import admin
from .models import Contractor, ServiceReceipt, ScheduledMaintenance, PaymentSchedule, PaymentInstallment, PaymentReceipt, MaintenanceTicket, WorkOrder

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

@admin.register(MaintenanceTicket)
class MaintenanceTicketAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'category', 'priority', 'status', 'reporter', 'assignee']
    list_filter = ['status', 'priority', 'category', 'building']
    search_fields = ['title', 'description', 'building__name', 'reporter__email']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'

@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'contractor', 'status', 'scheduled_at', 'cost_estimate']
    list_filter = ['status', 'scheduled_at']
    search_fields = ['ticket__title', 'contractor__name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(PaymentSchedule)
class PaymentScheduleAdmin(admin.ModelAdmin):
    list_display = ['scheduled_maintenance', 'payment_type', 'total_amount', 'number_of_installments', 'status']
    list_filter = ['payment_type', 'status', 'created_at']
    search_fields = ['scheduled_maintenance__title', 'scheduled_maintenance__building__name']
    readonly_fields = ['created_at', 'updated_at', 'installment_amount']
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('scheduled_maintenance', 'payment_type', 'total_amount')
        }),
        ('Ρυθμίσεις Πληρωμής', {
            'fields': ('number_of_installments', 'installment_amount', 'payment_frequency_days', 'start_date', 'end_date')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'notes')
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(PaymentInstallment)
class PaymentInstallmentAdmin(admin.ModelAdmin):
    list_display = ['payment_schedule', 'installment_number', 'amount', 'due_date', 'status', 'paid_date']
    list_filter = ['status', 'due_date', 'paid_date']
    search_fields = ['payment_schedule__scheduled_maintenance__title', 'notes']
    readonly_fields = ['created_at', 'updated_at', 'is_overdue']
    date_hierarchy = 'due_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('payment_schedule', 'installment_number', 'amount')
        }),
        ('Ημερομηνίες', {
            'fields': ('due_date', 'paid_date')
        }),
        ('Πληρωμή', {
            'fields': ('paid_amount', 'payment_method', 'transaction_reference')
        }),
        ('Κατάσταση', {
            'fields': ('status', 'is_overdue')
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Χρονικές Στιγμές', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_paid', 'mark_as_cancelled']
    
    def mark_as_paid(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(
            status='paid',
            paid_date=timezone.now().date()
        )
        self.message_user(request, f"{updated} δόσεις σημάνθηκαν ως πληρωμένες.")
    mark_as_paid.short_description = "Σήμανση ως πληρωμένες"
    
    def mark_as_cancelled(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f"{updated} δόσεις ακυρώθηκαν.")
    mark_as_cancelled.short_description = "Ακύρωση δόσεων"

@admin.register(PaymentReceipt)
class PaymentReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'scheduled_maintenance', 'contractor', 'amount', 'payment_date', 'status']
    list_filter = ['status', 'receipt_type', 'payment_date', 'issue_date', 'contractor']
    search_fields = ['receipt_number', 'scheduled_maintenance__title', 'contractor__name', 'description']
    readonly_fields = ['receipt_number', 'issue_date', 'created_at', 'updated_at', 'contractor_signature_date', 'contractor_signature_ip']
    date_hierarchy = 'payment_date'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('scheduled_maintenance', 'installment', 'contractor', 'receipt_type', 'receipt_number', 'amount', 'payment_date')
        }),
        ('Περιγραφή', {
            'fields': ('description',)
        }),
        ('Κατάσταση', {
            'fields': ('status', 'approved_by', 'approved_at', 'archived_at')
        }),
        ('Ψηφιακή Υπογραφή', {
            'fields': ('contractor_signature', 'contractor_signature_date', 'contractor_signature_ip'),
            'classes': ('collapse',)
        }),
        ('Αρχεία', {
            'fields': ('receipt_file', 'contractor_invoice', 'pdf_file')
        }),
        ('Οικονομικά', {
            'fields': ('linked_expense',)
        }),
        ('Σημειώσεις', {
            'fields': ('notes',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'issue_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_issued', 'mark_as_approved']
    
    def mark_as_issued(self, request, queryset):
        updated = queryset.update(status='issued')
        self.message_user(request, f"{updated} αποδείξεις σημάνθηκαν ως εκδοθείσες.")
    mark_as_issued.short_description = "Σήμανση ως εκδοθείσες"
    
    def mark_as_approved(self, request, queryset):
        updated = queryset.update(status='approved')
        self.message_user(request, f"{updated} αποδείξεις σημάνθηκαν ως εγκεκριμένες.")
    mark_as_approved.short_description = "Σήμανση ως εγκεκριμένες"

from django.contrib import admin
from .models import Project, Offer, OfferFile, ProjectVote, ProjectExpense


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'status', 'priority', 'estimated_cost', 'created_at']
    list_filter = ['status', 'priority', 'created_at', 'building']
    search_fields = ['title', 'building__name', 'description', 'selected_contractor']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('title', 'description', 'building', 'priority')
        }),
        ('Κατάσταση & Ημερομηνίες', {
            'fields': ('status', 'deadline', 'tender_deadline', 'general_assembly_date')
        }),
        ('Οικονομικά', {
            'fields': ('estimated_cost', 'final_cost', 'payment_terms')
        }),
        ('Αποτελέσματα', {
            'fields': ('selected_contractor',)
        }),
        ('Δημιουργία', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ['contractor_name', 'project', 'amount', 'status', 'submitted_at']
    list_filter = ['status', 'submitted_at', 'project__status']
    search_fields = ['project__title', 'contractor_name', 'description']
    readonly_fields = ['submitted_at']
    date_hierarchy = 'submitted_at'
    
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('project', 'contractor_name', 'amount', 'description')
        }),
        ('Στοιχεία Συνεργείου', {
            'fields': ('contractor_contact', 'contractor_phone', 'contractor_email', 'contractor_address')
        }),
        ('Προσφορά', {
            'fields': ('payment_terms', 'warranty_period', 'completion_time')
        }),
        ('Κατάσταση & Αξιολόγηση', {
            'fields': ('status', 'reviewed_at', 'notes', 'reviewed_by')
        }),
        ('Δημιουργία', {
            'fields': ('submitted_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(OfferFile)
class OfferFileAdmin(admin.ModelAdmin):
    list_display = ['filename', 'offer', 'file_type', 'file_size', 'uploaded_at']
    list_filter = ['file_type', 'uploaded_at', 'offer__project']
    search_fields = ['filename', 'offer__contractor_name', 'offer__project__title']
    readonly_fields = ['uploaded_at', 'file_size']
    date_hierarchy = 'uploaded_at'


@admin.register(ProjectVote)
class ProjectVoteAdmin(admin.ModelAdmin):
    list_display = ['voter_name', 'apartment', 'project', 'vote_type', 'participation_mills', 'voted_at']
    list_filter = ['vote_type', 'voted_at', 'project__status']
    search_fields = ['voter_name', 'apartment', 'project__title']
    readonly_fields = ['voted_at']
    date_hierarchy = 'voted_at'


@admin.register(ProjectExpense)
class ProjectExpenseAdmin(admin.ModelAdmin):
    list_display = ['description', 'project', 'expense_type', 'amount', 'expense_date']
    list_filter = ['expense_type', 'expense_date', 'project__status']
    search_fields = ['description', 'project__title']
    readonly_fields = ['created_at']
    date_hierarchy = 'expense_date'

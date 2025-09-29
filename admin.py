from django.contrib import admin
from .models import DocumentUpload

@admin.register(DocumentUpload)
class DocumentUploadAdmin(admin.ModelAdmin):
    list_display = ('id', 'building', 'uploaded_by', 'status', 'original_file', 'created_at')
    list_filter = ('status', 'building', 'created_at')
    search_fields = ('building__name', 'uploaded_by__email')
    readonly_fields = (
        'created_at', 
        'updated_at', 
        'raw_text', 
        'extracted_data', 
        'linked_object',
        'content_type',
        'object_id',
        'error_message'
    )
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': ('building', 'uploaded_by', 'original_file', 'status')
        }),
        ('Επεξεργασμένα Δεδομένα (AI)', {
            'fields': ('raw_text', 'extracted_data'),
            'classes': ('collapse',)
        }),
        ('Σύνδεση & Σφάλματα', {
            'fields': ('content_type', 'object_id', 'error_message')
        }),
        ('Χρονικές Σφραγίδες', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
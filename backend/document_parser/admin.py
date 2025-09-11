from django.contrib import admin
from .models import DocumentUpload


@admin.register(DocumentUpload)
class DocumentUploadAdmin(admin.ModelAdmin):
    list_display = [
        'original_filename', 
        'building', 
        'uploaded_by', 
        'status', 
        'created_at'
    ]
    list_filter = ['status', 'building', 'created_at']
    search_fields = ['original_filename', 'building__name']
    readonly_fields = ['created_at', 'updated_at', 'processing_started_at', 'processing_completed_at']
    
    fieldsets = (
        ('Document Information', {
            'fields': ('building', 'uploaded_by', 'file', 'original_filename', 'file_size', 'mime_type')
        }),
        ('Processing Status', {
            'fields': ('status', 'processing_started_at', 'processing_completed_at', 'error_message')
        }),
        ('AI Analysis Results', {
            'fields': ('raw_analysis', 'extracted_data', 'confidence_score'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )



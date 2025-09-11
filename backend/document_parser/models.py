from django.db import models
from django.contrib.auth import get_user_model
from buildings.models import Building

User = get_user_model()


class DocumentUpload(models.Model):
    """Model for storing uploaded documents and their processing status"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='document_uploads'
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_documents'
    )
    file = models.FileField(upload_to='documents/')
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    
    # Processing status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    
    # AI Analysis results
    raw_analysis = models.JSONField(null=True, blank=True)
    extracted_data = models.JSONField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    
    # Error handling
    error_message = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Document Upload'
        verbose_name_plural = 'Document Uploads'
    
    def __str__(self):
        return f"{self.original_filename} - {self.get_status_display()}"



from django.db import models
from django.conf import settings
from tenants.models import TenantAwareModel
from buildings.models import Building

class DocumentUpload(TenantAwareModel):
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('processing', 'Σε Επεξεργασία'),
        ('awaiting_confirmation', 'Αναμονή Επιβεβαίωσης'),
        ('completed', 'Ολοκληρώθηκε'),
        ('failed', 'Απέτυχε'),
    ]

    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='document_uploads')
    original_file = models.FileField(upload_to='document_uploads/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # AI Processing fields
    extracted_data = models.JSONField(null=True, blank=True)
    raw_analysis = models.JSONField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)

    # Confirmation and Linking
    confirmed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='confirmed_documents')
    confirmed_at = models.DateTimeField(null=True, blank=True)
    
    # 🔗 Η ΚΡΙΣΙΜΗ ΣΥΝΔΕΣΗ
    linked_expense = models.OneToOneField(
        'financial.Expense',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_document',
        verbose_name="Συνδεδεμένη Δαπάνη"
    )

    def __str__(self):
        return f"Παραστατικό: {self.original_filename} ({self.get_status_display()})"
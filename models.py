from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from buildings.models import Building
from users.models import CustomUser

class DocumentUpload(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί Επεξεργασία'),
        ('processing', 'Σε Εξέλιξη'),
        ('awaiting_confirmation', 'Αναμονή Επιβεβαίωσης'),
        ('completed', 'Ολοκληρώθηκε'),
        ('failed', 'Αποτυχία'),
    ]

    building = models.ForeignKey(Building, on_delete=models.CASCADE, verbose_name="Κτίριο")
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, verbose_name="Χρήστης")
    original_file = models.FileField(upload_to='document_uploads/%Y/%m/', verbose_name="Αρχικό Αρχείο")
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending', verbose_name="Κατάσταση")
    
    # Δεδομένα από το AI
    raw_text = models.TextField(blank=True, null=True, verbose_name="Ακατέργαστο Κείμενο (OCR)")
    extracted_data = models.JSONField(blank=True, null=True, verbose_name="Εξαγόμενα Δεδομένα")
    
    # Σύνδεση με το τελικό αντικείμενο (π.χ. Expense, Payment)
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    linked_object = GenericForeignKey('content_type', 'object_id')

    error_message = models.TextField(blank=True, null=True, verbose_name="Μήνυμα Σφάλματος")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ανέβασμα Εγγράφου"
        verbose_name_plural = "Ανεβάσματα Εγγράφων"
        ordering = ['-created_at']

    def __str__(self):
        return f"Έγγραφο {self.id} για το κτίριο {self.building.name}"
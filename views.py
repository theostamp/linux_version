from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from .models import DocumentUpload
from .serializers import DocumentUploadSerializer
from .tasks import process_document

class DocumentUploadViewSet(viewsets.ModelViewSet):
    """
    API endpoint για το ανέβασμα και τη διαχείριση εγγράφων για ανάλυση από AI.
    """
    queryset = DocumentUpload.objects.all().order_by('-created_at')
    serializer_class = DocumentUploadSerializer
    parser_classes = (MultiPartParser, FormParser)  # Για να δέχεται file uploads

    def get_queryset(self):
        """
        Επιστρέφει τα έγγραφα που ανήκουν στο τρέχον tenant (κτίριο).
        Η django-tenants φιλτράρει αυτόματα τα δεδομένα.
        """
        return DocumentUpload.objects.select_related('building', 'uploaded_by').all()

    def perform_create(self, serializer):
        """
        Κατά τη δημιουργία, θέτει τον χρήστη που ανέβασε το αρχείο
        και ξεκινά την ασύγχρονη εργασία επεξεργασίας.
        """
        instance = serializer.save(uploaded_by=self.request.user)
        
        # Ξεκινά την ασύγχρονη επεξεργασία του εγγράφου στο background
        process_document.delay(instance.id)
from celery import shared_task
from .models import DocumentUpload
from .services import GoogleDocumentAIService # Υποθέτουμε ότι υπάρχει αυτό το service
import logging

logger = logging.getLogger(__name__)

@shared_task
def process_document_ai(document_id):
    """
    Ασύγχρονο task για την επεξεργασία ενός εγγράφου μέσω του Google Document AI.
    """
    try:
        doc = DocumentUpload.objects.get(id=document_id)
        doc.status = 'processing'
        doc.save(update_fields=['status'])

        logger.info(f"Starting AI processing for document: {document_id}")

        # Υποθετική κλήση στο service της Google
        service = GoogleDocumentAIService()
        extracted_data, raw_text = service.parse_document(doc.original_file.path)

        doc.extracted_data = extracted_data
        doc.raw_text = raw_text
        doc.status = 'awaiting_confirmation'
        doc.save(update_fields=['extracted_data', 'raw_text', 'status'])

        logger.info(f"Successfully processed document: {document_id}")
        # Εδώ μπορεί να σταλεί μια WebSocket ειδοποίηση στον χρήστη

    except DocumentUpload.DoesNotExist:
        logger.error(f"Document with id {document_id} not found for AI processing.")
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}", exc_info=True)
        if 'doc' in locals():
            doc.status = 'failed'
            doc.error_message = str(e)
            doc.save(update_fields=['status', 'error_message'])
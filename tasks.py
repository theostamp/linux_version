from celery import shared_task
from .models import DocumentUpload
from .services import GoogleDocumentAIService
import os
import mimetypes
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_document(self, document_id):
    """
    Ασύγχρονη εργασία Celery για την επεξεργασία ενός εγγράφου με AI.
    Περιλαμβάνει λογική για retries σε περίπτωση προσωρινών σφαλμάτων.
    """
    doc = None
    try:
        doc = DocumentUpload.objects.get(id=document_id)
        doc.status = 'processing'
        doc.save(update_fields=['status'])

        # Get file path and mime type
        file_path = doc.original_file.path
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            # Default to a common type if guessing fails, or handle error
            mime_type = 'application/pdf'
            logger.warning(f"Could not guess mime type for {file_path}. Defaulting to {mime_type}.")

        # --- Real AI Service Call ---
        service = GoogleDocumentAIService()
        extracted_data, raw_text = service.parse_document(file_path, mime_type)
        # ----------------------------

        doc.extracted_data = extracted_data
        doc.raw_text = raw_text
        doc.status = 'awaiting_confirmation'
        doc.save(update_fields=['extracted_data', 'raw_text', 'status'])

        # --- Αποστολή ειδοποίησης WebSocket ---
        channel_layer = get_channel_layer()
        if channel_layer and doc.uploaded_by:
            group_name = f"user_{doc.uploaded_by.id}_notifications"
            message = {
                'type': 'document.processed',
                'document_id': doc.id,
                'status': doc.status,
                'file_name': os.path.basename(doc.original_file.name),
                'building_name': doc.building.name,
            }
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'send.notification',
                    'message': message
                }
            )
            logger.info(f"Sent notification for document {doc.id} to group {group_name}")

    except DocumentUpload.DoesNotExist:
        logger.error(f"DocumentUpload with id={document_id} does not exist. Task will not be retried.")
    except Exception as e:
        logger.error(f"An error occurred while processing document {document_id}: {e}", exc_info=True)
        if doc:
            doc.status = 'failed'
            doc.error_message = str(e)
            doc.save(update_fields=['status', 'error_message'])
        # Retry the task for transient errors (e.g., network issues with Google API)
        raise self.retry(exc=e)
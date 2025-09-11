from django.utils import timezone
from .models import DocumentUpload
from .services import GoogleDocumentAIService
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # Retry after 1 minute
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3},
    retry_backoff=True,
    retry_backoff_max=600,  # Max 10 minutes between retries
    retry_jitter=True,
)
def process_document(self, document_id):
    """Process a document using Google Document AI"""
    
    try:
        document = DocumentUpload.objects.get(id=document_id)
        
        # Update status to processing
        document.status = 'processing'
        document.processing_started_at = timezone.now()
        document.save()
        
        # Initialize Google Document AI service
        ai_service = GoogleDocumentAIService()
        
        # Process the document
        result = ai_service.process_document(document.file.path)
        
        # Update document with results
        document.raw_analysis = result.get('raw_analysis')
        document.extracted_data = result.get('extracted_data')
        document.confidence_score = result.get('confidence_score')
        document.status = 'completed'
        document.processing_completed_at = timezone.now()
        document.save()
        
        return f"Document {document_id} processed successfully"
        
    except DocumentUpload.DoesNotExist:
        return f"Document {document_id} not found"
    except Exception as e:
        # Update document with error
        try:
            document = DocumentUpload.objects.get(id=document_id)
            document.status = 'failed'
            document.error_message = str(e)
            document.processing_completed_at = timezone.now()
            document.save()
        except DocumentUpload.DoesNotExist:
            pass
        
        logger.error(f"Error processing document {document_id}: {str(e)}")
        raise  # Re-raise to trigger retry


@shared_task
def cleanup_old_documents():
    """Clean up old failed or abandoned documents"""
    from datetime import timedelta
    
    cutoff_date = timezone.now() - timedelta(days=30)
    
    # Delete failed documents older than 30 days
    old_failed = DocumentUpload.objects.filter(
        status='failed',
        created_at__lt=cutoff_date
    )
    
    count = old_failed.count()
    old_failed.delete()
    
    logger.info(f"Cleaned up {count} old failed documents")
    return f"Cleaned up {count} old failed documents"

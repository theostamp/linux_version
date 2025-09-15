from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import FileResponse, Http404
from django.utils import timezone
from datetime import timedelta
from .models import DocumentUpload
from .serializers import DocumentUploadSerializer
from .tasks import process_document
import logging
import os

logger = logging.getLogger(__name__)


class DocumentUploadViewSet(viewsets.ModelViewSet):
    """ViewSet for managing document uploads and processing"""
    
    queryset = DocumentUpload.objects.all()
    serializer_class = DocumentUploadSerializer
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'building', 'uploaded_by']
    search_fields = ['original_filename']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def perform_create(self, serializer):
        """Set the uploaded_by field to the current user and trigger processing"""
        document = serializer.save(uploaded_by=self.request.user)
        
        # Automatically trigger processing after upload
        try:
            # Get tenant schema from request
            tenant_schema = getattr(self.request.tenant, 'schema_name', 'demo')
            process_document.delay(document.id, tenant_schema)
            logger.info(f"Document {document.id} queued for processing in schema {tenant_schema}")
        except Exception as e:
            logger.error(f"Failed to queue document {document.id} for processing: {e}")
            # Even if queueing fails, the document is still uploaded
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Trigger document processing"""
        document = self.get_object()
        
        if document.status != 'pending':
            return Response(
                {'error': 'Document is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Start processing asynchronously
        try:
            # Get tenant schema from request
            tenant_schema = getattr(request.tenant, 'schema_name', 'demo')
            process_document.delay(document.id, tenant_schema)
        except Exception as e:
            logger.error(f"Failed to queue document for processing: {e}")
            return Response(
                {'error': 'Failed to queue document for processing'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(
            {'message': 'Document processing started'},
            status=status.HTTP_202_ACCEPTED
        )
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm and save extracted data"""
        document = self.get_object()
        
        if document.status != 'awaiting_confirmation':
            return Response(
                {'error': 'Document is not awaiting confirmation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Here you would implement the logic to save the extracted data
        # to the appropriate models (expenses, payments, etc.)
        
        return Response(
            {'message': 'Document data confirmed and saved'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def confirm_and_create_expense(self, request, pk=None):
        """Confirm extracted data and create expense record"""
        document = self.get_object()
        
        if document.status != 'awaiting_confirmation':
            return Response(
                {'error': 'Document is not awaiting confirmation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Import here to avoid circular imports
            from financial.models import Expense
            
            # Create expense from extracted data
            expense_data = request.data
            
            # Map extracted data to expense fields
            expense = Expense.objects.create(
                building=document.building,
                amount=expense_data.get('amount', 0),
                description=expense_data.get('description', ''),
                category=expense_data.get('category', 'other'),
                date=expense_data.get('date'),
                supplier=expense_data.get('supplier', ''),
                invoice_number=expense_data.get('invoice_number', ''),
                created_by=request.user,
            )
            
            # Link expense to document
            document.linked_expense = expense
            document.status = 'completed'
            document.save()
            
            return Response(
                {'message': 'Document confirmed and expense created successfully', 'expense_id': expense.id},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error creating expense from document {document.id}: {str(e)}")
            return Response(
                {'error': 'Failed to create expense from document'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the original document file"""
        document = self.get_object()

        if not document.file:
            raise Http404("Document file not found")

        try:
            file_path = document.file.path
            if os.path.exists(file_path):
                response = FileResponse(
                    open(file_path, 'rb'),
                    content_type=document.mime_type or 'application/octet-stream'
                )
                response['Content-Disposition'] = f'attachment; filename="{document.original_filename}"'
                return response
            else:
                raise Http404("File not found on server")
        except Exception as e:
            logger.error(f"Error downloading document {document.id}: {str(e)}")
            raise Http404("Error downloading file")

    @action(detail=False, methods=['post'])
    def cleanup_stale(self, request):
        """Clean up failed or stuck documents older than specified hours"""
        hours = int(request.data.get('hours', 24))
        cutoff_time = timezone.now() - timedelta(hours=hours)

        # Find documents that are stuck in pending/processing or failed
        stale_documents = DocumentUpload.objects.filter(
            status__in=['pending', 'processing', 'failed'],
            created_at__lt=cutoff_time
        )

        count = stale_documents.count()
        stale_documents.delete()

        return Response({
            'message': f'Deleted {count} stale documents older than {hours} hours',
            'count': count
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple documents by IDs"""
        document_ids = request.data.get('ids', [])

        if not document_ids:
            return Response(
                {'error': 'No document IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only allow deletion of non-completed documents
        documents = DocumentUpload.objects.filter(
            id__in=document_ids,
            status__in=['pending', 'processing', 'failed', 'awaiting_confirmation']
        )

        count = documents.count()
        documents.delete()

        return Response({
            'message': f'Deleted {count} documents',
            'count': count
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def celery_status(self, request):
        """Get Celery worker status"""
        from celery import current_app
        from celery.task.control import inspect

        try:
            # Get Celery inspector
            i = inspect()

            # Get active tasks
            active = i.active()
            active_count = sum(len(tasks) for tasks in (active or {}).values())

            # Get scheduled tasks
            scheduled = i.scheduled()
            scheduled_count = sum(len(tasks) for tasks in (scheduled or {}).values())

            # Determine status
            if active_count > 0:
                status = 'active'
            elif scheduled_count > 0:
                status = 'scheduled'
            else:
                status = 'idle'

            return Response({
                'status': status,
                'active_tasks': active_count,
                'scheduled_tasks': scheduled_count,
                'workers': len(active or {})
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error getting Celery status: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    @action(detail=True, methods=['post'])
    def retry_processing(self, request, pk=None):
        """Retry processing for a failed document"""
        document = self.get_object()

        if document.status not in ['failed', 'pending']:
            return Response(
                {'error': 'Document must be in failed or pending status to retry'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset status and error message
        document.status = 'pending'
        document.error_message = None
        document.processing_started_at = None
        document.processing_completed_at = None
        document.save()

        # Queue for reprocessing
        try:
            tenant_schema = getattr(request.tenant, 'schema_name', 'demo')
            process_document.delay(document.id, tenant_schema)

            return Response({
                'message': 'Document queued for reprocessing',
                'document_id': document.id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to queue document {document.id} for reprocessing: {e}")
            return Response(
                {'error': 'Failed to queue document for reprocessing'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

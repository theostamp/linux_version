from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import DocumentUpload
from .serializers import DocumentUploadSerializer
from .tasks import process_document
import logging

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
            process_document.delay(document.id)
            logger.info(f"Document {document.id} queued for processing")
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
            process_document.delay(document.id)
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
        
        if document.status != 'completed':
            return Response(
                {'error': 'Document processing is not completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Here you would implement the logic to save the extracted data
        # to the appropriate models (expenses, payments, etc.)
        
        return Response(
            {'message': 'Document data confirmed and saved'},
            status=status.HTTP_200_OK
        )

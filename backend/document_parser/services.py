import os
import json
import logging
from typing import Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

# Try to import Google Cloud, but make it optional
try:
    from google.cloud import documentai
    GOOGLE_CLOUD_AVAILABLE = True
except ImportError:
    GOOGLE_CLOUD_AVAILABLE = False
    logger.warning("Google Cloud Document AI not available. Using mock processing.")


class GoogleDocumentAIService:
    """Service for processing documents using Google Document AI"""
    
    def __init__(self):
        self.project_id = os.getenv('GOOGLE_CLOUD_PROJECT_ID')
        self.location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us')
        self.processor_id = os.getenv('GOOGLE_DOCUMENT_AI_PROCESSOR_ID')
        self.use_mock = False
        
        # Check if we should use mock processing
        if not GOOGLE_CLOUD_AVAILABLE or not all([self.project_id, self.processor_id]):
            self.use_mock = True
            logger.info("Using mock document processing (Google Cloud not configured)")
    
    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Process a document using Google Document AI or mock processing
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Dictionary containing the analysis results
        """
        if self.use_mock:
            return self._mock_process_document(file_path)
        
        try:
            # Initialize the Document AI client
            client = documentai.DocumentProcessorServiceClient()
            
            # Construct the processor name
            processor_name = f"projects/{self.project_id}/locations/{self.location}/processors/{self.processor_id}"
            
            # Read the file
            with open(file_path, 'rb') as file:
                file_content = file.read()
            
            # Create the document
            raw_document = documentai.RawDocument(
                content=file_content,
                mime_type=self._get_mime_type(file_path)
            )
            
            # Create the request
            request = documentai.ProcessRequest(
                name=processor_name,
                raw_document=raw_document
            )
            
            # Process the document
            result = client.process_document(request=request)
            document = result.document
            
            # Extract relevant information
            extracted_data = self._extract_document_data(document)
            
            return {
                'raw_analysis': self._document_to_dict(document),
                'extracted_data': extracted_data,
                'confidence_score': self._calculate_confidence_score(document)
            }
            
        except Exception as e:
            raise Exception(f"Error processing document: {str(e)}")
    
    def _get_mime_type(self, file_path: str) -> str:
        """Get MIME type based on file extension"""
        extension = os.path.splitext(file_path)[1].lower()
        
        mime_types = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff',
        }
        
        return mime_types.get(extension, 'application/octet-stream')
    
    def _extract_document_data(self, document) -> Dict[str, Any]:
        """Extract relevant data from the processed document"""
        extracted_data = {
            'text': document.text,
            'entities': [],
            'tables': [],
            'form_fields': {}
        }
        
        # Extract entities (amounts, dates, etc.)
        for entity in document.entities:
            extracted_data['entities'].append({
                'type': entity.type_,
                'mention_text': entity.mention_text,
                'confidence': entity.confidence
            })
        
        # Extract tables
        for page in document.pages:
            for table in page.tables:
                table_data = []
                for row in table.body_rows:
                    row_data = []
                    for cell in row.cells:
                        cell_text = self._get_text_from_layout(cell.layout, document.text)
                        row_data.append(cell_text)
                    table_data.append(row_data)
                extracted_data['tables'].append(table_data)
        
        # Extract form fields
        for page in document.pages:
            for form_field in page.form_fields:
                field_name = self._get_text_from_layout(form_field.field_name, document.text)
                field_value = self._get_text_from_layout(form_field.field_value, document.text)
                extracted_data['form_fields'][field_name] = field_value
        
        return extracted_data
    
    def _get_text_from_layout(self, layout, document_text: str) -> str:
        """Extract text from a layout element"""
        if not layout.text_anchor:
            return ""
        
        start_index = layout.text_anchor.text_segments[0].start_index
        end_index = layout.text_anchor.text_segments[0].end_index
        
        return document_text[start_index:end_index]
    
    def _calculate_confidence_score(self, document) -> float:
        """Calculate overall confidence score for the document"""
        if not document.entities:
            return 0.0
        
        total_confidence = sum(entity.confidence for entity in document.entities)
        return total_confidence / len(document.entities)
    
    def _document_to_dict(self, document) -> Dict[str, Any]:
        """Convert Document AI document to dictionary for storage"""
        return {
            'text': document.text,
            'pages': [
                {
                    'page_number': page.page_number,
                    'dimension': {
                        'width': page.dimension.width,
                        'height': page.dimension.height
                    },
                    'layouts': [
                        {
                            'text_anchor': {
                                'text_segments': [
                                    {
                                        'start_index': segment.start_index,
                                        'end_index': segment.end_index
                                    }
                                    for segment in layout.text_anchor.text_segments
                                ]
                            } if layout.text_anchor else None
                        } for layout in page.layouts
                    ]
                }
                for page in document.pages
            ],
            'entities': [
                {
                    'type': entity.type_,
                    'mention_text': entity.mention_text,
                    'confidence': entity.confidence
                }
                for entity in document.entities
            ]
        }
    
    def _mock_process_document(self, file_path: str) -> Dict[str, Any]:
        """Mock document processing for development/testing"""
        import random
        from pathlib import Path
        
        filename = Path(file_path).name.lower()
        
        # Generate mock data based on filename patterns
        mock_data = {
            'text': f'[Mock OCR Text from {filename}]',
            'entities': [],
            'tables': [],
            'form_fields': {}
        }
        
        # Add some realistic mock entities based on filename
        if any(word in filename for word in ['invoice', 'τιμολογιο', 'receipt', 'αποδειξη']):
            mock_data['entities'] = [
                {'type': 'supplier', 'mention_text': 'Mock Supplier Ltd.', 'confidence': 0.85},
                {'type': 'total_amount', 'mention_text': f'{random.randint(100, 1000)}.00', 'confidence': 0.90},
                {'type': 'invoice_date', 'mention_text': '2025-09-10', 'confidence': 0.88},
                {'type': 'invoice_id', 'mention_text': f'INV-{random.randint(1000, 9999)}', 'confidence': 0.92}
            ]
            mock_data['form_fields'] = {
                'Invoice Number': f'INV-{random.randint(1000, 9999)}',
                'Date': '10/09/2025',
                'Supplier': 'Mock Supplier Ltd.',
                'Total': f'€{random.randint(100, 1000)}.00'
            }
        
        confidence_score = random.uniform(0.75, 0.95)
        
        return {
            'raw_analysis': {
                'text': mock_data['text'],
                'pages': [{'page_number': 1, 'dimension': {'width': 2480, 'height': 3508}}],
                'entities': mock_data['entities']
            },
            'extracted_data': mock_data,
            'confidence_score': confidence_score
        }

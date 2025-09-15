from google.cloud import documentai
from django.conf import settings
import os
import mimetypes
import time
import logging
from google.protobuf.json_format import MessageToJson

logger = logging.getLogger(__name__)

# Global client instance για connection pooling
_google_client = None
_client_lock = None

def get_google_client():
    """
    Singleton pattern για το Google Document AI client.
    Αποφεύγει memory leaks από πολλαπλές δημιουργίες client.
    """
    global _google_client, _client_lock
    
    if _google_client is None:
        # Βεβαιωνόμαστε ότι τα credentials έχουν οριστεί στο .env
        if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
            raise Exception("Η μεταβλητή περιβάλλοντος GOOGLE_APPLICATION_CREDENTIALS δεν έχει οριστεί.")

        project_id = settings.GOOGLE_CLOUD_PROJECT_ID
        location = settings.GOOGLE_CLOUD_LOCATION
        
        # Το api_endpoint είναι απαραίτητο αν η τοποθεσία δεν είναι "us"
        opts = {"api_endpoint": f"{location}-documentai.googleapis.com"}
        _google_client = documentai.DocumentProcessorServiceClient(client_options=opts)
        
        logger.info(f"Google Document AI client initialized for project: {project_id}")
    
    return _google_client

class GoogleDocumentAIService:
    """
    Μια κλάση-service για την επικοινωνία με το Google Cloud Document AI API.
    Χρησιμοποιεί singleton pattern για το client για αποφυγή memory leaks.
    """
    def __init__(self):
        self.project_id = settings.GOOGLE_CLOUD_PROJECT_ID
        self.location = settings.GOOGLE_CLOUD_LOCATION
        self.processor_id = settings.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
        
        # Validation
        if not self.project_id:
            raise Exception("GOOGLE_CLOUD_PROJECT_ID δεν έχει οριστεί στο .env")
        if not self.processor_id or self.processor_id == "your-processor-id-here":
            raise Exception("GOOGLE_DOCUMENT_AI_PROCESSOR_ID δεν έχει οριστεί σωστά στο .env")
        
        # Χρήση του singleton client
        self.client = get_google_client()
        self.name = self.client.processor_path(self.project_id, self.location, self.processor_id)

    def process_document(self, file_path: str):
        """
        Επεξεργάζεται ένα έγγραφο (αρχείο) χρησιμοποιώντας το Google Document AI.
        Προσδιορίζει αυτόματα τον τύπο MIME και επιστρέφει ένα λεξικό με τα αποτελέσματα.
        """
        # File size validation (Google Document AI limit: 20MB)
        MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
        file_size = os.path.getsize(file_path)
        
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"Το αρχείο είναι πολύ μεγάλο: {file_size / (1024*1024):.1f}MB. Μέγιστο επιτρεπόμενο: {MAX_FILE_SIZE / (1024*1024)}MB")
        
        if file_size == 0:
            raise ValueError("Το αρχείο είναι κενό")
        
        logger.info(f"Processing file: {file_path} ({file_size / 1024:.1f}KB)")
        
        # MIME type validation
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            raise ValueError(f"Δεν ήταν δυνατός ο προσδιορισμός του τύπου MIME για το αρχείο: {file_path}")
        
        # Supported MIME types
        supported_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/bmp']
        if mime_type not in supported_types:
            raise ValueError(f"Μη υποστηριζόμενος τύπος αρχείου: {mime_type}. Υποστηριζόμενοι τύποι: {', '.join(supported_types)}")

        with open(file_path, "rb") as image:
            image_content = image.read()

        # Δημιουργία του raw document object για το API
        raw_document = documentai.RawDocument(content=image_content, mime_type=mime_type)

        # Ρύθμιση του request προς το API
        request = documentai.ProcessRequest(name=self.name, raw_document=raw_document)

        # Rate limiting: Προσθήκη μικρής καθυστέρησης για αποφυγή rate limits
        time.sleep(0.5)  # 500ms delay μεταξύ API calls
        
        # Αποστολή του request στο API
        try:
            result = self.client.process_document(request=request)
            document = result.document
            logger.info(f"Successfully processed document: {file_path}")
        except Exception as e:
            logger.error(f"Google Document AI API error for {file_path}: {str(e)}")
            raise Exception(f"Σφάλμα επεξεργασίας εγγράφου: {str(e)}")

        # 1. Εξαγωγή δομημένων δεδομένων (Entities)
        extracted_data = {}
        total_confidence = 0
        entity_count = 0

        for entity in document.entities:
            key = entity.type_
            value = entity.mention_text
            confidence = entity.confidence

            if key not in extracted_data:
                extracted_data[key] = []

            extracted_data[key].append({
                'value': value,
                'confidence': round(confidence, 4)
            })
            total_confidence += confidence
            entity_count += 1

        # 2. Υπολογισμός μέσης βεβαιότητας
        average_confidence = (total_confidence / entity_count) if entity_count > 0 else 0.0

        # 3. Πλήρης ανάλυση σε μορφή JSON
        raw_analysis_json = MessageToJson(document._pb)

        return {
            'extracted_data': extracted_data,
            'raw_analysis': raw_analysis_json,
            'confidence_score': round(average_confidence, 4)
        }
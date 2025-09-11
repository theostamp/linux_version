from google.cloud import documentai
from django.conf import settings
import os

class GoogleDocumentAIService:
    """
    Μια κλάση-service για την επικοινωνία με το Google Cloud Document AI API.
    """
    def __init__(self):
        # Βεβαιωνόμαστε ότι τα credentials έχουν οριστεί στο .env
        if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
            raise Exception("Η μεταβλητή περιβάλλοντος GOOGLE_APPLICATION_CREDENTIALS δεν έχει οριστεί.")

        self.project_id = settings.GOOGLE_CLOUD_PROJECT_ID
        self.location = settings.GOOGLE_CLOUD_LOCATION
        self.processor_id = settings.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
        
        # Το api_endpoint είναι απαραίτητο αν η τοποθεσία δεν είναι "us"
        opts = {"api_endpoint": f"{self.location}-documentai.googleapis.com"}
        self.client = documentai.DocumentProcessorServiceClient(client_options=opts)
        self.name = self.client.processor_path(self.project_id, self.location, self.processor_id)

    def parse_document(self, file_path: str, mime_type: str):
        """
        Επεξεργάζεται ένα έγγραφο (αρχείο) χρησιμοποιώντας το Google Document AI.
        """
        with open(file_path, "rb") as image:
            image_content = image.read()

        # Δημιουργία του raw document object για το API
        raw_document = documentai.RawDocument(content=image_content, mime_type=mime_type)

        # Ρύθμιση του request
        request = documentai.ProcessRequest(name=self.name, raw_document=raw_document)

        # Αποστολή του request στο API
        result = self.client.process_document(request=request)
        document = result.document

        # Εξαγωγή των δομημένων δεδομένων (π.χ. για τιμολόγια)
        extracted_data = {}
        raw_text = document.text

        for entity in document.entities:
            key = entity.type_
            value = entity.mention_text
            confidence = entity.confidence
            
            if key not in extracted_data:
                extracted_data[key] = []
            
            extracted_data[key].append({
                'value': value,
                'confidence': round(confidence, 2)
            })

        return extracted_data, raw_text
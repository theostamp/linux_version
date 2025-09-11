import os
from typing import Tuple, Dict, Any
from google.cloud import documentai
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class GoogleDocumentAIService:
    """
    A service class to interact with Google Cloud Document AI API.
    It uses a pre-trained processor (like Invoice Parser) to extract data from documents.
    """

    def __init__(self):
        self.project_id = os.getenv("GOOGLE_PROJECT_ID")
        self.location = os.getenv("GOOGLE_DOCAI_LOCATION", "eu")  # e.g., 'eu' or 'us'
        self.processor_id = os.getenv("GOOGLE_DOCAI_PROCESSOR_ID")
        self.timeout = int(os.getenv("GOOGLE_DOCAI_TIMEOUT", "60"))  # Timeout σε δευτερόλεπτα

        if not all([self.project_id, self.location, self.processor_id]):
            logger.error("Google Document AI settings are not fully configured in environment variables.")
            raise ValueError("Google Document AI settings (GOOGLE_PROJECT_ID, GOOGLE_DOCAI_LOCATION, GOOGLE_DOCAI_PROCESSOR_ID) must be configured.")

        self.processor_name = f"projects/{self.project_id}/locations/{self.location}/processors/{self.processor_id}"


    def parse_document(self, file_path: str, mime_type: str) -> Tuple[Dict[str, Any], str]:
        """
        Processes a document file using Google Document AI.

        Args:
            file_path: The local path to the document file.
            mime_type: The MIME type of the file (e.g., 'application/pdf', 'image/jpeg').

        Returns:
            A tuple containing:
            - A dictionary of the extracted and formatted data.
            - The full raw text extracted from the document.
        """
        logger.info(f"Starting document parsing for file: {file_path}")
        try:
            with open(file_path, "rb") as file:
                content = file.read()
        except FileNotFoundError:
            logger.error(f"File not found at path: {file_path}", exc_info=True)
            raise

        raw_document = documentai.RawDocument(content=content, mime_type=mime_type)
        request = documentai.ProcessRequest(name=self.processor_name, raw_document=raw_document)

        # The `api_endpoint` must be set if the location is not 'us'.
        opts = {"api_endpoint": f"{self.location}-documentai.googleapis.com"}

        try:
            # Use a context manager to automatically create and close the client connection.
            # This is the recommended practice for ensuring resources are managed correctly.
            with documentai.DocumentProcessorServiceClient(client_options=opts) as client:
                result = client.process_document(request=request, timeout=self.timeout)
                document = result.document
                logger.info("Successfully processed document with Google Document AI.")
        except Exception as e:
            logger.error(f"Error during Google Document AI API call: {e}", exc_info=True)
            raise

        raw_text = document.text
        extracted_data = self._format_entities(document.entities)

        return extracted_data, raw_text

    def _format_entities(self, entities: list) -> Dict[str, Any]:
        """
        Formats the raw entity list from Document AI into a structured dictionary
        with keys that are useful for our application.
        """
        data = {entity.type_: (entity.normalized_value.text if entity.normalized_value else entity.mention_text) for entity in entities}

        # Map Google's keys to our application's keys
        final_data = {
            "vendor": data.get("supplier_name", ""),
            "total_amount": float(data.get("total_amount", 0.0)),
            "date": data.get("invoice_date", ""),
            "vat_amount": float(data.get("total_vat_amount", 0.0)),
            "net_amount": float(data.get("net_amount", 0.0)),
            "invoice_id": data.get("invoice_id", ""),
            "due_date": data.get("due_date", ""),
        }
        
        logger.info(f"Extracted and formatted data: {final_data}")
        return final_data
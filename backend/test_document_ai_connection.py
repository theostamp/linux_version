#!/usr/bin/env python
import os
import sys
import django
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from document_parser.services import GoogleDocumentAIService
from google.cloud import documentai_v1
from google.oauth2 import service_account

def test_document_ai_connection():
    """Test Document AI service connection and configuration"""

    print("=" * 50)
    print("Testing Document AI Connection")
    print("=" * 50)

    # Check if credentials file exists
    creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    print(f"\n1. Credentials path: {creds_path}")

    if creds_path and os.path.exists(creds_path):
        print("   ✓ Credentials file exists")

        # Try to load credentials
        try:
            with open(creds_path, 'r') as f:
                creds_data = json.load(f)
                print(f"   ✓ Project ID: {creds_data.get('project_id', 'Not found')}")
                print(f"   ✓ Client email: {creds_data.get('client_email', 'Not found')}")
        except Exception as e:
            print(f"   ✗ Error loading credentials: {e}")
    else:
        print("   ✗ Credentials file not found")

    # Check environment variables
    print("\n2. Environment variables:")
    project_id = os.environ.get('DOCUMENT_AI_PROJECT_ID')
    location = os.environ.get('DOCUMENT_AI_LOCATION')
    processor_id = os.environ.get('DOCUMENT_AI_PROCESSOR_ID')

    print(f"   Project ID: {project_id or 'NOT SET'}")
    print(f"   Location: {location or 'NOT SET'}")
    print(f"   Processor ID: {processor_id or 'NOT SET'}")

    # Try to initialize Document AI client
    print("\n3. Testing Document AI client initialization:")
    try:
        service = GoogleDocumentAIService()
        print("   ✓ GoogleDocumentAIService initialized successfully")

        # Test getting processor
        try:
            processor_name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"
            print(f"   Processor name: {processor_name}")

            # Try to create a client
            credentials = service_account.Credentials.from_service_account_file(creds_path)
            client = documentai_v1.DocumentProcessorServiceClient(credentials=credentials)
            print("   ✓ Document AI client created successfully")

            # Try to get processor info
            processor = client.get_processor(name=processor_name)
            print(f"   ✓ Processor retrieved: {processor.display_name}")
            print(f"   ✓ Processor type: {processor.type_}")
            print(f"   ✓ Processor state: {processor.state}")

        except Exception as e:
            print(f"   ✗ Error getting processor: {e}")

    except Exception as e:
        print(f"   ✗ Error initializing service: {e}")

    # Test with a simple text extraction
    print("\n4. Testing document processing with sample text:")
    try:
        service = GoogleDocumentAIService()

        # Create a simple test document
        test_content = b"This is a test document for Document AI."

        result = service.process_document(
            content=test_content,
            mime_type='text/plain'
        )

        if result:
            print("   ✓ Document processed successfully")
            print(f"   Text extracted: {result.get('text', '')[:100]}...")
            print(f"   Confidence: {result.get('confidence', 0):.2%}")
        else:
            print("   ✗ No result returned from processing")

    except Exception as e:
        print(f"   ✗ Error processing test document: {e}")

    print("\n" + "=" * 50)
    print("Test complete")
    print("=" * 50)

if __name__ == "__main__":
    with schema_context('demo'):
        test_document_ai_connection()
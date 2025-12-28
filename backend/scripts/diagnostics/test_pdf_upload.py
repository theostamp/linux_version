#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.core.files.base import ContentFile
from document_parser.models import DocumentUpload
from document_parser.tasks import process_document
from users.models import CustomUser
from buildings.models import Building
from datetime import datetime

def test_pdf_upload():
    """Test PDF document upload and processing"""

    with schema_context('demo'):
        print("=" * 50)
        print("Testing PDF Document Upload & Processing")
        print("=" * 50)

        # Get user and building
        user = CustomUser.objects.get(email='theostam1966@gmail.com')
        building = Building.objects.get(id=1)
        print(f"\n✓ Using user: {user.email}")
        print(f"✓ Using building: {building.name}")

        # Read the test PDF
        pdf_path = '/tmp/test_invoice.pdf'
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()

        print(f"\n✓ PDF loaded: {len(pdf_content)} bytes")

        # Create a DocumentUpload instance
        document = DocumentUpload(
            building=building,
            uploaded_by=user,
            original_filename="test_invoice.pdf",
            file_size=len(pdf_content),
            mime_type="application/pdf",
            status='pending'
        )

        # Save the document with the PDF file
        document.file.save(
            f'invoice_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf',
            ContentFile(pdf_content),
            save=True
        )

        print(f"\n✓ Document created:")
        print(f"  - ID: {document.id}")
        print(f"  - Building: {document.building.name}")
        print(f"  - File: {document.file.name}")
        print(f"  - MIME Type: {document.mime_type}")
        print(f"  - Status: {document.status}")

        # Queue the document for processing
        print("\n📤 Queueing document for processing...")
        try:
            # Call the task with tenant schema
            result = process_document.delay(document.id, 'demo')
            print(f"✓ Task queued with ID: {result.id}")

            # Wait for processing
            import time
            print("\n⏳ Waiting for processing...")

            for i in range(15):  # Wait up to 30 seconds
                time.sleep(2)
                document.refresh_from_db()
                print(f"  Status: {document.status}", end="")

                if document.status == 'awaiting_confirmation':
                    print(" ✓ Success!")
                    print(f"\n📊 Results:")
                    print(f"  - Confidence Score: {document.confidence_score:.2%}" if document.confidence_score else "  - Confidence Score: N/A")

                    if document.extracted_data:
                        print(f"  - Extracted Data Keys: {list(document.extracted_data.keys())}")

                        # Show some extracted fields
                        if 'invoice_number' in document.extracted_data:
                            print(f"  - Invoice Number: {document.extracted_data['invoice_number']}")
                        if 'total_amount' in document.extracted_data:
                            print(f"  - Total Amount: {document.extracted_data['total_amount']}")
                        if 'date' in document.extracted_data:
                            print(f"  - Date: {document.extracted_data['date']}")

                    if document.raw_analysis:
                        text = document.raw_analysis.get('text', '')
                        if text:
                            print(f"\n  - Extracted Text (first 200 chars):")
                            print(f"    {text[:200]}...")
                    break

                elif document.status == 'failed':
                    print(f" ✗ Failed!")
                    print(f"  Error: {document.error_message}")
                    break
                else:
                    print("...")
            else:
                print("\n⚠️ Processing timeout - check Celery logs")

        except Exception as e:
            print(f"✗ Error queueing task: {e}")

        print("\n" + "=" * 50)
        print("Test complete")
        print("=" * 50)

if __name__ == "__main__":
    test_pdf_upload()
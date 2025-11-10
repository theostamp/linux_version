#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

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

def test_document_upload():
    """Test document upload and processing"""

    with schema_context('demo'):
        print("=" * 50)
        print("Testing Document Upload & Processing")
        print("=" * 50)

        # Get or create a test user
        try:
            user = CustomUser.objects.get(email='theostam1966@gmail.com')
            print(f"\n✓ Using existing user: {user.email}")
        except CustomUser.DoesNotExist:
            user = CustomUser.objects.create_user(
                email='test@example.com',
                password='testpass',
                first_name='Test',
                last_name='User'
            )
            print(f"\n✓ Created test user: {user.email}")

        # Create a test document content
        test_content = """
        INVOICE #2025-001
        Date: 15/09/2025

        Customer: John Doe
        Address: 123 Main Street, Athens, Greece

        Item                    Quantity    Price       Total
        Service Fee             1           100.00      100.00
        Tax (24%)                                       24.00

        TOTAL:                                          124.00
        """.encode('utf-8')

        # Get the main building
        try:
            building = Building.objects.get(id=1)
            print(f"\n✓ Using building: {building.name}")
        except Building.DoesNotExist:
            print("✗ Building not found - creating one")
            building = Building.objects.create(
                name="Test Building",
                address="123 Test Street"
            )

        # Create a DocumentUpload instance
        document = DocumentUpload(
            building=building,
            uploaded_by=user,
            original_filename="test_invoice.txt",
            file_size=len(test_content),
            mime_type="text/plain",
            status='pending'
        )

        # Save the document with a file
        document.file.save(
            f'test_invoice_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt',
            ContentFile(test_content),
            save=True
        )

        print(f"\n✓ Document created:")
        print(f"  - ID: {document.id}")
        print(f"  - Building: {document.building.name}")
        print(f"  - File: {document.file.name}")
        print(f"  - Status: {document.status}")

        # Queue the document for processing
        print("\n📤 Queueing document for processing...")
        try:
            # Call the task with tenant schema
            result = process_document.delay(document.id, 'demo')
            print(f"✓ Task queued with ID: {result.id}")

            # Wait a bit and check status
            import time
            print("\n⏳ Waiting for processing...")

            for i in range(10):
                time.sleep(2)
                document.refresh_from_db()
                print(f"  Status: {document.status}", end="")

                if document.status == 'awaiting_confirmation':
                    print(" ✓ Success!")
                    print(f"\n📊 Results:")
                    print(f"  - Confidence Score: {document.confidence_score:.2%}" if document.confidence_score else "  - Confidence Score: N/A")
                    if document.extracted_data:
                        print(f"  - Extracted Data: {document.extracted_data}")
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
    test_document_upload()
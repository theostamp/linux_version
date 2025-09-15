#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from document_parser.models import DocumentUpload
from django.conf import settings

with schema_context('demo'):
    # Get the last document
    try:
        document = DocumentUpload.objects.latest('id')
        print(f"Document ID: {document.id}")
        print(f"File field: {document.file}")
        print(f"File name: {document.file.name}")
        print(f"File path: {document.file.path}")
        print(f"File URL: {document.file.url}")
        print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
        print(f"MEDIA_URL: {settings.MEDIA_URL}")

        # Check if file exists
        if os.path.exists(document.file.path):
            print(f"✓ File exists at: {document.file.path}")
        else:
            print(f"✗ File NOT found at: {document.file.path}")

        # Try alternative paths
        alt_path = os.path.join('/app/media', document.file.name)
        print(f"\nAlternative path: {alt_path}")
        if os.path.exists(alt_path):
            print(f"✓ File exists at alternative path")
        else:
            print(f"✗ File NOT found at alternative path")

    except DocumentUpload.DoesNotExist:
        print("No documents found")
#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from document_parser.models import DocumentUpload

with schema_context('demo'):
    documents = DocumentUpload.objects.all()
    print(f'Total documents: {documents.count()}')
    for doc in documents[:5]:
        print(f'ID: {doc.id}, Status: {doc.status}, Filename: {doc.original_filename}')
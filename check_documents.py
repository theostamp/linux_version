import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from document_parser.models import DocumentUpload
from django.contrib.auth import get_user_model
from datetime import datetime

User = get_user_model()

with schema_context('demo'):
    # Get all documents
    documents = DocumentUpload.objects.all()
    
    print(f"\n=== Document Parser Status Report ===")
    print(f"Total documents: {documents.count()}")
    print(f"Report generated at: {datetime.now()}")
    print("\n" + "="*50 + "\n")
    
    # Status summary
    status_counts = {}
    for doc in documents:
        status = doc.status
        if status not in status_counts:
            status_counts[status] = 0
        status_counts[status] += 1
    
    print("Status Summary:")
    for status, count in status_counts.items():
        print(f"  - {status}: {count} documents")
    
    print("\n" + "="*50 + "\n")
    
    # Detailed document list
    print("Document Details:")
    for doc in documents:
        print(f"\nDocument ID: {doc.id}")
        print(f"  - Filename: {doc.original_filename}")
        print(f"  - Size: {doc.file_size:,} bytes")
        print(f"  - Status: {doc.status}")
        print(f"  - Uploaded at: {doc.created_at}")
        print(f"  - Uploaded by: {doc.uploaded_by.email if doc.uploaded_by else 'N/A'}")
        
        if doc.processing_started_at:
            print(f"  - Processing started: {doc.processing_started_at}")
        
        if doc.processing_completed_at:
            print(f"  - Processing completed: {doc.processing_completed_at}")
            
        if doc.error_message:
            print(f"  - Error: {doc.error_message}")
            
        if doc.confidence_score:
            print(f"  - Confidence score: {doc.confidence_score:.2f}")
    
    print("\n" + "="*50 + "\n")
    
    # Check for stuck documents
    pending_docs = documents.filter(status='pending')
    if pending_docs:
        print(f"⚠️  WARNING: {pending_docs.count()} documents stuck in 'pending' status:")
        for doc in pending_docs:
            print(f"  - {doc.original_filename} (ID: {doc.id}, uploaded: {doc.created_at})")
#!/usr/bin/env python3
"""
Test script για τις βελτιστοποιήσεις του Document Parser
"""

import os
import sys
import django
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from document_parser.services import GoogleDocumentAIService, get_google_client
from document_parser.models import DocumentUpload
import tempfile
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection_pooling():
    """Δοκιμή του connection pooling"""
    print("🔧 Testing Connection Pooling...")
    
    try:
        # Δοκιμή πρώτης δημιουργίας client
        client1 = get_google_client()
        print(f"✅ First client created: {type(client1)}")
        
        # Δοκιμή δεύτερης δημιουργίας (πρέπει να είναι το ίδιο instance)
        client2 = get_google_client()
        print(f"✅ Second client created: {type(client2)}")
        
        # Έλεγχος αν είναι το ίδιο instance
        if client1 is client2:
            print("✅ Connection pooling working: Same client instance reused")
        else:
            print("❌ Connection pooling failed: Different client instances")
            
    except Exception as e:
        print(f"❌ Connection pooling test failed: {e}")

def test_file_validation():
    """Δοκιμή του file validation"""
    print("\n📁 Testing File Validation...")
    
    try:
        service = GoogleDocumentAIService()
        print("✅ Service initialized successfully")
        
        # Δοκιμή με κενό αρχείο
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(b"")
            temp_path = temp_file.name
        
        try:
            service.process_document(temp_path)
            print("❌ Empty file validation failed: Should have raised error")
        except ValueError as e:
            if "κενό" in str(e):
                print("✅ Empty file validation working")
            else:
                print(f"❌ Empty file validation failed: {e}")
        finally:
            os.unlink(temp_path)
        
        # Δοκιμή με μεγάλο αρχείο (>20MB)
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            # Δημιουργία αρχείου 21MB
            temp_file.write(b"0" * (21 * 1024 * 1024))
            temp_path = temp_file.name
        
        try:
            service.process_document(temp_path)
            print("❌ Large file validation failed: Should have raised error")
        except ValueError as e:
            if "πολύ μεγάλο" in str(e):
                print("✅ Large file validation working")
            else:
                print(f"❌ Large file validation failed: {e}")
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        print(f"❌ File validation test failed: {e}")

def test_environment_validation():
    """Δοκιμή του environment validation"""
    print("\n🔐 Testing Environment Validation...")
    
    try:
        service = GoogleDocumentAIService()
        print("✅ Environment validation passed")
    except Exception as e:
        if "Processor ID" in str(e):
            print("⚠️  Processor ID not configured (expected in development)")
        elif "credentials" in str(e).lower():
            print("⚠️  Credentials not configured (expected in development)")
        else:
            print(f"❌ Environment validation failed: {e}")

def test_celery_task_config():
    """Δοκιμή της διαμόρφωσης Celery tasks"""
    print("\n⚙️  Testing Celery Task Configuration...")
    
    from document_parser.tasks import process_document
    
    # Έλεγχος των task settings
    task_config = process_document.__dict__
    
    expected_settings = {
        'max_retries': 3,
        'default_retry_delay': 60,
        'time_limit': 300,
        'soft_time_limit': 240
    }
    
    for setting, expected_value in expected_settings.items():
        if hasattr(process_document, setting):
            actual_value = getattr(process_document, setting)
            if actual_value == expected_value:
                print(f"✅ {setting}: {actual_value}")
            else:
                print(f"❌ {setting}: Expected {expected_value}, got {actual_value}")
        else:
            print(f"❌ {setting}: Not found")

def main():
    """Κύρια συνάρτηση δοκιμών"""
    print("🚀 Starting Document Parser Optimization Tests\n")
    
    test_connection_pooling()
    test_file_validation()
    test_environment_validation()
    test_celery_task_config()
    
    print("\n✅ All tests completed!")
    print("\n📋 Summary:")
    print("- Connection pooling: Prevents memory leaks")
    print("- File validation: Prevents oversized files")
    print("- Environment validation: Catches config errors early")
    print("- Celery optimization: Better error handling and timeouts")

if __name__ == "__main__":
    main()

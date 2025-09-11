#!/usr/bin/env python3
"""
Απλό test script για το Google Document AI
"""

import os
import sys
import django
from django.conf import settings

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from document_parser.services import GoogleDocumentAIService
import mimetypes
from pprint import pprint

def test_document_parsing(file_path):
    """Test document parsing with Google Document AI"""
    
    print(f"🚀 Επεξεργασία εγγράφου: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ Το αρχείο δεν βρέθηκε: {file_path}")
        return
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        print("❌ Δεν ήταν δυνατός ο προσδιορισμός του MIME type")
        return
    
    print(f"📄 MIME Type: {mime_type}")
    
    try:
        # Initialize service
        print("⚙️ Αρχικοποίηση Google Document AI Service...")
        service = GoogleDocumentAIService()
        print("✅ Η υπηρεσία αρχικοποιήθηκε")
        
        # Parse document
        print("🧠 Αποστολή εγγράφου στο AI για επεξεργασία...")
        extracted_data, raw_text = service.parse_document(file_path, mime_type)
        print("🎉 Η επεξεργασία ολοκληρώθηκε!")
        
        # Print results
        print("\n" + "="*50)
        print("🔬 ΕΞΑΓΟΜΕΝΑ ΔΕΔΟΜΕΝΑ:")
        print("="*50)
        pprint(extracted_data)
        
        print("\n" + "="*50)
        print("📝 ΑΚΑΤΕΡΓΑΣΤΟ ΚΕΙΜΕΝΟ (OCR) - Πρώτα 500 χαρακτήρες:")
        print("="*50)
        print(raw_text[:500] + "..." if len(raw_text) > 500 else raw_text)
        
        print("\n✅ Η δοκιμή ολοκληρώθηκε με επιτυχία!")
        
        # Summary
        print(f"\n📊 ΣΥΝΟΨΗ:")
        print(f"   - Εξαγόμενα πεδία: {len(extracted_data)}")
        print(f"   - Μήκος κειμένου: {len(raw_text)} χαρακτήρες")
        
        if extracted_data:
            for key, values in extracted_data.items():
                print(f"   - {key}: {len(values)} τιμές")
        
    except Exception as e:
        print(f"❌ Παρουσιάστηκε σφάλμα: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Χρήση: python simple_document_test.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    test_document_parsing(file_path)


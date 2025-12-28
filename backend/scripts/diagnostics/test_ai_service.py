#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from data_migration.ai_service import form_analyzer
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_ai_service():
    """Test the AI service with a simple image path"""
    try:
        print("Testing AI service...")
        
        # Test with a non-existent image path to see the error handling
        test_image_paths = ['/tmp/test_image.jpg']
        
        print("Calling form_analyzer.analyze_form_images...")
        result = form_analyzer.analyze_form_images(test_image_paths)
        
        print("AI service test completed successfully!")
        print(f"Result: {result}")
        
    except Exception as e:
        print(f"Error in AI service test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ai_service()

#!/usr/bin/env python
import os
import django

# Setup Django first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def test_imports():
    """Test if all required modules can be imported"""
    try:
        print("Testing imports...")
        
        print("1. Testing OpenCV...")
        import cv2
        print(f"   OpenCV version: {cv2.__version__}")
        
        print("2. Testing NumPy...")
        import numpy as np
        print(f"   NumPy version: {np.__version__}")
        
        print("3. Testing PIL...")
        from PIL import Image
        print(f"   PIL version: {Image.__version__}")
        
        print("4. Testing pytesseract...")
        import pytesseract
        print(f"   pytesseract version: {pytesseract.__version__}")
        
        print("5. Testing AI service...")
        from data_migration.ai_service import form_analyzer
        print("   AI service imported successfully!")
        
        print("6. Testing AI service methods...")
        result = form_analyzer.analyze_form_images(['/tmp/nonexistent.jpg'])
        print(f"   AI service method works: {result}")
        
        print("All imports successful!")
        
    except Exception as e:
        print(f"Import error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_imports()

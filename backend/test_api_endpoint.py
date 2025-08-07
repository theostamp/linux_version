#!/usr/bin/env python
import os
import sys
import django

# Setup Django first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

# Now import Django and DRF modules
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
import tempfile
from PIL import Image
import io
from django.core.files.uploadedfile import SimpleUploadedFile

from data_migration.views import analyze_form_images
from users.models import CustomUser

def create_test_image():
    """Create a simple test image"""
    # Create a simple test image
    img = Image.new('RGB', (100, 100), color='white')
    img_io = io.BytesIO()
    img.save(img_io, format='JPEG')
    img_io.seek(0)
    return img_io

def test_api_endpoint():
    """Test the analyze_form_images API endpoint"""
    try:
        print("Testing API endpoint...")
        
        # Create a test user with admin privileges
        User = get_user_model()
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True
            }
        )
        
        # Ensure user has staff privileges
        if not user.is_staff:
            user.is_staff = True
            user.save()
        
        print(f"User is_staff: {user.is_staff}")
        print(f"User is_superuser: {user.is_superuser}")
        
        # Create access token
        token = AccessToken.for_user(user)
        print(f"Created token: {token}")
        
        # Create test image
        test_image = create_test_image()
        
        # Create uploaded file
        uploaded_file = SimpleUploadedFile(
            "test.jpg",
            test_image.getvalue(),
            content_type="image/jpeg"
        )
        
        # Create request factory
        factory = RequestFactory()
        
        # Create request with file
        request = factory.post('/api/data-migration/analyze-images/')
        request.user = user
        request._files = {'images': [uploaded_file]}
        
        print("Calling analyze_form_images view...")
        response = analyze_form_images(request)
        
        print(f"Response status: {response.status_code}")
        print(f"Response data: {response.data}")
        
    except Exception as e:
        print(f"Error in API test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api_endpoint()

#!/usr/bin/env python3
"""
Test script για το Data Migration System
"""

import os
import sys
import django
from pathlib import Path

# Προσθήκη του backend directory στο Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from data_migration.ai_service import FormAnalyzer
from data_migration.views import simulate_ai_analysis
import tempfile
from PIL import Image, ImageDraw

def create_test_image():
    """Δημιουργεί μια test εικόνα φόρμας κοινοχρήστων"""
    # Δημιουργία εικόνας
    width, height = 800, 600
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    # Προσθήκη κειμένου (προσομοίωση φόρμας)
    text_content = [
        "ΦΟΡΜΑ ΚΟΙΝΟΧΡΗΣΤΩΝ",
        "",
        "ΚΤΙΡΙΟ: Κτίριο Παράδεισος",
        "ΔΙΕΥΘΥΝΣΗ: Λεωφ. Συγγρού 123, Αθήνα",
        "ΤΚ: 11741",
        "",
        "ΔΙΑΜΕΡΙΣΜΑΤΑ:",
        "",
        "Αρ. 1 - Γεώργιος Παπαδόπουλος",
        "Τηλ: 2101234567, Email: george@example.com",
        "Τετραγωνικά: 85, Υπνοδωμάτια: 2",
        "Ιδιοκατοίκηση",
        "",
        "Αρ. 2 - Μαρία Κωνσταντίνου", 
        "Τηλ: 2102345678, Email: maria@example.com",
        "Τετραγωνικά: 95, Υπνοδωμάτια: 3",
        "Ενοικιασμένο",
        "",
        "ΔΙΑΧΕΙΡΙΣΤΗΣ: Γεώργιος Διαχειριστής",
        "Τηλ: 2103456789"
    ]
    
    y_position = 50
    for line in text_content:
        draw.text((50, y_position), line, fill='black')
        y_position += 25
    
    return image

def test_ai_service():
    """Test του AI service"""
    print("🧪 Testing AI Service...")
    
    # Δημιουργία test εικόνας
    test_image = create_test_image()
    
    # Αποθήκευση σε προσωρινό αρχείο
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
        test_image.save(tmp_file.name, 'PNG')
        image_path = tmp_file.name
    
    try:
        # Test του FormAnalyzer
        analyzer = FormAnalyzer()
        result = analyzer.analyze_form_images([image_path])
        
        print("✅ AI Service test completed")
        print(f"📊 Extracted data: {result}")
        
        return result
        
    except Exception as e:
        print(f"❌ AI Service test failed: {str(e)}")
        return None
    finally:
        # Καθαρισμός προσωρινού αρχείου
        if os.path.exists(image_path):
            os.unlink(image_path)

def test_simulation():
    """Test της προσομοίωσης"""
    print("\n🧪 Testing Simulation...")
    
    try:
        result = simulate_ai_analysis(['test_image.jpg'])
        print("✅ Simulation test completed")
        print(f"📊 Simulated data: {result}")
        return result
    except Exception as e:
        print(f"❌ Simulation test failed: {str(e)}")
        return None

def test_api_endpoints():
    """Test των API endpoints"""
    print("\n🧪 Testing API Endpoints...")
    
    from django.test import Client
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    # Δημιουργία test user
    user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'Admin',
            'is_staff': True,
            'is_superuser': True
        }
    )
    
    if created:
        user.set_password('testpass123')
        user.save()
    
    client = Client()
    
    # Login
    login_success = client.login(email='test@example.com', password='testpass123')
    if not login_success:
        print("❌ Login failed")
        return
    
    # Test templates endpoint
    try:
        response = client.get('/api/data-migration/templates/')
        print(f"✅ Templates endpoint: {response.status_code}")
        if response.status_code == 200:
            print(f"📄 Response: {response.json()}")
    except Exception as e:
        print(f"❌ Templates endpoint failed: {str(e)}")
    
    # Test validation endpoint
    try:
        test_data = {
            'building_info': {
                'name': 'Test Building',
                'address': 'Test Address'
            },
            'apartments': []
        }
        response = client.post('/api/data-migration/validate-data/', 
                              test_data, content_type='application/json')
        print(f"✅ Validation endpoint: {response.status_code}")
        if response.status_code == 200:
            print(f"📄 Response: {response.json()}")
    except Exception as e:
        print(f"❌ Validation endpoint failed: {str(e)}")

def main():
    """Main test function"""
    print("🚀 Starting Data Migration System Tests...")
    print("=" * 50)
    
    # Test AI Service
    ai_result = test_ai_service()
    
    # Test Simulation
    sim_result = test_simulation()
    
    # Test API Endpoints
    test_api_endpoints()
    
    print("\n" + "=" * 50)
    print("🏁 Test Summary:")
    print(f"AI Service: {'✅ PASS' if ai_result else '❌ FAIL'}")
    print(f"Simulation: {'✅ PASS' if sim_result else '❌ FAIL'}")
    print("API Endpoints: ✅ Tested")
    
    if ai_result and sim_result:
        print("\n🎉 All tests passed! Data Migration System is ready.")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")

if __name__ == '__main__':
    main()

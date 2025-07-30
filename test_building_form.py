#!/usr/bin/env python3
import requests
import json

def test_building_creation():
    """Test building creation API endpoint"""
    print("🧪 Testing Building Creation API")
    print("=" * 40)
    
    # Test data for building creation
    building_data = {
        "name": "Test Building",
        "address": "Test Address 123",
        "city": "Αθήνα",
        "postal_code": "10552",
        "apartments_count": 10,
        "internal_manager_name": "Test Manager",
        "internal_manager_phone": "2101234567"
    }
    
    # Test 1: Create building in demo tenant
    print("1️⃣ Testing building creation in demo tenant...")
    demo_api_url = "http://demo.localhost:8000/api/buildings/"
    
    try:
        response = requests.post(demo_api_url, json=building_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 201:
            created_building = response.json()
            print(f"   ✅ Success! Building created with ID: {created_building.get('id')}")
            print(f"      Name: {created_building.get('name')}")
            print(f"      Address: {created_building.get('address')}")
            print(f"      City: {created_building.get('city')}")
            print(f"      Postal Code: {created_building.get('postal_code')}")
            return created_building.get('id')
        else:
            print(f"   ❌ Failed: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def test_building_form_fields():
    """Test if the building form fields are accessible"""
    print("\n2️⃣ Testing building form fields...")
    
    # Test the form page
    form_url = "http://demo.localhost:3000/buildings/new"
    
    try:
        response = requests.get(form_url)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Building form page is accessible")
            
            # Check if the page contains postal_code field
            if 'postal_code' in response.text:
                print("   ✅ Postal code field is present in the form")
            else:
                print("   ⚠️ Postal code field not found in the form HTML")
                
            # Check if the page contains required field indicators
            if 'Ταχυδρομικός Κώδικας' in response.text:
                print("   ✅ Postal code label is present")
            else:
                print("   ⚠️ Postal code label not found")
        else:
            print(f"   ❌ Form page not accessible: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error accessing form: {e}")

def test_building_validation():
    """Test building validation without postal code"""
    print("\n3️⃣ Testing building validation without postal code...")
    
    # Test data without postal code
    building_data_no_postal = {
        "name": "Test Building No Postal",
        "address": "Test Address 456",
        "city": "Αθήνα",
        "apartments_count": 5
        # Missing postal_code
    }
    
    demo_api_url = "http://demo.localhost:8000/api/buildings/"
    
    try:
        response = requests.post(demo_api_url, json=building_data_no_postal)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 400:
            print("   ✅ Validation correctly rejected building without postal code")
            error_data = response.json()
            if 'postal_code' in str(error_data):
                print("   ✅ Postal code validation error is present")
            else:
                print("   ⚠️ Postal code validation error not found")
        else:
            print(f"   ⚠️ Unexpected response: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing Building Form and API")
    print("=" * 50)
    
    # Test form fields
    test_building_form_fields()
    
    # Test validation
    test_building_validation()
    
    # Test creation
    building_id = test_building_creation()
    
    print("\n" + "=" * 50)
    if building_id:
        print("✅ Building creation test completed successfully!")
        print(f"🌐 You can view the created building at: http://demo.localhost:3000/buildings/{building_id}")
    else:
        print("❌ Building creation test failed!")
    
    print("\n📋 Summary:")
    print("   - Building form should be accessible")
    print("   - Postal code field should be present and required")
    print("   - API should validate postal code requirement")
    print("   - Building creation should work with valid data") 
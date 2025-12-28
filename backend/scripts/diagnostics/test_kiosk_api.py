#!/usr/bin/env python3
"""
Test script for Kiosk API endpoints
"""

import os
import sys
import django
import requests
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskWidgetConfig
from buildings.models import Building

def test_kiosk_api():
    """Test kiosk API endpoints"""
    
    print("🧪 Testing Kiosk API Endpoints")
    print("=" * 50)
    
    # Test with demo tenant
    with schema_context('demo'):
        # Get a building
        try:
            building = Building.objects.first()
            if not building:
                print("❌ No buildings found in demo tenant")
                return
            
            building_id = building.id
            print(f"✅ Testing with building: {building.name} (ID: {building_id})")
            
        except Exception as e:
            print(f"❌ Error getting building: {e}")
            return
        
        # Test public kiosk config endpoint
        try:
            url = f"http://localhost:8000/api/kiosk/public/configs/get_by_building/?building_id={building_id}"
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Public kiosk config endpoint working")
                print(f"   - Building: {data.get('building', 'N/A')}")
                print(f"   - Widgets count: {len(data.get('widgets', []))}")
                print(f"   - Settings: {data.get('settings', {})}")
            else:
                print(f"❌ Public kiosk config endpoint failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing public endpoint: {e}")
        
        # Test public info endpoint
        try:
            url = f"http://localhost:8000/api/public-info/{building_id}/"
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Public info endpoint working")
                print(f"   - Announcements: {len(data.get('announcements', []))}")
                print(f"   - Votes: {len(data.get('votes', []))}")
                print(f"   - Building info: {data.get('building_info', {}).get('name', 'N/A')}")
            else:
                print(f"❌ Public info endpoint failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing public info endpoint: {e}")
        
        # Test weather endpoint (if available)
        try:
            url = "http://localhost:3000/api/weather"
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Weather endpoint working")
                print(f"   - Temperature: {data.get('temperature', 'N/A')}°C")
                print(f"   - Description: {data.get('description', 'N/A')}")
            else:
                print(f"❌ Weather endpoint failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing weather endpoint: {e}")
        
        # Test kiosk config creation
        try:
            config, created = KioskWidgetConfig.objects.get_or_create(
                building=building,
                defaults={
                    'config': {
                        'widgets': KioskWidgetConfig()._get_default_widgets(),
                        'settings': {
                            'slideDuration': 10,
                            'refreshInterval': 30,
                            'autoRefresh': True
                        }
                    }
                }
            )
            
            if created:
                print(f"✅ Created kiosk config for building {building.name}")
            else:
                print(f"✅ Kiosk config already exists for building {building.name}")
            
            print(f"   - Config ID: {config.id}")
            print(f"   - Widgets: {len(config.widgets)}")
            print(f"   - Settings: {config.settings}")
            
        except Exception as e:
            print(f"❌ Error creating kiosk config: {e}")

def test_frontend_integration():
    """Test frontend integration"""
    
    print("\n🌐 Testing Frontend Integration")
    print("=" * 50)
    
    try:
        # Test frontend kiosk page
        url = "http://localhost:3000/kiosk-public"
        response = requests.get(url)
        
        if response.status_code == 200:
            print("✅ Frontend kiosk page accessible")
        else:
            print(f"❌ Frontend kiosk page failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing frontend: {e}")

if __name__ == "__main__":
    print("🚀 Starting Kiosk API Tests")
    print("=" * 50)
    
    test_kiosk_api()
    test_frontend_integration()
    
    print("\n✅ Kiosk API Tests Complete")
    print("=" * 50)

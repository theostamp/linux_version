"""
Direct API test using Django test client.
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from rest_framework.test import APIClient
from users.models import CustomUser
from buildings.models import Building
import json

with schema_context('demo'):
    # Get user and building
    user = CustomUser.objects.filter(is_staff=True).first()
    building = Building.objects.first()

    print(f"User: {user.email}")
    print(f"Building: {building.name}\n")

    # Create API client
    client = APIClient()
    client.force_authenticate(user=user)

    # Test 1: Get pending events
    print("=== Test 1: GET /api/notifications/events/pending/ ===")
    response = client.get(f'/api/notifications/events/pending/?building_id={building.id}')
    print(f"Status: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.data, indent=2, ensure_ascii=False))
    print()

    # Test 2: Get all events
    print("=== Test 2: GET /api/notifications/events/ ===")
    response = client.get(f'/api/notifications/events/?building={building.id}')
    print(f"Status: {response.status_code}")
    print(f"Count: {response.data.get('count', 0)}")
    if response.data.get('results'):
        print(f"First event: {response.data['results'][0]['title']}")
    print()

    # Test 3: Digest preview
    print("=== Test 3: POST /api/notifications/events/digest_preview/ ===")
    response = client.post(
        '/api/notifications/events/digest_preview/',
        {'building_id': building.id},
        format='json'
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Subject: {response.data.get('subject')}")
        print(f"Event count: {response.data.get('event_count')}")
        print(f"Events by type: {response.data.get('events_by_type')}")
        print(f"Body preview (first 300 chars):")
        body = response.data.get('body', '')
        print(body[:300])
        print("...")
    else:
        print(f"Error: {response.data}")
    print()

    print("✅ All API tests completed!")

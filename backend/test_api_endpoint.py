#!/usr/bin/env python3
"""
Test script για το API endpoint summary
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context


def test_api_endpoint():
    """Test του API endpoint summary"""
    
    with schema_context('demo'):
        print("🧪 Testing API endpoint summary")
        print("=" * 40)
        
        try:
            # Δημιουργία test user
            User = get_user_model()
            user, created = User.objects.get_or_create(
                email='test@example.com',
                defaults={
                    'first_name': 'Test',
                    'last_name': 'User',
                    'is_staff': True,
                    'is_superuser': True
                }
            )
            
            if created:
                user.set_password('testpass123')
                user.save()
            
            # Login
            client = Client()
            login_success = client.login(email='test@example.com', password='testpass123')
            
            if not login_success:
                print("❌ Αποτυχία login")
                return
            
            # Κλήση του API endpoint
            response = client.get('/api/financial/dashboard/summary/', {
                'building_id': '2'
            })
            
            print(f"📊 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ API endpoint λειτουργεί σωστά!")
                print(f"📊 Total balance: {data.get('total_balance', 0)}")
                print(f"📊 Apartments count: {data.get('apartments_count', 0)}")
                print(f"📊 Recent transactions: {data.get('recent_transactions_count', 0)}")
                
                # Έλεγχος για apartment_balances με νέα κατάσταση
                apartment_balances = data.get('apartment_balances', [])
                if apartment_balances:
                    print(f"📊 Apartment balances: {len(apartment_balances)}")
                    first_apartment = apartment_balances[0]
                    print(f"📊 First apartment status: {first_apartment.get('status', 'N/A')}")
                
            else:
                print(f"❌ API Error: {response.status_code}")
                print(f"Response: {response.content.decode()}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")


if __name__ == "__main__":
    test_api_endpoint()

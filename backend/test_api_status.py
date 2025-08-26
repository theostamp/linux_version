#!/usr/bin/env python3
"""
Test script για το API endpoint apartment_balances με τη νέα λογική κατάστασης
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


def test_api_status():
    """Test του API endpoint apartment_balances"""
    
    print("🧪 Testing API endpoint apartment_balances με νέα λογική κατάστασης")
    print("=" * 80)
    
    # Test του πρώτου endpoint (λεπτομερές)
    print("📊 Testing πρώτο endpoint (λεπτομερές):")
    print("-" * 50)
    
    try:
        # Χρήση του Django test client για να κάνουμε request
        from django.test import Client
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Δημιουργία test user αν δεν υπάρχει
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
        response = client.get('/api/financial/dashboard/apartment_balances/', {
            'building_id': '2'
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response Status: {response.status_code}")
            print(f"📊 Συνολικά διαμερίσματα: {len(data.get('apartments', []))}")
            
            # Ανάλυση καταστάσεων
            status_counts = {}
            for apartment in data.get('apartments', []):
                status = apartment.get('status', 'Άγνωστο')
                status_counts[status] = status_counts.get(status, 0) + 1
                
                print(f"🏠 Διαμέρισμα {apartment.get('apartment_number')}:")
                print(f"   Ιδιοκτήτης: {apartment.get('owner_name')}")
                print(f"   Υπόλοιπο: {apartment.get('current_balance', 0):,.2f}€")
                print(f"   Κατάσταση: {status}")
                print()
            
            print("📈 Σύνοψη καταστάσεων από API:")
            print("-" * 40)
            for status, count in status_counts.items():
                percentage = (count / len(data.get('apartments', []))) * 100 if data.get('apartments') else 0
                print(f"   {status}: {count} διαμερίσματα ({percentage:.1f}%)")
            
            # Έλεγχος summary
            summary = data.get('summary', {})
            if summary:
                print()
                print("📊 Summary από API:")
                print(f"   Ενεργό: {summary.get('active_count', 0)}")
                print(f"   Καθυστέρηση: {summary.get('delay_count', 0)}")
                print(f"   Κρίσιμο: {summary.get('critical_count', 0)}")
                print(f"   Πιστωτικό: {summary.get('credit_count', 0)}")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.content.decode()}")
            
    except Exception as e:
        print(f"❌ Error κατά το test: {str(e)}")
    
    print()
    print("✅ API test ολοκληρώθηκε!")


if __name__ == "__main__":
    test_api_status()

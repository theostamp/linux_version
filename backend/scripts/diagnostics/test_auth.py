#!/usr/bin/env python
import os
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def test_auth():
    """Δοκιμή authentication για demo users"""
    
    # Demo users
    users = [
        {
            'email': 'admin@demo.localhost',
            'password': 'admin123456',
            'name': 'Admin'
        },
        {
            'email': 'manager@demo.localhost',
            'password': 'manager123456',
            'name': 'Manager'
        },
        {
            'email': 'resident1@demo.localhost',
            'password': 'resident123456',
            'name': 'Resident 1'
        }
    ]
    
    base_url = 'http://demo.localhost:8000/api'
    
    for user in users:
        print(f"\n🔐 Δοκιμή login για {user['name']} ({user['email']})")
        print("=" * 50)
        
        # 1. Login
        login_url = f"{base_url}/users/login/"
        login_data = {
            'email': user['email'],
            'password': user['password']
        }
        
        try:
            response = requests.post(login_url, json=login_data)
            print(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get('access')
                user_data = data.get('user')
                
                print("✅ Login επιτυχής!")
                print(f"Access token: {access_token[:20]}...")
                print(f"User data: {user_data}")
                
                # 2. Test /users/me/ endpoint
                headers = {'Authorization': f'Bearer {access_token}'}
                me_url = f"{base_url}/users/me/"
                
                me_response = requests.get(me_url, headers=headers)
                print(f"GET /users/me/ status: {me_response.status_code}")
                
                if me_response.status_code == 200:
                    me_data = me_response.json()
                    print(f"✅ /users/me/ επιτυχής: {me_data}")
                else:
                    print(f"❌ /users/me/ απέτυχε: {me_response.text}")
                
                # 3. Test financial dashboard endpoint
                dashboard_url = f"{base_url}/financial/dashboard/summary/?building_id=1"
                dashboard_response = requests.get(dashboard_url, headers=headers)
                print(f"GET /financial/dashboard/summary/ status: {dashboard_response.status_code}")
                
                if dashboard_response.status_code == 200:
                    dashboard_data = dashboard_response.json()
                    print(f"✅ Financial dashboard επιτυχής: {dashboard_data}")
                else:
                    print(f"❌ Financial dashboard απέτυχε: {dashboard_response.text}")
                
            else:
                print(f"❌ Login απέτυχε: {response.text}")
                
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 ΟΔΗΓΙΕΣ ΓΙΑ ΤΟ FRONTEND:")
    print("=" * 50)
    print("1. Χρησιμοποιήστε τα παραπάνω credentials για login")
    print("2. Αποθηκεύστε το access token στο localStorage")
    print("3. Προσθέστε το Authorization header: 'Bearer <token>'")
    print("4. Ελέγξτε ότι το API URL είναι σωστό (demo.localhost:8000)")

if __name__ == '__main__':
    test_auth() 
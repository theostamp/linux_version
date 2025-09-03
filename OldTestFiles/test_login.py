#!/usr/bin/env python3
import requests

# Test login for demo tenant
def test_login():
    url = "http://demo.localhost:8000/api/users/login/"
    data = {
        "email": "admin@demo.localhost",
        "password": "admin123"  # Assuming this is the password
    }
    
    try:
        response = requests.post(url, json=data, headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("Login successful!")
            print(f"Access token: {result.get('access', 'No access token')[:20]}...")
            print(f"Refresh token: {result.get('refresh', 'No refresh token')[:20]}...")
            print(f"User: {result.get('user', {}).get('email', 'No user data')}")
            
            # Test the /users/me/ endpoint with the token
            if result.get('access'):
                test_me_endpoint(result['access'])
        else:
            print(f"Login failed with status {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

def test_me_endpoint(access_token):
    url = "http://demo.localhost:8000/api/users/me/"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers)
        print("\n/me/ endpoint test:")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"Error testing /me/ endpoint: {e}")

if __name__ == "__main__":
    test_login()

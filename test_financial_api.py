#!/usr/bin/env python3
import requests
import json

def test_financial_api():
    """Test the financial API endpoints"""
    
    # Test URL with tenant subdomain
    base_url = "http://demo.localhost:8000/api"
    
    # Test accounts endpoint
    accounts_url = f"{base_url}/financial/accounts/"
    
    print(f"Testing: {accounts_url}")
    
    try:
        response = requests.get(accounts_url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
        else:
            print(f"Error Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    test_financial_api() 
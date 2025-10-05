#!/usr/bin/env python3
"""
Generate new JWT tokens for debugging authentication issues
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

def generate_tokens():
    """Generate new JWT tokens for the first user"""
    User = get_user_model()
    
    try:
        user = User.objects.first()
        if not user:
            print("❌ No users found in database")
            return
        
        print(f"✅ Found user: {user.email}")
        
        # Generate new tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        print("\n🔑 New Tokens Generated:")
        print("=" * 50)
        print(f"Access Token:")
        print(access_token)
        print()
        print(f"Refresh Token:")
        print(refresh)
        print()
        
        print("📋 JavaScript Code for Browser Console:")
        print("=" * 50)
        print(f"""
localStorage.setItem('access', '{access_token}');
localStorage.setItem('refresh', '{refresh}');
console.log('✅ Tokens updated in localStorage');
""")
        
        print("🧪 Test API Call:")
        print("=" * 50)
        print(f"curl -X GET \"http://localhost:18000/api/kiosk/configs/?building_id=1\" \\")
        print(f"  -H \"Content-Type: application/json\" \\")
        print(f"  -H \"Authorization: Bearer {access_token}\"")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    generate_tokens()

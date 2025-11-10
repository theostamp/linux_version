#!/usr/bin/env python3
"""
Check and Create Demo Users
===========================
This script checks if demo users exist in the demo tenant and creates them if needed.
Must be run inside Docker container with proper Django setup.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from users.models import CustomUser
from django.contrib.auth.hashers import make_password

def check_demo_users():
    """Check existing demo users in the tenant schema"""
    print("🔍 Checking Demo Users...")
    print("=" * 30)
    
    with schema_context('demo'):
        users = CustomUser.objects.all()
        print(f"📊 Total users in demo schema: {users.count()}")
        
        if users.exists():
            print("\n👥 Existing users:")
            for user in users:
                print(f"   - {user.email} ({user.first_name} {user.last_name}) - Active: {user.is_active}")
        else:
            print("❌ No users found in demo schema")
        
        return users

def create_demo_users():
    """Create demo users for testing"""
    print("\n🏗️ Creating Demo Users...")
    print("-" * 25)
    
    demo_users = [
        {
            'email': 'admin@demo.localhost',
            'password': 'admin123',
            'first_name': 'Admin',
            'last_name': 'Demo',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        },
        {
            'email': 'manager@demo.localhost', 
            'password': 'manager123',
            'first_name': 'Manager',
            'last_name': 'Demo',
            'is_staff': True,
            'is_superuser': False,
            'is_active': True,
        },
        {
            'email': 'tenant@demo.localhost',
            'password': 'tenant123', 
            'first_name': 'Tenant',
            'last_name': 'Demo',
            'is_staff': False,
            'is_superuser': False,
            'is_active': True,
        }
    ]
    
    created_users = []
    
    with schema_context('demo'):
        for user_data in demo_users:
            email = user_data['email']
            
            # Check if user already exists
            if CustomUser.objects.filter(email=email).exists():
                print(f"⚠️ User {email} already exists, skipping...")
                continue
            
            # Create user
            user = CustomUser.objects.create(
                email=email,
                password=make_password(user_data['password']),
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                is_staff=user_data['is_staff'],
                is_superuser=user_data['is_superuser'],
                is_active=user_data['is_active'],
            )
            created_users.append(user)
            print(f"✅ Created user: {email} (password: {user_data['password']})")
    
    return created_users

def test_login_credentials():
    """Test if login credentials work"""
    print("\n🧪 Testing Login Credentials...")
    print("-" * 30)
    
    test_credentials = [
        ('admin@demo.localhost', 'admin123'),
        ('manager@demo.localhost', 'manager123'),
        ('tenant@demo.localhost', 'tenant123'),
    ]
    
    with schema_context('demo'):
        for email, password in test_credentials:
            try:
                user = CustomUser.objects.get(email=email)
                if user.check_password(password):
                    print(f"✅ {email}: Login credentials valid")
                else:
                    print(f"❌ {email}: Invalid password")
            except CustomUser.DoesNotExist:
                print(f"❌ {email}: User not found")

def main():
    """Main execution function"""
    print("🚀 Demo Users Configuration")
    print("=" * 40)
    
    # Check existing users
    existing_users = check_demo_users()
    
    # Create users if none exist
    if not existing_users.exists():
        created_users = create_demo_users()
        print(f"\n✅ Created {len(created_users)} demo users")
    else:
        print("\n✅ Demo users already exist")
    
    # Test login credentials
    test_login_credentials()
    
    # Final summary
    print("\n📋 Demo Users Summary:")
    print("-" * 25)
    final_users = check_demo_users()
    
    print(f"\n🎯 Login Information:")
    print(f"   - Admin: admin@demo.localhost / admin123")
    print(f"   - Manager: manager@demo.localhost / manager123") 
    print(f"   - Tenant: tenant@demo.localhost / tenant123")
    
    print(f"\n🌐 Frontend URL: http://demo.localhost:8080")
    print(f"🔗 Backend API: http://demo.localhost:8000/api")

if __name__ == '__main__':
    main()

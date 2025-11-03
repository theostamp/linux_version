#!/usr/bin/env python3
"""
Fix tenant user issue - ensure user exists in both public and tenant schemas
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
from tenants.models import Client

def fix_tenant_user():
    """Ensure user exists in both public and tenant schemas"""
    print("🔍 Fixing User-Tenant Relationships...")
    print("=" * 50)
    
    # Find user in public schema
    email = 'etherm2021@gmail.com'
    
    with schema_context('public'):
        try:
            public_user = CustomUser.objects.get(email=email)
            print(f"✅ Found user in public schema:")
            print(f"   ID: {public_user.id}")
            print(f"   Email: {public_user.email}")
            print(f"   Username: {public_user.username}")
            print(f"   Tenant: {public_user.tenant}")
            print(f"   Tenant Schema: {public_user.tenant.schema_name if public_user.tenant else 'None'}")
            print()
            
            if not public_user.tenant:
                print("❌ User has no tenant assigned!")
                return
                
            tenant_schema = public_user.tenant.schema_name
            print(f"🏢 Checking tenant schema: {tenant_schema}")
            
            # Check if user exists in tenant schema
            with schema_context(tenant_schema):
                try:
                    tenant_user = CustomUser.objects.get(email=email)
                    print(f"✅ User already exists in tenant schema {tenant_schema}")
                    print(f"   Tenant User ID: {tenant_user.id}")
                    
                    # Check if IDs match
                    if tenant_user.id != public_user.id:
                        print(f"⚠️  WARNING: User IDs don't match!")
                        print(f"   Public ID: {public_user.id}")
                        print(f"   Tenant ID: {tenant_user.id}")
                        print(f"   This will cause authentication issues!")
                        
                        # Fix by ensuring the same ID
                        print(f"🔧 Fixing user ID mismatch...")
                        tenant_user.delete()
                        
                        # Create user with same ID as public
                        tenant_user = CustomUser.objects.create(
                            id=public_user.id,
                            email=public_user.email,
                            username=public_user.username,
                            first_name=public_user.first_name,
                            last_name=public_user.last_name,
                            is_active=public_user.is_active,
                            is_staff=public_user.is_staff,
                            is_superuser=public_user.is_superuser,
                            role=public_user.role,
                            password=public_user.password  # Copy hashed password
                        )
                        print(f"✅ Recreated user with matching ID: {tenant_user.id}")
                    
                except CustomUser.DoesNotExist:
                    print(f"❌ User does not exist in tenant schema {tenant_schema}")
                    print(f"🔧 Creating user in tenant schema...")
                    
                    # Create user in tenant schema with same ID as public
                    tenant_user = CustomUser.objects.create(
                        id=public_user.id,  # CRITICAL: Use same ID as public
                        email=public_user.email,
                        username=public_user.username,
                        first_name=public_user.first_name,
                        last_name=public_user.last_name,
                        is_active=public_user.is_active,
                        is_staff=public_user.is_staff,
                        is_superuser=public_user.is_superuser,
                        role=public_user.role,
                        password=public_user.password  # Copy hashed password
                    )
                    print(f"✅ Created user in tenant schema with ID: {tenant_user.id}")
                    
            print()
            print("✅ User synchronization complete!")
                    
        except CustomUser.DoesNotExist:
            print(f"❌ User {email} not found in public schema")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    fix_tenant_user()

#!/usr/bin/env python3
"""
Script to assign admin user as manager to building
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from users.models import CustomUser

def assign_manager_to_building():
    """Assign admin user as manager to building"""
    
    with schema_context('demo'):
        print("🔧 Assigning Manager to Building")
        print("=" * 50)
        
        try:
            # Get admin user
            admin_user = CustomUser.objects.get(email='admin@demo.localhost')
            print(f"✅ Found admin user: {admin_user.email}")
            
            # Get building
            building = Building.objects.get(id=1)
            print(f"✅ Found building: {building.name}")
            
            # Assign manager
            building.manager = admin_user
            building.save()
            
            print(f"✅ Assigned {admin_user.email} as manager of {building.name}")
            
            # Verify assignment
            building.refresh_from_db()
            if building.manager:
                print(f"✅ Verification: Building manager is now {building.manager.email}")
                if building.manager.office_logo:
                    print(f"✅ Manager has logo: {building.manager.office_logo.url}")
                else:
                    print("⚠️ Manager has no logo")
            else:
                print("❌ Assignment failed")
                
        except CustomUser.DoesNotExist:
            print("❌ Admin user not found")
        except Building.DoesNotExist:
            print("❌ Building not found")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    assign_manager_to_building()



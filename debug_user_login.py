import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context

User = get_user_model()

def check_user_status(email):
    print(f"🔍 Checking status for user: {email}")
    
    with schema_context('public'):
        try:
            user = User.objects.get(email__iexact=email)
            print(f"✅ User found: {user.email}")
            print(f"   ID: {user.id}")
            print(f"   Active: {user.is_active}")
            print(f"   Verified: {user.email_verified}")
            print(f"   Staff: {user.is_staff}")
            print(f"   Superuser: {user.is_superuser}")
            print(f"   Role: {user.role}")
            
            if user.is_active and not user.email_verified:
                if user.is_staff or user.is_superuser:
                    print("⚠️  WARNING: User is STAFF/SUPERUSER but NOT VERIFIED.")
                    print("   Authentication will fail due to EmailBackend security check.")
                else:
                    print("ℹ️  User is unverified resident (should be able to login).")
            
            if not user.is_active:
                print("❌ User is INACTIVE.")

            # Optional: Reset password prompt
            print("\nTo reset password, use:")
            print(f"user = User.objects.get(email='{user.email}')")
            print("user.set_password('new_password')")
            print("user.save()")
            
        except User.DoesNotExist:
            print(f"❌ User not found with email: {email}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_user_status(sys.argv[1])
    else:
        print("Usage: python debug_user_login.py <email>")


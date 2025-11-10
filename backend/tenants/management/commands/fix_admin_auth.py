#!/usr/bin/env python
"""
Management command to fix admin authentication issues on Railway
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from users.models import CustomUser
import sys


class Command(BaseCommand):
    help = 'Fix admin authentication issues'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("ADMIN AUTHENTICATION FIX")
        self.stdout.write("=" * 60)

        email = "theostam1966@gmail.com"
        password = "theo123!@#"

        # Step 1: Check if user exists
        try:
            user = CustomUser.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f"✅ User found: {email}"))

            # Display user details
            self.stdout.write(f"   ID: {user.id}")
            self.stdout.write(f"   Username: {user.username if hasattr(user, 'username') else 'N/A'}")
            self.stdout.write(f"   First name: {user.first_name}")
            self.stdout.write(f"   Last name: {user.last_name}")
            self.stdout.write(f"   Is active: {user.is_active}")
            self.stdout.write(f"   Is staff: {user.is_staff}")
            self.stdout.write(f"   Is superuser: {user.is_superuser}")
            self.stdout.write(f"   Date joined: {user.date_joined}")
            self.stdout.write(f"   Last login: {user.last_login}")

            # Step 2: Check current password
            self.stdout.write("\n" + "-" * 40)
            self.stdout.write("Testing current authentication...")

            # Test with email as username
            auth_user = authenticate(username=email, password=password)
            if auth_user:
                self.stdout.write(self.style.SUCCESS("✅ Authentication works with email!"))
                return

            # Check if password matches
            if user.check_password(password):
                self.stdout.write("✅ Password hash matches but authentication failed")
                self.stdout.write("   This might be a USERNAME vs EMAIL issue")
            else:
                self.stdout.write(self.style.WARNING("❌ Current password doesn't match"))

            # Step 3: Fix user flags
            self.stdout.write("\n" + "-" * 40)
            self.stdout.write("Fixing user flags...")

            fixed = False
            if not user.is_active:
                user.is_active = True
                fixed = True
                self.stdout.write("   Set is_active = True")

            if not user.is_staff:
                user.is_staff = True
                fixed = True
                self.stdout.write("   Set is_staff = True")

            if not user.is_superuser:
                user.is_superuser = True
                fixed = True
                self.stdout.write("   Set is_superuser = True")

            # Step 4: Reset password
            self.stdout.write("\n" + "-" * 40)
            self.stdout.write("Resetting password...")
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"✅ Password reset to: {password}"))

            # Step 5: Test authentication again
            self.stdout.write("\n" + "-" * 40)
            self.stdout.write("Testing authentication after fix...")

            # Test with email
            auth_user = authenticate(username=email, password=password)
            if auth_user:
                self.stdout.write(self.style.SUCCESS("✅ Authentication SUCCESSFUL with email!"))
            else:
                self.stdout.write(self.style.ERROR("❌ Authentication still failing"))

                # Try creating username field if needed
                if hasattr(user, 'username') and not user.username:
                    user.username = email
                    user.save()
                    self.stdout.write("   Set username = email")

                    auth_user = authenticate(username=email, password=password)
                    if auth_user:
                        self.stdout.write(self.style.SUCCESS("✅ Authentication works now!"))

        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ User NOT found: {email}"))

            # Create new superuser
            self.stdout.write("\nCreating new superuser...")
            user = CustomUser.objects.create_superuser(
                email=email,
                password=password,
                first_name="Theo",
                last_name="Stam"
            )
            self.stdout.write(self.style.SUCCESS(f"✅ Superuser created: {email}"))

            # Test authentication
            auth_user = authenticate(username=email, password=password)
            if auth_user:
                self.stdout.write(self.style.SUCCESS("✅ Authentication works!"))
            else:
                self.stdout.write(self.style.ERROR("❌ Something is seriously wrong with authentication"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
            import traceback
            traceback.print_exc()

        # Final summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write("You should now be able to login with:")
        self.stdout.write(f"   Email: {email}")
        self.stdout.write(f"   Password: {password}")
        self.stdout.write("")
        self.stdout.write("Login URL: https://linuxversion-production.up.railway.app/admin/")
        self.stdout.write("=" * 60)
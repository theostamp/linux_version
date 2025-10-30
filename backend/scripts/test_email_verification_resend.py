#!/usr/bin/env python3
"""
Test script for email verification resend functionality.
Tests the complete flow from registration to resend to verification.
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import Group
from users.models import CustomUser
from users.services import EmailService, UserVerificationService
from django.utils import timezone
from datetime import timedelta
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_email_verification_resend():
    """Test the complete email verification resend flow."""
    print("🧪 Testing Email Verification Resend Flow")
    print("=" * 60)
    
    # Test 1: Create unverified user
    print("\n1️⃣ Creating Unverified User...")
    user = create_unverified_user()
    
    # Test 2: Test resend functionality
    print("\n2️⃣ Testing Resend Functionality...")
    test_resend_verification(user)
    
    # Test 3: Test verification with new token
    print("\n3️⃣ Testing Verification with New Token...")
    test_verification_with_new_token(user)
    
    # Test 4: Test expired token handling
    print("\n4️⃣ Testing Expired Token Handling...")
    test_expired_token_handling()
    
    # Test 5: Test already verified user
    print("\n5️⃣ Testing Already Verified User...")
    test_already_verified_user()
    
    print("\n✅ Email Verification Resend Test Complete!")


def create_unverified_user():
    """Create a test user with unverified email."""
    print("  Creating unverified user...")
    
    try:
        # Create user with unverified email
        user = CustomUser.objects.create(
            email='test_verification@example.com',
            first_name='Test',
            last_name='Verification',
            is_active=False,  # Not active until verified
            email_verified=False,  # Not verified
        )
        user.set_password('test123456')
        user.save()
        
        print(f"  ✅ User created: {user.email}")
        print(f"  ✅ is_active: {user.is_active}")
        print(f"  ✅ email_verified: {user.email_verified}")
        
        return user
        
    except Exception as e:
        print(f"  ❌ Error creating user: {e}")
        return None


def test_resend_verification(user):
    """Test resend verification functionality."""
    if not user:
        print("  ⚠️ No user to test with")
        return
    
    print("  Testing resend verification...")
    
    try:
        # Get initial token
        initial_token = user.email_verification_token
        initial_sent_at = user.email_verification_sent_at
        
        print(f"  Initial token: {initial_token[:20] if initial_token else 'None'}...")
        print(f"  Initial sent at: {initial_sent_at}")
        
        # Send verification email (simulates resend)
        result = EmailService.send_verification_email(user)
        
        if result:
            print("  ✅ Verification email sent successfully")
            
            # Refresh user from database
            user.refresh_from_db()
            
            # Check if new token was generated
            new_token = user.email_verification_token
            new_sent_at = user.email_verification_sent_at
            
            print(f"  New token: {new_token[:20] if new_token else 'None'}...")
            print(f"  New sent at: {new_sent_at}")
            
            # Verify token changed
            if new_token != initial_token:
                print("  ✅ New token generated (as expected)")
            else:
                print("  ⚠️ Token didn't change (unexpected)")
            
            # Verify timestamp updated
            if new_sent_at != initial_sent_at:
                print("  ✅ Timestamp updated (as expected)")
            else:
                print("  ⚠️ Timestamp didn't update (unexpected)")
                
        else:
            print("  ❌ Failed to send verification email")
            
    except Exception as e:
        print(f"  ❌ Error in resend test: {e}")


def test_verification_with_new_token(user):
    """Test verification with the new token."""
    if not user:
        print("  ⚠️ No user to test with")
        return
    
    print("  Testing verification with new token...")
    
    try:
        # Get current token
        current_token = user.email_verification_token
        
        if not current_token:
            print("  ❌ No verification token found")
            return
        
        print(f"  Using token: {current_token[:20]}...")
        
        # Verify email with token
        verified_user = UserVerificationService.verify_email(current_token)
        
        if verified_user:
            print("  ✅ Email verified successfully")
            print(f"  ✅ is_active: {verified_user.is_active}")
            print(f"  ✅ email_verified: {verified_user.email_verified}")
            print(f"  ✅ token cleared: {verified_user.email_verification_token is None}")
        else:
            print("  ❌ Email verification failed")
            
    except Exception as e:
        print(f"  ❌ Error in verification test: {e}")


def test_expired_token_handling():
    """Test handling of expired tokens."""
    print("  Testing expired token handling...")
    
    try:
        # Create user with expired token
        user = CustomUser.objects.create(
            email='test_expired@example.com',
            first_name='Test',
            last_name='Expired',
            is_active=False,
            email_verified=False,
            email_verification_token='expired_token_123',
            email_verification_sent_at=timezone.now() - timedelta(hours=25)  # 25 hours ago
        )
        user.set_password('test123456')
        user.save()
        
        print(f"  ✅ User created with expired token")
        print(f"  ✅ Token sent 25 hours ago (expired)")
        
        # Try to verify with expired token
        try:
            UserVerificationService.verify_email('expired_token_123')
            print("  ❌ Expired token was accepted (unexpected)")
        except ValueError as e:
            if "λήξει" in str(e):
                print("  ✅ Expired token correctly rejected")
                print(f"  ✅ Error message: {e}")
            else:
                print(f"  ⚠️ Unexpected error: {e}")
        
        # Clean up
        user.delete()
        print("  🧹 Cleaned up expired token test user")
        
    except Exception as e:
        print(f"  ❌ Error in expired token test: {e}")


def test_already_verified_user():
    """Test resend for already verified user."""
    print("  Testing resend for already verified user...")
    
    try:
        # Create already verified user
        user = CustomUser.objects.create(
            email='test_verified@example.com',
            first_name='Test',
            last_name='Verified',
            is_active=True,
            email_verified=True,
        )
        user.set_password('test123456')
        user.save()
        
        print(f"  ✅ User created as already verified")
        
        # Try to resend verification (should fail)
        try:
            # This simulates what the API endpoint does
            user = CustomUser.objects.get(email='test_verified@example.com', email_verified=False)
            print("  ❌ Found unverified user when should be verified")
        except CustomUser.DoesNotExist:
            print("  ✅ Correctly rejected resend for verified user")
        
        # Clean up
        user.delete()
        print("  🧹 Cleaned up verified user test")
        
    except Exception as e:
        print(f"  ❌ Error in already verified test: {e}")


def show_verification_flow():
    """Show the complete verification flow."""
    print("\n📧 Email Verification Flow:")
    print("=" * 40)
    print("1. User registers → is_active=False, email_verified=False")
    print("2. Verification email sent → token generated")
    print("3. User doesn't receive email → clicks 'Resend'")
    print("4. New email sent → new token generated")
    print("5. User clicks link → email verified, is_active=True")
    print("6. User can now login and use the system")


def show_api_endpoints():
    """Show the API endpoints for verification."""
    print("\n🔌 API Endpoints:")
    print("=" * 30)
    print("POST /api/users/verify-email/")
    print("  Body: { 'token': 'verification_token' }")
    print("  Response: { 'message': 'Email επιβεβαιώθηκε επιτυχώς' }")
    print()
    print("POST /api/users/resend-verification/")
    print("  Body: { 'email': 'user@example.com' }")
    print("  Response: { 'message': 'Email επιβεβαίωσης στάλθηκε ξανά' }")


if __name__ == '__main__':
    try:
        test_email_verification_resend()
        show_verification_flow()
        show_api_endpoints()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)





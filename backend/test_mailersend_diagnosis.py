#!/usr/bin/env python
"""
Script για διάγνωση MailerSend email issues
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from users.mailersend_backend import MailerSendEmailBackend
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def diagnose_mailersend():
    """Διάγνωση MailerSend configuration"""
    print("=" * 60)
    print("🔍 MailerSend Configuration Diagnosis")
    print("=" * 60)
    
    # 1. Check EMAIL_BACKEND
    print(f"\n1. EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    expected_backend = 'users.mailersend_backend.MailerSendEmailBackend'
    if settings.EMAIL_BACKEND != expected_backend:
        print(f"   ⚠️  WARNING: Expected '{expected_backend}', got '{settings.EMAIL_BACKEND}'")
    else:
        print("   ✅ EMAIL_BACKEND is correctly set")
    
    # 2. Check MAILERSEND_API_KEY
    api_key = os.getenv('MAILERSEND_API_KEY', '')
    print(f"\n2. MAILERSEND_API_KEY: {'✅ Set' if api_key else '❌ NOT SET'}")
    if api_key:
        # Show first and last 4 chars for security
        masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
        print(f"   Key preview: {masked_key}")
    
    # 3. Check MAILERSEND_FROM_EMAIL
    from_email = os.getenv('MAILERSEND_FROM_EMAIL', 'noreply@newconcierge.app')
    print(f"\n3. MAILERSEND_FROM_EMAIL: {from_email}")
    
    # 4. Check DEFAULT_FROM_EMAIL
    default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@newconcierge.gr')
    print(f"4. DEFAULT_FROM_EMAIL: {default_from}")
    if from_email != default_from:
        print(f"   ⚠️  WARNING: MAILERSEND_FROM_EMAIL ({from_email}) != DEFAULT_FROM_EMAIL ({default_from})")
        print(f"   ℹ️  MailerSend backend will use {from_email}, but EmailService uses {default_from}")
    
    # 5. Check FRONTEND_URL
    frontend_url = getattr(settings, 'FRONTEND_URL', '')
    print(f"\n5. FRONTEND_URL: {frontend_url or '❌ NOT SET'}")
    
    # 6. Test backend initialization
    print("\n6. Testing MailerSend Backend Initialization:")
    try:
        backend = MailerSendEmailBackend()
        print(f"   ✅ Backend initialized successfully")
        print(f"   Backend from_email: {backend.from_email}")
        print(f"   Backend API key set: {'✅ Yes' if backend.api_key else '❌ No'}")
    except Exception as e:
        print(f"   ❌ Failed to initialize backend: {e}")
    
    # 7. Test actual email send (optional)
    test_email = os.getenv('TEST_EMAIL', '')
    if test_email and api_key:
        print(f"\n7. Test Email Send (to {test_email}):")
        try:
            send_mail(
                subject="Test Email from MailerSend Diagnosis",
                message="This is a test email to verify MailerSend configuration.",
                from_email=from_email,  # Use MailerSend from_email
                recipient_list=[test_email],
                fail_silently=False,
            )
            print("   ✅ Test email sent successfully!")
            print("   ℹ️  Check the inbox and MailerSend dashboard")
        except Exception as e:
            print(f"   ❌ Failed to send test email: {e}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
    else:
        print(f"\n7. Test Email Send: Skipped (TEST_EMAIL or MAILERSEND_API_KEY not set)")
    
    print("\n" + "=" * 60)
    print("Diagnosis Complete")
    print("=" * 60)

if __name__ == '__main__':
    diagnose_mailersend()


#!/usr/bin/env python3
"""
Test script for Resend email configuration
"""
import os
import sys
import django
from django.conf import settings

# Add the project directory to Python path
sys.path.append('/home/theo/project/linux_version/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.mail import send_mail
from django.core.mail import EmailMessage
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_resend_configuration():
    """Test Resend email configuration"""
    print("🔧 Testing Resend Email Configuration")
    print("=" * 50)
    
    # Check environment variables
    resend_api_key = os.getenv('RESEND_API_KEY')
    resend_from_email = os.getenv('RESEND_FROM_EMAIL', 'noreply@newconcierge.gr')
    
    print(f"📧 EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"🔑 RESEND_API_KEY: {'✅ Set' if resend_api_key else '❌ Missing'}")
    print(f"📨 RESEND_FROM_EMAIL: {resend_from_email}")
    print(f"📨 DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    
    if not resend_api_key:
        print("\n❌ RESEND_API_KEY is not set!")
        print("Please set the RESEND_API_KEY environment variable in Railway.")
        return False
    
    # Test email sending
    try:
        print("\n📤 Sending test email...")
        
        # Create a test email
        subject = "Test Email from New Concierge"
        message = """
        <h2>Test Email</h2>
        <p>This is a test email sent via Resend API.</p>
        <p>If you receive this, the Resend configuration is working correctly!</p>
        """
        
        # Send email using Django's send_mail
        result = send_mail(
            subject=subject,
            message=message,
            from_email=resend_from_email,
            recipient_list=['test@example.com'],  # Change this to your email
            html_message=message,
            fail_silently=False
        )
        
        print(f"✅ Email sent successfully! Result: {result}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        logger.error(f"Email sending error: {e}")
        return False

def test_resend_direct():
    """Test Resend API directly"""
    print("\n🔧 Testing Resend API Directly")
    print("=" * 50)
    
    try:
        from users.email_backends import ResendEmailBackend
        
        # Create ResendEmailBackend instance
        backend = ResendEmailBackend()
        
        # Create test email message
        email = EmailMessage(
            subject="Direct Resend Test",
            body="<h1>Direct Resend Test</h1><p>This is a direct test of Resend API.</p>",
            from_email=os.getenv('RESEND_FROM_EMAIL', 'noreply@newconcierge.gr'),
            to=['test@example.com'],  # Change this to your email
        )
        email.content_subtype = "html"
        
        # Send using backend directly
        result = backend.send_messages([email])
        print(f"✅ Direct Resend test successful! Sent: {result} emails")
        return True
        
    except Exception as e:
        print(f"❌ Direct Resend test failed: {e}")
        logger.error(f"Direct Resend test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Resend Email Configuration Test")
    print("=" * 50)
    
    # Test configuration
    config_ok = test_resend_configuration()
    
    if config_ok:
        # Test direct API
        direct_ok = test_resend_direct()
        
        if direct_ok:
            print("\n🎉 All tests passed! Resend is configured correctly.")
        else:
            print("\n⚠️ Configuration looks good but direct API test failed.")
    else:
        print("\n❌ Configuration test failed. Please check your settings.")

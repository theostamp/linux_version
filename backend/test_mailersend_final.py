#!/usr/bin/env python3
"""
Test MailerSend email sending with production configuration
"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives

def test_mailersend_production():
    """Test MailerSend with production settings"""
    print("🧪 Testing MailerSend Production Configuration")
    print("=" * 50)
    
    # Check configuration
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"MAILERSEND_API_KEY: {'✅ Set' if os.getenv('MAILERSEND_API_KEY') else '❌ Missing'}")
    print(f"MAILERSEND_FROM_EMAIL: {os.getenv('MAILERSEND_FROM_EMAIL', 'Not set')}")
    print()
    
    if not os.getenv('MAILERSEND_API_KEY'):
        print("❌ MAILERSEND_API_KEY not found. Please set it in Railway.")
        return False
    
    try:
        # Test simple email
        print("📧 Sending test email...")
        
        subject = "Test Email from MailerSend"
        text_content = "This is a test email sent via MailerSend API."
        html_content = """
        <html>
        <body>
            <h2>Test Email from MailerSend</h2>
            <p>This is a test email sent via MailerSend API.</p>
            <p><strong>Status:</strong> Production Ready ✅</p>
        </body>
        </html>
        """
        
        # Create email with both text and HTML
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=os.getenv('MAILERSEND_FROM_EMAIL', 'noreply@newconcierge.app'),
            to=['theostam1966@gmail.com']  # Use verified email
        )
        msg.attach_alternative(html_content, "text/html")
        
        # Send email
        result = msg.send()
        
        if result:
            print("✅ Email sent successfully!")
            print(f"📬 Check inbox: theostam1966@gmail.com")
            return True
        else:
            print("❌ Email sending failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_mailersend_production()

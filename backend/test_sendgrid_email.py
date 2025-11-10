import os
import django
from django.conf import settings
from django.core.mail import send_mail

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def test_sendgrid_email_sending():
    print("Attempting to send test email via SendGrid backend...")
    try:
        subject = "Test Email from SendGrid Backend"
        message = "This is a test email sent using the SendGrid Django email backend."
        from_email = "noreply@example.com"  # Use a simple from email for testing
        recipient_list = ["theostam1966@gmail.com"]  # Use your email for testing

        if not from_email:
            print("Error: SENDGRID_FROM_EMAIL is not set in settings.")
            return

        if not settings.SENDGRID_API_KEY:
            print("Error: SENDGRID_API_KEY is not set in settings.")
            return

        print(f"Sending email from: {from_email} to: {recipient_list}")
        print(f"Using EMAIL_BACKEND: {settings.EMAIL_BACKEND}")

        send_mail(subject, message, from_email, recipient_list, fail_silently=False)
        print("Test email sent successfully (check SendGrid dashboard and recipient inbox).")
    except Exception as e:
        print(f"Failed to send test email: {e}")

if __name__ == "__main__":
    test_sendgrid_email_sending()

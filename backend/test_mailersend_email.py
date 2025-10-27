import os
import django
from django.conf import settings
from django.core.mail import send_mail

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def test_mailersend_email_sending():
    print("Attempting to send test email via MailerSend backend...")
    try:
        subject = "Test Email from MailerSend Backend"
        message = "This is a test email sent using the MailerSend Django email backend."
        from_email = "noreply@example.com"  # Use a simple from email for testing
        recipient_list = ["theostam1966@gmail.com"]  # Use your email for testing

        if not from_email:
            print("Error: MAILERSEND_FROM_EMAIL is not set in settings.")
            return

        if not settings.MAILERSEND_API_KEY:
            print("Error: MAILERSEND_API_KEY is not set in settings.")
            return

        print(f"Sending email from: {from_email} to: {recipient_list}")
        print(f"Using EMAIL_BACKEND: {settings.EMAIL_BACKEND}")

        send_mail(subject, message, from_email, recipient_list, fail_silently=False)
        print("Test email sent successfully (check MailerSend dashboard and recipient inbox).")
    except Exception as e:
        print(f"Failed to send test email: {e}")

if __name__ == "__main__":
    test_mailersend_email_sending()

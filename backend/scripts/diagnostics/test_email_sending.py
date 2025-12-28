#!/usr/bin/env python
"""
Test script for email sending functionality.
This will send a test email using the console backend.
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from notifications.models import Notification, NotificationRecipient
from buildings.models import Building
from apartments.models import Apartment
from users.models import CustomUser
from django_tenants.utils import schema_context

print("=" * 60)
print("📧 EMAIL SENDING TEST")
print("=" * 60)
print(f"Email Backend: {settings.EMAIL_BACKEND}")
print(f"Default From: {settings.DEFAULT_FROM_EMAIL}")
print()

# Test 1: Simple email
print("Test 1: Sending simple test email...")
try:
    send_mail(
        subject='Test Email - New Concierge',
        message='This is a test email from New Concierge system.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=['test@example.com'],
        fail_silently=False,
    )
    print("✅ Simple email sent successfully!")
except Exception as e:
    print(f"❌ Error sending simple email: {e}")

print()

# Test 2: Email with attachment simulation
print("Test 2: Testing email with attachment...")
try:
    email = EmailMultiAlternatives(
        subject='Common Expenses Sheet - October 2025',
        body='Please find attached the common expenses sheet for October 2025.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=['owner1@example.com', 'owner2@example.com'],
    )

    # Simulate attachment (in console mode, this will just show in logs)
    # In real mode, this would attach actual file
    print("   📎 Attaching file: koinochrista-2025-10.jpg")
    email.attach('koinochrista-2025-10.jpg', b'fake-jpg-content', 'image/jpeg')

    email.send(fail_silently=False)
    print("✅ Email with attachment sent successfully!")
except Exception as e:
    print(f"❌ Error sending email with attachment: {e}")

print()

# Test 3: Notification system test
print("Test 3: Testing notification system...")
try:
    with schema_context('demo'):
        # Get first building
        building = Building.objects.first()
        if not building:
            print("❌ No building found in demo schema")
        else:
            print(f"   🏢 Using building: {building.name}")

            # Get admin user
            admin = CustomUser.objects.filter(is_staff=True).first()
            if not admin:
                print("❌ No admin user found")
            else:
                print(f"   👤 Using admin: {admin.email}")

                # Create notification
                from notifications.services import NotificationService

                notification = NotificationService.create_notification(
                    building=building,
                    created_by=admin,
                    subject='Test Common Expenses Notification',
                    body='This is a test notification for common expenses.',
                    notification_type='email',
                    priority='normal',
                )

                print(f"   📨 Created notification ID: {notification.id}")

                # Get apartments
                apartments = Apartment.objects.filter(building=building)[:2]
                if apartments.exists():
                    print(f"   🏠 Found {apartments.count()} apartments for testing")

                    # Create recipients
                    for apt in apartments:
                        recipient = NotificationRecipient.objects.create(
                            notification=notification,
                            apartment=apt,
                            recipient_name=f"Owner of {apt.number}",
                            email=f"owner-{apt.number}@example.com",
                        )
                        print(f"      → Recipient: {recipient.email}")

                    notification.total_recipients = apartments.count()
                    notification.save()

                    # Send notification
                    print("   📤 Sending notification...")
                    result = NotificationService.send_notification(notification)

                    print(f"✅ Notification sent!")
                    print(f"   Success: {result['success']}")
                    print(f"   Failed: {result['failed']}")
                else:
                    print("❌ No apartments found")

except Exception as e:
    print(f"❌ Error in notification system test: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("🎉 EMAIL TESTING COMPLETE")
print("=" * 60)
print()
print("📋 Next steps:")
print("1. Check the output above for email content")
print("2. If using console backend, emails are printed above")
print("3. If using SMTP backend, check recipient inboxes")
print("4. To test from UI: Financial → Export → 'Αποστολή Email'")
print()

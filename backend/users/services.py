# users/services.py

import secrets
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from django.contrib.auth import get_user_model
from .models import UserInvitation, PasswordResetToken

logger = logging.getLogger(__name__)

User = get_user_model()


class EmailService:
    """
    Service για την αποστολή emails
    """
    
    @staticmethod
    def send_verification_email(user):
        """
        Αποστολή email επιβεβαίωσης
        """
        # Δημιουργία verification token
        verification_token = secrets.token_urlsafe(32)
        user.email_verification_token = verification_token
        user.email_verification_sent_at = timezone.now()
        user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])
        
        # Δημιουργία verification URL
        verification_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={verification_token}"
        
        # Email content
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Επιβεβαίωση Email"
        
        # Render HTML template
        html_content = render_to_string('emails/email_verification.html', {
            'user': user,
            'verification_url': verification_url,
        })
        
        # Plain text version
        message = f"""
        Γεια σας {user.first_name},

        Καλώς ήρθατε στο New Concierge!

        Παρακαλούμε κάντε κλικ στον παρακάτω σύνδεσμο για να επιβεβαιώσετε το email σας:
        {verification_url}

        Αυτός ο σύνδεσμος θα λήξει σε 24 ώρες.

        Αν δεν έχετε δημιουργήσει λογαριασμό στο New Concierge, παρακαλούμε αγνοήστε αυτό το email.

        Με εκτίμηση,
        Η ομάδα του New Concierge
        """
        
        try:
            # Import EmailMultiAlternatives here to avoid circular imports
            from django.core.mail import EmailMultiAlternatives
            
            # Create email with both HTML and text content
            msg = EmailMultiAlternatives(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            return True
        except Exception as e:
            print(f"Error sending verification email: {e}")
            return False
    
    @staticmethod
    def send_invitation_email(invitation):
        """
        Αποστολή email πρόσκλησης
        """
        # Get tenant subdomain for the invitation URL
        from django.db import connection
        tenant_subdomain = None
        try:
            if hasattr(connection, 'tenant') and connection.tenant:
                tenant_subdomain = connection.tenant.subdomain
        except:
            pass
        
        # Build the invitation URL with tenant subdomain
        base_url = settings.FRONTEND_URL.rstrip('/')
        if tenant_subdomain and 'newconcierge.app' in base_url:
            # Replace the base domain with tenant subdomain
            # e.g., https://newconcierge.app -> https://theo.newconcierge.app
            invitation_url = f"https://{tenant_subdomain}.newconcierge.app/accept-invitation?token={invitation.token}"
        else:
            invitation_url = f"{base_url}/accept-invitation?token={invitation.token}"
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Πρόσκληση στο New Concierge"
        
        # Get building name if exists
        building_name = None
        if invitation.building_id:
            try:
                from buildings.models import Building
                building = Building.objects.get(id=invitation.building_id)
                building_name = building.name
            except:
                pass
        
        # Render HTML template
        html_content = render_to_string('emails/user_invitation.html', {
            'invitation': invitation,
            'invitation_url': invitation_url,
            'building_name': building_name,
        })
        
        # Plain text version
        building_info = f"\nΚτίριο: {building_name}" if building_name else ""
        role_info = f"\nΡόλος: {invitation.assigned_role}" if invitation.assigned_role else ""
        
        message = f"""
        Γεια σας {invitation.first_name},

        Ο/Η {invitation.invited_by.first_name} {invitation.invited_by.last_name} σας προσκαλεί να συμμετάσχετε στο New Concierge.{building_info}{role_info}

        Για να αποδεχτείτε την πρόσκληση και να δημιουργήσετε τον λογαριασμό σας, κάντε κλικ στον παρακάτω σύνδεσμο:
        {invitation_url}

        Αυτή η πρόσκληση θα λήξει στις {invitation.expires_at.strftime('%d/%m/%Y %H:%M')}.

        Αν δεν αναμένετε αυτή την πρόσκληση, παρακαλούμε αγνοήστε αυτό το email.

        Με εκτίμηση,
        Η ομάδα του New Concierge
        """
        
        try:
            # Import EmailMultiAlternatives here to avoid circular imports
            from django.core.mail import EmailMultiAlternatives
            
            # Create email with both HTML and text content
            msg = EmailMultiAlternatives(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [invitation.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            return True
        except Exception as e:
            print(f"Error sending invitation email: {e}")
            return False
    
    @staticmethod
    def send_password_reset_email(user, reset_token):
        """
        Αποστολή email επαναφοράς κωδικού
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Επαναφορά Κωδικού"
        
        # Render HTML template
        html_content = render_to_string('emails/password_reset.html', {
            'user': user,
            'reset_url': reset_url,
        })
        
        # Plain text version
        message = f"""
        Γεια σας {user.first_name},

        Έχετε ζητήσει επαναφορά του κωδικού πρόσβασης για τον λογαριασμό σας στο New Concierge.

        Για να δημιουργήσετε νέο κωδικό, κάντε κλικ στον παρακάτω σύνδεσμο:
        {reset_url}

        Αυτός ο σύνδεσμος θα λήξει σε 24 ώρες.

        Αν δεν έχετε ζητήσει επαναφορά κωδικού, παρακαλούμε αγνοήστε αυτό το email και ο κωδικός σας θα παραμείνει αμετάβλητος.

        Με εκτίμηση,
        Η ομάδα του New Concierge
        """
        
        try:
            # Import EmailMultiAlternatives here to avoid circular imports
            from django.core.mail import EmailMultiAlternatives
            
            # Create email with both HTML and text content
            msg = EmailMultiAlternatives(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            return True
        except Exception as e:
            print(f"Error sending password reset email: {e}")
            return False
    
    @staticmethod
    def send_welcome_email(user):
        """
        Αποστολή welcome email στον χρήστη
        """
        login_url = f"{settings.FRONTEND_URL}/login"
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Καλώς ήρθατε!"
        
        # Render HTML template
        html_content = render_to_string('emails/welcome.html', {
            'user': user,
            'login_url': login_url,
            'frontend_url': settings.FRONTEND_URL,
        })
        
        # Plain text version
        message = f"""
        Γεια σας {user.first_name} {user.last_name},

        Καλώς ήρθατε στο New Concierge!

        Ο λογαριασμός σας είναι πλέον ενεργός και έχετε πρόσβαση σε όλες τις λειτουργίες του συστήματος.

        Μπορείτε να συνδεθείτε στο: {login_url}

        Εάν έχετε οποιεσδήποτε ερωτήσεις, μη διστάσετε να επικοινωνήσετε μαζί μας.

        Με εκτίμηση,
        Η ομάδα του New Concierge
        """
        
        try:
            # Import EmailMultiAlternatives here to avoid circular imports
            from django.core.mail import EmailMultiAlternatives
            
            # Create email with both HTML and text content
            msg = EmailMultiAlternatives(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            return True
        except Exception as e:
            print(f"Error sending welcome email: {e}")
            return False
    
    @staticmethod
    def send_workspace_welcome_email(user, tenant_domain):
        """
        Send workspace welcome email after successful subscription and tenant creation.

        Args:
            user: The user who subscribed
            tenant_domain: The tenant subdomain (e.g., 'demo.localhost')
        """
        workspace_url = f"http://{tenant_domain}:8080"  # Adjust protocol/port as needed

        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Ο χώρος εργασίας σας είναι έτοιμος!"

        # Plain text version
        message = f"""
        Γεια σας {user.first_name} {user.last_name},

        Καλώς ήρθατε στο New Concierge! 🎉

        Ο χώρος εργασίας σας έχει δημιουργηθεί επιτυχώς και είναι έτοιμος για χρήση.

        📍 Ο χώρος εργασίας σας: {workspace_url}

        🔐 Τα στοιχεία σύνδεσής σας:
           Email: {user.email}
           Κωδικός: Ο ίδιος που χρησιμοποιήσατε κατά την εγγραφή

        💡 Επόμενα βήματα:
           1. Συνδεθείτε στο χώρο εργασίας σας
           2. Εξερευνήστε το demo κτίριο "Αλκμάνος 22"
           3. Προσκαλέστε τους ενοίκους σας
           4. Ξεκινήστε να διαχειρίζεστε την πολυκατοικία σας

        Εάν έχετε οποιεσδήποτε ερωτήσεις, μη διστάσετε να επικοινωνήσετε μαζί μας.

        Καλή αρχή!
        Η ομάδα του New Concierge
        """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Error sending workspace welcome email: {e}")
            return False

    @staticmethod
    def send_invoice_notification(user, billing_cycle):
        """
        Send invoice notification email
        """
        try:
            subject = f"{settings.EMAIL_SUBJECT_PREFIX}Invoice #{billing_cycle.id:06d} Ready for Payment"
            
            # Render HTML template
            html_content = render_to_string('emails/invoice_notification.html', {
                'user': user,
                'billing_cycle': billing_cycle,
                'frontend_url': settings.FRONTEND_URL,
            })
            
            # Plain text version
            message = f"""
            Hello {user.first_name or user.email},

            Your invoice #{billing_cycle.id:06d} is ready for payment.

            Amount Due: €{billing_cycle.amount_due}
            Due Date: {billing_cycle.due_date.strftime('%B %d, %Y')}
            Billing Period: {billing_cycle.period_start.strftime('%B %d, %Y')} - {billing_cycle.period_end.strftime('%B %d, %Y')}

            Please complete your payment to avoid service interruption.

            Payment Link: {settings.FRONTEND_URL}/billing/invoice/{billing_cycle.id}/pay

            If you have any questions, please contact our support team.

            Best regards,
            New Concierge Team
            """
            
            # Import EmailMultiAlternatives here to avoid circular imports
            from django.core.mail import EmailMultiAlternatives
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            logger.info(f"Sent invoice notification email to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send invoice notification to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_payment_confirmation(user, billing_cycle):
        """
        Send payment confirmation email
        """
        try:
            subject = f"{settings.EMAIL_SUBJECT_PREFIX}Payment Confirmation - Invoice #{billing_cycle.id:06d}"
            
            # Render HTML template
            html_content = render_to_string('emails/payment_confirmation.html', {
                'user': user,
                'billing_cycle': billing_cycle,
                'frontend_url': settings.FRONTEND_URL,
            })
            
            # Plain text version
            message = f"""
            Hello {user.first_name or user.email},

            Thank you! Your payment has been processed successfully.

            Payment Details:
            - Amount Paid: €{billing_cycle.amount_paid}
            - Payment Date: {billing_cycle.paid_at.strftime('%B %d, %Y %H:%M')}
            - Invoice: #{billing_cycle.id:06d}
            - Transaction ID: {billing_cycle.stripe_payment_intent_id}

            Your subscription is now active and up to date.

            Dashboard: {settings.FRONTEND_URL}/dashboard

            If you have any questions, please contact our support team.

            Best regards,
            New Concierge Team
            """
            
            # Import EmailMultiAlternatives here to avoid circular imports
            from django.core.mail import EmailMultiAlternatives
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            logger.info(f"Sent payment confirmation email to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send payment confirmation to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_payment_failure_notification(user, billing_cycle, failure_reason):
        """
        Send payment failure notification email
        """
        try:
            subject = f"{settings.EMAIL_SUBJECT_PREFIX}Payment Failed - Invoice #{billing_cycle.id:06d}"
            
            # Render HTML template
            html_content = render_to_string('emails/payment_failure.html', {
                'user': user,
                'billing_cycle': billing_cycle,
                'failure_reason': failure_reason,
                'frontend_url': settings.FRONTEND_URL,
            })
            
            # Plain text version
            message = f"""
            Hello {user.first_name or user.email},

            We were unable to process your payment for invoice #{billing_cycle.id:06d}.

            Payment Details:
            - Amount Due: €{billing_cycle.amount_due}
            - Due Date: {billing_cycle.due_date.strftime('%B %d, %Y')}
            - Failure Reason: {failure_reason}

            Please update your payment information and retry the payment as soon as possible.
            Your subscription may be suspended if payment is not completed within 7 days.

            Retry Payment: {settings.FRONTEND_URL}/billing/invoice/{billing_cycle.id}/retry
            Update Payment Method: {settings.FRONTEND_URL}/billing/payment-methods

            If you need assistance, please contact our support team.

            Best regards,
            New Concierge Team
            """
            
            # Import EmailMultiAlternatives here to avoid circular imports
            from django.core.mail import EmailMultiAlternatives
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            logger.info(f"Sent payment failure notification to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send payment failure notification to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_tenant_welcome_email(user, tenant, domain):
        """
        Send welcome email with secure tenant access link.
        Uses time-limited signed token (24h expiry).
        """
        from django.core.signing import TimestampSigner
        
        # Generate secure token (expires in 24h)
        signer = TimestampSigner()
        token_data = f"{user.id}:{tenant.id}:{domain.domain}"
        secure_token = signer.sign(token_data)
        
        # Build access URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        access_url = f"{frontend_url}/tenant/accept?token={secure_token}"
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}🎉 Το Workspace σας είναι έτοιμο - {tenant.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Καλώς ήρθατε στο New Concierge!</h2>
            <p>Γεια σας {user.first_name},</p>
            <p>Το workspace σας <strong>{tenant.name}</strong> δημιουργήθηκε επιτυχώς!</p>
            
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>Στοιχεία Πρόσβασης:</h3>
                <p><strong>Domain:</strong> {domain.domain}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Ρόλος:</strong> Manager (Διαχειριστής)</p>
            </div>
            
            <p>
                <a href="{access_url}" 
                   style="background: #4CAF50; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                    Πρόσβαση στο Workspace
                </a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
                Αυτό το link είναι έγκυρο για 24 ώρες. Μετά μπορείτε να συνδεθείτε κανονικά με το email και password σας.
            </p>
            
            <p>Καλή αρχή!</p>
            <p>Η Ομάδα του New Concierge</p>
        </body>
        </html>
        """
        
        try:
            send_mail(
                subject=subject,
                message=strip_tags(html_content),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_content,
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send tenant welcome email to {user.email}: {e}")
            return False

    @staticmethod
    def send_kiosk_registration_email(invitation, building, apartment=None):
        """
        Send email for kiosk self-registration.
        This is for users who scanned the QR code on the building kiosk.
        """
        from django.db import connection
        
        # Get tenant subdomain for the invitation URL
        tenant_subdomain = None
        try:
            if hasattr(connection, 'tenant') and connection.tenant:
                tenant_subdomain = connection.tenant.subdomain
        except:
            pass
        
        # Build the registration URL
        base_url = settings.FRONTEND_URL.rstrip('/')
        if tenant_subdomain and 'newconcierge.app' in base_url:
            registration_url = f"https://{tenant_subdomain}.newconcierge.app/kiosk/complete-registration?token={invitation.token}"
        else:
            registration_url = f"{base_url}/kiosk/complete-registration?token={invitation.token}"
        
        # Get apartment info
        apartment_info = ''
        if apartment:
            apartment_info = f'<p style="margin: 0;"><strong>Διαμέρισμα:</strong> {apartment.number}</p>'
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Ολοκληρώστε την εγγραφή σας - {building.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">🏢 New Concierge</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1e3a5f; margin-top: 0;">Καλώς ήρθατε στο {building.name}!</h2>
                
                <p>Σκανάρατε το QR code στο kiosk του κτιρίου και είστε ένα βήμα μακριά από την πλήρη πρόσβαση.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <p style="margin: 0;"><strong>Email:</strong> {invitation.email}</p>
                    <p style="margin: 0;"><strong>Κτίριο:</strong> {building.name}</p>
                    {apartment_info}
                    {f'<p style="margin: 0;"><strong>Διεύθυνση:</strong> {building.address}</p>' if building.address else ''}
                </div>
                
                <p style="text-align: center;">
                    <a href="{registration_url}" 
                       style="background: #4CAF50; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;
                              font-size: 16px; font-weight: bold;">
                        Ολοκλήρωση Εγγραφής
                    </a>
                </p>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                    Αυτός ο σύνδεσμος είναι έγκυρος για 7 ημέρες.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                
                <p style="color: #888; font-size: 12px;">
                    Αν δεν σκανάρατε εσείς το QR code, παρακαλώ αγνοήστε αυτό το email.
                </p>
            </div>
        </body>
        </html>
        """
        
        message = f"""
Καλώς ήρθατε στο {building.name}!

Σκανάρατε το QR code στο kiosk του κτιρίου. Για να ολοκληρώσετε την εγγραφή σας, κάντε κλικ στον παρακάτω σύνδεσμο:

{registration_url}

Email: {invitation.email}
Κτίριο: {building.name}

Αυτός ο σύνδεσμος είναι έγκυρος για 7 ημέρες.

Αν δεν σκανάρατε εσείς το QR code, παρακαλώ αγνοήστε αυτό το email.

Με εκτίμηση,
Η ομάδα του New Concierge
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                html_message=html_content,
                fail_silently=False,
            )
            logger.info(f"Sent kiosk registration email to {invitation.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send kiosk registration email to {invitation.email}: {e}")
            return False

    @staticmethod
    def send_login_reminder_email(user, building):
        """
        Send login reminder email for existing users who tried to register via kiosk.
        """
        from django.db import connection
        
        # Get tenant subdomain for the login URL
        tenant_subdomain = None
        try:
            if hasattr(connection, 'tenant') and connection.tenant:
                tenant_subdomain = connection.tenant.subdomain
        except:
            pass
        
        # Build the login URL
        base_url = settings.FRONTEND_URL.rstrip('/')
        if tenant_subdomain and 'newconcierge.app' in base_url:
            login_url = f"https://{tenant_subdomain}.newconcierge.app/login"
            reset_url = f"https://{tenant_subdomain}.newconcierge.app/forgot-password"
        else:
            login_url = f"{base_url}/login"
            reset_url = f"{base_url}/forgot-password"
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Έχετε ήδη λογαριασμό - {building.name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">🏢 New Concierge</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1e3a5f; margin-top: 0;">Γεια σας {user.first_name or ''}!</h2>
                
                <p>Προσπαθήσατε να εγγραφείτε μέσω του kiosk στο <strong>{building.name}</strong>, αλλά έχετε ήδη λογαριασμό με το email <strong>{user.email}</strong>.</p>
                
                <p style="text-align: center;">
                    <a href="{login_url}" 
                       style="background: #2196F3; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;
                              font-size: 16px; font-weight: bold; margin: 10px;">
                        Σύνδεση
                    </a>
                </p>
                
                <p style="text-align: center; color: #666;">
                    Ξεχάσατε τον κωδικό σας? 
                    <a href="{reset_url}" style="color: #2196F3;">Επαναφορά κωδικού</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                
                <p style="color: #888; font-size: 12px;">
                    Αν δεν σκανάρατε εσείς το QR code, παρακαλώ αγνοήστε αυτό το email.
                </p>
            </div>
        </body>
        </html>
        """
        
        message = f"""
Γεια σας {user.first_name or ''}!

Προσπαθήσατε να εγγραφείτε μέσω του kiosk στο {building.name}, αλλά έχετε ήδη λογαριασμό με το email {user.email}.

Για σύνδεση: {login_url}
Ξεχάσατε τον κωδικό; {reset_url}

Με εκτίμηση,
Η ομάδα του New Concierge
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_content,
                fail_silently=False,
            )
            logger.info(f"Sent login reminder email to {user.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send login reminder email to {user.email}: {e}")
            return False

    @staticmethod
    def send_new_apartment_user_notification(invitation, building, apartment, existing_users, manager):
        """
        Notify admin when a new user registers for an apartment that already has registered users.
        This allows the admin to be aware of and potentially review the registration.
        """
        if not manager or not manager.email:
            logger.warning("No manager email available for apartment user notification")
            return False
        
        # Build list of existing users
        existing_users_html = ""
        existing_users_text = ""
        for membership in existing_users:
            user = membership.resident
            user_name = user.get_full_name() or user.email
            existing_users_html += f'<li>{user_name} ({user.email})</li>'
            existing_users_text += f"- {user_name} ({user.email})\n"
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Νέα εγγραφή - Διαμέρισμα {apartment.number} ({building.name})"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">🔔 Ειδοποίηση Διαχειριστή</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1e3a5f; margin-top: 0;">Νέα εγγραφή χρήστη</h2>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
                    <p style="margin: 0; color: #856404;">
                        <strong>Σημείωση:</strong> Αυτό το διαμέρισμα έχει ήδη εγγεγραμμένους χρήστες.
                    </p>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
                    <h3 style="margin-top: 0; color: #1e3a5f;">Νέος χρήστης:</h3>
                    <p style="margin: 5px 0;"><strong>Όνομα:</strong> {invitation.first_name} {invitation.last_name}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> {invitation.email}</p>
                    <p style="margin: 5px 0;"><strong>Διαμέρισμα:</strong> {apartment.number}</p>
                    <p style="margin: 5px 0;"><strong>Κτίριο:</strong> {building.name}</p>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <h3 style="margin-top: 0; color: #1e3a5f;">Υπάρχοντες χρήστες στο διαμέρισμα:</h3>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        {existing_users_html}
                    </ul>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    Η εγγραφή θα ολοκληρωθεί κανονικά. Αυτή η ειδοποίηση είναι μόνο για ενημέρωσή σας.
                    Αν χρειάζεται κάποια ενέργεια, μπορείτε να διαχειριστείτε τους χρήστες από τον πίνακα ελέγχου.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                
                <p style="color: #888; font-size: 12px;">
                    Αυτό είναι αυτόματο μήνυμα από το σύστημα New Concierge.
                </p>
            </div>
        </body>
        </html>
        """
        
        message = f"""
Νέα εγγραφή χρήστη στο διαμέρισμα {apartment.number}

ΣΗΜΕΙΩΣΗ: Αυτό το διαμέρισμα έχει ήδη εγγεγραμμένους χρήστες.

Νέος χρήστης:
- Όνομα: {invitation.first_name} {invitation.last_name}
- Email: {invitation.email}
- Διαμέρισμα: {apartment.number}
- Κτίριο: {building.name}

Υπάρχοντες χρήστες:
{existing_users_text}

Η εγγραφή θα ολοκληρωθεί κανονικά. Αυτή η ειδοποίηση είναι μόνο για ενημέρωσή σας.

Με εκτίμηση,
Η ομάδα του New Concierge
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[manager.email],
                html_message=html_content,
                fail_silently=False,
            )
            logger.info(f"Sent new apartment user notification to {manager.email} for apartment {apartment.number}")
            return True
        except Exception as e:
            logger.error(f"Failed to send new apartment user notification: {e}")
            return False


class InvitationService:
    """
    Service για τη διαχείριση των προσκλήσεων
    """
    
    @staticmethod
    def create_invitation(invited_by, email, first_name="", last_name="", 
                         invitation_type="registration", building=None, building_id=None, 
                         apartment_id=None, assigned_role=None):
        """
        Δημιουργία νέας πρόσκλησης
        
        Args:
            building: Building object (optional, legacy support)
            building_id: Building ID (optional, preferred)
            apartment_id: Apartment ID for linking user to specific apartment
            assigned_role: Role to assign to user (resident, internal_manager, etc.)
        """
        # Έλεγχος αν υπάρχει ήδη χρήστης με αυτό το email
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            # Επιτρέπουμε επαναποστολή αν ο χρήστης δεν έχει επιβεβαιώσει το email ή δεν είναι ενεργός
            email_verified = getattr(existing_user, 'email_verified', True)
            is_active = getattr(existing_user, 'is_active', True)
            
            if email_verified and is_active:
                raise ValueError("Χρήστης με αυτό το email υπάρχει ήδη και είναι ενεργός.")
            
            # Αν ο χρήστης δεν έχει επιβεβαιώσει ή δεν είναι ενεργός, διαγράφουμε τον χρήστη
            # για να μπορέσει να ξαναγίνει η εγγραφή μέσω νέας πρόσκλησης
            existing_user.delete()
        
        # Έλεγχος για pending invitations - ακυρώνουμε τις παλιές
        old_invitations = UserInvitation.objects.filter(email=email, status='pending')
        if old_invitations.exists():
            old_invitations.update(status='cancelled')
        
        # Determine building_id from either parameter
        final_building_id = building_id or (building.id if building else None)
        
        # Δημιουργία invitation
        invitation = UserInvitation.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            invitation_type=invitation_type,
            invited_by=invited_by,
            building_id=final_building_id,
            apartment_id=apartment_id,
            assigned_role=assigned_role
        )
        
        # Αποστολή email
        if EmailService.send_invitation_email(invitation):
            return invitation
        else:
            invitation.delete()
            raise ValueError("Αποτυχία αποστολής email.")
    
    @staticmethod
    def accept_invitation(token, password, first_name=None, last_name=None):
        """
        Αποδοχή πρόσκλησης και δημιουργία χρήστη
        
        Args:
            token: Invitation token
            password: User password
            first_name: Optional first name (overrides invitation first_name, useful for kiosk registrations)
            last_name: Optional last name (overrides invitation last_name, useful for kiosk registrations)
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"[INVITATION] Starting accept_invitation for token: {token}")
        logger.info(f"[INVITATION] Password provided: {'Yes' if password else 'No'}, length: {len(password) if password else 0}")
        
        try:
            invitation = UserInvitation.objects.get(token=token, status='pending')
        except UserInvitation.DoesNotExist:
            raise ValueError("Μη έγκυρη ή ληγμένη πρόσκληση.")
        
        if invitation.is_expired:
            invitation.expire()
            raise ValueError("Η πρόσκληση έχει λήξει.")
        
        logger.info(f"[INVITATION] Found invitation for email: {invitation.email}")
        
        # Use provided first_name/last_name or fall back to invitation values
        # This is particularly useful for kiosk registrations where name is entered during completion
        final_first_name = first_name if first_name else invitation.first_name
        final_last_name = last_name if last_name else invitation.last_name
        
        # Δημιουργία χρήστη - ΣΗΜΑΝΤΙΚΟ: is_superuser και is_staff πρέπει να είναι False
        # για όλους τους χρήστες που δημιουργούνται μέσω πρόσκλησης
        user = User.objects.create_user(
            email=invitation.email,
            first_name=final_first_name,
            last_name=final_last_name,
            password=password,
            is_active=True,
            is_staff=False,  # Explicit: δεν είναι staff
            is_superuser=False,  # Explicit: δεν είναι superuser
            email_verified=True
        )
        
        # Verify password was set correctly
        password_check = user.check_password(password)
        logger.info(f"[INVITATION] User created: {user.email}, ID: {user.id}")
        logger.info(f"[INVITATION] Password verification after creation: {password_check}")
        
        # Ορισμός tenant από τον χρήστη που έστειλε την πρόσκληση
        if invitation.invited_by and hasattr(invitation.invited_by, 'tenant') and invitation.invited_by.tenant:
            user.tenant = invitation.invited_by.tenant
            user.save(update_fields=['tenant'])
        
        # Ορισμός user.role από assigned_role
        if invitation.assigned_role:
            user.role = invitation.assigned_role
            user.save(update_fields=['role'])
            
            # Ανάθεση σε RBAC group αν υπάρχει
            from django.contrib.auth.models import Group
            try:
                group = Group.objects.get(name=invitation.assigned_role)
                user.groups.add(group)
            except Group.DoesNotExist:
                pass
        
        # Δημιουργία building membership και σύνδεση με apartment
        if invitation.building_id:
            logger.info(f"Creating building membership for user {user.email} in building {invitation.building_id}")
            
            try:
                from buildings.models import Building, BuildingMembership
                from apartments.models import Apartment
                from django_tenants.utils import schema_context
                
                # Χρησιμοποιούμε schema_context για να διασφαλίσουμε ότι επιστρέφουμε στο αρχικό schema
                if user.tenant:
                    logger.info(f"Switching to tenant schema: {user.tenant.schema_name}")
                    with schema_context(user.tenant.schema_name):
                        building = Building.objects.get(id=invitation.building_id)
                        logger.info(f"Found building: {building.name} (ID: {building.id})")
                        
                        # Χρήση assigned_role για building membership role (ή default 'resident')
                        membership_role = invitation.assigned_role or 'resident'
                        
                        # Έλεγχος αν υπάρχει ήδη membership
                        existing_membership = BuildingMembership.objects.filter(
                            resident=user, 
                            building=building
                        ).first()
                        
                        if existing_membership:
                            logger.info(f"Membership already exists for user {user.email} in building {building.name}")
                        else:
                            BuildingMembership.objects.create(
                                resident=user,
                                building=building,
                                role=membership_role
                            )
                            logger.info(f"Created building membership: user={user.email}, building={building.name}, role={membership_role}")
                        
                        # Αν ο ρόλος είναι internal_manager, ορίζουμε building.internal_manager
                        if invitation.assigned_role == 'internal_manager':
                            building.internal_manager = user
                            building.save(update_fields=['internal_manager'])
                            logger.info(f"Set {user.email} as internal manager of {building.name}")
                        
                        # ΝΕΟ: Σύνδεση χρήστη με διαμέρισμα αν υπάρχει apartment_id
                        if invitation.apartment_id:
                            try:
                                apartment = Apartment.objects.get(id=invitation.apartment_id)
                                role = (invitation.assigned_role or '').lower()
                                
                                # Καθορισμός του τύπου σύνδεσης βάσει ρόλου
                                if role in ['resident', 'ένοικος', 'tenant', '']:
                                    # Ένοικος - θέτουμε tenant_user
                                    apartment.tenant_user = user
                                    apartment.is_rented = True
                                    apartment.save(update_fields=['tenant_user', 'is_rented'])
                                    logger.info(f"✅ Set tenant_user for apartment {apartment.number} to user {user.email}")
                                elif role in ['owner', 'ιδιοκτήτης']:
                                    # Ιδιοκτήτης - θέτουμε owner_user
                                    apartment.owner_user = user
                                    apartment.save(update_fields=['owner_user'])
                                    logger.info(f"✅ Set owner_user for apartment {apartment.number} to user {user.email}")
                                else:
                                    # Default: θεωρούμε ένοικο για άλλους ρόλους (π.χ. internal_manager)
                                    apartment.tenant_user = user
                                    apartment.is_rented = True
                                    apartment.save(update_fields=['tenant_user', 'is_rented'])
                                    logger.info(f"✅ Set tenant_user (default) for apartment {apartment.number} to user {user.email}")
                                    
                            except Apartment.DoesNotExist:
                                logger.error(f"❌ Apartment with ID {invitation.apartment_id} not found")
                            except Exception as e:
                                logger.error(f"❌ Failed to link user to apartment: {e}", exc_info=True)
                    
            except Building.DoesNotExist:
                logger.error(f"Building with ID {invitation.building_id} not found in current tenant schema")
            except Exception as e:
                logger.error(f"Failed to create building membership: {e}", exc_info=True)
        
        # ΚΡΙΣΙΜΟ: Διασφάλιση ότι residents δεν έχουν admin permissions
        # Αυτό προστατεύει από bugs ή data corruption που μπορεί να θέσουν λάθος flags
        if invitation.assigned_role == 'resident' or not invitation.assigned_role:
            user.refresh_from_db()
            if user.is_staff or user.is_superuser:
                logger.warning(f"⚠️ Correcting admin flags for resident {user.email}: is_staff={user.is_staff}, is_superuser={user.is_superuser}")
                user.is_staff = False
                user.is_superuser = False
                user.save(update_fields=['is_staff', 'is_superuser'])
                logger.info(f"✅ Admin flags corrected for {user.email}")
        
        # Ενημέρωση invitation (πρέπει να γίνει στο public schema)
        invitation.accept(user)
        
        # Αποστολή welcome email
        EmailService.send_welcome_email(user)
        
        logger.info(f"[INVITATION] Invitation accepted successfully for {user.email}")
        logger.info(f"[INVITATION] Final user state: role={user.role}, is_staff={user.is_staff}, is_superuser={user.is_superuser}")
        
        return user


class PasswordResetService:
    """
    Service για την επαναφορά κωδικού
    """
    
    @staticmethod
    def request_password_reset(email):
        """
        Αίτηση επαναφοράς κωδικού
        """
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            raise ValueError("Δεν βρέθηκε ενεργός χρήστης με αυτό το email.")
        
        # Δημιουργία reset token
        reset_token = PasswordResetToken.objects.create(user=user)
        
        # Αποστολή email
        if EmailService.send_password_reset_email(user, reset_token):
            return reset_token
        else:
            reset_token.delete()
            raise ValueError("Αποτυχία αποστολής email.")
    
    @staticmethod
    def confirm_password_reset(token, new_password):
        """
        Επιβεβαίωση επαναφοράς κωδικού
        """
        try:
            reset_token = PasswordResetToken.objects.get(token=token, used=False)
        except PasswordResetToken.DoesNotExist:
            raise ValueError("Μη έγκυρο ή χρησιμοποιημένο token.")
        
        if reset_token.is_expired:
            raise ValueError("Το token έχει λήξει.")
        
        # Ενημέρωση κωδικού
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Σήμανση token ως χρησιμοποιημένο
        reset_token.used = True
        reset_token.used_at = timezone.now()
        reset_token.save()
        
        # Απενεργοποίηση όλων των άλλων reset tokens για αυτόν τον χρήστη
        PasswordResetToken.objects.filter(
            user=user, 
            used=False
        ).update(used=True, used_at=timezone.now())
        
        return user


class UserVerificationService:
    """
    Service για την επιβεβαίωση email
    """
    
    @staticmethod
    def verify_email(token):
        """
        Επιβεβαίωση email με token
        """
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            raise ValueError("Μη έγκυρο token επιβεβαίωσης.")
        
        # Έλεγχος αν το token έχει λήξει (24 ώρες)
        if user.email_verification_sent_at:
            time_diff = timezone.now() - user.email_verification_sent_at
            if time_diff.total_seconds() > 24 * 3600:  # 24 hours
                raise ValueError("Το token επιβεβαίωσης έχει λήξει.")
        
        # Επιβεβαίωση email
        user.email_verified = True
        user.is_active = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        user.save(update_fields=[
            'email_verified', 
            'is_active', 
            'email_verification_token', 
            'email_verification_sent_at'
        ])
        
        return user

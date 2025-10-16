# users/services.py

import secrets
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import UserInvitation, PasswordResetToken

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
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        
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
        invitation_url = f"{settings.FRONTEND_URL}/accept-invitation?token={invitation.token}"
        
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


class InvitationService:
    """
    Service για τη διαχείριση των προσκλήσεων
    """
    
    @staticmethod
    def create_invitation(invited_by, email, first_name="", last_name="", 
                         invitation_type="registration", building=None, assigned_role=None):
        """
        Δημιουργία νέας πρόσκλησης
        """
        # Έλεγχος αν υπάρχει ήδη χρήστης με αυτό το email
        if User.objects.filter(email=email).exists():
            raise ValueError("Χρήστης με αυτό το email υπάρχει ήδη.")
        
        # Έλεγχος για pending invitations
        if UserInvitation.objects.filter(email=email, status='pending').exists():
            raise ValueError("Υπάρχει ήδη ενεργή πρόσκληση για αυτό το email.")
        
        # Δημιουργία invitation
        invitation = UserInvitation.objects.create(
            email=email,
            first_name=first_name,
            last_name=last_name,
            invitation_type=invitation_type,
            invited_by=invited_by,
            building_id=building.id if building else None,
            assigned_role=assigned_role
        )
        
        # Αποστολή email
        if EmailService.send_invitation_email(invitation):
            return invitation
        else:
            invitation.delete()
            raise ValueError("Αποτυχία αποστολής email.")
    
    @staticmethod
    def accept_invitation(token, password):
        """
        Αποδοχή πρόσκλησης και δημιουργία χρήστη
        """
        try:
            invitation = UserInvitation.objects.get(token=token, status='pending')
        except UserInvitation.DoesNotExist:
            raise ValueError("Μη έγκυρη ή ληγμένη πρόσκληση.")
        
        if invitation.is_expired:
            invitation.expire()
            raise ValueError("Η πρόσκληση έχει λήξει.")
        
        # Δημιουργία χρήστη
        user = User.objects.create_user(
            email=invitation.email,
            first_name=invitation.first_name,
            last_name=invitation.last_name,
            password=password,
            is_active=True,
            email_verified=True
        )
        
        # Ανάθεση ρόλου αν υπάρχει
        if invitation.assigned_role:
            from django.contrib.auth.models import Group
            try:
                group = Group.objects.get(name=invitation.assigned_role)
                user.groups.add(group)
            except Group.DoesNotExist:
                pass
        
        # Δημιουργία building membership αν υπάρχει building
        if invitation.building_id:
            try:
                from buildings.models import Building, BuildingMembership
                building = Building.objects.get(id=invitation.building_id)
                BuildingMembership.objects.create(
                    user=user,
                    building=building,
                    role='resident'  # Default role
                )
            except:
                pass  # Building might not exist in current tenant
        
        # Ενημέρωση invitation
        invitation.accept(user)
        
        # Αποστολή welcome email
        EmailService.send_welcome_email(user)
        
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

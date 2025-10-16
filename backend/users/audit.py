# users/audit.py

import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import UserLoginAttempt

User = get_user_model()
logger = logging.getLogger('security_audit')


class SecurityAuditLogger:
    """
    Security audit logging για authentication events
    """
    
    @staticmethod
    def log_login_success(user, ip_address, user_agent):
        """Log επιτυχής σύνδεση"""
        logger.info(
            f"LOGIN_SUCCESS: User {user.email} (ID: {user.id}) logged in successfully from IP {ip_address}",
            extra={
                'event_type': 'LOGIN_SUCCESS',
                'user_id': user.id,
                'user_email': user.email,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_login_failure(email, ip_address, user_agent, failure_reason):
        """Log αποτυχημένη σύνδεση"""
        logger.warning(
            f"LOGIN_FAILURE: Failed login attempt for {email} from IP {ip_address}. Reason: {failure_reason}",
            extra={
                'event_type': 'LOGIN_FAILURE',
                'email': email,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'failure_reason': failure_reason,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_account_locked(user, ip_address, duration_minutes):
        """Log κλείδωμα λογαριασμού"""
        logger.warning(
            f"ACCOUNT_LOCKED: User {user.email} (ID: {user.id}) account locked for {duration_minutes} minutes from IP {ip_address}",
            extra={
                'event_type': 'ACCOUNT_LOCKED',
                'user_id': user.id,
                'user_email': user.email,
                'ip_address': ip_address,
                'lock_duration_minutes': duration_minutes,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_password_reset_request(user, ip_address, user_agent):
        """Log αίτημα επαναφοράς κωδικού"""
        logger.info(
            f"PASSWORD_RESET_REQUEST: User {user.email} (ID: {user.id}) requested password reset from IP {ip_address}",
            extra={
                'event_type': 'PASSWORD_RESET_REQUEST',
                'user_id': user.id,
                'user_email': user.email,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_password_reset_success(user, ip_address, user_agent):
        """Log επιτυχής επαναφορά κωδικού"""
        logger.info(
            f"PASSWORD_RESET_SUCCESS: User {user.email} (ID: {user.id}) successfully reset password from IP {ip_address}",
            extra={
                'event_type': 'PASSWORD_RESET_SUCCESS',
                'user_id': user.id,
                'user_email': user.email,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_user_registration(user, ip_address, user_agent):
        """Log εγγραφή νέου χρήστη"""
        logger.info(
            f"USER_REGISTRATION: New user {user.email} (ID: {user.id}) registered from IP {ip_address}",
            extra={
                'event_type': 'USER_REGISTRATION',
                'user_id': user.id,
                'user_email': user.email,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_email_verification(user, ip_address, user_agent, success=True):
        """Log επιβεβαίωση email"""
        event_type = 'EMAIL_VERIFICATION_SUCCESS' if success else 'EMAIL_VERIFICATION_FAILURE'
        message = f"{event_type}: User {user.email} (ID: {user.id}) {'verified' if success else 'failed to verify'} email from IP {ip_address}"
        
        logger.info(
            message,
            extra={
                'event_type': event_type,
                'user_id': user.id,
                'user_email': user.email,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'success': success,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_invitation_created(invitation, ip_address, user_agent):
        """Log δημιουργία πρόσκλησης"""
        logger.info(
            f"INVITATION_CREATED: User {invitation.invited_by.email} (ID: {invitation.invited_by.id}) created invitation for {invitation.email} from IP {ip_address}",
            extra={
                'event_type': 'INVITATION_CREATED',
                'inviter_id': invitation.invited_by.id,
                'inviter_email': invitation.invited_by.email,
                'invitee_email': invitation.email,
                'invitation_id': invitation.id,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_invitation_accepted(invitation, user, ip_address, user_agent):
        """Log αποδοχή πρόσκλησης"""
        logger.info(
            f"INVITATION_ACCEPTED: User {user.email} (ID: {user.id}) accepted invitation {invitation.id} from IP {ip_address}",
            extra={
                'event_type': 'INVITATION_ACCEPTED',
                'user_id': user.id,
                'user_email': user.email,
                'invitation_id': invitation.id,
                'inviter_email': invitation.invited_by.email,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @staticmethod
    def log_suspicious_activity(description, ip_address, user_agent, user=None):
        """Log ύποπτη δραστηριότητα"""
        user_info = f"User {user.email} (ID: {user.id})" if user else "Anonymous user"
        
        logger.warning(
            f"SUSPICIOUS_ACTIVITY: {user_info} - {description} from IP {ip_address}",
            extra={
                'event_type': 'SUSPICIOUS_ACTIVITY',
                'user_id': user.id if user else None,
                'user_email': user.email if user else None,
                'description': description,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'timestamp': timezone.now().isoformat()
            }
        )


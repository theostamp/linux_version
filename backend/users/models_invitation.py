"""
Tenant Invitation System
Allows tenant admins to invite users (residents, managers, etc.) via email
"""
from django.db import models
from django.utils import timezone
from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
from django.conf import settings
import uuid
import logging

logger = logging.getLogger(__name__)


class TenantInvitation(models.Model):
    """
    Invitation for a user to join a tenant.
    Sent by tenant admin/manager to new users.
    """
    
    class InvitationStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'
    
    class InvitedRole(models.TextChoices):
        RESIDENT = 'resident', 'Resident'
        MANAGER = 'manager', 'Manager'
        STAFF = 'staff', 'Staff'
        INTERNAL_MANAGER = 'internal_manager', 'Internal Manager'
    
    # Unique identifier
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Invitation details
    email = models.EmailField(
        help_text='Email address of the invited user'
    )
    invited_role = models.CharField(
        max_length=20,
        choices=InvitedRole.choices,
        default=InvitedRole.RESIDENT,
        help_text='Role the user will have when they accept'
    )
    
    # Optional: Link to specific apartment (commented out until buildings app is properly installed)
    # apartment = models.ForeignKey(
    #     'buildings.Apartment',
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='invitations',
    #     help_text='Optional: Assign user to specific apartment'
    # )
    
    # Invitation metadata
    invited_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='sent_tenant_invitations',
        help_text='User who sent the invitation'
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text='Invitation expiration date/time'
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    declined_at = models.DateTimeField(null=True, blank=True)
    
    # Optional: Personal message
    message = models.TextField(
        blank=True,
        help_text='Optional personal message to the invitee'
    )
    
    # Tracking
    created_user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_invitations',
        help_text='User created from this invitation (if accepted)'
    )
    
    class Meta:
        ordering = ['-invited_at']
        indexes = [
            models.Index(fields=['email', 'status']),
            models.Index(fields=['invited_by', 'status']),
            models.Index(fields=['status', 'expires_at']),
        ]
        unique_together = [['email', 'invited_by', 'status']]  # Prevent duplicate pending invitations
    
    def __str__(self):
        return f"Invitation to {self.email} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Set expiration if not set (default: 7 days)
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if invitation has expired"""
        return timezone.now() > self.expires_at
    
    def can_be_accepted(self):
        """Check if invitation can be accepted"""
        return (
            self.status == self.InvitationStatus.PENDING and
            not self.is_expired()
        )
    
    def generate_token(self):
        """
        Generate a secure, time-limited token for this invitation.
        Token format: invitation_id:email:expires_at
        """
        signer = TimestampSigner()
        token_data = f"{self.id}:{self.email}"
        return signer.sign(token_data)
    
    @staticmethod
    def verify_token(token, max_age=None):
        """
        Verify and decode an invitation token.
        
        Args:
            token (str): The invitation token
            max_age (int): Maximum age in seconds (default: from invitation)
        
        Returns:
            TenantInvitation: The invitation object if valid
            
        Raises:
            SignatureExpired: If token has expired
            BadSignature: If token is invalid
            DoesNotExist: If invitation not found
        """
        signer = TimestampSigner()
        
        # Verify signature (max_age in seconds)
        if max_age is None:
            max_age = 7 * 24 * 60 * 60  # 7 days in seconds
        
        unsigned_data = signer.unsign(token, max_age=max_age)
        invitation_id, email = unsigned_data.split(':')
        
        # Get invitation
        invitation = TenantInvitation.objects.get(id=invitation_id, email=email)
        
        # Check if still valid
        if not invitation.can_be_accepted():
            if invitation.is_expired():
                invitation.status = TenantInvitation.InvitationStatus.EXPIRED
                invitation.save()
                raise SignatureExpired("Invitation has expired")
            else:
                raise BadSignature(f"Invitation is {invitation.status}")
        
        return invitation
    
    def accept(self, user=None):
        """
        Mark invitation as accepted.
        
        Args:
            user (CustomUser): The user who accepted (optional, for tracking)
        """
        if not self.can_be_accepted():
            raise ValueError(f"Invitation cannot be accepted (status: {self.status})")
        
        self.status = self.InvitationStatus.ACCEPTED
        self.accepted_at = timezone.now()
        if user:
            self.created_user = user
        self.save()
        
        logger.info(f"Invitation {self.id} accepted by {self.email}")
    
    def decline(self):
        """Mark invitation as declined"""
        if self.status != self.InvitationStatus.PENDING:
            raise ValueError(f"Invitation cannot be declined (status: {self.status})")
        
        self.status = self.InvitationStatus.DECLINED
        self.declined_at = timezone.now()
        self.save()
        
        logger.info(f"Invitation {self.id} declined by {self.email}")
    
    def cancel(self):
        """Cancel invitation (by sender)"""
        if self.status != self.InvitationStatus.PENDING:
            raise ValueError(f"Invitation cannot be cancelled (status: {self.status})")
        
        self.status = self.InvitationStatus.CANCELLED
        self.save()
        
        logger.info(f"Invitation {self.id} cancelled by sender")
    
    def get_invitation_url(self):
        """Get the full invitation acceptance URL"""
        token = self.generate_token()
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{frontend_url}/invitations/accept?token={token}"


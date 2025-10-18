# backend/users/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Το email είναι υποχρεωτικό')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Ο Superuser πρέπει να έχει is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Ο Superuser πρέπει να έχει is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    class SystemRole(models.TextChoices):
        ADMIN = 'admin', _('Admin')  # Superusers only
        OFFICE_MANAGER = 'manager', _('Office Manager')  # Γραφείο διαχείρισης (Tenant owner)

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=False)  # Changed to False - requires email verification
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    # Email verification fields
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    email_verification_sent_at = models.DateTimeField(blank=True, null=True)

    role = models.CharField(
        max_length=20,
        choices=SystemRole.choices,
        blank=True,
        null=True,
        help_text=_("Ρόλος σε επίπεδο tenant (π.χ. γραφείο διαχείρισης)")
    )

    # Office Management Details - Auto-filled when creating buildings
    office_name = models.CharField(
        _("Όνομα Γραφείου Διαχείρισης"),
        max_length=255,
        blank=True,
        help_text=_("Όνομα της εταιρείας/γραφείου διαχείρισης")
    )
    office_phone = models.CharField(
        _("Τηλέφωνο Γραφείου Διαχείρισης"),
        max_length=20,
        blank=True,
        help_text=_("Τηλέφωνο επικοινωνίας με το γραφείο διαχείρισης")
    )
    office_address = models.CharField(
        _("Διεύθυνση Γραφείου Διαχείρισης"),
        max_length=255,
        blank=True,
        help_text=_("Διεύθυνση του γραφείου διαχείρισης")
    )
    office_logo = models.ImageField(
        _("Logo Γραφείου Διαχείρισης"),
        upload_to='office_logos/',
        blank=True,
        null=True,
        help_text=_("Logo της εταιρείας διαχείρισης")
    )
    
    # Τραπεζικά Στοιχεία
    office_bank_name = models.CharField(
        _("Όνομα Τράπεζας"),
        max_length=100,
        blank=True,
        help_text=_("Όνομα της τράπεζας για πληρωμές")
    )
    office_bank_account = models.CharField(
        _("Αριθμός Λογαριασμού"),
        max_length=50,
        blank=True,
        help_text=_("Αριθμός τραπεζικού λογαριασμού")
    )
    office_bank_iban = models.CharField(
        _("IBAN"),
        max_length=34,
        blank=True,
        help_text=_("IBAN για πληρωμές")
    )
    office_bank_beneficiary = models.CharField(
        _("Δικαιούχος"),
        max_length=255,
        blank=True,
        help_text=_("Όνομα δικαιούχου του λογαριασμού")
    )
    
    # Notification preferences
    email_notifications_enabled = models.BooleanField(
        _('Email Notifications Enabled'),
        default=True,
        help_text=_('Ενεργοποίηση email ειδοποιήσεων')
    )
    
    sms_notifications_enabled = models.BooleanField(
        _('SMS Notifications Enabled'),
        default=False,
        help_text=_('Ενεργοποίηση SMS ειδοποιήσεων')
    )
    
    # Specific notification types
    notify_financial_updates = models.BooleanField(
        _('Financial Updates'),
        default=True,
        help_text=_('Ειδοποιήσεις για οικονομικές ενημερώσεις')
    )
    
    notify_maintenance_updates = models.BooleanField(
        _('Maintenance Updates'),
        default=True,
        help_text=_('Ειδοποιήσεις για αιτήματα συντήρησης')
    )
    
    notify_announcements = models.BooleanField(
        _('Announcements'),
        default=True,
        help_text=_('Ειδοποιήσεις για ανακοινώσεις')
    )
    
    notify_votes = models.BooleanField(
        _('Votes'),
        default=True,
        help_text=_('Ειδοποιήσεις για ψηφοφορίες')
    )
    
    # Account security fields
    failed_login_attempts = models.PositiveIntegerField(
        _('Failed Login Attempts'),
        default=0,
        help_text=_('Αριθμός αποτυχημένων προσπαθειών σύνδεσης')
    )
    
    locked_until = models.DateTimeField(
        _('Locked Until'),
        null=True,
        blank=True,
        help_text=_('Λογαριασμός κλειδωμένος μέχρι αυτή την ημερομηνία')
    )
    
    last_failed_login = models.DateTimeField(
        _('Last Failed Login'),
        null=True,
        blank=True,
        help_text=_('Τελευταία αποτυχημένη προσπάθεια σύνδεσης')
    )

    # OAuth fields
    oauth_provider = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('OAuth provider (google, microsoft, etc.)')
    )
    oauth_provider_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('User ID from OAuth provider')
    )

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.email
    
    # Account security methods
    @property
    def is_locked(self):
        """Ελέγχει αν ο λογαριασμός είναι κλειδωμένος"""
        if not self.locked_until:
            return False
        return timezone.now() < self.locked_until
    
    def lock_account(self, duration_minutes=30):
        """Κλειδώνει τον λογαριασμό για συγκεκριμένη διάρκεια"""
        from django.utils import timezone
        from datetime import timedelta
        
        self.locked_until = timezone.now() + timedelta(minutes=duration_minutes)
        self.save(update_fields=['locked_until'])
    
    def unlock_account(self):
        """Ξεκλειδώνει τον λογαριασμό"""
        self.locked_until = None
        self.failed_login_attempts = 0
        self.last_failed_login = None
        self.save(update_fields=['locked_until', 'failed_login_attempts', 'last_failed_login'])
    
    def increment_failed_login(self):
        """Αυξάνει τον αριθμό αποτυχημένων προσπαθειών"""
        from django.utils import timezone
        
        self.failed_login_attempts += 1
        self.last_failed_login = timezone.now()
        
        # Κλείδωμα αν υπερβούν τα 5 attempts
        if self.failed_login_attempts >= 5:
            self.lock_account(duration_minutes=30)
            
            # Security audit logging for account lockout
            try:
                from .audit import SecurityAuditLogger
                SecurityAuditLogger.log_account_locked(self, 'Unknown IP', 30)
            except ImportError:
                pass  # Skip if audit module not available
        
        self.save(update_fields=['failed_login_attempts', 'last_failed_login', 'locked_until'])
    
    def reset_failed_login(self):
        """Επαναφέρει τον αριθμό αποτυχημένων προσπαθειών"""
        self.failed_login_attempts = 0
        self.last_failed_login = None
        self.save(update_fields=['failed_login_attempts', 'last_failed_login'])
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['email']

    # ------- Helper ιδιότητες για ρόλους συστήματος --------

    @property
    def full_name(self):
        return self.get_full_name()

    @property
    def is_office_manager(self):
        return self.role == self.SystemRole.OFFICE_MANAGER

    @property
    def is_admin(self):
        return self.role == self.SystemRole.ADMIN

    # ------- Helper ιδιότητες για ρόλους ανά πολυκατοικία --------
    def is_manager_of(self, building):
        """
        Επιστρέφει True αν ο χρήστης είναι ο manager του δοσμένου κτιρίου.
        """
        return hasattr(building, "manager") and building.manager == self


    def is_resident_of(self, building):
        return self.memberships.filter(building=building).exists()

    def is_representative_of(self, building):
        return self.memberships.filter(building=building, role='representative').exists()

    def get_buildings_as_resident(self):
        return [m.building for m in self.memberships.all()]

    def get_apartment_in(self, building):
        membership = self.memberships.filter(building=building).first()
        return membership.apartment if membership else None


class UserInvitation(models.Model):
    """
    Model για την διαχείριση των προσκλήσεων χρηστών
    """
    class InvitationStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        ACCEPTED = 'accepted', _('Accepted')
        EXPIRED = 'expired', _('Expired')
        CANCELLED = 'cancelled', _('Cancelled')

    class InvitationType(models.TextChoices):
        REGISTRATION = 'registration', _('Registration')
        BUILDING_ACCESS = 'building_access', _('Building Access')
        ROLE_ASSIGNMENT = 'role_assignment', _('Role Assignment')

    # Βασικά στοιχεία
    email = models.EmailField(_('Email'), help_text=_('Email διεύθυνση του προσκεκλημένου'))
    first_name = models.CharField(_('First Name'), max_length=50, blank=True)
    last_name = models.CharField(_('Last Name'), max_length=50, blank=True)
    
    # Invitation details
    invitation_type = models.CharField(
        _('Invitation Type'),
        max_length=20,
        choices=InvitationType.choices,
        default=InvitationType.REGISTRATION
    )
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING
    )
    
    # Security
    token = models.UUIDField(_('Token'), default=uuid.uuid4, unique=True)
    expires_at = models.DateTimeField(_('Expires At'))
    
    # Sender information
    invited_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sent_invitations',
        verbose_name=_('Invited By')
    )
    
    # Building association (if applicable) - using string reference for tenant compatibility
    building_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('Building ID'),
        help_text=_('ID του κτιρίου στο οποίο προσκλήθηκε ο χρήστης')
    )
    
    # Role assignment (if applicable)
    assigned_role = models.CharField(
        _('Assigned Role'),
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Ρόλος που θα ανατεθεί στον χρήστη')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('Created At'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Updated At'), auto_now=True)
    accepted_at = models.DateTimeField(_('Accepted At'), null=True, blank=True)
    
    # User creation after acceptance
    created_user = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitation_origin',
        verbose_name=_('Created User')
    )

    class Meta:
        verbose_name = _('User Invitation')
        verbose_name_plural = _('User Invitations')
        ordering = ['-created_at']

    def __str__(self):
        return f'Invitation for {self.email} ({self.status})'

    def save(self, *args, **kwargs):
        # Set default expiration (7 days from now)
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return self.status == self.InvitationStatus.PENDING and not self.is_expired

    def accept(self, user=None):
        """Accept the invitation and optionally create a user"""
        if not self.is_valid:
            return False
        
        self.status = self.InvitationStatus.ACCEPTED
        self.accepted_at = timezone.now()
        
        if user:
            self.created_user = user
        
        self.save()
        return True

    def expire(self):
        """Mark invitation as expired"""
        self.status = self.InvitationStatus.EXPIRED
        self.save()

    def cancel(self):
        """Cancel the invitation"""
        self.status = self.InvitationStatus.CANCELLED
        self.save()


class PasswordResetToken(models.Model):
    """
    Model για την διαχείριση των tokens επαναφοράς κωδικού
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Password reset for {self.user.email}'

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.used and not self.is_expired


class UserLoginAttempt(models.Model):
    """
    Model για την παρακολούθηση των προσπαθειών σύνδεσης
    """
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='login_attempts',
        verbose_name=_('User'),
        null=True,
        blank=True
    )
    
    email = models.EmailField(
        _('Email'),
        help_text=_('Email που χρησιμοποιήθηκε για την προσπάθεια σύνδεσης')
    )
    
    ip_address = models.GenericIPAddressField(
        _('IP Address'),
        help_text=_('IP διεύθυνση από την οποία έγινε η προσπάθεια')
    )
    
    user_agent = models.TextField(
        _('User Agent'),
        blank=True,
        help_text=_('User agent string του browser/client')
    )
    
    success = models.BooleanField(
        _('Success'),
        default=False,
        help_text=_('Αν η προσπάθεια σύνδεσης ήταν επιτυχής')
    )
    
    failure_reason = models.CharField(
        _('Failure Reason'),
        max_length=100,
        blank=True,
        help_text=_('Λόγος αποτυχίας (αν υπάρχει)')
    )
    
    attempted_at = models.DateTimeField(
        _('Attempted At'),
        auto_now_add=True,
        help_text=_('Ώρα που έγινε η προσπάθεια')
    )
    
    class Meta:
        verbose_name = _('User Login Attempt')
        verbose_name_plural = _('User Login Attempts')
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['email', 'attempted_at']),
            models.Index(fields=['ip_address', 'attempted_at']),
            models.Index(fields=['success', 'attempted_at']),
        ]
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.email} - {status} - {self.attempted_at}"

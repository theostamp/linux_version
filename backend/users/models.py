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

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.email

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

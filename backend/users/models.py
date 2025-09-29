# backend/users/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


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
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

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

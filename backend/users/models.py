# backend/users/models.py

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager  # type: ignore  # type: ignore  # type: ignore
from django.db import models  # type: ignore  # type: ignore  # type: ignore

# Προσοχή: ορίζεται ΠΡΙΝ χρησιμοποιηθεί
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
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    ROLE_CHOICES = [
        ('manager', 'Manager'),
        ('resident', 'Resident'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    def __str__(self):
        return self.email

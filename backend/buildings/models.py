# backend/buildings/models.py
from django.db import models
from users.models import CustomUser

# Σταθερές επιλογές για αριθμό διαμερισμάτων
APARTMENT_CHOICES = [(i, str(i)) for i in range(1, 101)]  # 1 έως 100

class Building(models.Model):
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    manager = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='buildings',
        help_text='User who manages this building'
    )
    apartments_count = models.IntegerField(
        choices=APARTMENT_CHOICES,
        null=True,
        blank=True
    )
    internal_manager_name = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    internal_manager_phone = models.CharField(
        max_length=20,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
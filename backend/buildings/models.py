# backend/buildings/models.py
from django.db import models  
    
from django.conf import settings 
   
from django.utils.translation import gettext_lazy as _ 
   

from users.models import CustomUser

# Σταθερές επιλογές για αριθμό διαμερισμάτων
APARTMENT_CHOICES = [(i, str(i)) for i in range(1, 101)]  # 1 έως 100

class Building(models.Model):
    name = models.CharField(_("Όνομα"), max_length=255)
    address = models.CharField(_("Διεύθυνση"), max_length=255)
    city = models.CharField(_("Πόλη"), max_length=100)
    postal_code = models.CharField(_("Τ.Κ."), max_length=10)
    manager = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_buildings",
        verbose_name=_("Διαχειριστής")
    )
    apartments_count = models.PositiveIntegerField(
        _("Σύνολο Διαμερισμάτων"),
        default=0
    )

    internal_manager_name = models.CharField(
        max_length=255,
        blank=True
    )
    internal_manager_phone = models.CharField(
        max_length=20,
        blank=True
    )
    street_view_image = models.URLField(
        _("Εικόνα Street View"),
        max_length=1000,
        blank=True,
        null=True
    )
    latitude = models.DecimalField(
        _("Γεωγραφικό Πλάτος"),
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text=_("Γεωγραφικό πλάτος (latitude) από Google Maps")
    )
    longitude = models.DecimalField(
        _("Γεωγραφικό Μήκος"),
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text=_("Γεωγραφικό μήκος (longitude) από Google Maps")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.address}"


class BuildingMembership(models.Model):
    RESIDENT_ROLES = [
        ("resident", "Κάτοικος"),
        ("representative", "Εκπρόσωπος"),
    ]

    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="memberships")
    resident = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="memberships")
    apartment = models.CharField(max_length=10, blank=True)
    role = models.CharField(max_length=20, choices=RESIDENT_ROLES, default="resident")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('building', 'resident')

    def __str__(self):
        return f"{self.resident.email} → {self.building.name} ({self.get_role_display()})"
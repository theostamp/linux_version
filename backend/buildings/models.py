# backend/buildings/models.py
from django.db import models  # type: ignore
from django.conf import settings  # type: ignore
from django.utils.translation import gettext_lazy as _  # type: ignore

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.address}"
from django.db import models
from buildings.models import Building
from users.models import CustomUser


class Resident(models.Model):
    class Role(models.TextChoices):
        MANAGER = "manager", "Διαχειριστής"
        OWNER   = "owner",   "Ιδιοκτήτης"
        TENANT  = "tenant",  "Ένοικος"

    building  = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name="residents",
    )
    user      = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="resident_profile",
    )
    apartment = models.CharField(max_length=50)
    phone     = models.CharField(max_length=20, blank=True)
    role      = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.TENANT,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("building", "apartment")
        ordering = ("building", "apartment")

    def __str__(self):
        return f"{self.user.get_full_name()} • {self.apartment}"

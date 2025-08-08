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
    
    # Γραφείο Διαχείρισης
    management_office_name = models.CharField(
        _("Όνομα Γραφείου Διαχείρισης"),
        max_length=255,
        blank=True,
        help_text=_("Όνομα της εταιρείας/γραφείου διαχείρισης")
    )
    management_office_phone = models.CharField(
        _("Τηλέφωνο Γραφείου Διαχείρισης"),
        max_length=20,
        blank=True,
        help_text=_("Τηλέφωνο επικοινωνίας με το γραφείο διαχείρισης")
    )
    management_office_address = models.CharField(
        _("Διεύθυνση Γραφείου Διαχείρισης"),
        max_length=255,
        blank=True,
        help_text=_("Διεύθυνση του γραφείου διαχείρισης")
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
    
    # 💰 Οικονομικά πεδία
    current_reserve = models.DecimalField(
        _("Τρέχον Αποθεματικό"),
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Τρέχον αποθεματικό του κτιρίου σε ευρώ")
    )
    
    heating_fixed_percentage = models.DecimalField(
        _("Ποσοστό Παγίου Θέρμανσης"),
        max_digits=5,
        decimal_places=2,
        default=30.0,
        help_text=_("Ποσοστό παγίου κόστους θέρμανσης (π.χ. 30% = 30.00)")
    )
    
    reserve_contribution_per_apartment = models.DecimalField(
        _("Πάγια Εισφορά Αποθεματικού ανά Διαμέρισμα"),
        max_digits=6,
        decimal_places=2,
        default=5.0,
        help_text=_("Πάγια εισφορά αποθεματικού ανά διαμέρισμα σε ευρώ")
    )

    def __str__(self):
        return self.name
    
    def get_street_view_image_url(self):
        """Returns the street view image URL or a placeholder"""
        if self.street_view_image:
            return self.street_view_image
        # Return a placeholder image if no street view image is set
        return f"https://picsum.photos/600/300?random={self.id}"
    
    def has_street_view_image(self):
        """Check if building has a street view image"""
        return bool(self.street_view_image)


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
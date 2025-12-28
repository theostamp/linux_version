from django.db import models
from buildings.models import Building
from apartments.models import Apartment
from django.utils.translation import gettext_lazy as _

class HeatingDevice(models.Model):
    """
    IoT συσκευή (π.χ. Shelly Relay) που ελέγχει/καταγράφει την ηλεκτροβάνα.
    Premium Feature: Διαθέσιμο μόνο σε κτίρια με Smart Heating plan.
    """
    DEVICE_TYPES = [
        ('shelly_1', 'Shelly 1/1PM'),
        ('sonoff_mini', 'Sonoff Mini'),
        ('custom_esp', 'Custom ESP32'),
        ('virtual', 'Virtual Simulator'),
    ]

    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='heating_devices',
        verbose_name=_("Κτίριο")
    )
    apartment = models.ForeignKey(
        Apartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='heating_devices',
        verbose_name=_("Διαμέρισμα"),
        help_text=_("Αν η συσκευή αφορά συγκεκριμένο διαμέρισμα (αυτονομία)")
    )
    device_id = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Device ID"),
        help_text=_("MAC Address ή Unique Serial Number")
    )
    name = models.CharField(max_length=100, verbose_name=_("Όνομα Συσκευής"))
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES, default='shelly_1')

    # Status
    is_active = models.BooleanField(default=True, verbose_name=_("Ενεργή"))
    last_seen = models.DateTimeField(null=True, blank=True, verbose_name=_("Τελευταία Επικοινωνία"))
    current_status = models.BooleanField(default=False, verbose_name=_("Τρέχουσα Κατάσταση (ON/OFF)"))

    # Auth
    api_key = models.CharField(max_length=64, blank=True, help_text=_("Κλειδί για Authentication συσκευής"))

    class Meta:
        verbose_name = _("Συσκευή Θέρμανσης (IoT)")
        verbose_name_plural = _("Συσκευές Θέρμανσης (IoT)")

    def __str__(self):
        return f"{self.name} ({self.device_id})"


class HeatingSession(models.Model):
    """
    Μια συνεδρία θέρμανσης (πόση ώρα ήταν ανοιχτή η βάνα).
    Αυτό είναι το 'Billable Item' για τα κοινόχρηστα.
    """
    device = models.ForeignKey(
        HeatingDevice,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name=_("Συσκευή")
    )
    started_at = models.DateTimeField(verbose_name=_("Έναρξη"))
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Λήξη"))
    duration_minutes = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Διάρκεια (λεπτά)")
    )

    # Financial Link
    is_billed = models.BooleanField(default=False, verbose_name=_("Έχει Χρεωθεί"))

    class Meta:
        verbose_name = _("Συνεδρία Θέρμανσης")
        verbose_name_plural = _("Συνεδρίες Θέρμανσης")
        ordering = ['-started_at']

    def save(self, *args, **kwargs):
        if self.ended_at and self.started_at:
            delta = self.ended_at - self.started_at
            self.duration_minutes = delta.total_seconds() / 60
        super().save(*args, **kwargs)

    def __str__(self):
        status = f"{self.duration_minutes:.1f} min" if self.duration_minutes else "Active"
        return f"{self.device.name}: {self.started_at.strftime('%d/%m %H:%M')} ({status})"


class TelemetryLog(models.Model):
    """
    Raw logs για debugging και history (θερμοκρασία, voltage κλπ).
    Κρατάμε logs για 30 μέρες.
    """
    device = models.ForeignKey(HeatingDevice, on_delete=models.CASCADE, related_name='telemetry')
    timestamp = models.DateTimeField(auto_now_add=True)
    payload = models.JSONField(verbose_name=_("Raw Data"))

    class Meta:
        ordering = ['-timestamp']


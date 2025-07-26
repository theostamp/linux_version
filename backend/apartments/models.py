# backend/apartments/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from buildings.models import Building


class Apartment(models.Model):
    """
    Μοντέλο για διαμερίσματα με πλήρη στοιχεία ιδιοκτησίας και ενοικίασης
    """
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='apartments',
        verbose_name='Κτίριο'
    )
    
    number = models.CharField(
        max_length=10,
        verbose_name='Αριθμός Διαμερίσματος',
        help_text='π.χ. Α1, Β2, 101, κλπ'
    )
    
    identifier = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Διακριτικό Διαμερίσματος',
        help_text='π.χ. Α2, Β1, C3'
    )
    
    floor = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Όροφος'
    )
    
    # Στοιχεία ιδιοκτησίας
    owner_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Όνομα Ιδιοκτήτη'
    )
    
    owner_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Τηλέφωνο Ιδιοκτήτη'
    )
    
    owner_phone2 = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Δεύτερο Τηλέφωνο Ιδιοκτήτη'
    )
    
    owner_email = models.EmailField(
        blank=True,
        verbose_name='Email Ιδιοκτήτη'
    )
    
    ownership_percentage = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='Χιλιοστά Ιδιοκτησίας (%)',
        help_text='Ποσοστό ιδιοκτησίας σε χιλιοστά'
    )
    
    # Στοιχεία ενοικίασης
    tenant_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Όνομα Ενοίκου'
    )
    
    tenant_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Τηλέφωνο Ενοίκου'
    )
    
    tenant_phone2 = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Δεύτερο Τηλέφωνο Ενοίκου'
    )
    
    tenant_email = models.EmailField(
        blank=True,
        verbose_name='Email Ενοίκου'
    )
    
    is_rented = models.BooleanField(
        default=False,
        verbose_name='Είναι Ενοικιασμένο'
    )
    
    is_closed = models.BooleanField(
        default=False,
        verbose_name='Είναι Κλειστό/Μη Κατοικημένο',
        help_text='Διαμέρισμα με ιδιοκτήτη που δεν κατοικείται'
    )
    
    rent_start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Ημερομηνία Έναρξης Ενοικίασης'
    )
    
    rent_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Ημερομηνία Λήξης Ενοικίασης'
    )
    
    # Σύνδεση με υπάρχοντα χρήστη (αν υπάρχει)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_apartments',
        verbose_name='Χρήστης Ιδιοκτήτης'
    )
    
    tenant_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rented_apartments',
        verbose_name='Χρήστης Ενοίκου'
    )
    
    # Επιπλέον πληροφορίες
    square_meters = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Τετραγωνικά Μέτρα'
    )
    
    bedrooms = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Υπνοδωμάτια'
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name='Σημειώσεις'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['building', 'number']
        ordering = ['building', 'number']
        verbose_name = 'Διαμέρισμα'
        verbose_name_plural = 'Διαμερίσματα'
    
    def __str__(self):
        return f"{self.building.name} - {self.number}"
    
    @property
    def occupant_name(self):
        """Επιστρέφει το όνομα του κατοίκου (ενοίκου ή ιδιοκτήτη)"""
        if self.is_rented and self.tenant_name:
            return self.tenant_name
        elif self.is_closed:
            return "Κλειστό"
        elif self.owner_name:
            return self.owner_name
        return "Μη καταχωρημένο"
    
    @property
    def occupant_phone(self):
        """Επιστρέφει το τηλέφωνο του κατοίκου"""
        if self.is_rented and self.tenant_phone:
            return self.tenant_phone
        elif self.is_closed:
            return ""
        elif self.owner_phone:
            return self.owner_phone
        return ""
    
    @property
    def occupant_phone2(self):
        """Επιστρέφει το δεύτερο τηλέφωνο του κατοίκου"""
        if self.is_rented and self.tenant_phone2:
            return self.tenant_phone2
        elif self.is_closed:
            return ""
        elif self.owner_phone2:
            return self.owner_phone2
        return ""
    
    @property
    def occupant_email(self):
        """Επιστρέφει το email του κατοίκου"""
        if self.is_rented and self.tenant_email:
            return self.tenant_email
        elif self.is_closed:
            return ""
        elif self.owner_email:
            return self.owner_email
        return ""
    
    @property
    def status_display(self):
        """Επιστρέφει την κατάσταση του διαμερίσματος"""
        if self.is_rented:
            return "Ενοικιασμένο"
        elif self.is_closed:
            return "Κλειστό"
        elif self.owner_name:
            return "Ιδιοκατοίκηση"
        else:
            return "Κενό" 
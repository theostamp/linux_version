# backend/buildings/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


from django.utils.translation import gettext_lazy as _


from users.models import CustomUser

# Σταθερές επιλογές για αριθμό διαμερισμάτων
APARTMENT_CHOICES = [(i, str(i)) for i in range(1, 101)]  # 1 έως 100

class ServicePackage(models.Model):
    """
    Προκαθορισμένα πακέτα υπηρεσιών που προσφέρει το γραφείο διαχείρισης
    """
    name = models.CharField(max_length=100, verbose_name="Όνομα Πακέτου")
    description = models.TextField(verbose_name="Περιγραφή Υπηρεσιών")
    fee_per_apartment = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Αμοιβή ανά Διαμέρισμα (€)"
    )
    services_included = models.JSONField(
        default=list,
        verbose_name="Υπηρεσίες που Περιλαμβάνονται"
    )
    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Πακέτο Υπηρεσιών"
        verbose_name_plural = "Πακέτα Υπηρεσιών"
        ordering = ['fee_per_apartment']

    def __str__(self):
        return f"{self.name} - {self.fee_per_apartment}€/διαμέρισμα"

    def get_total_cost_for_building(self, apartments_count):
        """Υπολογίζει το συνολικό κόστος για ένα κτίριο"""
        return self.fee_per_apartment * apartments_count

    def get_services_list(self):
        """Επιστρέφει τη λίστα υπηρεσιών ως string"""
        if isinstance(self.services_included, list):
            return ", ".join(self.services_included)
        return ""

class Building(models.Model):
    name = models.CharField(_("Όνομα"), max_length=255)
    address = models.CharField(_("Διεύθυνση"), max_length=255)
    city = models.CharField(_("Πόλη"), max_length=100)
    postal_code = models.CharField(_("Τ.Κ."), max_length=10)
    # Store manager_id as integer to support cross-schema reference
    # The manager user exists in the public schema, but buildings are in tenant schema
    manager_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Διαχειριστής (User ID από Public Schema)"),
        help_text=_("ID του χρήστη-διαχειριστή από το public schema")
    )

    @property
    def manager(self):
        """Get the manager user from public schema"""
        if not self.manager_id:
            return None
        from users.models import CustomUser
        from django.db import connection
        # Query public schema for user
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id, email, first_name, last_name FROM public.users_customuser WHERE id = %s",
                [self.manager_id]
            )
            row = cursor.fetchone()
            if row:
                # Create a pseudo-user object (not saved to DB)
                user = CustomUser(id=row[0], email=row[1], first_name=row[2], last_name=row[3])
                return user
        return None
    apartments_count = models.PositiveIntegerField(
        _("Σύνολο Διαμερισμάτων"),
        default=0
    )

    # 👤 Εσωτερικός Διαχειριστής - Σύνδεση με User
    internal_manager = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_buildings_internal',
        verbose_name=_("Εσωτερικός Διαχειριστής"),
        help_text=_("Ο χρήστης που είναι εσωτερικός διαχειριστής της πολυκατοικίας")
    )
    
    # 💳 Δικαίωμα καταχώρησης πληρωμών (opt-in για τον εσωτερικό διαχειριστή)
    internal_manager_can_record_payments = models.BooleanField(
        _("Δικαίωμα Καταχώρησης Πληρωμών"),
        default=False,
        help_text=_("Αν ο εσωτερικός διαχειριστής μπορεί να καταχωρεί πληρωμές")
    )

    # Legacy πεδία για backward compatibility (πληροφοριακά)
    internal_manager_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Όνομα Εσωτερικού Διαχειριστή"),
        help_text=_("Πληροφοριακό πεδίο - χρησιμοποιείται αν δεν υπάρχει συνδεδεμένος χρήστης")
    )
    internal_manager_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name=_("Τηλέφωνο Εσωτερικού Διαχειριστή")
    )
    internal_manager_apartment = models.CharField(
        max_length=10,
        blank=True,
        verbose_name=_("Διαμέρισμα Εσωτερικού Διαχειριστή"),
        help_text=_("Αριθμός διαμερίσματος του εσωτερικού διαχειριστή")
    )
    internal_manager_collection_schedule = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Ωράριο Είσπραξης Κοινοχρήστων"),
        help_text=_("Ημέρες και ώρες είσπραξης κοινοχρήστων από τον εσωτερικό διαχειριστή"),
        default="Δευ-Παρ 9:00-17:00"
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

    # 🔥 Σύστημα Θέρμανσης
    HEATING_SYSTEM_NONE = 'none'
    HEATING_SYSTEM_CONVENTIONAL = 'conventional'
    HEATING_SYSTEM_HOUR_METERS = 'hour_meters'
    HEATING_SYSTEM_HEAT_METERS = 'heat_meters'

    HEATING_SYSTEM_CHOICES = [
        (HEATING_SYSTEM_NONE, _('Χωρίς Κεντρική Θέρμανση')),
        (HEATING_SYSTEM_CONVENTIONAL, _('Συμβατικό (Κατανομή με χιλιοστά)')),
        (HEATING_SYSTEM_HOUR_METERS, _('Αυτονομία με Ωρομετρητές')),
        (HEATING_SYSTEM_HEAT_METERS, _('Αυτονομία με Θερμιδομετρητές')),
    ]

    heating_system = models.CharField(
        _("Σύστημα Θέρμανσης"),
        max_length=20,
        choices=HEATING_SYSTEM_CHOICES,
        default=HEATING_SYSTEM_NONE,
        help_text=_("Επιλέξτε τον τρόπο κατανομής των δαπανών θέρμανσης.")
    )

    heating_fixed_percentage = models.PositiveIntegerField(
        _("Ποσοστό Παγίου Θέρμανσης (%)"),
        default=30,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_("Το ποσοστό της δαπάνης που κατανέμεται ως πάγιο (π.χ. 30%). Εφαρμόζεται μόνο σε συστήματα με αυτονομία.")
    )

    reserve_contribution_per_apartment = models.DecimalField(
        _("Πάγια Εισφορά Αποθεματικού ανά Διαμέρισμα"),
        max_digits=6,
        decimal_places=2,
        default=0.0,
        help_text=_("Πάγια εισφορά αποθεματικού ανά διαμέρισμα σε ευρώ")
    )

    # 🎯 Στόχος Αποθεματικού
    reserve_fund_goal = models.DecimalField(
        _("Στόχος Αποθεματικού"),
        max_digits=10,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        help_text=_("Στόχος αποθεματικού σε ευρώ")
    )

    reserve_fund_duration_months = models.PositiveIntegerField(
        _("Διάρκεια Συλλογής (μήνες)"),
        default=0,
        null=True,
        blank=True,
        help_text=_("Διάρκεια συλλογής αποθεματικού σε μήνες")
    )

    reserve_fund_start_date = models.DateField(
        _("Ημερομηνία Έναρξης Συλλογής"),
        null=True,
        blank=True,
        help_text=_("Ημερομηνία έναρξης συλλογής αποθεματικού")
    )

    reserve_fund_target_date = models.DateField(
        _("Ημερομηνία Ολοκλήρωσης Στόχου"),
        null=True,
        blank=True,
        help_text=_("Ημερομηνία ολοκλήρωσης του στόχου αποθεματικού")
    )

    # 💼 Έξοδα Διαχείρισης
    management_fee_per_apartment = models.DecimalField(
        _("Αμοιβή Διαχείρισης ανά Διαμέρισμα"),
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_("Αμοιβή διαχείρισης ανά διαμέρισμα σε ευρώ")
    )

            # ⏳ Grace period για οφειλές πληρωμών (ημέρα μήνα)
    grace_day_of_month = models.PositiveSmallIntegerField(
        _("Ημέρα Έναρξης Οφειλής"),
        default=1,
        validators=[MinValueValidator(1)],
        help_text=_("Ημέρα του μήνα μετά την οποία οι οφειλές θεωρούνται καθυστερημένες")
    )
    
    # 📅 Ημερομηνία Έναρξης Συστήματος
    financial_system_start_date = models.DateField(
        _("Ημερομηνία Έναρξης Συστήματος"),
        null=True,
        blank=True,
        help_text=_("Ημερομηνία έναρξης χρήσης του οικονομικού συστήματος. Αν αφεθεί κενό, υπολογίζεται αυτόματα η 1η του μήνα που δημιουργήθηκε το κτίριο. Αν οριστεί, χρησιμοποιείται πάντα η 1η του μήνα της εισαγμένης ημερομηνίας.")
    )

    # 📦 Πακέτο Υπηρεσιών
    service_package = models.ForeignKey(
        ServicePackage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Πακέτο Υπηρεσιών"),
        help_text=_("Επιλεγμένο πακέτο υπηρεσιών διαχείρισης")
    )
    
    service_package_start_date = models.DateField(
        _("Ημερομηνία Έναρξης Πακέτου"),
        null=True,
        blank=True,
        help_text=_("Ημερομηνία έναρξης ισχύος του πακέτου υπηρεσιών")
    )

    # 📅 Google Calendar Integration
    google_calendar_id = models.CharField(
        _("Google Calendar ID"),
        max_length=255,
        blank=True,
        null=True,
        help_text=_("ID του Google Calendar για αυτό το κτίριο")
    )
    
    google_calendar_enabled = models.BooleanField(
        _("Google Calendar Ενεργό"),
        default=False,
        help_text=_("Ενεργοποίηση του Google Calendar για αυτό το κτίριο")
    )
    
    google_calendar_sync_enabled = models.BooleanField(
        _("Αυτόματος Συγχρονισμός"),
        default=True,
        help_text=_("Αυτόματος συγχρονισμός events με Google Calendar")
    )

    def __str__(self):
        return self.name

    def get_internal_manager_display_name(self):
        """
        Επιστρέφει το όνομα του εσωτερικού διαχειριστή.
        Αν υπάρχει συνδεδεμένος χρήστης, επιστρέφει το full_name του.
        Αλλιώς επιστρέφει το legacy πεδίο internal_manager_name.
        """
        if self.internal_manager:
            return self.internal_manager.get_full_name() or self.internal_manager.email
        return self.internal_manager_name

    def get_internal_manager_phone_display(self):
        """
        Επιστρέφει το τηλέφωνο του εσωτερικού διαχειριστή.
        """
        # TODO: Αν θέλουμε να πάρουμε τηλέφωνο από user profile, μπορούμε να το προσθέσουμε
        return self.internal_manager_phone

    def can_internal_manager_record_payments(self):
        """Ελέγχει αν ο εσωτερικός διαχειριστής μπορεί να καταχωρεί πληρωμές"""
        return self.internal_manager is not None and self.internal_manager_can_record_payments
    
    def get_google_calendar_url(self):
        """Επιστρέφει το Google Calendar URL αν υπάρχει"""
        if self.google_calendar_id:
            return f"https://calendar.google.com/calendar/embed?src={self.google_calendar_id}&ctz=Europe/Athens"
        return None
        
    def get_google_calendar_public_url(self):
        """Επιστρέφει το δημόσιο Google Calendar URL"""
        if self.google_calendar_id:
            return f"https://calendar.google.com/calendar/u/0?cid={self.google_calendar_id}"
        return None

    def get_street_view_image_url(self):
        """Returns the street view image URL or a placeholder"""
        if self.street_view_image:
            return self.street_view_image
        # Return a placeholder image if no street view image is set
        return f"https://picsum.photos/600/300?random={self.id}"

    def has_street_view_image(self):
        """Check if building has a street view image"""
        return bool(self.street_view_image)

    def get_effective_year_start(self, year):
        """
        Υπολογίζει την αποτελεσματική αρχή του έτους για οικονομικούς υπολογισμούς
        
        Args:
            year: Το έτος για το οποίο υπολογίζουμε
            
        Returns:
            date: Η αποτελεσματική αρχή του έτους
        """
        from datetime import date
        
        # Αν υπάρχει ημερομηνία έναρξης συστήματος
        if self.financial_system_start_date:
            start_year = self.financial_system_start_date.year
            
            # Αν το έτος είναι το ίδιο με την έναρξη συστήματος
            if year == start_year:
                return self.financial_system_start_date
            
            # Αν το έτος είναι μετά την έναρξη συστήματος
            elif year > start_year:
                return date(year, 1, 1)
            
            # Αν το έτος είναι πριν την έναρξη συστήματος
            else:
                return None  # Δεν υπάρχουν δεδομένα για αυτό το έτος
        
        # Αν δεν υπάρχει ημερομηνία έναρξης, χρησιμοποιούμε την 1η Ιανουαρίου
        return date(year, 1, 1)
    
    def save(self, *args, **kwargs):
        """
        Custom save method για αυτόματο ορισμό financial_system_start_date
        και δημιουργία μελλοντικών μηνιαίων χρεώσεων
        
        ΚΑΝΟΝΑΣ 1: Όταν ορίζεται management_fee_per_apartment (πακέτο διαχείρισης)
        και δεν υπάρχει financial_system_start_date, ορίζουμε αυτόματα στην 1η του τρέχοντος μήνα.
        
        ΚΑΝΟΝΑΣ 2: Όταν ορίζεται ή αλλάζει management_fee_per_apartment,
        δημιουργούνται αυτόματα management fees για τους επόμενους 12 μήνες.
        """
        from datetime import date
        
        # Track αν το management fee άλλαξε
        is_new = self.pk is None
        management_fee_changed = False
        
        if not is_new:
            try:
                old_building = Building.objects.get(pk=self.pk)
                if old_building.management_fee_per_apartment != self.management_fee_per_apartment:
                    management_fee_changed = True
            except Building.DoesNotExist:
                pass
        
        # ✅ ΑΥΤΟΜΑΤΟΣ ΟΡΙΣΜΟΣ: financial_system_start_date
        # Αν δεν έχει οριστεί, υπολογίζουμε την 1η του μήνα που δημιουργήθηκε το κτίριο
        if not self.financial_system_start_date:
            if self.created_at:
                # Χρησιμοποιούμε την ημερομηνία δημιουργίας (1η του μήνα)
                creation_date = self.created_at.date() if hasattr(self.created_at, 'date') else self.created_at
                if isinstance(creation_date, str):
                    from datetime import datetime
                    creation_date = datetime.strptime(creation_date, '%Y-%m-%d').date()
                self.financial_system_start_date = creation_date.replace(day=1)
                print(f"✅ Auto-set financial_system_start_date = {self.financial_system_start_date} (1η του μήνα δημιουργίας) for building {self.name}")
            else:
                # Fallback: 1η του τρέχοντος μήνα αν δεν υπάρχει created_at
                today = date.today()
                self.financial_system_start_date = today.replace(day=1)
                print(f"✅ Auto-set financial_system_start_date = {self.financial_system_start_date} (fallback: 1η τρέχοντος μήνα) for building {self.name}")
        
        # 🔧 ΕΠΙΣΗ: Εξασφαλίζουμε ότι η ημερομηνία είναι πάντα η 1η του μήνα
        if self.financial_system_start_date:
            self.financial_system_start_date = self.financial_system_start_date.replace(day=1)
        
        super().save(*args, **kwargs)
        
        # ✨ ΝΕΟ: Αυτόματη δημιουργία μελλοντικών μηνιαίων χρεώσεων
        # Μόνο αν το management fee ορίστηκε για πρώτη φορά ή άλλαξε
        if (is_new or management_fee_changed) and self.management_fee_per_apartment > 0:
            self._create_future_management_fees()
    
    def _create_future_management_fees(self, months_ahead: int = 12):
        """
        Δημιουργεί αυτόματα management fee expenses για τους επόμενους Ν μήνες
        
        Args:
            months_ahead: Αριθμός μηνών μπροστά (default: 12)
        """
        from datetime import date
        from financial.monthly_charge_service import MonthlyChargeService
        
        try:
            print(f"🔮 Auto-creating management fees for next {months_ahead} months...")
            
            start_month = date.today().replace(day=1)
            current = start_month
            created_count = 0
            
            for i in range(months_ahead):
                result = MonthlyChargeService.create_monthly_charges(self, current)
                
                if result.get('management_fees_created'):
                    created_count += 1
                
                # Next month
                if current.month == 12:
                    current = date(current.year + 1, 1, 1)
                else:
                    current = date(current.year, current.month + 1, 1)
            
            print(f"✅ Auto-created {created_count} management fee expenses for {self.name}")
            
        except Exception as e:
            # Δεν θέλουμε να σταματήσει το save αν αποτύχει η δημιουργία
            print(f"⚠️ Error auto-creating management fees: {e}")
            import traceback
            traceback.print_exc()


class BuildingMembership(models.Model):
    """
    Σχέση χρήστη με πολυκατοικία.
    Περιλαμβάνει τους ρόλους: Κάτοικος, Εκπρόσωπος, Εσωτερικός Διαχειριστής
    """
    RESIDENT_ROLES = [
        ("resident", "Κάτοικος"),
        ("representative", "Εκπρόσωπος"),
        ("internal_manager", "Εσωτερικός Διαχειριστής"),
    ]

    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="memberships")
    resident = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="memberships")
    apartment = models.CharField(max_length=10, blank=True)
    role = models.CharField(max_length=20, choices=RESIDENT_ROLES, default="resident")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Μέλος Πολυκατοικίας")
        verbose_name_plural = _("Μέλη Πολυκατοικίας")
        unique_together = ('building', 'resident')

    def __str__(self):
        return f"{self.resident.email} → {self.building.name} ({self.get_role_display()})"

    @property
    def is_internal_manager(self):
        """Ελέγχει αν το membership είναι εσωτερικού διαχειριστή"""
        return self.role == 'internal_manager'

    @property
    def is_representative(self):
        """Ελέγχει αν το membership είναι εκπροσώπου"""
        return self.role == 'representative'

    @property
    def is_resident(self):
        """Ελέγχει αν το membership είναι απλού κατοίκου"""
        return self.role == 'resident'
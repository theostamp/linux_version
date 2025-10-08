from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid

User = get_user_model()


class Project(models.Model):
    """
    Μοντέλο για τα έργα/συντηρήσεις που πρέπει να γίνουν στο κτίριο
    """
    PROJECT_STATUS_CHOICES = [
        ('planning', 'Σχεδιασμός'),
        ('tendering', 'Διαγωνισμός'),
        ('evaluation', 'Αξιολόγηση'),
        ('approved', 'Εγκεκριμένο'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρωμένο'),
        ('cancelled', 'Ακυρωμένο'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('medium', 'Μεσαία'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγον'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name="Τίτλος Έργου")
    description = models.TextField(verbose_name="Περιγραφή")
    building = models.ForeignKey('buildings.Building', on_delete=models.CASCADE, verbose_name="Κτίριο")
    
    # Στοιχεία έργου
    estimated_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Εκτιμώμενο Κόστος"
    )
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_CHOICES, 
        default='medium',
        verbose_name="Προτεραιότητα"
    )
    status = models.CharField(
        max_length=20,
        choices=PROJECT_STATUS_CHOICES, 
        default='planning',
        verbose_name="Κατάσταση"
    )
    
    # Ημερομηνίες
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Δημιουργίας")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Ημερομηνία Ενημέρωσης")
    deadline = models.DateField(null=True, blank=True, verbose_name="Προθεσμία")

    # Στοιχεία διαγωνισμού
    tender_deadline = models.DateField(null=True, blank=True, verbose_name="Προθεσμία Υποβολής Προσφορών")
    general_assembly_date = models.DateField(null=True, blank=True, verbose_name="Ημερομηνία Γενικής Συνελεύσης")

    # Στοιχεία Γενικής Συνέλευσης
    assembly_time = models.TimeField(null=True, blank=True, verbose_name="Ώρα Γενικής Συνέλευσης")
    assembly_is_online = models.BooleanField(default=False, verbose_name="Διαδικτυακή Συνέλευση")
    assembly_is_physical = models.BooleanField(default=False, verbose_name="Φυσική Παρουσία")
    assembly_location = models.CharField(max_length=200, null=True, blank=True, verbose_name="Τοποθεσία Συνέλευσης",
                                         help_text="π.χ. Pilotis, Διαμέρισμα Α2")
    assembly_zoom_link = models.URLField(max_length=500, null=True, blank=True, verbose_name="Σύνδεσμος Zoom")
    
    # Επιπλέον ρυθμίσεις Zoom
    assembly_zoom_meeting_id = models.CharField(max_length=50, null=True, blank=True, verbose_name="Meeting ID")
    assembly_zoom_password = models.CharField(max_length=100, null=True, blank=True, verbose_name="Κωδικός Zoom")
    assembly_zoom_waiting_room = models.BooleanField(default=True, verbose_name="Αίθουσα Αναμονής")
    assembly_zoom_participant_video = models.BooleanField(default=False, verbose_name="Βίντεο Συμμετεχόντων")
    assembly_zoom_host_video = models.BooleanField(default=True, verbose_name="Βίντεο Οργανωτή")
    assembly_zoom_mute_on_entry = models.BooleanField(default=True, verbose_name="Σίγαση κατά Είσοδο")
    assembly_zoom_auto_record = models.BooleanField(default=False, verbose_name="Αυτόματη Εγγραφή")
    assembly_zoom_notes = models.TextField(null=True, blank=True, verbose_name="Σημειώσεις Zoom")
    
    # Αποτελέσματα
    selected_contractor = models.CharField(max_length=200, null=True, blank=True, verbose_name="Επιλεγμένος Αναδόχος")
    final_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Τελικό Κόστος"
    )

    # Πεδία πληρωμής
    payment_terms = models.TextField(null=True, blank=True, verbose_name="Όροι Πληρωμής")
    payment_method = models.CharField(max_length=50, null=True, blank=True, verbose_name="Τρόπος Πληρωμής")
    installments = models.PositiveIntegerField(null=True, blank=True, default=1, verbose_name="Αριθμός Δόσεων")
    advance_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Προκαταβολή"
    )
    
    # Στοιχεία δημιουργίας
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Δημιουργήθηκε από")
    
    # Σχέση με financial models
    linked_expense = models.ForeignKey(
        'financial.Expense', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='linked_projects',
        verbose_name="Συνδεδεμένη Δαπάνη"
    )
    
    class Meta:
        verbose_name = "Έργο"
        verbose_name_plural = "Έργα"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.building.name}"


class Offer(models.Model):
    """
    Μοντέλο για τις προσφορές που υποβάλλονται για κάθε έργο
    """
    OFFER_STATUS_CHOICES = [
        ('submitted', 'Υποβλήθηκε'),
        ('under_review', 'Υπό Αξιολόγηση'),
        ('accepted', 'Εγκεκριμένη'),
        ('rejected', 'Απορρίφθηκε'),
        ('withdrawn', 'Ανακλήθηκε'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='offers', verbose_name="Έργο")
    
    # Στοιχεία συνεργείου
    contractor_name = models.CharField(max_length=200, default="", verbose_name="Όνομα Συνεργείου")
    contractor_contact = models.CharField(max_length=200, null=True, blank=True, verbose_name="Στοιχεία Επικοινωνίας")
    contractor_phone = models.CharField(max_length=20, null=True, blank=True, verbose_name="Τηλέφωνο")
    contractor_email = models.EmailField(null=True, blank=True, verbose_name="Email")
    contractor_address = models.TextField(null=True, blank=True, verbose_name="Διεύθυνση")
    
    # Στοιχεία προσφοράς
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Ποσό Προσφοράς"
    )
    description = models.TextField(null=True, blank=True, verbose_name="Περιγραφή Προσφοράς")

    # Πεδία πληρωμής (ευθυγραμμισμένα με τα έργα)
    payment_terms = models.TextField(null=True, blank=True, verbose_name="Όροι Πληρωμής")
    payment_method = models.CharField(max_length=50, null=True, blank=True, verbose_name="Τρόπος Πληρωμής")
    installments = models.PositiveIntegerField(null=True, blank=True, default=1, verbose_name="Αριθμός Δόσεων")
    advance_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Προκαταβολή"
    )

    warranty_period = models.CharField(max_length=100, null=True, blank=True, verbose_name="Περίοδος Εγγύησης")
    completion_time = models.CharField(max_length=100, null=True, blank=True, verbose_name="Χρόνος Ολοκλήρωσης")
    
    # Κατάσταση και ημερομηνίες
    status = models.CharField(
        max_length=20,
        choices=OFFER_STATUS_CHOICES, 
        default='submitted',
        verbose_name="Κατάσταση"
    )
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Υποβολής")
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Αξιολόγησης")
    
    # Στοιχεία αξιολόγησης
    notes = models.TextField(null=True, blank=True, verbose_name="Σημειώσεις")
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Αξιολογήθηκε από")
    
    class Meta:
        verbose_name = "Προσφορά"
        verbose_name_plural = "Προσφορές"
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.contractor_name} - {self.project.title} - €{self.amount}"


class OfferFile(models.Model):
    """
    Μοντέλο για τα αρχεία που συνοδεύουν τις προσφορές
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name='files', verbose_name="Προσφορά")
    
    file = models.FileField(upload_to='offers/%Y/%m/%d/', verbose_name="Αρχείο")
    filename = models.CharField(max_length=255, verbose_name="Όνομα Αρχείου")
    file_type = models.CharField(max_length=50, null=True, blank=True, verbose_name="Τύπος Αρχείου")
    file_size = models.PositiveIntegerField(null=True, blank=True, verbose_name="Μέγεθος Αρχείου")
    
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Ανεβάσματος")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Ανεβάστηκε από")
    
    class Meta:
        verbose_name = "Αρχείο Προσφοράς"
        verbose_name_plural = "Αρχεία Προσφορών"
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.filename} - {self.offer.contractor_name}"


class ProjectVote(models.Model):
    """
    Μοντέλο για τις ψηφοφορίες σχετικά με τα έργα
    """
    VOTE_CHOICES = [
        ('approve', 'Έγκριση'),
        ('reject', 'Απόρριψη'),
        ('abstain', 'Αποχή'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_votes', verbose_name="Έργο")
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, null=True, blank=True, related_name='project_votes', verbose_name="Προσφορά")
    
    # Στοιχεία ψηφοφορίας
    vote_type = models.CharField(max_length=10, choices=VOTE_CHOICES, verbose_name="Τύπος Ψήφου")
    voter_name = models.CharField(max_length=200, verbose_name="Όνομα Ψηφοφόρου")
    apartment = models.CharField(max_length=20, verbose_name="Διαμέρισμα")
    participation_mills = models.PositiveIntegerField(verbose_name="Μοίρες Συμμετοχής")
    
    # Ημερομηνία και σημειώσεις
    voted_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Ψηφοφορίας")
    notes = models.TextField(null=True, blank=True, verbose_name="Σημειώσεις")
    
    class Meta:
        verbose_name = "Ψηφοφορία Έργου"
        verbose_name_plural = "Ψηφοφορίες Έργων"
        unique_together = ['project', 'apartment']  # Ένα διαμέρισμα μπορεί να ψηφίσει μόνο μία φορά
        ordering = ['-voted_at']

    def __str__(self):
        return f"{self.voter_name} ({self.apartment}) - {self.get_vote_type_display()}"


class ProjectExpense(models.Model):
    """
    Μοντέλο για τις δαπάνες που σχετίζονται με τα έργα
    """
    EXPENSE_TYPE_CHOICES = [
        ('material', 'Υλικά'),
        ('labor', 'Εργασία'),
        ('equipment', 'Εξοπλισμός'),
        ('permit', 'Άδεια'),
        ('other', 'Άλλο'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='expenses', verbose_name="Έργο")
    
    description = models.CharField(max_length=200, verbose_name="Περιγραφή")
    expense_type = models.CharField(max_length=20, choices=EXPENSE_TYPE_CHOICES, verbose_name="Τύπος Δαπάνης")
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Ποσό"
    )
    
    # Ημερομηνίες
    expense_date = models.DateField(verbose_name="Ημερομηνία Δαπάνης")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Δημιουργίας")
    
    # Στοιχεία δημιουργίας
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Δημιουργήθηκε από")

    class Meta:
        verbose_name = "Δαπάνη Έργου"
        verbose_name_plural = "Δαπάνες Έργων"
        ordering = ['-expense_date']

    def __str__(self):
        return f"{self.description} - €{self.amount}"
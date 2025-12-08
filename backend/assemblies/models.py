"""
Assembly Management Models
Διαχείριση Γενικών Συνελεύσεων Πολυκατοικιών

Features:
- Δομημένη ατζέντα με time budgeting
- Quorum tracking με μιλέσιμα
- Υβριδική ψηφοφορία (pre-voting + live)
- Αυτόματη δημιουργία πρακτικών
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid

User = get_user_model()


class Assembly(models.Model):
    """
    Γενική Συνέλευση Πολυκατοικίας
    
    Κύριο model που περιέχει όλες τις πληροφορίες για μια συνέλευση:
    - Βασικά στοιχεία (τίτλος, ημερομηνία, τοποθεσία)
    - Quorum tracking
    - Status management
    - Πρακτικά
    """
    
    STATUS_CHOICES = [
        ('draft', 'Προσχέδιο'),
        ('scheduled', 'Προγραμματισμένη'),
        ('convened', 'Συγκληθείσα'),  # Η πρόσκληση έχει σταλεί
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρωμένη'),
        ('cancelled', 'Ακυρωμένη'),
        ('adjourned', 'Αναβλήθηκε'),  # Διεκόπη για συνέχιση αργότερα
    ]
    
    ASSEMBLY_TYPE_CHOICES = [
        ('regular', 'Τακτική'),
        ('extraordinary', 'Έκτακτη'),
        ('continuation', 'Συνέχιση Αναβληθείσας'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(
        'buildings.Building', 
        on_delete=models.CASCADE,
        related_name='assemblies',
        verbose_name="Κτίριο"
    )
    
    # Βασικά στοιχεία
    title = models.CharField(max_length=255, verbose_name="Τίτλος Συνέλευσης")
    assembly_type = models.CharField(
        max_length=20,
        choices=ASSEMBLY_TYPE_CHOICES,
        default='regular',
        verbose_name="Τύπος Συνέλευσης"
    )
    description = models.TextField(blank=True, verbose_name="Περιγραφή/Σκοπός")
    
    # Χρονοδιάγραμμα
    scheduled_date = models.DateField(verbose_name="Ημερομηνία Συνέλευσης")
    scheduled_time = models.TimeField(verbose_name="Ώρα Έναρξης")
    estimated_duration = models.PositiveIntegerField(
        default=60,
        verbose_name="Εκτιμώμενη Διάρκεια (λεπτά)"
    )
    
    # Τοποθεσία - Υβριδική υποστήριξη
    is_physical = models.BooleanField(default=True, verbose_name="Φυσική Παρουσία")
    is_online = models.BooleanField(default=False, verbose_name="Διαδικτυακή Συμμετοχή")
    location = models.CharField(
        max_length=255, 
        blank=True, 
        verbose_name="Τοποθεσία",
        help_text="π.χ. Pilotis, Αίθουσα Α2"
    )
    
    # Online meeting details
    meeting_link = models.URLField(blank=True, verbose_name="Σύνδεσμος Τηλεδιάσκεψης")
    meeting_id = models.CharField(max_length=50, blank=True, verbose_name="Meeting ID")
    meeting_password = models.CharField(max_length=100, blank=True, verbose_name="Κωδικός Meeting")
    
    # Quorum - Απαρτία
    total_building_mills = models.PositiveIntegerField(
        default=1000,
        verbose_name="Συνολικά Μιλέσιμα Κτιρίου"
    )
    required_quorum_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.01'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Απαιτούμενο Ποσοστό Απαρτίας (%)"
    )
    achieved_quorum_mills = models.PositiveIntegerField(
        default=0,
        verbose_name="Επιτευχθέντα Μιλέσιμα"
    )
    quorum_achieved = models.BooleanField(default=False, verbose_name="Επετεύχθη Απαρτία")
    quorum_achieved_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα Επίτευξης Απαρτίας")
    
    # Status & Timing
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Κατάσταση"
    )
    actual_start_time = models.DateTimeField(null=True, blank=True, verbose_name="Πραγματική Ώρα Έναρξης")
    actual_end_time = models.DateTimeField(null=True, blank=True, verbose_name="Πραγματική Ώρα Λήξης")
    
    # Pre-voting settings
    pre_voting_enabled = models.BooleanField(
        default=True,
        verbose_name="Ενεργοποίηση Pre-voting",
        help_text="Επιτρέπει ψηφοφορία πριν τη συνέλευση"
    )
    pre_voting_start_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Έναρξη Pre-voting"
    )
    pre_voting_end_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Λήξη Pre-voting",
        help_text="Συνήθως η ημέρα πριν τη συνέλευση"
    )
    
    # Πρακτικά
    minutes_text = models.TextField(blank=True, verbose_name="Κείμενο Πρακτικών")
    minutes_approved = models.BooleanField(default=False, verbose_name="Εγκρίθηκαν τα Πρακτικά")
    minutes_approved_at = models.DateTimeField(null=True, blank=True, verbose_name="Ημερομηνία Έγκρισης Πρακτικών")
    minutes_approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_assembly_minutes',
        verbose_name="Εγκρίθηκαν από"
    )
    
    # Πρόσκληση/Ανακοίνωση
    invitation_sent = models.BooleanField(default=False, verbose_name="Εστάλη Πρόσκληση")
    invitation_sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα Αποστολής Πρόσκλησης")
    linked_announcement = models.ForeignKey(
        'announcements.Announcement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assemblies',
        verbose_name="Συνδεδεμένη Ανακοίνωση"
    )
    
    # Email Reminder Tracking
    email_initial_sent = models.BooleanField(
        default=False,
        verbose_name="Αρχική Ειδοποίηση Εστάλη",
        help_text="Επόμενη ημέρα από convening"
    )
    email_initial_sent_at = models.DateTimeField(null=True, blank=True)
    
    email_7days_sent = models.BooleanField(
        default=False,
        verbose_name="Υπενθύμιση 7 ημερών"
    )
    email_7days_sent_at = models.DateTimeField(null=True, blank=True)
    
    email_3days_sent = models.BooleanField(
        default=False,
        verbose_name="Υπενθύμιση 3 ημερών"
    )
    email_3days_sent_at = models.DateTimeField(null=True, blank=True)
    
    email_1day_sent = models.BooleanField(
        default=False,
        verbose_name="Υπενθύμιση 1 ημέρας"
    )
    email_1day_sent_at = models.DateTimeField(null=True, blank=True)
    
    email_sameday_sent = models.BooleanField(
        default=False,
        verbose_name="Υπενθύμιση ημέρας συνέλευσης"
    )
    email_sameday_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Σύνδεση με προηγούμενη συνέλευση (για continuation)
    continued_from = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='continuations',
        verbose_name="Συνέχεια από"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_assemblies',
        verbose_name="Δημιουργήθηκε από"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ημερομηνία Δημιουργίας")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Τελευταία Ενημέρωση")

    class Meta:
        app_label = 'assemblies'
        verbose_name = "Γενική Συνέλευση"
        verbose_name_plural = "Γενικές Συνελεύσεις"
        ordering = ['-scheduled_date', '-scheduled_time']

    def __str__(self):
        return f"{self.title} - {self.building.name} ({self.scheduled_date})"

    @property
    def required_quorum_mills(self):
        """Υπολογίζει τα απαιτούμενα μιλέσιμα για απαρτία"""
        return int(self.total_building_mills * self.required_quorum_percentage / 100)
    
    @property
    def quorum_percentage(self):
        """Τρέχον ποσοστό απαρτίας"""
        if self.total_building_mills == 0:
            return Decimal('0')
        return Decimal(self.achieved_quorum_mills * 100) / Decimal(self.total_building_mills)
    
    @property
    def quorum_status(self):
        """Επιστρέφει status απαρτίας: 'achieved', 'close', 'far'"""
        percentage = self.quorum_percentage
        if percentage >= self.required_quorum_percentage:
            return 'achieved'
        elif percentage >= self.required_quorum_percentage - 10:
            return 'close'
        return 'far'
    
    @property
    def total_agenda_duration(self):
        """Συνολικός εκτιμώμενος χρόνος από τα θέματα"""
        return sum(item.estimated_duration for item in self.agenda_items.all())
    
    @property
    def is_upcoming(self):
        """Είναι μελλοντική συνέλευση"""
        from datetime import datetime, date
        today = date.today()
        return self.scheduled_date >= today and self.status in ['draft', 'scheduled', 'convened']
    
    @property
    def is_pre_voting_active(self):
        """Είναι ενεργό το pre-voting"""
        if not self.pre_voting_enabled:
            return False
        today = timezone.now().date()
        start = self.pre_voting_start_date or self.scheduled_date
        end = self.pre_voting_end_date or self.scheduled_date
        return start <= today <= end and self.status in ['scheduled', 'convened']
    
    def check_quorum(self):
        """Ελέγχει και ενημερώνει την απαρτία"""
        total_mills = sum(
            attendee.mills for attendee in self.attendees.filter(is_present=True)
        )
        self.achieved_quorum_mills = total_mills
        
        if total_mills >= self.required_quorum_mills and not self.quorum_achieved:
            self.quorum_achieved = True
            self.quorum_achieved_at = timezone.now()
        
        self.save(update_fields=['achieved_quorum_mills', 'quorum_achieved', 'quorum_achieved_at'])
        return self.quorum_achieved
    
    def start_assembly(self):
        """Ξεκινά τη συνέλευση"""
        self.status = 'in_progress'
        self.actual_start_time = timezone.now()
        self.save(update_fields=['status', 'actual_start_time'])
    
    def end_assembly(self):
        """Τερματίζει τη συνέλευση"""
        self.status = 'completed'
        self.actual_end_time = timezone.now()
        self.save(update_fields=['status', 'actual_end_time'])
    
    def adjourn_assembly(self, continuation_date=None):
        """Αναβάλλει τη συνέλευση για συνέχεια"""
        self.status = 'adjourned'
        self.actual_end_time = timezone.now()
        self.save(update_fields=['status', 'actual_end_time'])
        
        # Optionally create continuation assembly
        if continuation_date:
            return Assembly.objects.create(
                building=self.building,
                title=f"Συνέχεια: {self.title}",
                assembly_type='continuation',
                scheduled_date=continuation_date,
                scheduled_time=self.scheduled_time,
                is_physical=self.is_physical,
                is_online=self.is_online,
                location=self.location,
                meeting_link=self.meeting_link,
                total_building_mills=self.total_building_mills,
                required_quorum_percentage=self.required_quorum_percentage,
                continued_from=self,
                created_by=self.created_by
            )
        return None


class AgendaItem(models.Model):
    """
    Θέμα Ημερήσιας Διάταξης
    
    Κάθε θέμα έχει:
    - Τύπο (ενημερωτικό, συζήτηση, ψηφοφορία)
    - Εκτιμώμενη διάρκεια
    - Σύνδεση με ψηφοφορία (αν χρειάζεται)
    - Απόφαση/Αποτέλεσμα
    """
    
    ITEM_TYPE_CHOICES = [
        ('informational', 'Ενημερωτικό'),
        ('discussion', 'Συζήτηση'),
        ('voting', 'Ψηφοφορία'),
        ('approval', 'Έγκριση'),  # π.χ. έγκριση πρακτικών
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('in_progress', 'Σε Εξέλιξη'),
        ('completed', 'Ολοκληρώθηκε'),
        ('deferred', 'Αναβλήθηκε'),
        ('cancelled', 'Ακυρώθηκε'),
    ]
    
    VOTING_TYPE_CHOICES = [
        ('simple_majority', 'Απλή Πλειοψηφία (>50%)'),
        ('qualified_majority', 'Ειδική Πλειοψηφία (2/3)'),
        ('unanimous', 'Ομοφωνία'),
        ('relative_majority', 'Σχετική Πλειοψηφία'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assembly = models.ForeignKey(
        Assembly, 
        on_delete=models.CASCADE, 
        related_name='agenda_items',
        verbose_name="Συνέλευση"
    )
    
    # Ordering
    order = models.PositiveIntegerField(verbose_name="Σειρά")
    
    # Content
    title = models.CharField(max_length=255, verbose_name="Τίτλος Θέματος")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    item_type = models.CharField(
        max_length=20,
        choices=ITEM_TYPE_CHOICES,
        default='discussion',
        verbose_name="Τύπος Θέματος"
    )
    
    # Time management
    estimated_duration = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(180)],
        verbose_name="Εκτιμώμενη Διάρκεια (λεπτά)"
    )
    actual_duration = models.PositiveIntegerField(
        null=True, 
        blank=True,
        verbose_name="Πραγματική Διάρκεια (λεπτά)"
    )
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα Έναρξης")
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα Λήξης")
    
    # Presenter
    presenter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='presented_agenda_items',
        verbose_name="Εισηγητής"
    )
    presenter_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Όνομα Εισηγητή",
        help_text="Αν ο εισηγητής δεν είναι χρήστης"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Κατάσταση"
    )
    
    # Voting configuration (if item_type == 'voting')
    voting_type = models.CharField(
        max_length=20,
        choices=VOTING_TYPE_CHOICES,
        default='simple_majority',
        verbose_name="Τύπος Ψηφοφορίας"
    )
    allows_pre_voting = models.BooleanField(
        default=True,
        verbose_name="Επιτρέπει Pre-voting"
    )
    
    # Linked Vote - Αυτόματα δημιουργείται για voting items
    linked_vote = models.OneToOneField(
        'votes.Vote',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agenda_item',
        verbose_name="Συνδεδεμένη Ψηφοφορία"
    )
    
    # Linked Project - Αν το θέμα αφορά συγκεκριμένο έργο
    linked_project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agenda_items',
        verbose_name="Συνδεδεμένο Έργο"
    )
    
    # Decision/Resolution
    decision = models.TextField(
        blank=True,
        verbose_name="Απόφαση",
        help_text="Η απόφαση που λήφθηκε για αυτό το θέμα"
    )
    decision_type = models.CharField(
        max_length=20,
        choices=[
            ('approved', 'Εγκρίθηκε'),
            ('rejected', 'Απορρίφθηκε'),
            ('deferred', 'Αναβλήθηκε'),
            ('amended', 'Εγκρίθηκε με Τροποποιήσεις'),
            ('no_decision', 'Χωρίς Απόφαση'),
        ],
        blank=True,
        verbose_name="Τύπος Απόφασης"
    )
    
    # Notes
    discussion_notes = models.TextField(
        blank=True,
        verbose_name="Σημειώσεις Συζήτησης"
    )
    
    # Attachments support
    has_attachments = models.BooleanField(default=False, verbose_name="Έχει Συνημμένα")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assemblies'
        verbose_name = "Θέμα Ημερήσιας Διάταξης"
        verbose_name_plural = "Θέματα Ημερήσιας Διάταξης"
        ordering = ['assembly', 'order']
        unique_together = ['assembly', 'order']

    def __str__(self):
        return f"{self.order}. {self.title}"
    
    @property
    def is_voting_item(self):
        return self.item_type == 'voting'
    
    @property
    def time_status(self):
        """Επιστρέφει 'on_track', 'over_time', 'under_time'"""
        if not self.actual_duration:
            return None
        if self.actual_duration <= self.estimated_duration:
            return 'on_track'
        elif self.actual_duration <= self.estimated_duration * 1.5:
            return 'slightly_over'
        return 'over_time'
    
    def start_item(self):
        """Ξεκινά τη συζήτηση του θέματος"""
        self.status = 'in_progress'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def end_item(self, decision=None, decision_type=None):
        """Ολοκληρώνει το θέμα"""
        self.status = 'completed'
        self.ended_at = timezone.now()
        
        if self.started_at:
            delta = self.ended_at - self.started_at
            self.actual_duration = int(delta.total_seconds() / 60)
        
        if decision:
            self.decision = decision
        if decision_type:
            self.decision_type = decision_type
            
        self.save()
    
    def defer_item(self, reason=''):
        """Αναβάλλει το θέμα"""
        self.status = 'deferred'
        if reason:
            self.discussion_notes = f"{self.discussion_notes}\n\nΛόγος αναβολής: {reason}".strip()
        self.save()


class AgendaItemAttachment(models.Model):
    """Συνημμένα αρχεία σε θέματα ατζέντας"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agenda_item = models.ForeignKey(
        AgendaItem,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name="Θέμα"
    )
    
    file = models.FileField(
        upload_to='assemblies/attachments/%Y/%m/',
        verbose_name="Αρχείο"
    )
    filename = models.CharField(max_length=255, verbose_name="Όνομα Αρχείου")
    file_type = models.CharField(max_length=50, blank=True, verbose_name="Τύπος")
    file_size = models.PositiveIntegerField(null=True, blank=True, verbose_name="Μέγεθος (bytes)")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="Ανέβηκε από"
    )
    
    class Meta:
        app_label = 'assemblies'
        verbose_name = "Συνημμένο Θέματος"
        verbose_name_plural = "Συνημμένα Θεμάτων"
        ordering = ['uploaded_at']
    
    def __str__(self):
        return self.filename


class AssemblyAttendee(models.Model):
    """
    Παρόντες στη Συνέλευση
    
    Καταγράφει:
    - Ποιος παρευρέθηκε
    - Με ποιον τρόπο (φυσικά, online, proxy)
    - Πόσα μιλέσιμα εκπροσωπεί
    - RSVP status
    """
    
    ATTENDANCE_TYPE_CHOICES = [
        ('in_person', 'Φυσική Παρουσία'),
        ('online', 'Διαδικτυακά'),
        ('proxy', 'Με Εξουσιοδότηση'),
        ('pre_vote_only', 'Μόνο Pre-voting'),
    ]
    
    RSVP_STATUS_CHOICES = [
        ('pending', 'Αναμένεται'),
        ('attending', 'Θα Παρευρεθεί'),
        ('not_attending', 'Δεν θα Παρευρεθεί'),
        ('maybe', 'Ίσως'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assembly = models.ForeignKey(
        Assembly,
        on_delete=models.CASCADE,
        related_name='attendees',
        verbose_name="Συνέλευση"
    )
    apartment = models.ForeignKey(
        'apartments.Apartment',
        on_delete=models.CASCADE,
        related_name='assembly_attendances',
        verbose_name="Διαμέρισμα"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assembly_attendances',
        verbose_name="Χρήστης"
    )
    
    # Mills
    mills = models.PositiveIntegerField(verbose_name="Μιλέσιμα")
    
    # RSVP
    rsvp_status = models.CharField(
        max_length=20,
        choices=RSVP_STATUS_CHOICES,
        default='pending',
        verbose_name="RSVP"
    )
    rsvp_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα RSVP")
    rsvp_notes = models.TextField(blank=True, verbose_name="Σημειώσεις RSVP")
    
    # Attendance
    attendance_type = models.CharField(
        max_length=20,
        choices=ATTENDANCE_TYPE_CHOICES,
        blank=True,
        verbose_name="Τύπος Παρουσίας"
    )
    is_present = models.BooleanField(default=False, verbose_name="Παρών")
    checked_in_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα Check-in")
    checked_out_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα Αποχώρησης")
    
    # Proxy information
    is_proxy = models.BooleanField(default=False, verbose_name="Είναι Εξουσιοδότηση")
    proxy_from_apartment = models.ForeignKey(
        'apartments.Apartment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='proxy_given_to',
        verbose_name="Εξουσιοδότηση από"
    )
    proxy_document = models.FileField(
        upload_to='assemblies/proxies/%Y/%m/',
        blank=True,
        verbose_name="Έγγραφο Εξουσιοδότησης"
    )
    
    # Pre-voting
    has_pre_voted = models.BooleanField(default=False, verbose_name="Έχει Pre-voted")
    pre_voted_at = models.DateTimeField(null=True, blank=True, verbose_name="Ώρα Pre-vote")
    
    # Contact info (για όσους δεν είναι users)
    attendee_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Όνομα Παρόντος",
        help_text="Αν δεν είναι εγγεγραμμένος χρήστης"
    )
    attendee_phone = models.CharField(max_length=20, blank=True, verbose_name="Τηλέφωνο")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assemblies'
        verbose_name = "Παρών Συνέλευσης"
        verbose_name_plural = "Παρόντες Συνέλευσης"
        unique_together = ['assembly', 'apartment']
        ordering = ['apartment__number']

    def __str__(self):
        name = self.attendee_name or (self.user.get_full_name() if self.user else str(self.apartment))
        return f"{name} - {self.apartment}"
    
    @property
    def display_name(self):
        """Επιστρέφει το όνομα για εμφάνιση"""
        if self.attendee_name:
            return self.attendee_name
        if self.user:
            return self.user.get_full_name() or self.user.email
        return str(self.apartment)
    
    def check_in(self, attendance_type='in_person'):
        """Check-in του παρόντος"""
        self.is_present = True
        self.attendance_type = attendance_type
        self.checked_in_at = timezone.now()
        self.save(update_fields=['is_present', 'attendance_type', 'checked_in_at'])
        
        # Update assembly quorum
        self.assembly.check_quorum()
    
    def check_out(self):
        """Check-out του παρόντος"""
        self.is_present = False
        self.checked_out_at = timezone.now()
        self.save(update_fields=['is_present', 'checked_out_at'])
        
        # Update assembly quorum
        self.assembly.check_quorum()
    
    def rsvp(self, status, notes=''):
        """RSVP response"""
        self.rsvp_status = status
        self.rsvp_at = timezone.now()
        if notes:
            self.rsvp_notes = notes
        self.save(update_fields=['rsvp_status', 'rsvp_at', 'rsvp_notes'])
    
    @property
    def has_completed_voting(self) -> bool:
        """
        Ελέγχει αν ο συμμετέχων έχει ψηφίσει σε όλα τα θέματα ψηφοφορίας.
        Χρησιμοποιείται για εξαίρεση από υπενθυμίσεις email.
        """
        # Get all voting items that allow pre-voting
        voting_items = self.assembly.agenda_items.filter(
            item_type='voting',
            allows_pre_voting=True
        )
        
        if not voting_items.exists():
            return False  # No voting items = not "completed"
        
        # Get voted item IDs
        voted_item_ids = self.votes.values_list('agenda_item_id', flat=True)
        
        # Check if all voting items have been voted on
        return all(item.id in voted_item_ids for item in voting_items)
    
    @property
    def pending_votes_count(self) -> int:
        """Αριθμός θεμάτων που δεν έχει ψηφίσει ακόμα"""
        voting_items = self.assembly.agenda_items.filter(
            item_type='voting',
            allows_pre_voting=True
        )
        voted_item_ids = set(self.votes.values_list('agenda_item_id', flat=True))
        return sum(1 for item in voting_items if item.id not in voted_item_ids)


class AssemblyVote(models.Model):
    """
    Ψήφος σε θέμα συνέλευσης
    
    Υποστηρίζει:
    - Pre-voting (πριν τη συνέλευση)
    - Live voting (κατά τη συνέλευση)
    - Proxy voting (με εξουσιοδότηση)
    """
    
    VOTE_CHOICES = [
        ('approve', 'Υπέρ'),
        ('reject', 'Κατά'),
        ('abstain', 'Λευκό'),
    ]
    
    VOTE_SOURCE_CHOICES = [
        ('pre_vote', 'Pre-voting'),
        ('live', 'Κατά τη Συνέλευση'),
        ('proxy', 'Με Εξουσιοδότηση'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agenda_item = models.ForeignKey(
        AgendaItem,
        on_delete=models.CASCADE,
        related_name='assembly_votes',
        verbose_name="Θέμα"
    )
    attendee = models.ForeignKey(
        AssemblyAttendee,
        on_delete=models.CASCADE,
        related_name='votes',
        verbose_name="Ψηφοφόρος"
    )
    
    vote = models.CharField(
        max_length=10,
        choices=VOTE_CHOICES,
        verbose_name="Ψήφος"
    )
    mills = models.PositiveIntegerField(verbose_name="Μιλέσιμα Ψήφου")
    
    vote_source = models.CharField(
        max_length=10,
        choices=VOTE_SOURCE_CHOICES,
        default='live',
        verbose_name="Πηγή Ψήφου"
    )
    
    # Για proxy votes
    voted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='proxy_votes_cast',
        verbose_name="Ψήφισε αντί του"
    )
    
    notes = models.TextField(blank=True, verbose_name="Σημειώσεις")
    voted_at = models.DateTimeField(auto_now_add=True, verbose_name="Ώρα Ψήφου")

    class Meta:
        app_label = 'assemblies'
        verbose_name = "Ψήφος Συνέλευσης"
        verbose_name_plural = "Ψήφοι Συνέλευσης"
        unique_together = ['agenda_item', 'attendee']
        ordering = ['voted_at']

    def __str__(self):
        return f"{self.attendee} - {self.get_vote_display()} ({self.mills} μιλέσιμα)"


class AssemblyMinutesTemplate(models.Model):
    """
    Template για πρακτικά συνέλευσης
    Επιτρέπει διαφορετικά templates ανά tenant ή κτίριο
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Όνομα Template")
    description = models.TextField(blank=True, verbose_name="Περιγραφή")
    
    # Template content με placeholders
    header_template = models.TextField(
        verbose_name="Header Template",
        help_text="Placeholders: {building_name}, {assembly_date}, {assembly_time}, {location}"
    )
    agenda_item_template = models.TextField(
        verbose_name="Agenda Item Template",
        help_text="Placeholders: {order}, {title}, {description}, {decision}, {vote_results}"
    )
    attendees_template = models.TextField(
        verbose_name="Attendees Template",
        help_text="Placeholders: {attendees_list}, {total_mills}, {quorum_percentage}"
    )
    footer_template = models.TextField(
        verbose_name="Footer Template",
        help_text="Placeholders: {end_time}, {secretary_name}, {chairman_name}"
    )
    
    is_default = models.BooleanField(default=False, verbose_name="Προεπιλεγμένο")
    building = models.ForeignKey(
        'buildings.Building',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='minutes_templates',
        verbose_name="Κτίριο"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assemblies'
        verbose_name = "Template Πρακτικών"
        verbose_name_plural = "Templates Πρακτικών"
        ordering = ['-is_default', 'name']

    def __str__(self):
        return self.name

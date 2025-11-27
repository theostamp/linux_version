# backend/office_staff/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.conf import settings


class OfficeStaffPermissions(models.Model):
    """
    Permissions για υπαλλήλους γραφείου διαχείρισης.
    Κάθε υπάλληλος έχει ένα σετ από permissions που ορίζει ο Office Manager.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='staff_permissions',
        verbose_name=_('Υπάλληλος'),
        help_text=_('Ο χρήστης που ανήκουν αυτά τα permissions')
    )
    
    # Θέση εργασίας
    job_title = models.CharField(
        _('Θέση Εργασίας'),
        max_length=100,
        blank=True,
        help_text=_('π.χ. Λογιστήριο, Γραμματεία, Τεχνικός')
    )
    
    # Οικονομικά Permissions
    can_view_financials = models.BooleanField(
        _('Προβολή Οικονομικών'),
        default=True,
        help_text=_('Μπορεί να βλέπει οικονομικά στοιχεία')
    )
    can_record_payments = models.BooleanField(
        _('Καταχώρηση Πληρωμών'),
        default=False,
        help_text=_('Μπορεί να καταχωρεί πληρωμές')
    )
    can_create_expenses = models.BooleanField(
        _('Δημιουργία Δαπανών'),
        default=False,
        help_text=_('Μπορεί να δημιουργεί δαπάνες')
    )
    can_edit_expenses = models.BooleanField(
        _('Επεξεργασία Δαπανών'),
        default=False,
        help_text=_('Μπορεί να επεξεργάζεται δαπάνες')
    )
    
    # Ανακοινώσεις & Επικοινωνία
    can_create_announcements = models.BooleanField(
        _('Δημιουργία Ανακοινώσεων'),
        default=False,
        help_text=_('Μπορεί να δημιουργεί ανακοινώσεις')
    )
    can_send_notifications = models.BooleanField(
        _('Αποστολή Ειδοποιήσεων'),
        default=False,
        help_text=_('Μπορεί να στέλνει ειδοποιήσεις')
    )
    
    # Αιτήματα & Συντήρηση
    can_manage_requests = models.BooleanField(
        _('Διαχείριση Αιτημάτων'),
        default=True,
        help_text=_('Μπορεί να διαχειρίζεται αιτήματα συντήρησης')
    )
    can_manage_maintenance = models.BooleanField(
        _('Διαχείριση Συντήρησης'),
        default=False,
        help_text=_('Μπορεί να διαχειρίζεται εργασίες συντήρησης')
    )
    
    # Κτίρια & Διαμερίσματα
    can_view_apartments = models.BooleanField(
        _('Προβολή Διαμερισμάτων'),
        default=True,
        help_text=_('Μπορεί να βλέπει πληροφορίες διαμερισμάτων')
    )
    can_edit_apartments = models.BooleanField(
        _('Επεξεργασία Διαμερισμάτων'),
        default=False,
        help_text=_('Μπορεί να επεξεργάζεται πληροφορίες διαμερισμάτων')
    )
    
    # Χρήστες
    can_view_residents = models.BooleanField(
        _('Προβολή Ενοίκων'),
        default=True,
        help_text=_('Μπορεί να βλέπει πληροφορίες ενοίκων')
    )
    can_invite_residents = models.BooleanField(
        _('Πρόσκληση Ενοίκων'),
        default=False,
        help_text=_('Μπορεί να προσκαλεί ενοίκους στην πλατφόρμα')
    )
    
    # Έγγραφα
    can_upload_documents = models.BooleanField(
        _('Ανέβασμα Εγγράφων'),
        default=False,
        help_text=_('Μπορεί να ανεβάζει έγγραφα')
    )
    can_delete_documents = models.BooleanField(
        _('Διαγραφή Εγγράφων'),
        default=False,
        help_text=_('Μπορεί να διαγράφει έγγραφα')
    )
    
    # Ενεργός υπάλληλος
    is_active = models.BooleanField(
        _('Ενεργός'),
        default=True,
        help_text=_('Αν ο υπάλληλος είναι ενεργός')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('Δημιουργήθηκε'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Ενημερώθηκε'), auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_staff_permissions',
        verbose_name=_('Δημιουργήθηκε από')
    )
    
    class Meta:
        app_label = 'office_staff'
        verbose_name = _('Δικαιώματα Υπαλλήλου')
        verbose_name_plural = _('Δικαιώματα Υπαλλήλων')
        ordering = ['user__last_name', 'user__first_name']
    
    def __str__(self):
        return f"Permissions για {self.user.get_full_name() or self.user.email}"


class ActivityLog(models.Model):
    """
    Καταγραφή δραστηριοτήτων χρηστών για audit trail.
    Αυτό το log είναι read-only και δεν μπορεί να τροποποιηθεί ή διαγραφεί.
    """
    
    class ActionType(models.TextChoices):
        # Authentication
        LOGIN = 'login', _('Σύνδεση')
        LOGOUT = 'logout', _('Αποσύνδεση')
        LOGIN_FAILED = 'login_failed', _('Αποτυχημένη σύνδεση')
        
        # Financial
        PAYMENT_CREATE = 'payment_create', _('Δημιουργία πληρωμής')
        PAYMENT_EDIT = 'payment_edit', _('Επεξεργασία πληρωμής')
        PAYMENT_DELETE = 'payment_delete', _('Διαγραφή πληρωμής')
        EXPENSE_CREATE = 'expense_create', _('Δημιουργία δαπάνης')
        EXPENSE_EDIT = 'expense_edit', _('Επεξεργασία δαπάνης')
        EXPENSE_DELETE = 'expense_delete', _('Διαγραφή δαπάνης')
        
        # Announcements
        ANNOUNCEMENT_CREATE = 'announcement_create', _('Δημιουργία ανακοίνωσης')
        ANNOUNCEMENT_EDIT = 'announcement_edit', _('Επεξεργασία ανακοίνωσης')
        ANNOUNCEMENT_DELETE = 'announcement_delete', _('Διαγραφή ανακοίνωσης')
        
        # Requests
        REQUEST_CREATE = 'request_create', _('Δημιουργία αιτήματος')
        REQUEST_EDIT = 'request_edit', _('Επεξεργασία αιτήματος')
        REQUEST_DELETE = 'request_delete', _('Διαγραφή αιτήματος')
        REQUEST_STATUS_CHANGE = 'request_status', _('Αλλαγή κατάστασης αιτήματος')
        
        # Apartments
        APARTMENT_EDIT = 'apartment_edit', _('Επεξεργασία διαμερίσματος')
        
        # Users
        USER_CREATE = 'user_create', _('Δημιουργία χρήστη')
        USER_EDIT = 'user_edit', _('Επεξεργασία χρήστη')
        USER_DELETE = 'user_delete', _('Διαγραφή χρήστη')
        USER_INVITE = 'user_invite', _('Πρόσκληση χρήστη')
        
        # Staff
        STAFF_CREATE = 'staff_create', _('Δημιουργία υπαλλήλου')
        STAFF_EDIT = 'staff_edit', _('Επεξεργασία υπαλλήλου')
        STAFF_DELETE = 'staff_delete', _('Απενεργοποίηση υπαλλήλου')
        STAFF_PERMISSIONS_CHANGE = 'staff_permissions', _('Αλλαγή δικαιωμάτων υπαλλήλου')
        
        # Documents
        DOCUMENT_UPLOAD = 'document_upload', _('Ανέβασμα εγγράφου')
        DOCUMENT_DELETE = 'document_delete', _('Διαγραφή εγγράφου')
        
        # Other
        DATA_EXPORT = 'data_export', _('Εξαγωγή δεδομένων')
        SETTINGS_CHANGE = 'settings_change', _('Αλλαγή ρυθμίσεων')
        OTHER = 'other', _('Άλλο')
    
    class Severity(models.TextChoices):
        INFO = 'info', _('Πληροφορία')
        WARNING = 'warning', _('Προειδοποίηση')
        ERROR = 'error', _('Σφάλμα')
        CRITICAL = 'critical', _('Κρίσιμο')
    
    # Ποιος έκανε την ενέργεια
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activity_logs',
        verbose_name=_('Χρήστης')
    )
    user_email = models.EmailField(
        _('Email Χρήστη'),
        help_text=_('Αποθηκεύεται ξεχωριστά για ιστορικούς λόγους')
    )
    user_role = models.CharField(
        _('Ρόλος Χρήστη'),
        max_length=50,
        blank=True
    )
    
    # Τι έκανε
    action = models.CharField(
        _('Ενέργεια'),
        max_length=50,
        choices=ActionType.choices
    )
    action_description = models.TextField(
        _('Περιγραφή Ενέργειας'),
        blank=True
    )
    
    # Σε τι αντικείμενο
    target_model = models.CharField(
        _('Μοντέλο'),
        max_length=100,
        blank=True,
        help_text=_('Το μοντέλο στο οποίο έγινε η ενέργεια')
    )
    target_id = models.PositiveIntegerField(
        _('ID Αντικειμένου'),
        null=True,
        blank=True
    )
    target_description = models.CharField(
        _('Περιγραφή Αντικειμένου'),
        max_length=255,
        blank=True
    )
    
    # Σε ποιο κτίριο (αν applicable)
    building_id = models.PositiveIntegerField(
        _('ID Κτιρίου'),
        null=True,
        blank=True
    )
    building_name = models.CharField(
        _('Όνομα Κτιρίου'),
        max_length=255,
        blank=True
    )
    
    # Επιπλέον δεδομένα (JSON)
    extra_data = models.JSONField(
        _('Επιπλέον Δεδομένα'),
        default=dict,
        blank=True,
        help_text=_('Επιπλέον δεδομένα σε μορφή JSON')
    )
    
    # Τεχνικά στοιχεία
    ip_address = models.GenericIPAddressField(
        _('IP Διεύθυνση'),
        null=True,
        blank=True
    )
    user_agent = models.TextField(
        _('User Agent'),
        blank=True
    )
    
    # Severity
    severity = models.CharField(
        _('Σοβαρότητα'),
        max_length=20,
        choices=Severity.choices,
        default=Severity.INFO
    )
    
    # Timestamp
    created_at = models.DateTimeField(
        _('Ημερομηνία'),
        default=timezone.now,
        db_index=True
    )
    
    class Meta:
        app_label = 'office_staff'
        verbose_name = _('Καταγραφή Δραστηριότητας')
        verbose_name_plural = _('Καταγραφές Δραστηριοτήτων')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['building_id', 'created_at']),
            models.Index(fields=['target_model', 'target_id']),
        ]
        # Prevent modifications to the log
        permissions = [
            ('view_all_activity_logs', 'Can view all activity logs'),
        ]
    
    def __str__(self):
        return f"{self.user_email} - {self.get_action_display()} - {self.created_at}"
    
    def save(self, *args, **kwargs):
        # Αν είναι νέο record, επιτρέπεται η αποθήκευση
        # Αν είναι update, δεν επιτρέπεται (το log είναι immutable)
        if self.pk:
            raise ValueError("Τα Activity Logs δεν μπορούν να τροποποιηθούν")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Δεν επιτρέπεται η διαγραφή
        raise ValueError("Τα Activity Logs δεν μπορούν να διαγραφούν")
    
    @classmethod
    def log(cls, user, action, description='', target_model='', target_id=None,
            target_description='', building_id=None, building_name='',
            extra_data=None, ip_address=None, user_agent='', severity='info'):
        """
        Helper method για εύκολη δημιουργία log entries.
        """
        return cls.objects.create(
            user=user,
            user_email=user.email if user else 'unknown',
            user_role=user.role if user and hasattr(user, 'role') else '',
            action=action,
            action_description=description,
            target_model=target_model,
            target_id=target_id,
            target_description=target_description,
            building_id=building_id,
            building_name=building_name,
            extra_data=extra_data or {},
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity
        )

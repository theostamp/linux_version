from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from buildings.models import Building

User = get_user_model()


class ChatRoom(models.Model):
    """
    Chat room για κάθε κτίριο.
    Κάθε κτίριο έχει ένα chat room όπου μπορούν να συνομιλούν κατοίκοι και διαχειριστές.
    """
    building = models.OneToOneField(
        Building,
        on_delete=models.CASCADE,
        related_name='chat_room',
        verbose_name=_("Κτίριο")
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Όνομα Chat Room"),
        help_text=_("Όνομα του chat room (συνήθως το όνομα του κτιρίου)")
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Ενεργό"),
        help_text=_("Αν το chat room είναι ενεργό")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Chat Room")
        verbose_name_plural = _("Chat Rooms")

    def __str__(self):
        return f"Chat Room: {self.building.name}"

    @property
    def room_name(self):
        """Επιστρέφει το όνομα του room για WebSocket"""
        return f"chat_{self.building.id}"


class ChatMessage(models.Model):
    """
    Μήνυμα στο chat room.
    """
    MESSAGE_TYPES = [
        ('text', _('Κείμενο')),
        ('image', _('Εικόνα')),
        ('file', _('Αρχείο')),
        ('system', _('Σύστημα')),
    ]

    chat_room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_("Chat Room")
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_messages',
        verbose_name=_("Αποστολέας")
    )
    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPES,
        default='text',
        verbose_name=_("Τύπος Μηνύματος")
    )
    content = models.TextField(
        verbose_name=_("Περιεχόμενο"),
        help_text=_("Το περιεχόμενο του μηνύματος")
    )
    file_url = models.URLField(
        blank=True,
        null=True,
        verbose_name=_("URL Αρχείου"),
        help_text=_("URL για εικόνες ή αρχεία")
    )
    file_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Όνομα Αρχείου")
    )
    file_size = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name=_("Μέγεθος Αρχείου (bytes)")
    )
    is_edited = models.BooleanField(
        default=False,
        verbose_name=_("Επεξεργασμένο"),
        help_text=_("Αν το μήνυμα έχει επεξεργαστεί")
    )
    edited_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Ημερομηνία Επεξεργασίας")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Chat Message")
        verbose_name_plural = _("Chat Messages")
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.get_full_name()}: {self.content[:50]}..."

    @property
    def sender_name(self):
        """Επιστρέφει το όνομα του αποστολέα"""
        return self.sender.get_full_name() or self.sender.email

    @property
    def sender_role(self):
        """Επιστρέφει τον ρόλο του αποστολέα στο κτίριο"""
        if self.sender.is_manager_of(self.chat_room.building):
            return "manager"
        elif self.sender.is_resident_of(self.chat_room.building):
            return "resident"
        else:
            return "other"


class ChatParticipant(models.Model):
    """
    Συμμετέχοντες στο chat room με επιπλέον πληροφορίες.
    """
    chat_room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='participants',
        verbose_name=_("Chat Room")
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_participations',
        verbose_name=_("Χρήστης")
    )
    is_online = models.BooleanField(
        default=False,
        verbose_name=_("Συνδεδεμένος")
    )
    last_seen = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Τελευταία Εμφάνιση")
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Chat Participant")
        verbose_name_plural = _("Chat Participants")
        unique_together = ['chat_room', 'user']

    def __str__(self):
        return f"{self.user.get_full_name()} in {self.chat_room.building.name}"


class ChatNotification(models.Model):
    """
    Ειδοποιήσεις για μη διαβασμένα μηνύματα.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_notifications',
        verbose_name=_("Χρήστης")
    )
    chat_room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_("Chat Room")
    )
    unread_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Αριθμός Μη Διαβασμένων")
    )
    last_read_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Τελευταία Ανάγνωση")
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Chat Notification")
        verbose_name_plural = _("Chat Notifications")
        unique_together = ['user', 'chat_room']

    def __str__(self):
        return f"{self.user.get_full_name()}: {self.unread_count} unread in {self.chat_room.building.name}" 
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
    # Reply/Quote functionality
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name=_("Απάντηση σε"),
        help_text=_("Το μήνυμα στο οποίο απαντά αυτό το μήνυμα")
    )
    # Edit/Delete functionality
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
    is_deleted = models.BooleanField(
        default=False,
        verbose_name=_("Διαγραμμένο"),
        help_text=_("Soft delete - το μήνυμα εμφανίζεται ως διαγραμμένο")
    )
    deleted_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Ημερομηνία Διαγραφής")
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


class DirectConversation(models.Model):
    """
    Ιδιωτική συνομιλία μεταξύ δύο χρηστών.
    """
    participant_one = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_one',
        verbose_name=_("Συμμετέχων 1")
    )
    participant_two = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_two',
        verbose_name=_("Συμμετέχων 2")
    )
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='direct_conversations',
        verbose_name=_("Κτίριο"),
        help_text=_("Κτίριο στο οποίο ξεκίνησε η συνομιλία (για context)")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Direct Conversation")
        verbose_name_plural = _("Direct Conversations")
        unique_together = ['participant_one', 'participant_two', 'building']
        ordering = ['-updated_at']

    def __str__(self):
        return f"DM: {self.participant_one.get_full_name()} ↔ {self.participant_two.get_full_name()}"

    @classmethod
    def get_or_create_conversation(cls, user1, user2, building):
        """
        Βρίσκει ή δημιουργεί συνομιλία μεταξύ δύο χρηστών.
        Εξασφαλίζει ότι η σειρά των χρηστών δεν δημιουργεί duplicates.
        """
        # Sort users by ID to ensure consistent ordering
        if user1.id > user2.id:
            user1, user2 = user2, user1
        
        conversation, created = cls.objects.get_or_create(
            participant_one=user1,
            participant_two=user2,
            building=building
        )
        return conversation, created

    def get_other_participant(self, user):
        """Επιστρέφει τον άλλο συμμετέχοντα της συνομιλίας."""
        if self.participant_one == user:
            return self.participant_two
        return self.participant_one

    def has_participant(self, user):
        """Ελέγχει αν ο χρήστης συμμετέχει στη συνομιλία."""
        return self.participant_one == user or self.participant_two == user


class DirectMessage(models.Model):
    """
    Ιδιωτικό μήνυμα μεταξύ δύο χρηστών.
    """
    MESSAGE_TYPES = [
        ('text', _('Κείμενο')),
        ('image', _('Εικόνα')),
        ('file', _('Αρχείο')),
    ]

    conversation = models.ForeignKey(
        DirectConversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_("Συνομιλία")
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_direct_messages',
        verbose_name=_("Αποστολέας")
    )
    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPES,
        default='text',
        verbose_name=_("Τύπος Μηνύματος")
    )
    content = models.TextField(
        verbose_name=_("Περιεχόμενο")
    )
    file_url = models.URLField(
        blank=True,
        null=True,
        verbose_name=_("URL Αρχείου")
    )
    file_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Όνομα Αρχείου")
    )
    # Reply functionality
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name=_("Απάντηση σε")
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name=_("Διαβάστηκε")
    )
    read_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Ημερομηνία Ανάγνωσης")
    )
    is_edited = models.BooleanField(
        default=False,
        verbose_name=_("Επεξεργασμένο")
    )
    edited_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Ημερομηνία Επεξεργασίας")
    )
    is_deleted = models.BooleanField(
        default=False,
        verbose_name=_("Διαγραμμένο")
    )
    deleted_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Ημερομηνία Διαγραφής")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Direct Message")
        verbose_name_plural = _("Direct Messages")
        ordering = ['created_at']

    def __str__(self):
        return f"DM from {self.sender.get_full_name()}: {self.content[:30]}..."

    @property
    def recipient(self):
        """Επιστρέφει τον παραλήπτη του μηνύματος."""
        return self.conversation.get_other_participant(self.sender)

    def mark_as_read(self):
        """Σήμανση του μηνύματος ως διαβασμένο."""
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class OnlineStatus(models.Model):
    """
    Κατάσταση σύνδεσης χρήστη (global, όχι per-room).
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='online_status',
        verbose_name=_("Χρήστης")
    )
    is_online = models.BooleanField(
        default=False,
        verbose_name=_("Συνδεδεμένος")
    )
    last_activity = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Τελευταία Δραστηριότητα")
    )
    status_message = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_("Μήνυμα Κατάστασης"),
        help_text=_("Π.χ. 'Διαθέσιμος', 'Απασχολημένος', κλπ.")
    )

    class Meta:
        verbose_name = _("Online Status")
        verbose_name_plural = _("Online Statuses")

    def __str__(self):
        status = "Online" if self.is_online else "Offline"
        return f"{self.user.get_full_name()}: {status}"

    @classmethod
    def get_online_users_for_building(cls, building):
        """
        Επιστρέφει τους online χρήστες για ένα κτίριο.
        Περιλαμβάνει managers και residents.
        """
        from django.db.models import Q
        from apartments.models import Membership
        
        # Get manager IDs
        manager_ids = building.managers.values_list('id', flat=True)
        
        # Get resident IDs
        resident_ids = Membership.objects.filter(
            building=building
        ).values_list('user_id', flat=True)
        
        # Combine and get online users
        user_ids = list(manager_ids) + list(resident_ids)
        
        return cls.objects.filter(
            user_id__in=user_ids,
            is_online=True
        ).select_related('user')


class MessageReaction(models.Model):
    """
    Emoji reaction σε μήνυμα.
    Κάθε χρήστης μπορεί να έχει μία αντίδραση ανά emoji ανά μήνυμα.
    """
    COMMON_EMOJIS = [
        ('👍', 'thumbs_up'),
        ('❤️', 'heart'),
        ('😂', 'laugh'),
        ('😮', 'wow'),
        ('😢', 'sad'),
        ('🎉', 'celebrate'),
        ('👏', 'clap'),
        ('🔥', 'fire'),
    ]

    message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        related_name='reactions',
        verbose_name=_("Μήνυμα")
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_reactions',
        verbose_name=_("Χρήστης")
    )
    emoji = models.CharField(
        max_length=10,
        verbose_name=_("Emoji"),
        help_text=_("Το emoji της αντίδρασης")
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Message Reaction")
        verbose_name_plural = _("Message Reactions")
        unique_together = ['message', 'user', 'emoji']
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.get_full_name()} reacted {self.emoji} to message {self.message.id}"


class DirectMessageReaction(models.Model):
    """
    Emoji reaction σε ιδιωτικό μήνυμα.
    """
    message = models.ForeignKey(
        DirectMessage,
        on_delete=models.CASCADE,
        related_name='reactions',
        verbose_name=_("Μήνυμα")
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='dm_reactions',
        verbose_name=_("Χρήστης")
    )
    emoji = models.CharField(
        max_length=10,
        verbose_name=_("Emoji")
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Direct Message Reaction")
        verbose_name_plural = _("Direct Message Reactions")
        unique_together = ['message', 'user', 'emoji']
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.get_full_name()} reacted {self.emoji}"


class PushSubscription(models.Model):
    """
    Web Push subscription για ειδοποιήσεις.
    Αποθηκεύει τα subscription details για κάθε χρήστη/συσκευή.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
        verbose_name=_("Χρήστης")
    )
    endpoint = models.TextField(
        verbose_name=_("Endpoint URL"),
        help_text=_("Push service endpoint URL")
    )
    p256dh = models.CharField(
        max_length=255,
        verbose_name=_("P256DH Key"),
        help_text=_("Client public key for encryption")
    )
    auth = models.CharField(
        max_length=255,
        verbose_name=_("Auth Secret"),
        help_text=_("Authentication secret")
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name=_("User Agent"),
        help_text=_("Browser user agent string")
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Ενεργό"),
        help_text=_("Αν το subscription είναι ακόμα ενεργό")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Push Subscription")
        verbose_name_plural = _("Push Subscriptions")
        unique_together = ['user', 'endpoint']

    def __str__(self):
        return f"Push subscription for {self.user.get_full_name()}"


class ChatNotificationPreference(models.Model):
    """
    Προτιμήσεις ειδοποιήσεων χρήστη για chat.
    """
    NOTIFICATION_TYPES = [
        ('all', _('Όλα τα μηνύματα')),
        ('mentions', _('Μόνο αναφορές')),
        ('dm_only', _('Μόνο ιδιωτικά μηνύματα')),
        ('none', _('Καμία ειδοποίηση')),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='chat_notification_preferences',
        verbose_name=_("Χρήστης")
    )
    chat_notifications = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        default='all',
        verbose_name=_("Ειδοποιήσεις Chat"),
        help_text=_("Πότε να λαμβάνετε ειδοποιήσεις για μηνύματα")
    )
    dm_notifications = models.BooleanField(
        default=True,
        verbose_name=_("Ειδοποιήσεις Ιδιωτικών"),
        help_text=_("Λήψη ειδοποιήσεων για ιδιωτικά μηνύματα")
    )
    sound_enabled = models.BooleanField(
        default=True,
        verbose_name=_("Ήχος"),
        help_text=_("Αναπαραγωγή ήχου για νέα μηνύματα")
    )
    quiet_hours_start = models.TimeField(
        blank=True,
        null=True,
        verbose_name=_("Ώρα Έναρξης Ησυχίας"),
        help_text=_("Από ποια ώρα να μην στέλνονται ειδοποιήσεις")
    )
    quiet_hours_end = models.TimeField(
        blank=True,
        null=True,
        verbose_name=_("Ώρα Λήξης Ησυχίας"),
        help_text=_("Μέχρι ποια ώρα να μην στέλνονται ειδοποιήσεις")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Chat Notification Preference")
        verbose_name_plural = _("Chat Notification Preferences")

    def __str__(self):
        return f"Chat notification preferences for {self.user.get_full_name()}"

    def should_notify(self):
        """
        Ελέγχει αν πρέπει να σταλεί ειδοποίηση βάσει quiet hours.
        """
        from datetime import datetime
        
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return True
        
        current_time = datetime.now().time()
        
        if self.quiet_hours_start <= self.quiet_hours_end:
            # Normal case: e.g., 22:00 - 08:00
            return not (self.quiet_hours_start <= current_time <= self.quiet_hours_end)
        else:
            # Overnight case: e.g., 22:00 - 08:00 the next day
            return self.quiet_hours_end <= current_time <= self.quiet_hours_start
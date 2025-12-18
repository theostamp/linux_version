from rest_framework import serializers
from .models import (
    ChatRoom, ChatMessage, ChatParticipant, ChatNotification,
    DirectConversation, DirectMessage, OnlineStatus,
    MessageReaction, DirectMessageReaction,
    PushSubscription, ChatNotificationPreference
)
from buildings.serializers import BuildingSerializer
from users.serializers import UserSerializer


class ChatRoomSerializer(serializers.ModelSerializer):
    """Serializer για ChatRoom"""
    building = BuildingSerializer(read_only=True)
    participants_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'building', 'name', 'is_active', 'created_at', 'updated_at',
            'participants_count', 'unread_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_participants_count(self, obj):
        """Επιστρέφει τον αριθμό των συμμετεχόντων"""
        return obj.participants.count()

    def get_unread_count(self, obj):
        """Επιστρέφει τον αριθμό των μη διαβασμένων μηνυμάτων για τον τρέχοντα χρήστη"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            notification = obj.notifications.filter(user=request.user).first()
            return notification.unread_count if notification else 0
        return 0


class MessageReactionSerializer(serializers.ModelSerializer):
    """Serializer για MessageReaction"""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = MessageReaction
        fields = ['id', 'emoji', 'user_id', 'user_name', 'created_at']
        read_only_fields = ['id', 'user_id', 'user_name', 'created_at']


class ReactionSummarySerializer(serializers.Serializer):
    """Serializer για συνοπτική εμφάνιση reactions"""
    emoji = serializers.CharField()
    count = serializers.IntegerField()
    users = serializers.ListField(child=serializers.DictField())
    has_reacted = serializers.BooleanField()


class ReplyToSerializer(serializers.ModelSerializer):
    """Simplified serializer για reply_to reference"""
    sender_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender_name', 'content', 'message_type', 'is_deleted']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer για ChatMessage"""
    sender = UserSerializer(read_only=True)
    sender_name = serializers.CharField(read_only=True)
    sender_role = serializers.CharField(read_only=True)
    chat_room = ChatRoomSerializer(read_only=True)
    reactions = serializers.SerializerMethodField()
    reply_to_data = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'chat_room', 'sender', 'sender_name', 'sender_role',
            'message_type', 'content', 'file_url', 'file_name', 'file_size',
            'reply_to', 'reply_to_data', 'reactions',
            'is_edited', 'edited_at', 'is_deleted', 'deleted_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sender', 'sender_name', 'sender_role', 
            'is_deleted', 'deleted_at', 'created_at', 'updated_at'
        ]

    def get_reactions(self, obj):
        """Επιστρέφει reactions ομαδοποιημένα ανά emoji"""
        if obj.is_deleted:
            return []
        
        reactions = obj.reactions.select_related('user').all()
        request = self.context.get('request')
        current_user_id = request.user.id if request else None
        
        # Group by emoji
        emoji_groups = {}
        for reaction in reactions:
            emoji = reaction.emoji
            if emoji not in emoji_groups:
                emoji_groups[emoji] = {
                    'emoji': emoji,
                    'count': 0,
                    'users': [],
                    'has_reacted': False
                }
            emoji_groups[emoji]['count'] += 1
            emoji_groups[emoji]['users'].append({
                'id': reaction.user.id,
                'name': reaction.user.get_full_name() or reaction.user.email
            })
            if reaction.user.id == current_user_id:
                emoji_groups[emoji]['has_reacted'] = True
        
        return list(emoji_groups.values())

    def get_reply_to_data(self, obj):
        """Επιστρέφει δεδομένα του μηνύματος στο οποίο απαντά"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender_name': obj.reply_to.sender_name,
                'content': obj.reply_to.content[:100] + '...' if len(obj.reply_to.content) > 100 else obj.reply_to.content,
                'message_type': obj.reply_to.message_type,
                'is_deleted': obj.reply_to.is_deleted
            }
        return None

    def create(self, validated_data):
        """Αυτόματη ανάθεση του αποστολέα"""
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class ChatMessageListSerializer(serializers.ModelSerializer):
    """Simplified serializer για λίστα μηνυμάτων"""
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.CharField(read_only=True)
    sender_role = serializers.CharField(read_only=True)
    reactions = serializers.SerializerMethodField()
    reply_to_data = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'sender_id', 'sender_name', 'sender_role', 'message_type', 'content',
            'file_url', 'file_name', 'reply_to', 'reply_to_data', 'reactions',
            'is_edited', 'edited_at', 'is_deleted', 'deleted_at', 'created_at'
        ]

    def get_reactions(self, obj):
        """Επιστρέφει reactions ομαδοποιημένα ανά emoji"""
        if obj.is_deleted:
            return []
        
        reactions = obj.reactions.select_related('user').all()
        request = self.context.get('request')
        current_user_id = request.user.id if request else None
        
        # Group by emoji
        emoji_groups = {}
        for reaction in reactions:
            emoji = reaction.emoji
            if emoji not in emoji_groups:
                emoji_groups[emoji] = {
                    'emoji': emoji,
                    'count': 0,
                    'users': [],
                    'has_reacted': False
                }
            emoji_groups[emoji]['count'] += 1
            emoji_groups[emoji]['users'].append({
                'id': reaction.user.id,
                'name': reaction.user.get_full_name() or reaction.user.email
            })
            if reaction.user.id == current_user_id:
                emoji_groups[emoji]['has_reacted'] = True
        
        return list(emoji_groups.values())

    def get_reply_to_data(self, obj):
        """Επιστρέφει δεδομένα του μηνύματος στο οποίο απαντά"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender_name': obj.reply_to.sender_name,
                'content': obj.reply_to.content[:100] + '...' if len(obj.reply_to.content) > 100 else obj.reply_to.content,
                'message_type': obj.reply_to.message_type,
                'is_deleted': obj.reply_to.is_deleted
            }
        return None


class ChatParticipantSerializer(serializers.ModelSerializer):
    """Serializer για ChatParticipant"""
    user = UserSerializer(read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = ChatParticipant
        fields = [
            'id', 'user', 'user_name', 'user_email', 'is_online',
            'last_seen', 'joined_at'
        ]
        read_only_fields = ['id', 'joined_at']


class ChatNotificationSerializer(serializers.ModelSerializer):
    """Serializer για ChatNotification"""
    chat_room = ChatRoomSerializer(read_only=True)

    class Meta:
        model = ChatNotification
        fields = [
            'id', 'chat_room', 'unread_count', 'last_read_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_read_at', 'updated_at']


class ChatRoomCreateSerializer(serializers.ModelSerializer):
    """Serializer για δημιουργία ChatRoom"""
    building_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ChatRoom
        fields = ['building_id', 'name', 'is_active']

    def create(self, validated_data):
        building_id = validated_data.pop('building_id')
        from buildings.models import Building
        building = Building.objects.get(id=building_id)
        validated_data['building'] = building
        return super().create(validated_data)


class ChatMessageUpdateSerializer(serializers.ModelSerializer):
    """Serializer για ενημέρωση μηνύματος"""
    class Meta:
        model = ChatMessage
        fields = ['content']
        read_only_fields = ['id', 'sender', 'chat_room', 'created_at']

    def update(self, instance, validated_data):
        """Ενημέρωση μηνύματος με σήμανση ως επεξεργασμένο"""
        from django.utils import timezone
        instance.content = validated_data.get('content', instance.content)
        instance.is_edited = True
        instance.edited_at = timezone.now()
        instance.save()
        return instance


class ChatRoomJoinSerializer(serializers.Serializer):
    """Serializer για συμμετοχή σε chat room"""
    chat_room_id = serializers.IntegerField()

    def validate_chat_room_id(self, value):
        """Επιβεβαίωση ότι ο χρήστης έχει πρόσβαση στο chat room"""
        from .models import ChatRoom
        
        try:
            chat_room = ChatRoom.objects.get(id=value)
            user = self.context['request'].user
            
            # Έλεγχος αν ο χρήστης είναι κάτοικος ή διαχειριστής του κτιρίου
            building = chat_room.building
            if not (user.is_manager_of(building) or user.is_resident_of(building)):
                raise serializers.ValidationError(
                    "Δεν έχετε πρόσβαση σε αυτό το chat room"
                )
            
            return value
        except ChatRoom.DoesNotExist:
            raise serializers.ValidationError("Το chat room δεν υπάρχει")


class ChatMessageReadSerializer(serializers.Serializer):
    """Serializer για σήμανση μηνυμάτων ως διαβασμένα"""
    chat_room_id = serializers.IntegerField()
    last_message_id = serializers.IntegerField(required=False)

    def validate(self, data):
        """Επιβεβαίωση ότι ο χρήστης έχει πρόσβαση στο chat room"""
        from .models import ChatRoom
        
        try:
            chat_room = ChatRoom.objects.get(id=data['chat_room_id'])
            user = self.context['request'].user
            
            # Έλεγχος αν ο χρήστης είναι κάτοικος ή διαχειριστής του κτιρίου
            building = chat_room.building
            if not (user.is_manager_of(building) or user.is_resident_of(building)):
                raise serializers.ValidationError(
                    "Δεν έχετε πρόσβαση σε αυτό το chat room"
                )
            
            return data
        except ChatRoom.DoesNotExist:
            raise serializers.ValidationError("Το chat room δεν υπάρχει")


# =============================================================================
# DIRECT MESSAGING (Private Chat) Serializers
# =============================================================================

class OnlineStatusSerializer(serializers.ModelSerializer):
    """Serializer για OnlineStatus"""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = OnlineStatus
        fields = [
            'user_id', 'user_name', 'user_email', 'user_role',
            'is_online', 'last_activity', 'status_message'
        ]
        read_only_fields = ['user_id', 'user_name', 'user_email', 'last_activity']

    def get_user_role(self, obj):
        """Επιστρέφει τον ρόλο του χρήστη"""
        user = obj.user
        if user.is_superuser:
            return 'superuser'
        if hasattr(user, 'profile') and user.profile:
            return user.profile.role
        # Check groups
        if user.groups.filter(name='managers').exists():
            return 'manager'
        return 'resident'


class DirectMessageReactionSerializer(serializers.ModelSerializer):
    """Serializer για DirectMessageReaction"""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = DirectMessageReaction
        fields = ['id', 'emoji', 'user_id', 'user_name', 'created_at']
        read_only_fields = ['id', 'user_id', 'user_name', 'created_at']


class DirectMessageSerializer(serializers.ModelSerializer):
    """Serializer για DirectMessage"""
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    recipient_id = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    reply_to_data = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = [
            'id', 'conversation', 'sender_id', 'sender_name', 'sender_email',
            'recipient_id', 'recipient_name', 'message_type', 'content',
            'file_url', 'file_name', 'reply_to', 'reply_to_data', 'reactions',
            'is_read', 'read_at', 'is_edited', 'edited_at',
            'is_deleted', 'deleted_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sender_id', 'sender_name', 'sender_email',
            'recipient_id', 'recipient_name', 'is_read', 'read_at',
            'is_deleted', 'deleted_at', 'created_at', 'updated_at'
        ]

    def get_recipient_id(self, obj):
        recipient = obj.recipient
        return recipient.id if recipient else None

    def get_recipient_name(self, obj):
        recipient = obj.recipient
        return recipient.get_full_name() if recipient else None

    def get_reactions(self, obj):
        """Επιστρέφει reactions ομαδοποιημένα ανά emoji"""
        if obj.is_deleted:
            return []
        
        reactions = obj.reactions.select_related('user').all()
        request = self.context.get('request')
        current_user_id = request.user.id if request else None
        
        emoji_groups = {}
        for reaction in reactions:
            emoji = reaction.emoji
            if emoji not in emoji_groups:
                emoji_groups[emoji] = {
                    'emoji': emoji,
                    'count': 0,
                    'users': [],
                    'has_reacted': False
                }
            emoji_groups[emoji]['count'] += 1
            emoji_groups[emoji]['users'].append({
                'id': reaction.user.id,
                'name': reaction.user.get_full_name() or reaction.user.email
            })
            if reaction.user.id == current_user_id:
                emoji_groups[emoji]['has_reacted'] = True
        
        return list(emoji_groups.values())

    def get_reply_to_data(self, obj):
        """Επιστρέφει δεδομένα του μηνύματος στο οποίο απαντά"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender_name': obj.reply_to.sender.get_full_name(),
                'content': obj.reply_to.content[:100] + '...' if len(obj.reply_to.content) > 100 else obj.reply_to.content,
                'is_deleted': obj.reply_to.is_deleted
            }
        return None

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class DirectConversationSerializer(serializers.ModelSerializer):
    """Serializer για DirectConversation"""
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    building_name = serializers.CharField(source='building.name', read_only=True)

    class Meta:
        model = DirectConversation
        fields = [
            'id', 'other_participant', 'building_name', 'last_message',
            'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_participant(self, obj):
        """Επιστρέφει τον άλλο συμμετέχοντα της συνομιλίας."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other = obj.get_other_participant(request.user)
            return {
                'id': other.id,
                'name': other.get_full_name() or other.email,
                'email': other.email,
            }
        return None

    def get_last_message(self, obj):
        """Επιστρέφει το τελευταίο μήνυμα της συνομιλίας."""
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'id': last.id,
                'content': last.content[:50] + '...' if len(last.content) > 50 else last.content,
                'sender_name': last.sender.get_full_name(),
                'created_at': last.created_at.isoformat(),
                'is_read': last.is_read,
            }
        return None

    def get_unread_count(self, obj):
        """Επιστρέφει τον αριθμό μη διαβασμένων μηνυμάτων."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class CreateDirectConversationSerializer(serializers.Serializer):
    """Serializer για δημιουργία νέας συνομιλίας"""
    recipient_id = serializers.IntegerField()
    building_id = serializers.IntegerField()
    initial_message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        from django.contrib.auth import get_user_model
        from buildings.models import Building
        
        User = get_user_model()
        request = self.context.get('request')
        
        # Validate recipient
        try:
            recipient = User.objects.get(id=data['recipient_id'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"recipient_id": "Ο χρήστης δεν βρέθηκε"})
        
        # Validate building
        try:
            building = Building.objects.get(id=data['building_id'])
        except Building.DoesNotExist:
            raise serializers.ValidationError({"building_id": "Το κτίριο δεν βρέθηκε"})
        
        # Check if sender has access to building
        sender = request.user
        if not (sender.is_manager_of(building) or sender.is_resident_of(building) or sender.is_superuser):
            raise serializers.ValidationError("Δεν έχετε πρόσβαση σε αυτό το κτίριο")
        
        # Check if recipient has access to building
        if not (recipient.is_manager_of(building) or recipient.is_resident_of(building) or recipient.is_superuser):
            raise serializers.ValidationError("Ο παραλήπτης δεν έχει πρόσβαση σε αυτό το κτίριο")
        
        # Can't message yourself
        if sender.id == recipient.id:
            raise serializers.ValidationError("Δεν μπορείτε να στείλετε μήνυμα στον εαυτό σας")
        
        data['recipient'] = recipient
        data['building'] = building
        return data


class OnlineUsersListSerializer(serializers.Serializer):
    """Serializer για λίστα online χρηστών ενός κτιρίου"""
    building_id = serializers.IntegerField()

    def validate_building_id(self, value):
        from buildings.models import Building
        
        try:
            building = Building.objects.get(id=value)
            request = self.context.get('request')
            user = request.user
            
            # Check access
            if not (user.is_manager_of(building) or user.is_resident_of(building) or user.is_superuser):
                raise serializers.ValidationError("Δεν έχετε πρόσβαση σε αυτό το κτίριο")
            
            return value
        except Building.DoesNotExist:
            raise serializers.ValidationError("Το κτίριο δεν βρέθηκε")


# =============================================================================
# PUSH NOTIFICATIONS Serializers
# =============================================================================

class PushSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer για PushSubscription"""
    
    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'p256dh', 'auth', 'user_agent', 'is_active', 'created_at']
        read_only_fields = ['id', 'is_active', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # Update or create - same endpoint should be updated
        subscription, created = PushSubscription.objects.update_or_create(
            user=validated_data['user'],
            endpoint=validated_data['endpoint'],
            defaults={
                'p256dh': validated_data['p256dh'],
                'auth': validated_data['auth'],
                'user_agent': validated_data.get('user_agent', ''),
                'is_active': True
            }
        )
        return subscription


class ChatNotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer για ChatNotificationPreference"""
    
    class Meta:
        model = ChatNotificationPreference
        fields = [
            'chat_notifications', 'dm_notifications', 'sound_enabled',
            'quiet_hours_start', 'quiet_hours_end'
        ]

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        preferences, created = ChatNotificationPreference.objects.update_or_create(
            user=validated_data['user'],
            defaults=validated_data
        )
        return preferences


class SubscribePushSerializer(serializers.Serializer):
    """Serializer για εγγραφή σε push notifications"""
    endpoint = serializers.CharField()
    keys = serializers.DictField()
    
    def validate_keys(self, value):
        if 'p256dh' not in value or 'auth' not in value:
            raise serializers.ValidationError("Απαιτούνται τα keys p256dh και auth")
        return value
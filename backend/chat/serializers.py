from rest_framework import serializers
from .models import ChatRoom, ChatMessage, ChatParticipant, ChatNotification
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


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer για ChatMessage"""
    sender = UserSerializer(read_only=True)
    sender_name = serializers.CharField(read_only=True)
    sender_role = serializers.CharField(read_only=True)
    chat_room = ChatRoomSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'chat_room', 'sender', 'sender_name', 'sender_role',
            'message_type', 'content', 'file_url', 'file_name', 'file_size',
            'is_edited', 'edited_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sender', 'sender_name', 'sender_role', 'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        """Αυτόματη ανάθεση του αποστολέα"""
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class ChatMessageListSerializer(serializers.ModelSerializer):
    """Simplified serializer για λίστα μηνυμάτων"""
    sender_name = serializers.CharField(read_only=True)
    sender_role = serializers.CharField(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'sender_name', 'sender_role', 'message_type', 'content',
            'file_url', 'file_name', 'is_edited', 'created_at'
        ]


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
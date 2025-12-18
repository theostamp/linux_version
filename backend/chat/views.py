from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Q

from .models import (
    ChatRoom, ChatMessage, ChatParticipant, ChatNotification,
    DirectConversation, DirectMessage, OnlineStatus,
    MessageReaction, DirectMessageReaction,
    PushSubscription, ChatNotificationPreference
)
from .serializers import (
    ChatRoomSerializer,
    ChatMessageSerializer,
    ChatMessageListSerializer,
    ChatParticipantSerializer,
    ChatNotificationSerializer,
    ChatRoomCreateSerializer,
    ChatMessageUpdateSerializer,
    ChatMessageReadSerializer,
    DirectConversationSerializer,
    DirectMessageSerializer,
    OnlineStatusSerializer,
    CreateDirectConversationSerializer,
    MessageReactionSerializer,
    DirectMessageReactionSerializer,
    PushSubscriptionSerializer,
    ChatNotificationPreferenceSerializer,
    SubscribePushSerializer
)
from core.permissions import IsManagerOrSuperuser


class ChatRoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση chat rooms.
    Κάθε κτίριο έχει ένα chat room.
    """
    queryset = ChatRoom.objects.select_related('building').all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return ChatRoomCreateSerializer
        return ChatRoomSerializer

    def get_permissions(self):
        # Actions accessible to all authenticated users (including residents)
        user_actions = ['list', 'retrieve', 'get_or_create_for_building', 'join', 'leave', 'participants', 'notifications']
        if self.action in user_actions:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        """
        Φιλτράρισμα chat rooms βάσει των κτιρίων που έχει πρόσβαση ο χρήστης.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            user = self.request.user
            
            # Για superusers/office-level, επιστρέφει όλα τα chat rooms του tenant
            # (office managers/staff έχουν πρόσβαση σε όλα τα κτίρια του tenant).
            if user.is_superuser or getattr(user, "is_office_level", False) or user.is_staff:
                return self.queryset
            
            # Για άλλους χρήστες, επιστρέφει μόνο τα chat rooms των κτιρίων τους
            building_ids = []
            
            # Κτίρια που διαχειρίζεται (manager_id is integer, not FK)
            try:
                from buildings.models import Building
                managed_ids = list(Building.objects.filter(manager_id=user.id).values_list('id', flat=True))
                building_ids.extend(managed_ids)
            except Exception as e:
                logger.warning(f"Error getting managed buildings: {e}")
            
            # Κτίρια που κατοικεί
            try:
                resident_ids = list(user.memberships.values_list('building_id', flat=True))
                building_ids.extend(resident_ids)
            except Exception as e:
                logger.warning(f"Error getting resident buildings: {e}")
            
            # Remove duplicates
            building_ids = list(set(building_ids))
            
            return self.queryset.filter(building_id__in=building_ids)
        except Exception as e:
            logger.error(f"Error in ChatRoomViewSet.get_queryset: {e}")
            return ChatRoom.objects.none()

    @action(detail=False, methods=['post'])
    def get_or_create_for_building(self, request):
        """
        Επιστρέφει ή δημιουργεί chat room για ένα κτίριο.
        """
        from buildings.models import Building
        
        building_id = request.data.get('building_id')
        if not building_id:
            return Response(
                {"error": "Απαιτείται building_id"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {"error": "Το κτίριο δεν βρέθηκε"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        user = request.user
        
        # Έλεγχος πρόσβασης (consistent με το υπόλοιπο σύστημα δικαιωμάτων)
        if not user.can_access_building(building):
            return Response(
                {"error": "Δεν έχετε πρόσβαση σε αυτό το κτίριο"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Δημιουργία ή ανάκτηση chat room
        chat_room, created = ChatRoom.objects.get_or_create(
            building=building,
            defaults={
                'name': f'Chat - {building.name}',
                'is_active': True
            }
        )
        
        # Δημιουργία participant αν δεν υπάρχει
        participant, _ = ChatParticipant.objects.get_or_create(
            chat_room=chat_room,
            user=user,
            defaults={'is_online': True}
        )
        
        # Δημιουργία notification αν δεν υπάρχει
        ChatNotification.objects.get_or_create(
            chat_room=chat_room,
            user=user,
            defaults={'unread_count': 0}
        )
        
        return Response({
            "chat_room": ChatRoomSerializer(chat_room, context={'request': request}).data,
            "created": created,
            "message": "Chat room δημιουργήθηκε" if created else "Chat room ανακτήθηκε"
        })

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """
        Συμμετοχή σε chat room.
        """
        chat_room = self.get_object()
        user = request.user
        
        # Έλεγχος αν ο χρήστης έχει πρόσβαση στο chat room
        building = chat_room.building
        if not user.can_access_building(building):
            return Response(
                {"error": "Δεν έχετε πρόσβαση σε αυτό το chat room"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Δημιουργία ή ενημέρωση συμμετοχής
        participant, created = ChatParticipant.objects.get_or_create(
            chat_room=chat_room,
            user=user,
            defaults={'is_online': True}
        )
        
        if not created:
            participant.is_online = True
            participant.save()
        
        # Δημιουργία ή ενημέρωση ειδοποίησης
        notification, created = ChatNotification.objects.get_or_create(
            chat_room=chat_room,
            user=user,
            defaults={'unread_count': 0}
        )
        
        return Response({
            "message": "Επιτυχής συμμετοχή στο chat room",
            "participant": ChatParticipantSerializer(participant).data
        })

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """
        Αποχώρηση από chat room.
        """
        chat_room = self.get_object()
        user = request.user
        
        try:
            participant = ChatParticipant.objects.get(
                chat_room=chat_room,
                user=user
            )
            participant.is_online = False
            participant.save()
            
            return Response({
                "message": "Επιτυχής αποχώρηση από το chat room"
            })
        except ChatParticipant.DoesNotExist:
            return Response({
                "error": "Δεν είστε συμμετέχοντας σε αυτό το chat room"
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """
        Λίστα συμμετεχόντων στο chat room.
        """
        chat_room = self.get_object()
        participants = chat_room.participants.select_related('user').all()
        
        return Response({
            "participants": ChatParticipantSerializer(participants, many=True).data
        })

    @action(detail=True, methods=['get'])
    def notifications(self, request, pk=None):
        """
        Ειδοποιήσεις για τον τρέχοντα χρήστη.
        """
        chat_room = self.get_object()
        user = request.user
        
        try:
            notification = ChatNotification.objects.get(
                chat_room=chat_room,
                user=user
            )
            return Response(ChatNotificationSerializer(notification).data)
        except ChatNotification.DoesNotExist:
            return Response({
                "unread_count": 0,
                "last_read_at": None
            })


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση μηνυμάτων chat.
    """
    queryset = ChatMessage.objects.select_related('sender', 'chat_room').all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ChatMessageListSerializer
        elif self.action == 'update':
            return ChatMessageUpdateSerializer
        return ChatMessageSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """
        Φιλτράρισμα μηνυμάτων βάσει των chat rooms που έχει πρόσβαση ο χρήστης.
        """
        user = self.request.user
        
        # Για superusers/office-level, επιστρέφει όλα τα μηνύματα του tenant
        if user.is_superuser or getattr(user, "is_office_level", False) or user.is_staff:
            return self.queryset
        
        # Για άλλους χρήστες, επιστρέφει μόνο τα μηνύματα των chat rooms τους
        from buildings.models import Building
        
        building_ids = []
        
        # Κτίρια που διαχειρίζεται (manager_id is integer, not FK)
        managed_ids = list(Building.objects.filter(manager_id=user.id).values_list('id', flat=True))
        building_ids.extend(managed_ids)
        
        # Κτίρια που κατοικεί
        resident_ids = list(user.memberships.values_list('building_id', flat=True))
        building_ids.extend(resident_ids)
        
        building_ids = list(set(building_ids))
        return self.queryset.filter(chat_room__building_id__in=building_ids)

    def perform_create(self, serializer):
        """
        Δημιουργία μηνύματος με αυτόματη ενημέρωση ειδοποιήσεων.
        """
        message = serializer.save()
        
        # Ενημέρωση ειδοποιήσεων για όλους τους συμμετέχοντες
        participants = message.chat_room.participants.exclude(user=message.sender)
        
        for participant in participants:
            notification, created = ChatNotification.objects.get_or_create(
                chat_room=message.chat_room,
                user=participant.user,
                defaults={'unread_count': 1}
            )
            
            if not created:
                notification.unread_count += 1
                notification.save()

    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        """
        Επεξεργασία μηνύματος.
        """
        message = self.get_object()
        user = request.user
        
        # Έλεγχος αν ο χρήστης είναι ο αποστολέας του μηνύματος
        if message.sender != user:
            return Response(
                {"error": "Μπορείτε να επεξεργαστείτε μόνο τα δικά σας μηνύματα"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Έλεγχος αν το μήνυμα έχει διαγραφεί
        if message.is_deleted:
            return Response(
                {"error": "Δεν μπορείτε να επεξεργαστείτε διαγραμμένο μήνυμα"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ChatMessageUpdateSerializer(message, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(ChatMessageSerializer(message, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def delete_message(self, request, pk=None):
        """
        Soft delete μηνύματος.
        """
        message = self.get_object()
        user = request.user
        
        # Έλεγχος αν ο χρήστης είναι ο αποστολέας του μηνύματος
        if message.sender != user:
            return Response(
                {"error": "Μπορείτε να διαγράψετε μόνο τα δικά σας μηνύματα"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if message.is_deleted:
            return Response(
                {"error": "Το μήνυμα έχει ήδη διαγραφεί"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message.is_deleted = True
        message.deleted_at = timezone.now()
        message.save(update_fields=['is_deleted', 'deleted_at'])
        
        return Response({
            "message": "Το μήνυμα διαγράφηκε επιτυχώς",
            "data": ChatMessageSerializer(message, context={'request': request}).data
        })

    @action(detail=True, methods=['post'])
    def add_reaction(self, request, pk=None):
        """
        Προσθήκη reaction σε μήνυμα.
        """
        message = self.get_object()
        user = request.user
        emoji = request.data.get('emoji', '').strip()
        
        if not emoji:
            return Response(
                {"error": "Απαιτείται emoji"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if message.is_deleted:
            return Response(
                {"error": "Δεν μπορείτε να αντιδράσετε σε διαγραμμένο μήνυμα"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Toggle reaction - αν υπάρχει διαγραφή, αλλιώς δημιουργία
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=user,
            emoji=emoji
        )
        
        if not created:
            # Αν υπάρχει ήδη, αφαίρεσέ το (toggle)
            reaction.delete()
            return Response({
                "action": "removed",
                "message": f"Αφαιρέθηκε το {emoji}",
                "reactions": self._get_message_reactions(message, user)
            })
        
        return Response({
            "action": "added",
            "message": f"Προστέθηκε το {emoji}",
            "reactions": self._get_message_reactions(message, user)
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'])
    def remove_reaction(self, request, pk=None):
        """
        Αφαίρεση reaction από μήνυμα.
        """
        message = self.get_object()
        user = request.user
        emoji = request.query_params.get('emoji', '').strip()
        
        if not emoji:
            return Response(
                {"error": "Απαιτείται emoji"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reaction = MessageReaction.objects.get(
                message=message,
                user=user,
                emoji=emoji
            )
            reaction.delete()
            return Response({
                "message": f"Αφαιρέθηκε το {emoji}",
                "reactions": self._get_message_reactions(message, user)
            })
        except MessageReaction.DoesNotExist:
            return Response(
                {"error": "Δεν βρέθηκε reaction"},
                status=status.HTTP_404_NOT_FOUND
            )

    def _get_message_reactions(self, message, current_user):
        """Helper για να πάρουμε τα reactions ενός μηνύματος"""
        reactions = message.reactions.select_related('user').all()
        
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
            if reaction.user.id == current_user.id:
                emoji_groups[emoji]['has_reacted'] = True
        
        return list(emoji_groups.values())

    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        """
        Σήμανση μηνυμάτων ως διαβασμένα.
        """
        serializer = ChatMessageReadSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            chat_room_id = serializer.validated_data['chat_room_id']
            last_message_id = serializer.validated_data.get('last_message_id')
            
            try:
                notification = ChatNotification.objects.get(
                    chat_room_id=chat_room_id,
                    user=request.user
                )
                
                # Ενημέρωση ειδοποίησης
                notification.unread_count = 0
                notification.last_read_at = timezone.now()
                notification.save()
                
                return Response({
                    "message": "Τα μηνύματα σημειώθηκαν ως διαβασμένα"
                })
            except ChatNotification.DoesNotExist:
                return Response({
                    "error": "Δεν βρέθηκε ειδοποίηση για αυτό το chat room"
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Συνολικός αριθμός μη διαβασμένων μηνυμάτων για τον χρήστη.
        """
        user = request.user
        
        # Για superusers, επιστρέφει 0
        if user.is_superuser:
            return Response({"unread_count": 0})
        
        # Για άλλους χρήστες, υπολογίζει τα μη διαβασμένα μηνύματα
        from buildings.models import Building
        
        building_ids = []
        
        # Κτίρια που διαχειρίζεται (manager_id is integer, not FK)
        managed_ids = list(Building.objects.filter(manager_id=user.id).values_list('id', flat=True))
        building_ids.extend(managed_ids)
        
        # Κτίρια που κατοικεί
        resident_ids = list(user.memberships.values_list('building_id', flat=True))
        building_ids.extend(resident_ids)
        
        building_ids = list(set(building_ids))
        
        total_unread = ChatNotification.objects.filter(
            chat_room__building_id__in=building_ids,
            user=user
        ).aggregate(total=Sum('unread_count'))['total'] or 0
        
        return Response({"unread_count": total_unread})


# =============================================================================
# DIRECT MESSAGING (Private Chat) ViewSets
# =============================================================================

class DirectConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση ιδιωτικών συνομιλιών (1-to-1 chat).
    """
    queryset = DirectConversation.objects.all()
    serializer_class = DirectConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Επιστρέφει μόνο τις συνομιλίες του τρέχοντα χρήστη.
        """
        user = self.request.user
        return DirectConversation.objects.filter(
            Q(participant_one=user) | Q(participant_two=user)
        ).select_related(
            'participant_one', 'participant_two', 'building'
        ).order_by('-updated_at')

    @action(detail=False, methods=['post'])
    def start_conversation(self, request):
        """
        Ξεκινάει ή επιστρέφει υπάρχουσα συνομιλία με έναν χρήστη.
        """
        serializer = CreateDirectConversationSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        recipient = serializer.validated_data['recipient']
        building = serializer.validated_data['building']
        initial_message = serializer.validated_data.get('initial_message', '')
        
        # Get or create conversation
        conversation, created = DirectConversation.get_or_create_conversation(
            request.user, recipient, building
        )
        
        # Send initial message if provided
        if initial_message and created:
            DirectMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                content=initial_message
            )
            # Update conversation timestamp
            conversation.save()  # This triggers auto_now on updated_at
        
        return Response({
            "conversation": DirectConversationSerializer(
                conversation, 
                context={'request': request}
            ).data,
            "created": created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """
        Λίστα μηνυμάτων μιας συνομιλίας.
        """
        conversation = self.get_object()
        
        # Check access
        if not conversation.has_participant(request.user):
            return Response(
                {"error": "Δεν έχετε πρόσβαση σε αυτή τη συνομιλία"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get messages with pagination
        page_size = int(request.query_params.get('page_size', 50))
        page = int(request.query_params.get('page', 1))
        offset = (page - 1) * page_size
        
        messages = conversation.messages.order_by('-created_at')[offset:offset + page_size]
        
        return Response({
            "messages": DirectMessageSerializer(
                reversed(list(messages)),  # Reverse to get chronological order
                many=True,
                context={'request': request}
            ).data,
            "total": conversation.messages.count()
        })

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """
        Αποστολή μηνύματος σε συνομιλία.
        """
        conversation = self.get_object()
        
        # Check access
        if not conversation.has_participant(request.user):
            return Response(
                {"error": "Δεν έχετε πρόσβαση σε αυτή τη συνομιλία"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response(
                {"error": "Το μήνυμα δεν μπορεί να είναι κενό"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = DirectMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            message_type=request.data.get('message_type', 'text'),
            file_url=request.data.get('file_url'),
            file_name=request.data.get('file_name')
        )
        
        # Update conversation timestamp
        conversation.save()
        
        return Response(
            DirectMessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Σήμανση όλων των μηνυμάτων ως διαβασμένα.
        """
        conversation = self.get_object()
        
        # Check access
        if not conversation.has_participant(request.user):
            return Response(
                {"error": "Δεν έχετε πρόσβαση σε αυτή τη συνομιλία"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark all unread messages from the other participant as read
        unread_messages = conversation.messages.filter(
            is_read=False
        ).exclude(sender=request.user)
        
        count = unread_messages.update(is_read=True, read_at=timezone.now())
        
        return Response({
            "message": f"{count} μηνύματα σημειώθηκαν ως διαβασμένα"
        })


class DirectMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση ιδιωτικών μηνυμάτων.
    """
    queryset = DirectMessage.objects.all()
    serializer_class = DirectMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Επιστρέφει μόνο τα μηνύματα σε συνομιλίες του τρέχοντα χρήστη.
        """
        user = self.request.user
        return DirectMessage.objects.filter(
            Q(conversation__participant_one=user) | 
            Q(conversation__participant_two=user)
        ).select_related('sender', 'conversation')

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Συνολικός αριθμός μη διαβασμένων ιδιωτικών μηνυμάτων.
        """
        user = request.user
        
        count = DirectMessage.objects.filter(
            Q(conversation__participant_one=user) | 
            Q(conversation__participant_two=user),
            is_read=False
        ).exclude(sender=user).count()
        
        return Response({"unread_count": count})


class OnlineStatusViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση κατάστασης σύνδεσης χρηστών.
    """
    queryset = OnlineStatus.objects.all()
    serializer_class = OnlineStatusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OnlineStatus.objects.select_related('user').all()

    @action(detail=False, methods=['post'])
    def heartbeat(self, request):
        """
        Heartbeat endpoint - ενημέρωση last_activity για REST API mode.
        Ο client πρέπει να καλεί αυτό κάθε 15-30 δευτερόλεπτα.
        """
        user = request.user
        
        online_status, created = OnlineStatus.objects.update_or_create(
            user=user,
            defaults={'is_online': True}
        )
        # Force update last_activity
        online_status.save()
        
        return Response({
            'status': 'ok',
            'timestamp': timezone.now().isoformat()
        })

    @action(detail=False, methods=['post'])
    def go_offline(self, request):
        """
        Σήμανση χρήστη ως offline (π.χ. όταν κλείνει το tab).
        """
        user = request.user
        
        OnlineStatus.objects.filter(user=user).update(is_online=False)
        
        return Response({
            'status': 'offline',
            'timestamp': timezone.now().isoformat()
        })

    @action(detail=False, methods=['post'])
    def cleanup_stale(self, request):
        """
        Cleanup stale users - σήμανση ως offline αν δεν υπάρχει activity για 60 δευτερόλεπτα.
        Αυτό μπορεί να κληθεί περιοδικά από admin ή scheduled task.
        """
        from datetime import timedelta
        
        stale_threshold = timezone.now() - timedelta(seconds=60)
        
        # Mark stale users as offline
        stale_count = OnlineStatus.objects.filter(
            is_online=True,
            last_activity__lt=stale_threshold
        ).update(is_online=False)
        
        return Response({
            'stale_users_marked_offline': stale_count,
            'threshold_seconds': 60,
            'timestamp': timezone.now().isoformat()
        })

    @action(detail=False, methods=['post'])
    def update_status(self, request):
        """
        Ενημέρωση κατάστασης σύνδεσης του τρέχοντα χρήστη.
        """
        user = request.user
        is_online = request.data.get('is_online', True)
        status_message = request.data.get('status_message', '')
        
        online_status, created = OnlineStatus.objects.update_or_create(
            user=user,
            defaults={
                'is_online': is_online,
                'status_message': status_message
            }
        )
        
        return Response(OnlineStatusSerializer(online_status).data)

    @action(detail=False, methods=['get'])
    def building_users(self, request):
        """
        Επιστρέφει όλους τους χρήστες ενός κτιρίου με την κατάσταση σύνδεσής τους.
        """
        from buildings.models import Building, BuildingMembership
        from django.contrib.auth import get_user_model
        from django_tenants.utils import schema_context
        import logging
        
        logger = logging.getLogger(__name__)
        User = get_user_model()
        
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {"error": "Απαιτείται building_id"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            building_id = int(building_id)
            building = Building.objects.get(id=building_id)
        except (ValueError, Building.DoesNotExist):
            return Response(
                {"error": "Το κτίριο δεν βρέθηκε"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check access using the unified can_access_building method
        user = request.user
        if not user.can_access_building(building):
            return Response(
                {"error": "Δεν έχετε πρόσβαση σε αυτό το κτίριο"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Collect user IDs from building
            # 1. Get manager_id from building (cross-schema reference)
            manager_ids = [building.manager_id] if building.manager_id else []
            
            # 2. Get internal_manager if exists
            if building.internal_manager_id:
                manager_ids.append(building.internal_manager_id)
            
            # 3. Get resident IDs from BuildingMembership (tenant schema)
            resident_ids = list(BuildingMembership.objects.filter(
                building=building
            ).values_list('resident_id', flat=True))
            
            all_user_ids = list(set(manager_ids + resident_ids))
            
            if not all_user_ids:
                return Response({
                    "building_id": building_id,
                    "building_name": building.name,
                    "users": [],
                    "online_count": 0,
                    "total_count": 0
                })
            
            # Get users from PUBLIC schema (users are in SHARED_APPS)
            with schema_context('public'):
                users_queryset = User.objects.filter(id__in=all_user_ids)
                users_dict = {u.id: u for u in users_queryset}
            
            # Get online statuses from TENANT schema (chat is in TENANT_APPS)
            online_statuses = {}
            try:
                statuses = OnlineStatus.objects.filter(user_id__in=all_user_ids)
                online_statuses = {os.user_id: os for os in statuses}
            except Exception:
                # OnlineStatus table might not exist yet
                pass
            
            # Build users data
            users_data = []
            for user_id in all_user_ids:
                u = users_dict.get(user_id)
                if not u:
                    continue
                
                # Get online status
                online_status = online_statuses.get(user_id)
                is_online = online_status.is_online if online_status else False
                last_activity = online_status.last_activity.isoformat() if online_status and online_status.last_activity else None
                status_message = online_status.status_message if online_status else None
                
                # Determine role
                if user_id in manager_ids:
                    role = 'manager'
                else:
                    role = 'resident'
                
                users_data.append({
                    'id': u.id,
                    'name': u.get_full_name() or u.email,
                    'email': u.email,
                    'role': role,
                    'is_online': is_online,
                    'last_activity': last_activity,
                    'status_message': status_message,
                })
            
            # Sort: online users first, then by name
            users_data.sort(key=lambda x: (not x['is_online'], x['name'].lower()))
            
            return Response({
                "building_id": building_id,
                "building_name": building.name,
                "users": users_data,
                "online_count": sum(1 for u in users_data if u['is_online']),
                "total_count": len(users_data)
            })
        except Exception as e:
            logger.error(f"Error in building_users: {e}", exc_info=True)
            return Response(
                {"error": f"Σφάλμα: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# PUSH NOTIFICATIONS ViewSets
# =============================================================================

class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση push notification subscriptions.
    """
    queryset = PushSubscription.objects.all()
    serializer_class = PushSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Επιστρέφει μόνο τα subscriptions του τρέχοντα χρήστη."""
        return PushSubscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """
        Εγγραφή σε push notifications.
        """
        serializer = SubscribePushSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        endpoint = serializer.validated_data['endpoint']
        keys = serializer.validated_data['keys']
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Create or update subscription
        subscription, created = PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={
                'p256dh': keys['p256dh'],
                'auth': keys['auth'],
                'user_agent': user_agent,
                'is_active': True
            }
        )
        
        return Response({
            'message': 'Εγγραφή επιτυχής' if created else 'Subscription ενημερώθηκε',
            'subscription': PushSubscriptionSerializer(subscription).data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def unsubscribe(self, request):
        """
        Απεγγραφή από push notifications.
        """
        endpoint = request.data.get('endpoint')
        
        if not endpoint:
            return Response(
                {'error': 'Απαιτείται endpoint'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscription = PushSubscription.objects.get(
                user=request.user,
                endpoint=endpoint
            )
            subscription.is_active = False
            subscription.save()
            
            return Response({'message': 'Απεγγραφή επιτυχής'})
        except PushSubscription.DoesNotExist:
            return Response(
                {'error': 'Subscription δεν βρέθηκε'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def vapid_public_key(self, request):
        """
        Επιστρέφει το VAPID public key για εγγραφή.
        """
        from django.conf import settings
        
        vapid_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        
        if not vapid_key:
            return Response(
                {'error': 'VAPID key δεν έχει ρυθμιστεί'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({'public_key': vapid_key})


class ChatNotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση προτιμήσεων ειδοποιήσεων chat.
    """
    queryset = ChatNotificationPreference.objects.all()
    serializer_class = ChatNotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Επιστρέφει μόνο τις προτιμήσεις του τρέχοντα χρήστη."""
        return ChatNotificationPreference.objects.filter(user=self.request.user)

    def get_object(self):
        """
        Επιστρέφει ή δημιουργεί τις προτιμήσεις του τρέχοντα χρήστη.
        """
        obj, created = ChatNotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return obj

    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_preferences(self, request):
        """
        Λήψη ή ενημέρωση των προτιμήσεων του χρήστη.
        """
        preferences, created = ChatNotificationPreference.objects.get_or_create(
            user=request.user
        )
        
        if request.method == 'GET':
            return Response(ChatNotificationPreferenceSerializer(preferences).data)
        
        serializer = ChatNotificationPreferenceSerializer(
            preferences, 
            data=request.data, 
            partial=(request.method == 'PATCH')
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
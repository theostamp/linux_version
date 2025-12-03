from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Sum, Q

from .models import (
    ChatRoom, ChatMessage, ChatParticipant, ChatNotification,
    DirectConversation, DirectMessage, OnlineStatus
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
    CreateDirectConversationSerializer
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
            
            # Για superusers, επιστρέφει όλα τα chat rooms
            if user.is_superuser:
                return self.queryset
            
            # Για άλλους χρήστες, επιστρέφει μόνο τα chat rooms των κτιρίων τους
            building_ids = []
            
            # Κτίρια που διαχειρίζεται
            try:
                managed_ids = list(user.managed_buildings.values_list('id', flat=True))
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
        
        # Έλεγχος πρόσβασης
        if not (user.is_manager_of(building) or user.is_resident_of(building) or user.is_superuser):
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
        if not (user.is_manager_of(building) or user.is_resident_of(building)):
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
        
        # Για superusers, επιστρέφει όλα τα μηνύματα
        if user.is_superuser:
            return self.queryset
        
        # Για άλλους χρήστες, επιστρέφει μόνο τα μηνύματα των chat rooms τους
        user_buildings = []
        
        # Κτίρια που διαχειρίζεται
        managed_buildings = user.managed_buildings.all()
        user_buildings.extend(managed_buildings)
        
        # Κτίρια που κατοικεί
        resident_buildings = [m.building for m in user.memberships.all()]
        user_buildings.extend(resident_buildings)
        
        building_ids = [b.id for b in user_buildings]
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
        
        serializer = ChatMessageUpdateSerializer(message, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(ChatMessageSerializer(message).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        user_buildings = []
        
        # Κτίρια που διαχειρίζεται
        managed_buildings = user.managed_buildings.all()
        user_buildings.extend(managed_buildings)
        
        # Κτίρια που κατοικεί
        resident_buildings = [m.building for m in user.memberships.all()]
        user_buildings.extend(resident_buildings)
        
        building_ids = [b.id for b in user_buildings]
        
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
        from buildings.models import Building
        from apartments.models import Membership
        from django.contrib.auth import get_user_model
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
        
        # Check access
        user = request.user
        if not (user.is_manager_of(building) or user.is_resident_of(building) or user.is_superuser):
            return Response(
                {"error": "Δεν έχετε πρόσβαση σε αυτό το κτίριο"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get all users in building
            manager_ids = list(building.managers.values_list('id', flat=True))
            resident_ids = list(Membership.objects.filter(
                building=building
            ).values_list('user_id', flat=True))
            
            all_user_ids = list(set(manager_ids + resident_ids))
            
            # Get users with their online status
            users_data = []
            for user_id in all_user_ids:
                try:
                    u = User.objects.get(id=user_id)
                    
                    # Try to get online status, but don't fail if table doesn't exist
                    try:
                        online_status = OnlineStatus.objects.filter(user=u).first()
                        is_online = online_status.is_online if online_status else False
                        last_activity = online_status.last_activity.isoformat() if online_status and online_status.last_activity else None
                        status_message = online_status.status_message if online_status else None
                    except Exception:
                        # OnlineStatus table might not exist yet
                        is_online = False
                        last_activity = None
                        status_message = None
                    
                    # Determine role
                    if u.id in manager_ids:
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
                except User.DoesNotExist:
                    continue
            
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
            logger.error(f"Error in building_users: {e}")
            return Response(
                {"error": f"Σφάλμα: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
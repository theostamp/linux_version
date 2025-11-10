from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count

from .models import ChatRoom, ChatMessage, ChatParticipant, ChatNotification
from .serializers import (
    ChatRoomSerializer,
    ChatMessageSerializer,
    ChatMessageListSerializer,
    ChatParticipantSerializer,
    ChatNotificationSerializer,
    ChatRoomCreateSerializer,
    ChatMessageUpdateSerializer,
    ChatMessageReadSerializer
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
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self):
        """
        Φιλτράρισμα chat rooms βάσει των κτιρίων που έχει πρόσβαση ο χρήστης.
        """
        user = self.request.user
        
        # Για superusers, επιστρέφει όλα τα chat rooms
        if user.is_superuser:
            return self.queryset
        
        # Για άλλους χρήστες, επιστρέφει μόνο τα chat rooms των κτιρίων τους
        user_buildings = []
        
        # Κτίρια που διαχειρίζεται
        managed_buildings = user.managed_buildings.all()
        user_buildings.extend(managed_buildings)
        
        # Κτίρια που κατοικεί
        resident_buildings = [m.building for m in user.memberships.all()]
        user_buildings.extend(resident_buildings)
        
        building_ids = [b.id for b in user_buildings]
        return self.queryset.filter(building_id__in=building_ids)

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
        ).aggregate(total=Count('unread_count'))['total'] or 0
        
        return Response({"unread_count": total_unread}) 
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ChatRoom, ChatMessage, ChatParticipant, ChatNotification

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer για real-time chat.
    """
    
    async def connect(self):
        """
        Σύνδεση στο WebSocket και συμμετοχή στο chat room.
        """
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        
        # Έλεγχος αν ο χρήστης είναι αυθεντικοποιημένος
        if self.scope["user"].is_anonymous:
            await self.close()
            return
        
        # Έλεγχος αν ο χρήστης έχει πρόσβαση στο chat room
        if not await self.can_access_room():
            await self.close()
            return
        
        # Συμμετοχή στο room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Ενημέρωση κατάστασης συμμετέχοντα
        await self.update_participant_status(True)
        
        await self.accept()
        
        # Αποστολή μηνύματος για την είσοδο του χρήστη
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_join',
                'user_id': self.scope["user"].id,
                'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                'timestamp': timezone.now().isoformat()
            }
        )

    async def disconnect(self, close_code):
        """
        Αποσύνδεση από το WebSocket.
        """
        # Ενημέρωση κατάστασης συμμετέχοντα
        await self.update_participant_status(False)
        
        # Αποστολή μηνύματος για την έξοδο του χρήστη
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_leave',
                'user_id': self.scope["user"].id,
                'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # Αποχώρηση από το room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Λήψη μηνύματος από το WebSocket.
        """
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'message')
        
        if message_type == 'message':
            await self.handle_chat_message(text_data_json)
        elif message_type == 'typing':
            await self.handle_typing_indicator(text_data_json)
        elif message_type == 'read':
            await self.handle_read_receipt(text_data_json)

    async def handle_chat_message(self, data):
        """
        Επεξεργασία μηνύματος chat.
        """
        message_content = data.get('message', '').strip()
        message_type = data.get('message_type', 'text')
        file_url = data.get('file_url', '')
        file_name = data.get('file_name', '')
        file_size = data.get('file_size', 0)
        
        if not message_content and message_type == 'text':
            return
        
        # Αποθήκευση μηνύματος στη βάση
        message = await self.save_message(
            message_content, message_type, file_url, file_name, file_size
        )
        
        # Ενημέρωση ειδοποιήσεων
        await self.update_notifications()
        
        # Αποστολή μηνύματος στο group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': message.id,
                'sender_id': message.sender.id,
                'sender_name': message.sender.get_full_name() or message.sender.email,
                'sender_role': await self.get_sender_role(message.sender),
                'content': message.content,
                'message_type': message.message_type,
                'file_url': message.file_url or '',
                'file_name': message.file_name or '',
                'file_size': message.file_size or 0,
                'timestamp': message.created_at.isoformat()
            }
        )

    async def handle_typing_indicator(self, data):
        """
        Επεξεργασία δείκτη πληκτρολόγησης.
        """
        is_typing = data.get('is_typing', False)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.scope["user"].id,
                'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                'is_typing': is_typing
            }
        )

    async def handle_read_receipt(self, data):
        """
        Επεξεργασία απόδειξης ανάγνωσης.
        """
        message_id = data.get('message_id')
        
        if message_id:
            await self.mark_message_as_read(message_id)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_receipt',
                    'user_id': self.scope["user"].id,
                    'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                    'message_id': message_id,
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def chat_message(self, event):
        """
        Αποστολή μηνύματος chat στο WebSocket.
        """
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message_id': event['message_id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'sender_role': event['sender_role'],
            'content': event['content'],
            'message_type': event['message_type'],
            'file_url': event['file_url'],
            'file_name': event['file_name'],
            'file_size': event['file_size'],
            'timestamp': event['timestamp']
        }))

    async def user_join(self, event):
        """
        Αποστολή μηνύματος για την είσοδο χρήστη.
        """
        await self.send(text_data=json.dumps({
            'type': 'user_join',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))

    async def user_leave(self, event):
        """
        Αποστολή μηνύματος για την έξοδο χρήστη.
        """
        await self.send(text_data=json.dumps({
            'type': 'user_leave',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp']
        }))

    async def typing_indicator(self, event):
        """
        Αποστολή δείκτη πληκτρολόγησης.
        """
        await self.send(text_data=json.dumps({
            'type': 'typing_indicator',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'is_typing': event['is_typing']
        }))

    async def read_receipt(self, event):
        """
        Αποστολή απόδειξης ανάγνωσης.
        """
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'message_id': event['message_id'],
            'timestamp': event['timestamp']
        }))

    async def broadcast_event(self, event):
        """Generic event broadcaster for non-chat updates (tickets, workorders, projects)."""
        await self.send(text_data=json.dumps({
            'type': 'event',
            'event': event.get('event'),
            'payload': event.get('payload', {}),
        }))

    @database_sync_to_async
    def can_access_room(self):
        """
        Έλεγχος αν ο χρήστης έχει πρόσβαση στο chat room.
        """
        try:
            building_id = int(self.room_name.replace('chat_', ''))
            chat_room = ChatRoom.objects.get(building_id=building_id)
            user = self.scope["user"]
            
            # Έλεγχος αν ο χρήστης είναι διαχειριστής ή κάτοικος του κτιρίου
            building = chat_room.building
            return user.is_manager_of(building) or user.is_resident_of(building)
        except (ValueError, ChatRoom.DoesNotExist):
            return False

    @database_sync_to_async
    def save_message(self, content, message_type, file_url, file_name, file_size):
        """
        Αποθήκευση μηνύματος στη βάση.
        """
        building_id = int(self.room_name.replace('chat_', ''))
        chat_room = ChatRoom.objects.get(building_id=building_id)
        
        return ChatMessage.objects.create(
            chat_room=chat_room,
            sender=self.scope["user"],
            content=content,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size
        )

    @database_sync_to_async
    def update_participant_status(self, is_online):
        """
        Ενημέρωση κατάστασης συμμετέχοντα.
        """
        building_id = int(self.room_name.replace('chat_', ''))
        chat_room = ChatRoom.objects.get(building_id=building_id)
        
        participant, created = ChatParticipant.objects.get_or_create(
            chat_room=chat_room,
            user=self.scope["user"],
            defaults={'is_online': is_online}
        )
        
        if not created:
            participant.is_online = is_online
            participant.save()

    @database_sync_to_async
    def update_notifications(self):
        """
        Ενημέρωση ειδοποιήσεων για μη διαβασμένα μηνύματα.
        """
        building_id = int(self.room_name.replace('chat_', ''))
        chat_room = ChatRoom.objects.get(building_id=building_id)
        
        # Ενημέρωση ειδοποιήσεων για όλους τους συμμετέχοντες εκτός από τον αποστολέα
        participants = chat_room.participants.exclude(user=self.scope["user"])
        
        for participant in participants:
            notification, created = ChatNotification.objects.get_or_create(
                chat_room=chat_room,
                user=participant.user,
                defaults={'unread_count': 1}
            )
            
            if not created:
                notification.unread_count += 1
                notification.save()

    @database_sync_to_async
    def get_sender_role(self, sender):
        """
        Επιστροφή του ρόλου του αποστολέα στο κτίριο.
        """
        building_id = int(self.room_name.replace('chat_', ''))
        chat_room = ChatRoom.objects.get(building_id=building_id)
        building = chat_room.building
        
        if sender.is_manager_of(building):
            return "manager"
        elif sender.is_resident_of(building):
            return "resident"
        else:
            return "other"

    @database_sync_to_async
    def mark_message_as_read(self, message_id):
        """
        Σήμανση μηνύματος ως διαβασμένο.
        """
        try:
            building_id = int(self.room_name.replace('chat_', ''))
            chat_room = ChatRoom.objects.get(building_id=building_id)
            
            notification, created = ChatNotification.objects.get_or_create(
                chat_room=chat_room,
                user=self.scope["user"],
                defaults={'unread_count': 0}
            )
            
            if not created and notification.unread_count > 0:
                notification.unread_count = max(0, notification.unread_count - 1)
                notification.last_read_at = timezone.now()
                notification.save()
        except (ValueError, ChatRoom.DoesNotExist):
            pass 
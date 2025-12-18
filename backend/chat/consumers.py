import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ChatRoom, ChatMessage, ChatParticipant, ChatNotification, MessageReaction, OnlineStatus

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
        
        # Ενημέρωση κατάστασης συμμετέχοντα (participant + online status)
        await self.update_participant_status(True)
        await self.update_online_status(True)
        
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
        
        # Broadcast presence update
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': self.scope["user"].id,
                'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                'is_online': True,
                'status_message': '',
                'timestamp': timezone.now().isoformat()
            }
        )

    async def disconnect(self, close_code):
        """
        Αποσύνδεση από το WebSocket.
        """
        # Ενημέρωση κατάστασης (participant + online status)
        await self.update_participant_status(False)
        await self.update_online_status(False)
        
        # Broadcast presence update (offline)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': self.scope["user"].id,
                'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                'is_online': False,
                'status_message': '',
                'timestamp': timezone.now().isoformat()
            }
        )
        
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
        elif message_type == 'reaction':
            await self.handle_reaction(text_data_json)
        elif message_type == 'edit':
            await self.handle_edit_message(text_data_json)
        elif message_type == 'delete':
            await self.handle_delete_message(text_data_json)
        elif message_type == 'heartbeat':
            await self.handle_heartbeat(text_data_json)
        elif message_type == 'presence':
            await self.handle_presence_update(text_data_json)

    async def handle_chat_message(self, data):
        """
        Επεξεργασία μηνύματος chat.
        """
        message_content = data.get('message', '').strip()
        message_type = data.get('message_type', 'text')
        file_url = data.get('file_url', '')
        file_name = data.get('file_name', '')
        file_size = data.get('file_size', 0)
        reply_to_id = data.get('reply_to')
        
        if not message_content and message_type == 'text':
            return
        
        # Αποθήκευση μηνύματος στη βάση
        message = await self.save_message(
            message_content, message_type, file_url, file_name, file_size, reply_to_id
        )
        
        # Ενημέρωση ειδοποιήσεων
        await self.update_notifications()
        
        # Πάρε reply_to data αν υπάρχει
        reply_to_data = None
        if message.reply_to:
            reply_to_data = await self.get_reply_to_data(message.reply_to_id)
        
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
                'reply_to': message.reply_to_id,
                'reply_to_data': reply_to_data,
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

    async def handle_reaction(self, data):
        """
        Επεξεργασία emoji reaction.
        """
        message_id = data.get('message_id')
        emoji = data.get('emoji', '').strip()
        
        if not message_id or not emoji:
            return
        
        result = await self.toggle_reaction(message_id, emoji)
        
        if result:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_reaction',
                    'message_id': message_id,
                    'emoji': emoji,
                    'user_id': self.scope["user"].id,
                    'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                    'action': result['action'],
                    'reactions': result['reactions'],
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def handle_edit_message(self, data):
        """
        Επεξεργασία αλλαγής μηνύματος.
        """
        message_id = data.get('message_id')
        new_content = data.get('content', '').strip()
        
        if not message_id or not new_content:
            return
        
        result = await self.edit_message(message_id, new_content)
        
        if result:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_edited',
                    'message_id': message_id,
                    'content': new_content,
                    'edited_at': result['edited_at'],
                    'user_id': self.scope["user"].id,
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def handle_delete_message(self, data):
        """
        Επεξεργασία διαγραφής μηνύματος (soft delete).
        """
        message_id = data.get('message_id')
        
        if not message_id:
            return
        
        result = await self.delete_message(message_id)
        
        if result:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted',
                    'message_id': message_id,
                    'deleted_at': result['deleted_at'],
                    'user_id': self.scope["user"].id,
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def handle_heartbeat(self, data):
        """
        Επεξεργασία heartbeat - ενημέρωση online status.
        """
        # Ενημέρωση last_activity στο OnlineStatus
        await self.update_online_status(True)
        
        # Στείλε επιβεβαίωση πίσω στον client
        await self.send(text_data=json.dumps({
            'type': 'heartbeat_ack',
            'timestamp': timezone.now().isoformat()
        }))

    async def handle_presence_update(self, data):
        """
        Επεξεργασία αλλαγής κατάστασης παρουσίας.
        """
        is_online = data.get('is_online', True)
        status_message = data.get('status_message', '')
        
        await self.update_online_status(is_online, status_message)
        
        # Broadcast presence change to all in room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': self.scope["user"].id,
                'user_name': self.scope["user"].get_full_name() or self.scope["user"].email,
                'is_online': is_online,
                'status_message': status_message,
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
            'reply_to': event.get('reply_to'),
            'reply_to_data': event.get('reply_to_data'),
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

    async def message_reaction(self, event):
        """
        Αποστολή reaction event.
        """
        await self.send(text_data=json.dumps({
            'type': 'message_reaction',
            'message_id': event['message_id'],
            'emoji': event['emoji'],
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'action': event['action'],
            'reactions': event['reactions'],
            'timestamp': event['timestamp']
        }))

    async def message_edited(self, event):
        """
        Αποστολή message edited event.
        """
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'message_id': event['message_id'],
            'content': event['content'],
            'edited_at': event['edited_at'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp']
        }))

    async def message_deleted(self, event):
        """
        Αποστολή message deleted event.
        """
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deleted_at': event['deleted_at'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp']
        }))

    async def presence_update(self, event):
        """
        Αποστολή presence update event.
        """
        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'is_online': event['is_online'],
            'status_message': event.get('status_message', ''),
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
    def save_message(self, content, message_type, file_url, file_name, file_size, reply_to_id=None):
        """
        Αποθήκευση μηνύματος στη βάση.
        """
        building_id = int(self.room_name.replace('chat_', ''))
        chat_room = ChatRoom.objects.get(building_id=building_id)
        
        reply_to = None
        if reply_to_id:
            try:
                reply_to = ChatMessage.objects.get(id=reply_to_id)
            except ChatMessage.DoesNotExist:
                pass
        
        return ChatMessage.objects.create(
            chat_room=chat_room,
            sender=self.scope["user"],
            content=content,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size,
            reply_to=reply_to
        )

    @database_sync_to_async
    def get_reply_to_data(self, reply_to_id):
        """
        Πάρε τα data του μηνύματος που απαντάει.
        """
        try:
            reply_message = ChatMessage.objects.select_related('sender').get(id=reply_to_id)
            return {
                'id': reply_message.id,
                'sender_name': reply_message.sender.get_full_name() or reply_message.sender.email,
                'content': reply_message.content[:100] + '...' if len(reply_message.content) > 100 else reply_message.content,
                'message_type': reply_message.message_type,
                'is_deleted': reply_message.is_deleted
            }
        except ChatMessage.DoesNotExist:
            return None

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

    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji):
        """
        Toggle reaction σε μήνυμα.
        """
        try:
            message = ChatMessage.objects.get(id=message_id)
            user = self.scope["user"]
            
            # Έλεγχος αν το μήνυμα έχει διαγραφεί
            if message.is_deleted:
                return None
            
            # Toggle - αν υπάρχει αφαίρεσε, αλλιώς πρόσθεσε
            reaction, created = MessageReaction.objects.get_or_create(
                message=message,
                user=user,
                emoji=emoji
            )
            
            if not created:
                reaction.delete()
                action = 'removed'
            else:
                action = 'added'
            
            # Επιστροφή updated reactions
            reactions = self._get_reactions_sync(message, user)
            
            return {
                'action': action,
                'reactions': reactions
            }
        except ChatMessage.DoesNotExist:
            return None

    def _get_reactions_sync(self, message, current_user):
        """Helper για reactions (sync version)"""
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

    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        """
        Επεξεργασία μηνύματος.
        """
        try:
            message = ChatMessage.objects.get(id=message_id)
            user = self.scope["user"]
            
            # Έλεγχος αν ο χρήστης είναι ο αποστολέας
            if message.sender != user:
                return None
            
            # Έλεγχος αν το μήνυμα έχει διαγραφεί
            if message.is_deleted:
                return None
            
            message.content = new_content
            message.is_edited = True
            message.edited_at = timezone.now()
            message.save(update_fields=['content', 'is_edited', 'edited_at'])
            
            return {
                'edited_at': message.edited_at.isoformat()
            }
        except ChatMessage.DoesNotExist:
            return None

    @database_sync_to_async
    def delete_message(self, message_id):
        """
        Soft delete μηνύματος.
        """
        try:
            message = ChatMessage.objects.get(id=message_id)
            user = self.scope["user"]
            
            # Έλεγχος αν ο χρήστης είναι ο αποστολέας
            if message.sender != user:
                return None
            
            # Έλεγχος αν το μήνυμα έχει ήδη διαγραφεί
            if message.is_deleted:
                return None
            
            message.is_deleted = True
            message.deleted_at = timezone.now()
            message.save(update_fields=['is_deleted', 'deleted_at'])
            
            return {
                'deleted_at': message.deleted_at.isoformat()
            }
        except ChatMessage.DoesNotExist:
            return None

    @database_sync_to_async
    def update_online_status(self, is_online, status_message=None):
        """
        Ενημέρωση online status χρήστη.
        """
        user = self.scope["user"]
        
        defaults = {
            'is_online': is_online,
        }
        if status_message is not None:
            defaults['status_message'] = status_message
        
        online_status, created = OnlineStatus.objects.update_or_create(
            user=user,
            defaults=defaults
        )
        
        # Force update last_activity (auto_now won't work with update_or_create)
        online_status.save(update_fields=['is_online'])
        
        return online_status
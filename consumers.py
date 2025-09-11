import json
from channels.generic.websocket import AsyncWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")

        if self.user is None or not self.user.is_authenticated:
            await self.close()
            return

        self.group_name = f"user_{self.user.id}_notifications"

        # Εγγραφή του χρήστη στο προσωπικό του group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket connected for user {self.user.id} in group {self.group_name}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            # Αποχώρηση από το group
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info(f"WebSocket disconnected for user {self.user.id} from group {self.group_name}")

    # Μέθοδος που καλείται όταν στέλνεται μήνυμα στο group
    async def send_notification(self, event):
        message_data = event['message']

        # Αποστολή του μηνύματος στον client μέσω WebSocket
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'message': message_data,
        }))
        logger.info(f"Sent notification to user {self.user.id}: {message_data.get('type')}")
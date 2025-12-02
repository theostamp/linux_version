import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import logging
import os

logger = logging.getLogger(__name__)

class PushNotificationService:
    _initialized = False

    @classmethod
    def initialize(cls):
        if cls._initialized:
            return
        
        try:
            # Check if app is already initialized
            if not firebase_admin._apps:
                cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
                
                if cred_path and os.path.exists(str(cred_path)):
                    cred = credentials.Certificate(str(cred_path))
                    firebase_admin.initialize_app(cred)
                    cls._initialized = True
                    logger.info("Firebase Admin initialized successfully")
                else:
                    logger.warning(f"Firebase credentials not found at {cred_path}")
            else:
                cls._initialized = True
                
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin: {e}")

    @staticmethod
    def send_multicast(tokens, title, body, data=None):
        """
        Send a message to multiple devices.
        """
        PushNotificationService.initialize()
        
        if not firebase_admin._apps:
            logger.warning("Firebase app not initialized, skipping push notification")
            return None
            
        if not tokens:
            return None

        # Clean data (must be strings)
        cleaned_data = {}
        if data:
            for k, v in data.items():
                cleaned_data[str(k)] = str(v)

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=cleaned_data,
            tokens=tokens,
        )
        
        try:
            response = messaging.send_multicast(message)
            logger.info(f"Push notification sent: {response.success_count} success, {response.failure_count} failure")
            
            # Handle failed tokens (optional cleanup)
            if response.failure_count > 0:
                responses = response.responses
                failed_tokens = []
                for idx, resp in enumerate(responses):
                    if not resp.success:
                        # The order of responses corresponds to the order of the registration tokens.
                        failed_tokens.append(tokens[idx])
                        logger.warning(f"Failed to send to token {tokens[idx]}: {resp.exception}")
                        
            return response
        except Exception as e:
            logger.error(f"Error sending multicast message: {e}")
            return None

    @staticmethod
    def send_to_user(user, title, body, data=None):
        """
        Send notification to all active devices of a user.
        """
        from .models import UserDeviceToken
        
        tokens = list(UserDeviceToken.objects.filter(
            user=user, 
            is_active=True
        ).values_list('token', flat=True))
        
        if tokens:
            return PushNotificationService.send_multicast(tokens, title, body, data)
        return None




"""
Push Notification Provider using Firebase Cloud Messaging (FCM).

Supports:
- Android push notifications
- iOS push notifications  
- Web push notifications

Documentation: https://firebase.google.com/docs/cloud-messaging
"""
import logging
from typing import List, Dict, Any, Optional
from django.conf import settings

from .base import BaseProvider, ProviderResult, ProviderConfig, ChannelType

logger = logging.getLogger(__name__)


class PushNotificationProvider(BaseProvider):
    """
    Firebase Cloud Messaging (FCM) Push Notification Provider.
    
    Setup requirements:
    1. Create Firebase project
    2. Download service account key JSON
    3. Configure in Django settings:
       - FIREBASE_CREDENTIALS_PATH (path to JSON file)
       - Or FIREBASE_CREDENTIALS_JSON (JSON content as dict)
       - PUSH_NOTIFICATIONS_ENABLED
    
    Usage:
        provider = PushNotificationProvider()
        result = provider.send(
            device_token,
            "Νέα ειδοποίηση",
            title="Κοινόχρηστα",
            data={"type": "common_expense", "building_id": "1"}
        )
    """
    
    channel_type = ChannelType.PUSH
    provider_name = "firebase"
    
    _firebase_app = None
    _messaging = None
    
    def __init__(self, config: ProviderConfig = None):
        if config is None:
            config = self._build_config_from_settings()
        super().__init__(config)
        
        self._initialize_firebase()
    
    @staticmethod
    def _build_config_from_settings() -> ProviderConfig:
        """Build config from Django settings."""
        return ProviderConfig(
            api_key=getattr(settings, 'FIREBASE_CREDENTIALS_PATH', ''),
            extra={
                'credentials_json': getattr(settings, 'FIREBASE_CREDENTIALS_JSON', None),
            },
            is_enabled=getattr(settings, 'PUSH_NOTIFICATIONS_ENABLED', False),
        )
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK."""
        if not self.config.is_enabled:
            return
            
        try:
            import firebase_admin
            from firebase_admin import credentials, messaging
            
            # Check if already initialized
            if PushNotificationProvider._firebase_app is not None:
                PushNotificationProvider._messaging = messaging
                return
            
            # Try to get credentials
            cred = None
            
            # From JSON dict in settings
            if self.config.extra.get('credentials_json'):
                cred = credentials.Certificate(self.config.extra['credentials_json'])
            # From file path
            elif self.config.api_key:
                cred = credentials.Certificate(self.config.api_key)
            
            if cred:
                PushNotificationProvider._firebase_app = firebase_admin.initialize_app(cred)
                PushNotificationProvider._messaging = messaging
                logger.info("Firebase Admin SDK initialized successfully")
            else:
                logger.warning("No Firebase credentials configured")
                
        except ImportError:
            logger.warning("firebase-admin package not installed. Run: pip install firebase-admin")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
    
    @property
    def messaging(self):
        """Get Firebase messaging module."""
        return PushNotificationProvider._messaging
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """
        Send push notification to a single device.
        
        Args:
            recipient: Device FCM token
            message: Notification body text
            **kwargs:
                - title: Notification title
                - data: Dict of custom data to send
                - image: Image URL to display
                - click_action: URL to open on click (web)
                - badge: Badge count (iOS)
                - sound: Notification sound
                - android_config: Android-specific options
                - ios_config: iOS-specific options (APNs)
                - web_config: Web push options
                
        Returns:
            ProviderResult
        """
        if not self.config.is_enabled:
            return ProviderResult.error_result("Push notifications disabled")
        
        if not self.messaging:
            return ProviderResult.error_result("Firebase not initialized")
        
        try:
            title = kwargs.get('title', 'New Concierge')
            data = kwargs.get('data', {})
            image = kwargs.get('image')
            
            # Build notification
            notification = self.messaging.Notification(
                title=title,
                body=message,
                image=image
            )
            
            # Build message
            fcm_message = self.messaging.Message(
                notification=notification,
                data={k: str(v) for k, v in data.items()} if data else None,
                token=recipient,
                android=self._build_android_config(kwargs),
                apns=self._build_apns_config(kwargs),
                webpush=self._build_webpush_config(kwargs),
            )
            
            # Send
            response = self.messaging.send(fcm_message)
            
            return ProviderResult.success_result(
                message_id=response,
                raw_response={'message_id': response}
            )
            
        except self.messaging.UnregisteredError:
            return ProviderResult.error_result(
                error_message="Device token is no longer valid",
                error_code="UNREGISTERED"
            )
        except self.messaging.SenderIdMismatchError:
            return ProviderResult.error_result(
                error_message="Sender ID mismatch",
                error_code="SENDER_MISMATCH"
            )
        except Exception as e:
            logger.error(f"Push notification error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="SEND_ERROR"
            )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """
        Send push notification to multiple devices.
        
        Uses FCM multicast for efficiency (up to 500 tokens per request).
        """
        if not self.config.is_enabled:
            return [ProviderResult.error_result("Push notifications disabled") for _ in recipients]
        
        if not self.messaging:
            return [ProviderResult.error_result("Firebase not initialized") for _ in recipients]
        
        title = kwargs.get('title', 'New Concierge')
        data = kwargs.get('data', {})
        image = kwargs.get('image')
        
        # Build notification
        notification = self.messaging.Notification(
            title=title,
            body=message,
            image=image
        )
        
        results = []
        
        # FCM allows max 500 tokens per multicast
        batch_size = 500
        for i in range(0, len(recipients), batch_size):
            batch_tokens = recipients[i:i + batch_size]
            
            try:
                multicast = self.messaging.MulticastMessage(
                    notification=notification,
                    data={k: str(v) for k, v in data.items()} if data else None,
                    tokens=batch_tokens,
                    android=self._build_android_config(kwargs),
                    apns=self._build_apns_config(kwargs),
                    webpush=self._build_webpush_config(kwargs),
                )
                
                response = self.messaging.send_each_for_multicast(multicast)
                
                # Process individual results
                for idx, send_response in enumerate(response.responses):
                    if send_response.success:
                        results.append(ProviderResult.success_result(
                            message_id=send_response.message_id,
                            raw_response={'success': True}
                        ))
                    else:
                        results.append(ProviderResult.error_result(
                            error_message=str(send_response.exception),
                            error_code="SEND_ERROR"
                        ))
                        
            except Exception as e:
                logger.error(f"Push notification batch error: {e}")
                # Add error result for all tokens in failed batch
                for _ in batch_tokens:
                    results.append(ProviderResult.error_result(
                        error_message=str(e),
                        error_code="BATCH_ERROR"
                    ))
        
        return results
    
    def send_to_topic(self, topic: str, message: str, **kwargs) -> ProviderResult:
        """
        Send push notification to a topic.
        
        Users must subscribe to topics to receive these messages.
        
        Args:
            topic: Topic name (e.g., "building_1_announcements")
            message: Notification body
            **kwargs: Same as send()
            
        Returns:
            ProviderResult
        """
        if not self.config.is_enabled:
            return ProviderResult.error_result("Push notifications disabled")
        
        if not self.messaging:
            return ProviderResult.error_result("Firebase not initialized")
        
        title = kwargs.get('title', 'New Concierge')
        data = kwargs.get('data', {})
        
        try:
            notification = self.messaging.Notification(
                title=title,
                body=message,
            )
            
            fcm_message = self.messaging.Message(
                notification=notification,
                data={k: str(v) for k, v in data.items()} if data else None,
                topic=topic,
            )
            
            response = self.messaging.send(fcm_message)
            
            return ProviderResult.success_result(
                message_id=response,
                raw_response={'message_id': response, 'topic': topic}
            )
            
        except Exception as e:
            logger.error(f"Topic notification error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="TOPIC_ERROR"
            )
    
    def subscribe_to_topic(self, tokens: List[str], topic: str) -> Dict[str, Any]:
        """
        Subscribe devices to a topic.
        
        Args:
            tokens: List of device tokens
            topic: Topic name
            
        Returns:
            Dict with success_count and failure_count
        """
        if not self.messaging:
            return {'success_count': 0, 'failure_count': len(tokens), 'error': 'Firebase not initialized'}
        
        try:
            response = self.messaging.subscribe_to_topic(tokens, topic)
            return {
                'success_count': response.success_count,
                'failure_count': response.failure_count,
                'errors': [str(e.reason) for e in response.errors] if response.errors else []
            }
        except Exception as e:
            return {'success_count': 0, 'failure_count': len(tokens), 'error': str(e)}
    
    def unsubscribe_from_topic(self, tokens: List[str], topic: str) -> Dict[str, Any]:
        """
        Unsubscribe devices from a topic.
        """
        if not self.messaging:
            return {'success_count': 0, 'failure_count': len(tokens), 'error': 'Firebase not initialized'}
        
        try:
            response = self.messaging.unsubscribe_from_topic(tokens, topic)
            return {
                'success_count': response.success_count,
                'failure_count': response.failure_count,
                'errors': [str(e.reason) for e in response.errors] if response.errors else []
            }
        except Exception as e:
            return {'success_count': 0, 'failure_count': len(tokens), 'error': str(e)}
    
    def _build_android_config(self, kwargs: Dict) -> Optional[Any]:
        """Build Android-specific notification config."""
        if not self.messaging:
            return None
            
        android_config = kwargs.get('android_config')
        if android_config:
            return android_config
        
        # Default Android config
        return self.messaging.AndroidConfig(
            priority='high',
            notification=self.messaging.AndroidNotification(
                click_action='FLUTTER_NOTIFICATION_CLICK',
                channel_id='new_concierge_notifications',
                sound='default',
            )
        )
    
    def _build_apns_config(self, kwargs: Dict) -> Optional[Any]:
        """Build iOS (APNs) specific notification config."""
        if not self.messaging:
            return None
            
        ios_config = kwargs.get('ios_config')
        if ios_config:
            return ios_config
        
        badge = kwargs.get('badge', 1)
        
        # Default iOS config
        return self.messaging.APNSConfig(
            payload=self.messaging.APNSPayload(
                aps=self.messaging.Aps(
                    badge=badge,
                    sound='default',
                )
            )
        )
    
    def _build_webpush_config(self, kwargs: Dict) -> Optional[Any]:
        """Build Web Push specific config."""
        if not self.messaging:
            return None
            
        web_config = kwargs.get('web_config')
        if web_config:
            return web_config
        
        click_action = kwargs.get('click_action')
        icon = kwargs.get('icon', '/icons/notification-icon.png')
        
        # Default web push config
        return self.messaging.WebpushConfig(
            notification=self.messaging.WebpushNotification(
                icon=icon,
            ),
            fcm_options=self.messaging.WebpushFCMOptions(
                link=click_action
            ) if click_action else None
        )
    
    def check_health(self) -> bool:
        """Check if Firebase connection is operational."""
        return self.config.is_enabled and self.messaging is not None


class MockPushProvider(PushNotificationProvider):
    """Mock Push provider for testing."""
    
    provider_name = "mock_push"
    
    def _initialize_firebase(self):
        """Skip Firebase initialization for mock."""
        pass
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """Simulate sending push notification."""
        title = kwargs.get('title', 'Test')
        self.logger.info(f"[MOCK PUSH] To: {recipient[:20]}...")
        self.logger.info(f"[MOCK PUSH] Title: {title}")
        self.logger.info(f"[MOCK PUSH] Body: {message[:100]}...")
        
        return ProviderResult.success_result(
            message_id=f"push_mock_{id(message)}",
            raw_response={'simulated': True, 'token': recipient[:20]}
        )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """Simulate sending bulk push notifications."""
        results = []
        for recipient in recipients:
            results.append(self.send(recipient, message, **kwargs))
        return results
    
    def check_health(self) -> bool:
        """Mock is always healthy."""
        return True


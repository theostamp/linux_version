"""
Viber Business Messages Provider.

Viber Business Messages allows sending messages to users who have opted in.
Requires a Viber Business account and API token.

Documentation: https://developers.viber.com/docs/api/rest-bot-api/
"""
import logging
from typing import List, Dict, Any, Optional
from django.conf import settings
import requests

from .base import BaseProvider, ProviderResult, ProviderConfig, ChannelType

logger = logging.getLogger(__name__)


class ViberProvider(BaseProvider):
    """
    Viber Business Messages Provider.
    
    Setup requirements:
    1. Create a Viber Business account
    2. Get API token from Viber Admin Panel
    3. Set up webhook for incoming messages (optional)
    4. Configure in Django settings:
       - VIBER_API_TOKEN
       - VIBER_SENDER_NAME
       - VIBER_SENDER_AVATAR (optional URL)
    """
    
    channel_type = ChannelType.VIBER
    provider_name = "viber"
    
    BASE_URL = "https://chatapi.viber.com/pa"
    
    def __init__(self, config: ProviderConfig = None):
        if config is None:
            config = self._build_config_from_settings()
        super().__init__(config)
        
        self.api_token = config.api_key
        self.sender_name = config.sender_id or "New Concierge"
        self.sender_avatar = config.extra.get('avatar_url', '')
    
    @staticmethod
    def _build_config_from_settings() -> ProviderConfig:
        """Build config from Django settings."""
        return ProviderConfig(
            api_key=getattr(settings, 'VIBER_API_TOKEN', ''),
            sender_id=getattr(settings, 'VIBER_SENDER_NAME', 'New Concierge'),
            extra={
                'avatar_url': getattr(settings, 'VIBER_SENDER_AVATAR', ''),
            },
            is_enabled=getattr(settings, 'VIBER_ENABLED', False),
        )
    
    def _headers(self) -> Dict[str, str]:
        """Get API headers."""
        return {
            'X-Viber-Auth-Token': self.api_token,
            'Content-Type': 'application/json'
        }
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """
        Send message to a Viber user.
        
        Args:
            recipient: Viber user ID (received when user starts conversation)
            message: Text message to send
            **kwargs:
                - keyboard: Optional keyboard buttons
                - tracking_data: Optional tracking data
                - rich_media: Optional rich media content
                
        Returns:
            ProviderResult
        """
        if not self.config.is_enabled:
            return ProviderResult.error_result("Viber provider is disabled")
        
        if not self.api_token:
            return ProviderResult.error_result("Viber API token not configured")
        
        payload = {
            'receiver': recipient,
            'type': 'text',
            'text': message,
            'sender': {
                'name': self.sender_name,
            }
        }
        
        if self.sender_avatar:
            payload['sender']['avatar'] = self.sender_avatar
        
        # Add optional keyboard
        if kwargs.get('keyboard'):
            payload['keyboard'] = kwargs['keyboard']
            
        # Add tracking data
        if kwargs.get('tracking_data'):
            payload['tracking_data'] = kwargs['tracking_data']
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/send_message",
                headers=self._headers(),
                json=payload,
                timeout=30
            )
            
            data = response.json()
            
            if data.get('status') == 0:
                return ProviderResult.success_result(
                    message_id=str(data.get('message_token', '')),
                    raw_response=data
                )
            else:
                return ProviderResult.error_result(
                    error_message=data.get('status_message', 'Unknown error'),
                    error_code=str(data.get('status')),
                    raw_response=data
                )
                
        except requests.RequestException as e:
            logger.error(f"Viber API error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """
        Send message to multiple Viber users.
        
        Note: Viber recommends using broadcast_message for large audiences,
        but requires minimum 10,000 subscribers.
        For smaller lists, we send individually.
        """
        if len(recipients) >= 10000:
            return self._send_broadcast(recipients, message, **kwargs)
        
        results = []
        for recipient in recipients:
            results.append(self.send(recipient, message, **kwargs))
        return results
    
    def _send_broadcast(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """
        Send broadcast message (for 10,000+ subscribers).
        """
        if not self.config.is_enabled:
            return [ProviderResult.error_result("Viber provider is disabled") for _ in recipients]
        
        payload = {
            'broadcast_list': recipients,
            'type': 'text',
            'text': message,
            'sender': {
                'name': self.sender_name,
            }
        }
        
        if self.sender_avatar:
            payload['sender']['avatar'] = self.sender_avatar
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/broadcast_message",
                headers=self._headers(),
                json=payload,
                timeout=60
            )
            
            data = response.json()
            
            if data.get('status') == 0:
                result = ProviderResult.success_result(
                    message_id=str(data.get('message_token', '')),
                    raw_response=data
                )
                return [result for _ in recipients]
            else:
                result = ProviderResult.error_result(
                    error_message=data.get('status_message', 'Unknown error'),
                    error_code=str(data.get('status')),
                    raw_response=data
                )
                return [result for _ in recipients]
                
        except requests.RequestException as e:
            logger.error(f"Viber broadcast API error: {e}")
            result = ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
            return [result for _ in recipients]
    
    def send_rich_media(self, recipient: str, rich_media: Dict[str, Any], **kwargs) -> ProviderResult:
        """
        Send rich media message (carousel, buttons, etc.).
        
        Args:
            recipient: Viber user ID
            rich_media: Rich media content object
            
        Returns:
            ProviderResult
        """
        if not self.config.is_enabled:
            return ProviderResult.error_result("Viber provider is disabled")
        
        payload = {
            'receiver': recipient,
            'type': 'rich_media',
            'min_api_version': 2,
            'rich_media': rich_media,
            'sender': {
                'name': self.sender_name,
            }
        }
        
        if self.sender_avatar:
            payload['sender']['avatar'] = self.sender_avatar
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/send_message",
                headers=self._headers(),
                json=payload,
                timeout=30
            )
            
            data = response.json()
            
            if data.get('status') == 0:
                return ProviderResult.success_result(
                    message_id=str(data.get('message_token', '')),
                    raw_response=data
                )
            else:
                return ProviderResult.error_result(
                    error_message=data.get('status_message', 'Unknown error'),
                    error_code=str(data.get('status')),
                    raw_response=data
                )
                
        except requests.RequestException as e:
            logger.error(f"Viber API error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
    
    def get_account_info(self) -> Optional[Dict[str, Any]]:
        """Get Viber bot account info."""
        if not self.api_token:
            return None
            
        try:
            response = requests.post(
                f"{self.BASE_URL}/get_account_info",
                headers=self._headers(),
                json={},
                timeout=30
            )
            
            data = response.json()
            if data.get('status') == 0:
                return data
            return None
            
        except requests.RequestException:
            return None
    
    def set_webhook(self, url: str, event_types: List[str] = None) -> bool:
        """
        Set webhook URL for receiving messages and events.
        
        Args:
            url: Webhook URL (must be HTTPS)
            event_types: List of event types to subscribe to
                Options: delivered, seen, failed, subscribed, unsubscribed,
                         conversation_started
        """
        if not self.api_token:
            return False
        
        payload = {
            'url': url,
            'event_types': event_types or [
                'delivered', 'seen', 'failed', 
                'subscribed', 'unsubscribed', 
                'conversation_started'
            ],
            'send_name': True,
            'send_photo': True
        }
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/set_webhook",
                headers=self._headers(),
                json=payload,
                timeout=30
            )
            
            data = response.json()
            return data.get('status') == 0
            
        except requests.RequestException:
            return False
    
    def check_health(self) -> bool:
        """Check if Viber connection is operational."""
        account_info = self.get_account_info()
        return account_info is not None and account_info.get('status') == 0


class MockViberProvider(ViberProvider):
    """Mock Viber provider for testing."""
    
    provider_name = "mock_viber"
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """Simulate sending Viber message."""
        self.logger.info(f"[MOCK VIBER] To: {recipient}")
        self.logger.info(f"[MOCK VIBER] Message: {message[:100]}...")
        
        return ProviderResult.success_result(
            message_id=f"viber_mock_{recipient}_{id(message)}",
            raw_response={'simulated': True, 'recipient': recipient}
        )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """Simulate sending bulk Viber messages."""
        results = []
        for recipient in recipients:
            results.append(self.send(recipient, message, **kwargs))
        return results


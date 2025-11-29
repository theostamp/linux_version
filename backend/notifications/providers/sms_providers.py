"""
SMS Provider implementations.

Supported providers (infrastructure ready, need configuration):
- Twilio
- MessageBird  
- Vonage (Nexmo)
- BulkSMS
- Apifon (Greek provider)
- YuBoto (Greek provider)

Configuration is done via Django settings or environment variables.
"""
import re
import logging
from typing import List, Dict, Any, Optional, Type
from django.conf import settings
import requests

from .base import BaseProvider, ProviderResult, ProviderConfig, ChannelType

logger = logging.getLogger(__name__)


class BaseSMSProvider(BaseProvider):
    """Base class for SMS providers."""
    
    channel_type = ChannelType.SMS
    
    def validate_recipient(self, recipient: str) -> bool:
        """Validate phone number format."""
        if not recipient:
            return False
        # Check for valid phone format (E.164 or Greek format)
        cleaned = ''.join(c for c in recipient if c.isdigit() or c == '+')
        # Greek mobiles start with 69, landlines with 21, or international with +
        if cleaned.startswith('+'):
            return len(cleaned) >= 10
        if cleaned.startswith('69') or cleaned.startswith('21'):
            return len(cleaned) >= 10
        return len(cleaned) >= 10


class TwilioSMSProvider(BaseSMSProvider):
    """Twilio SMS Provider."""
    
    provider_name = "twilio"
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.account_sid = config.api_key
        self.auth_token = config.api_secret
        self.from_number = config.sender_id
        self.base_url = config.base_url or f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """Send SMS via Twilio."""
        if not self.config.is_enabled:
            return ProviderResult.error_result("Provider is disabled")
            
        formatted_phone = self.format_phone_number(recipient)
        
        try:
            response = requests.post(
                self.base_url,
                auth=(self.account_sid, self.auth_token),
                data={
                    'To': formatted_phone,
                    'From': self.from_number,
                    'Body': message
                },
                timeout=30
            )
            
            data = response.json()
            
            if response.status_code in [200, 201]:
                return ProviderResult.success_result(
                    message_id=data.get('sid'),
                    raw_response=data,
                    cost=float(data.get('price', 0)) if data.get('price') else None
                )
            else:
                return ProviderResult.error_result(
                    error_message=data.get('message', 'Unknown error'),
                    error_code=str(data.get('code', response.status_code)),
                    raw_response=data
                )
                
        except requests.RequestException as e:
            logger.error(f"Twilio API error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """Send SMS to multiple recipients."""
        results = []
        for recipient in recipients:
            results.append(self.send(recipient, message, **kwargs))
        return results


class VonageSMSProvider(BaseSMSProvider):
    """Vonage (Nexmo) SMS Provider."""
    
    provider_name = "vonage"
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.api_key = config.api_key
        self.api_secret = config.api_secret
        self.sender_id = config.sender_id or "NewConcierge"
        self.base_url = config.base_url or "https://rest.nexmo.com/sms/json"
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """Send SMS via Vonage."""
        if not self.config.is_enabled:
            return ProviderResult.error_result("Provider is disabled")
            
        formatted_phone = self.format_phone_number(recipient)
        # Remove + for Vonage
        if formatted_phone.startswith('+'):
            formatted_phone = formatted_phone[1:]
        
        try:
            response = requests.post(
                self.base_url,
                json={
                    'api_key': self.api_key,
                    'api_secret': self.api_secret,
                    'to': formatted_phone,
                    'from': self.sender_id,
                    'text': message,
                    'type': 'unicode'  # Support Greek characters
                },
                timeout=30
            )
            
            data = response.json()
            messages = data.get('messages', [{}])
            first_msg = messages[0] if messages else {}
            
            if first_msg.get('status') == '0':
                return ProviderResult.success_result(
                    message_id=first_msg.get('message-id'),
                    raw_response=data,
                    cost=float(first_msg.get('message-price', 0))
                )
            else:
                return ProviderResult.error_result(
                    error_message=first_msg.get('error-text', 'Unknown error'),
                    error_code=first_msg.get('status'),
                    raw_response=data
                )
                
        except requests.RequestException as e:
            logger.error(f"Vonage API error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """Send SMS to multiple recipients."""
        results = []
        for recipient in recipients:
            results.append(self.send(recipient, message, **kwargs))
        return results


class ApifonSMSProvider(BaseSMSProvider):
    """
    Apifon SMS Provider - Greek SMS gateway.
    https://www.apifon.com/
    """
    
    provider_name = "apifon"
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.api_token = config.api_key
        self.sender_id = config.sender_id or "NewConcierge"
        self.base_url = config.base_url or "https://ars.apifon.com/services/api/v1/sms/send"
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """Send SMS via Apifon."""
        if not self.config.is_enabled:
            return ProviderResult.error_result("Provider is disabled")
            
        formatted_phone = self.format_phone_number(recipient)
        
        try:
            response = requests.post(
                self.base_url,
                headers={
                    'Authorization': f'Bearer {self.api_token}',
                    'Content-Type': 'application/json'
                },
                json={
                    'subscribers': [{
                        'number': formatted_phone
                    }],
                    'message': {
                        'sender_id': self.sender_id,
                        'text': message
                    }
                },
                timeout=30
            )
            
            data = response.json()
            
            if response.status_code in [200, 201, 202]:
                return ProviderResult.success_result(
                    message_id=data.get('request_id'),
                    raw_response=data
                )
            else:
                return ProviderResult.error_result(
                    error_message=data.get('message', 'Unknown error'),
                    error_code=str(response.status_code),
                    raw_response=data
                )
                
        except requests.RequestException as e:
            logger.error(f"Apifon API error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """Send SMS to multiple recipients - Apifon supports bulk natively."""
        if not self.config.is_enabled:
            return [ProviderResult.error_result("Provider is disabled") for _ in recipients]
        
        subscribers = [
            {'number': self.format_phone_number(r)} for r in recipients
        ]
        
        try:
            response = requests.post(
                self.base_url,
                headers={
                    'Authorization': f'Bearer {self.api_token}',
                    'Content-Type': 'application/json'
                },
                json={
                    'subscribers': subscribers,
                    'message': {
                        'sender_id': self.sender_id,
                        'text': message
                    }
                },
                timeout=60
            )
            
            data = response.json()
            
            if response.status_code in [200, 201, 202]:
                result = ProviderResult.success_result(
                    message_id=data.get('request_id'),
                    raw_response=data
                )
                return [result for _ in recipients]
            else:
                result = ProviderResult.error_result(
                    error_message=data.get('message', 'Unknown error'),
                    error_code=str(response.status_code),
                    raw_response=data
                )
                return [result for _ in recipients]
                
        except requests.RequestException as e:
            logger.error(f"Apifon API error: {e}")
            result = ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
            return [result for _ in recipients]


class YubotoSMSProvider(BaseSMSProvider):
    """
    Yuboto SMS Provider - Greek SMS gateway.
    https://www.yuboto.com/
    """
    
    provider_name = "yuboto"
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.username = config.api_key
        self.password = config.api_secret
        self.sender_id = config.sender_id or "NewConcierge"
        self.base_url = config.base_url or "https://services.yuboto.com/web2sms/api/v2/smsc.aspx"
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """Send SMS via Yuboto."""
        if not self.config.is_enabled:
            return ProviderResult.error_result("Provider is disabled")
            
        formatted_phone = self.format_phone_number(recipient)
        
        try:
            response = requests.get(
                self.base_url,
                params={
                    'user': self.username,
                    'pass': self.password,
                    'from': self.sender_id,
                    'to': formatted_phone,
                    'text': message,
                    'coding': '2'  # Unicode for Greek
                },
                timeout=30
            )
            
            # Yuboto returns plain text response
            text = response.text.strip()
            
            if text.startswith('OK'):
                # Extract message ID from response like "OK|12345"
                parts = text.split('|')
                message_id = parts[1] if len(parts) > 1 else text
                return ProviderResult.success_result(
                    message_id=message_id,
                    raw_response={'response': text}
                )
            else:
                return ProviderResult.error_result(
                    error_message=text,
                    error_code="YUBOTO_ERROR",
                    raw_response={'response': text}
                )
                
        except requests.RequestException as e:
            logger.error(f"Yuboto API error: {e}")
            return ProviderResult.error_result(
                error_message=str(e),
                error_code="CONNECTION_ERROR"
            )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """Send SMS to multiple recipients."""
        results = []
        for recipient in recipients:
            results.append(self.send(recipient, message, **kwargs))
        return results


class MockSMSProvider(BaseSMSProvider):
    """
    Mock SMS Provider for testing and development.
    Logs messages instead of sending them.
    """
    
    provider_name = "mock"
    
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """Simulate sending SMS."""
        self.logger.info(f"[MOCK SMS] To: {recipient}")
        self.logger.info(f"[MOCK SMS] Message: {message[:100]}...")
        
        return ProviderResult.success_result(
            message_id=f"mock_{recipient}_{id(message)}",
            raw_response={'simulated': True, 'recipient': recipient}
        )
    
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """Simulate sending bulk SMS."""
        results = []
        for recipient in recipients:
            results.append(self.send(recipient, message, **kwargs))
        return results


class SMSProviderFactory:
    """
    Factory for creating SMS provider instances.
    
    Usage:
        provider = SMSProviderFactory.get_provider()
        result = provider.send("+306912345678", "Hello!")
    """
    
    PROVIDERS: Dict[str, Type[BaseSMSProvider]] = {
        'twilio': TwilioSMSProvider,
        'vonage': VonageSMSProvider,
        'apifon': ApifonSMSProvider,
        'yuboto': YubotoSMSProvider,
        'mock': MockSMSProvider,
    }
    
    @classmethod
    def get_provider(cls, provider_name: str = None) -> BaseSMSProvider:
        """
        Get configured SMS provider.
        
        Args:
            provider_name: Specific provider name, or use default from settings
            
        Returns:
            Configured SMS provider instance
        """
        # Get provider name from settings if not specified
        if not provider_name:
            provider_name = getattr(settings, 'SMS_PROVIDER', 'mock')
        
        # Get provider class
        provider_class = cls.PROVIDERS.get(provider_name.lower())
        if not provider_class:
            logger.warning(f"Unknown SMS provider '{provider_name}', using mock")
            provider_class = MockSMSProvider
        
        # Build config from settings
        config = cls._build_config(provider_name)
        
        return provider_class(config)
    
    @classmethod
    def _build_config(cls, provider_name: str) -> ProviderConfig:
        """Build provider config from Django settings."""
        prefix = f"SMS_{provider_name.upper()}_"
        
        return ProviderConfig(
            api_key=getattr(settings, f'{prefix}API_KEY', ''),
            api_secret=getattr(settings, f'{prefix}API_SECRET', ''),
            sender_id=getattr(settings, f'{prefix}SENDER_ID', getattr(settings, 'SMS_DEFAULT_SENDER_ID', 'NewConcierge')),
            base_url=getattr(settings, f'{prefix}BASE_URL', None),
            is_enabled=getattr(settings, 'SMS_ENABLED', False),
            is_sandbox=getattr(settings, 'SMS_SANDBOX_MODE', True),
        )
    
    @classmethod
    def list_providers(cls) -> List[str]:
        """List available provider names."""
        return list(cls.PROVIDERS.keys())


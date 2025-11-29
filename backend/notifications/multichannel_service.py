"""
Multi-Channel Notification Service

Unified service for sending notifications across multiple channels:
- Email (existing)
- SMS
- Viber
- Push Notifications

Handles channel preferences, fallbacks, and delivery tracking.
"""
import logging
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from django.conf import settings
from django.utils import timezone

from .providers.base import ChannelType, ProviderResult
from .providers.sms_providers import SMSProviderFactory
from .providers.viber_provider import ViberProvider, MockViberProvider
from .providers.push_provider import PushNotificationProvider, MockPushProvider

logger = logging.getLogger(__name__)


class ChannelStatus(Enum):
    """Status of a channel for a recipient."""
    AVAILABLE = 'available'
    NOT_CONFIGURED = 'not_configured'
    DISABLED = 'disabled'
    OPTED_OUT = 'opted_out'


@dataclass
class ChannelConfig:
    """Configuration for a notification channel."""
    enabled: bool = False
    priority: int = 0  # Lower = higher priority
    fallback_channels: List[ChannelType] = field(default_factory=list)


@dataclass
class RecipientChannels:
    """Available channels for a recipient."""
    email: Optional[str] = None
    phone: Optional[str] = None  # For SMS
    viber_id: Optional[str] = None
    push_tokens: List[str] = field(default_factory=list)
    
    # Preferences
    preferred_channel: Optional[ChannelType] = None
    disabled_channels: Set[ChannelType] = field(default_factory=set)
    
    def get_available_channels(self) -> List[ChannelType]:
        """Get list of available channels for this recipient."""
        available = []
        
        if self.email and ChannelType.EMAIL not in self.disabled_channels:
            available.append(ChannelType.EMAIL)
            
        if self.phone and ChannelType.SMS not in self.disabled_channels:
            available.append(ChannelType.SMS)
            
        if self.viber_id and ChannelType.VIBER not in self.disabled_channels:
            available.append(ChannelType.VIBER)
            
        if self.push_tokens and ChannelType.PUSH not in self.disabled_channels:
            available.append(ChannelType.PUSH)
            
        return available


@dataclass
class DeliveryResult:
    """Result of multi-channel delivery attempt."""
    recipient_id: str
    successful_channels: List[ChannelType] = field(default_factory=list)
    failed_channels: Dict[ChannelType, str] = field(default_factory=dict)  # channel -> error
    skipped_channels: List[ChannelType] = field(default_factory=list)
    
    @property
    def any_success(self) -> bool:
        return len(self.successful_channels) > 0
    
    @property
    def all_failed(self) -> bool:
        return len(self.successful_channels) == 0 and len(self.failed_channels) > 0


class MultiChannelNotificationService:
    """
    Unified service for sending notifications across multiple channels.
    
    Usage:
        service = MultiChannelNotificationService()
        
        # Send to single recipient
        result = service.send_notification(
            recipient=RecipientChannels(email="user@example.com", phone="+306912345678"),
            subject="Κοινόχρηστα Νοεμβρίου",
            message="Τα κοινόχρηστα είναι διαθέσιμα...",
            channels=[ChannelType.EMAIL, ChannelType.SMS]
        )
        
        # Send to multiple recipients
        results = service.send_bulk(
            recipients=[...],
            subject="...",
            message="...",
            channels=[ChannelType.EMAIL, ChannelType.PUSH]
        )
    """
    
    def __init__(self):
        self._sms_provider = None
        self._viber_provider = None
        self._push_provider = None
        
        # Load channel configurations
        self.channel_configs = self._load_channel_configs()
    
    def _load_channel_configs(self) -> Dict[ChannelType, ChannelConfig]:
        """Load channel configurations from settings."""
        return {
            ChannelType.EMAIL: ChannelConfig(
                enabled=True,  # Always enabled
                priority=1,
                fallback_channels=[]
            ),
            ChannelType.SMS: ChannelConfig(
                enabled=getattr(settings, 'SMS_ENABLED', False),
                priority=2,
                fallback_channels=[ChannelType.EMAIL]
            ),
            ChannelType.VIBER: ChannelConfig(
                enabled=getattr(settings, 'VIBER_ENABLED', False),
                priority=3,
                fallback_channels=[ChannelType.SMS, ChannelType.EMAIL]
            ),
            ChannelType.PUSH: ChannelConfig(
                enabled=getattr(settings, 'PUSH_NOTIFICATIONS_ENABLED', False),
                priority=4,
                fallback_channels=[ChannelType.EMAIL]
            ),
        }
    
    @property
    def sms_provider(self):
        """Lazy-load SMS provider."""
        if self._sms_provider is None:
            self._sms_provider = SMSProviderFactory.get_provider()
        return self._sms_provider
    
    @property
    def viber_provider(self):
        """Lazy-load Viber provider."""
        if self._viber_provider is None:
            if getattr(settings, 'VIBER_ENABLED', False):
                self._viber_provider = ViberProvider()
            else:
                self._viber_provider = MockViberProvider()
        return self._viber_provider
    
    @property
    def push_provider(self):
        """Lazy-load Push provider."""
        if self._push_provider is None:
            if getattr(settings, 'PUSH_NOTIFICATIONS_ENABLED', False):
                self._push_provider = PushNotificationProvider()
            else:
                self._push_provider = MockPushProvider()
        return self._push_provider
    
    def send_notification(
        self,
        recipient: RecipientChannels,
        subject: str,
        message: str,
        channels: List[ChannelType] = None,
        html_message: str = None,
        sms_message: str = None,
        push_title: str = None,
        push_data: Dict = None,
        use_fallbacks: bool = True,
    ) -> DeliveryResult:
        """
        Send notification to a single recipient.
        
        Args:
            recipient: RecipientChannels with contact info
            subject: Notification subject (for email)
            message: Main message content
            channels: List of channels to use (default: all available)
            html_message: HTML version for email (optional)
            sms_message: Shortened message for SMS (optional, defaults to message)
            push_title: Title for push notification (optional, defaults to subject)
            push_data: Extra data for push notification
            use_fallbacks: Whether to try fallback channels on failure
            
        Returns:
            DeliveryResult with success/failure per channel
        """
        result = DeliveryResult(recipient_id=recipient.email or recipient.phone or 'unknown')
        
        # Determine channels to use
        if channels is None:
            channels = recipient.get_available_channels()
        else:
            # Filter by what's available for recipient
            channels = [c for c in channels if c in recipient.get_available_channels()]
        
        # Sort by priority
        channels = sorted(channels, key=lambda c: self.channel_configs[c].priority)
        
        for channel in channels:
            if not self.channel_configs[channel].enabled:
                result.skipped_channels.append(channel)
                continue
            
            try:
                success = self._send_via_channel(
                    channel=channel,
                    recipient=recipient,
                    subject=subject,
                    message=message,
                    html_message=html_message,
                    sms_message=sms_message,
                    push_title=push_title,
                    push_data=push_data,
                )
                
                if success:
                    result.successful_channels.append(channel)
                else:
                    result.failed_channels[channel] = "Send failed"
                    
            except Exception as e:
                logger.error(f"Error sending via {channel}: {e}")
                result.failed_channels[channel] = str(e)
        
        # Try fallbacks if all channels failed
        if use_fallbacks and result.all_failed:
            for failed_channel in list(result.failed_channels.keys()):
                fallbacks = self.channel_configs[failed_channel].fallback_channels
                for fallback in fallbacks:
                    if fallback not in result.failed_channels and fallback in recipient.get_available_channels():
                        try:
                            success = self._send_via_channel(
                                channel=fallback,
                                recipient=recipient,
                                subject=subject,
                                message=message,
                                html_message=html_message,
                                sms_message=sms_message,
                                push_title=push_title,
                                push_data=push_data,
                            )
                            if success:
                                result.successful_channels.append(fallback)
                                break
                        except Exception as e:
                            result.failed_channels[fallback] = str(e)
        
        return result
    
    def _send_via_channel(
        self,
        channel: ChannelType,
        recipient: RecipientChannels,
        subject: str,
        message: str,
        html_message: str = None,
        sms_message: str = None,
        push_title: str = None,
        push_data: Dict = None,
    ) -> bool:
        """Send via a specific channel."""
        
        if channel == ChannelType.EMAIL:
            return self._send_email(
                to_email=recipient.email,
                subject=subject,
                message=message,
                html_message=html_message
            )
            
        elif channel == ChannelType.SMS:
            sms_text = sms_message or self._truncate_for_sms(message)
            result = self.sms_provider.send(recipient.phone, sms_text)
            return result.success
            
        elif channel == ChannelType.VIBER:
            result = self.viber_provider.send(recipient.viber_id, message)
            return result.success
            
        elif channel == ChannelType.PUSH:
            title = push_title or subject
            for token in recipient.push_tokens:
                result = self.push_provider.send(
                    token, 
                    message,
                    title=title,
                    data=push_data or {}
                )
                if result.success:
                    return True
            return False
        
        return False
    
    def _send_email(
        self, 
        to_email: str, 
        subject: str, 
        message: str,
        html_message: str = None
    ) -> bool:
        """
        Send email using Django's email backend (MailerSend).
        
        The MailerSend backend is already configured in settings:
        - EMAIL_BACKEND = 'users.mailersend_backend.MailerSendEmailBackend'
        - MAILERSEND_API_KEY
        - MAILERSEND_FROM_EMAIL
        """
        from django.core.mail import send_mail
        
        try:
            # Use MAILERSEND_FROM_EMAIL if available, otherwise DEFAULT_FROM_EMAIL
            from_email = getattr(settings, 'MAILERSEND_FROM_EMAIL', None) or \
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@newconcierge.app')
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[to_email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Email sent successfully via MailerSend to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Email send error (MailerSend): {e}")
            return False
    
    def _truncate_for_sms(self, message: str, max_length: int = 160) -> str:
        """Truncate message for SMS (160 chars for single segment)."""
        if len(message) <= max_length:
            return message
        return message[:max_length - 3] + '...'
    
    def send_bulk(
        self,
        recipients: List[RecipientChannels],
        subject: str,
        message: str,
        channels: List[ChannelType] = None,
        **kwargs
    ) -> List[DeliveryResult]:
        """
        Send notification to multiple recipients.
        
        Args:
            recipients: List of RecipientChannels
            subject: Notification subject
            message: Main message content
            channels: Channels to use (default: all available per recipient)
            **kwargs: Additional options passed to send_notification
            
        Returns:
            List of DeliveryResult for each recipient
        """
        results = []
        for recipient in recipients:
            result = self.send_notification(
                recipient=recipient,
                subject=subject,
                message=message,
                channels=channels,
                **kwargs
            )
            results.append(result)
        return results
    
    def get_channel_status(self, channel: ChannelType) -> Dict[str, Any]:
        """Get status of a notification channel."""
        config = self.channel_configs.get(channel)
        
        status = {
            'channel': channel.value,
            'enabled': config.enabled if config else False,
            'priority': config.priority if config else 0,
            'healthy': False,
        }
        
        if not config or not config.enabled:
            status['status'] = 'disabled'
            return status
        
        # Check health
        if channel == ChannelType.SMS:
            status['healthy'] = self.sms_provider.check_health()
            status['provider'] = self.sms_provider.provider_name
        elif channel == ChannelType.VIBER:
            status['healthy'] = self.viber_provider.check_health()
        elif channel == ChannelType.PUSH:
            status['healthy'] = self.push_provider.check_health()
        elif channel == ChannelType.EMAIL:
            status['healthy'] = True  # Assume email is always healthy
        
        status['status'] = 'healthy' if status['healthy'] else 'unhealthy'
        return status
    
    def get_all_channel_statuses(self) -> Dict[str, Any]:
        """Get status of all notification channels."""
        return {
            channel.value: self.get_channel_status(channel)
            for channel in ChannelType
        }


# Global service instance
multichannel_service = MultiChannelNotificationService()


def send_multichannel_notification(
    recipient_email: str = None,
    recipient_phone: str = None,
    recipient_viber_id: str = None,
    recipient_push_tokens: List[str] = None,
    subject: str = "",
    message: str = "",
    channels: List[str] = None,
    **kwargs
) -> DeliveryResult:
    """
    Convenience function for sending multi-channel notifications.
    
    Args:
        recipient_email: Email address
        recipient_phone: Phone number
        recipient_viber_id: Viber user ID
        recipient_push_tokens: List of FCM tokens
        subject: Notification subject
        message: Message content
        channels: List of channel names ('email', 'sms', 'viber', 'push')
        **kwargs: Additional options
        
    Returns:
        DeliveryResult
    """
    recipient = RecipientChannels(
        email=recipient_email,
        phone=recipient_phone,
        viber_id=recipient_viber_id,
        push_tokens=recipient_push_tokens or [],
    )
    
    channel_types = None
    if channels:
        channel_types = [ChannelType(c) for c in channels]
    
    return multichannel_service.send_notification(
        recipient=recipient,
        subject=subject,
        message=message,
        channels=channel_types,
        **kwargs
    )


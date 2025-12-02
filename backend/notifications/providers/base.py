"""
Base classes for notification providers.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ChannelType(Enum):
    """Available notification channels."""
    EMAIL = 'email'
    SMS = 'sms'
    VIBER = 'viber'
    PUSH = 'push'


@dataclass
class ProviderConfig:
    """Configuration for a notification provider."""
    api_key: str
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None
    base_url: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)
    is_enabled: bool = True
    is_sandbox: bool = False


@dataclass 
class ProviderResult:
    """Result of a provider operation."""
    success: bool
    message_id: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None
    cost: Optional[float] = None  # Cost in credits/currency
    
    @classmethod
    def success_result(cls, message_id: str, raw_response: Dict = None, cost: float = None):
        return cls(
            success=True,
            message_id=message_id,
            raw_response=raw_response,
            cost=cost
        )
    
    @classmethod
    def error_result(cls, error_message: str, error_code: str = None, raw_response: Dict = None):
        return cls(
            success=False,
            error_message=error_message,
            error_code=error_code,
            raw_response=raw_response
        )


class BaseProvider(ABC):
    """Abstract base class for all notification providers."""
    
    channel_type: ChannelType = None
    provider_name: str = "base"
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{self.provider_name}")
    
    @abstractmethod
    def send(self, recipient: str, message: str, **kwargs) -> ProviderResult:
        """
        Send a message to a single recipient.
        
        Args:
            recipient: Phone number, device token, or other identifier
            message: Message content
            **kwargs: Provider-specific options
            
        Returns:
            ProviderResult with success status and details
        """
        pass
    
    @abstractmethod
    def send_bulk(self, recipients: List[str], message: str, **kwargs) -> List[ProviderResult]:
        """
        Send a message to multiple recipients.
        
        Args:
            recipients: List of phone numbers, device tokens, or other identifiers
            message: Message content
            **kwargs: Provider-specific options
            
        Returns:
            List of ProviderResult for each recipient
        """
        pass
    
    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate a recipient identifier.
        Override in subclasses for specific validation.
        """
        return bool(recipient and recipient.strip())
    
    def get_balance(self) -> Optional[float]:
        """
        Get account balance/credits.
        Override in subclasses if supported.
        """
        return None
    
    def check_health(self) -> bool:
        """
        Check if the provider is operational.
        Override in subclasses.
        """
        return self.config.is_enabled
    
    def format_phone_number(self, phone: str, country_code: str = '+30') -> str:
        """
        Format phone number to E.164 format.
        
        Args:
            phone: Phone number in various formats
            country_code: Default country code (Greece = +30)
            
        Returns:
            Phone number in E.164 format (e.g., +306912345678)
        """
        # Remove spaces, dashes, and other non-digit characters
        cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
        
        if not cleaned:
            return phone
            
        # If already in E.164 format
        if cleaned.startswith('+'):
            return cleaned
            
        # If starts with country code without +
        if cleaned.startswith('30') and len(cleaned) >= 12:
            return f'+{cleaned}'
            
        # If starts with 69 (Greek mobile) or 21 (Athens landline)
        if cleaned.startswith('69') or cleaned.startswith('21'):
            return f'{country_code}{cleaned}'
            
        # Default: add country code
        return f'{country_code}{cleaned}'


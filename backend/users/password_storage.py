"""
Temporary password storage for cross-service password handling.

This module provides secure temporary storage for plain passwords during
multi-step processes (signup -> Stripe -> tenant creation) where the
password needs to be accessible across different services.
"""

import logging
import hashlib
import hmac
import time
from typing import Optional
from django.conf import settings
from django.core.cache import cache
from django.core.signing import Signer

logger = logging.getLogger(__name__)

# Cache key prefix for password storage
PASSWORD_STORAGE_PREFIX = "temp_password_"
# TTL for password storage (30 minutes - enough for Stripe checkout)
PASSWORD_STORAGE_TTL = 30 * 60


def generate_password_key(user_email: str, session_id: str) -> str:
    """
    Generate a unique cache key for password storage.
    
    Args:
        user_email: User's email address
        session_id: Unique session identifier (e.g., Stripe checkout session ID)
    
    Returns:
        Cache key string
    """
    # Create a hash of email + session_id for uniqueness
    key_data = f"{user_email}:{session_id}"
    key_hash = hashlib.sha256(key_data.encode()).hexdigest()[:16]
    return f"{PASSWORD_STORAGE_PREFIX}{key_hash}"


def store_password(user_email: str, session_id: str, password: str) -> str:
    """
    Store plain password temporarily in encrypted cache.
    
    Args:
        user_email: User's email address
        session_id: Unique session identifier
        password: Plain password to store
    
    Returns:
        Storage key for retrieval
    """
    storage_key = generate_password_key(user_email, session_id)
    
    # Encrypt password using Django's signing
    signer = Signer()
    encrypted_password = signer.sign(password)
    
    # Store in cache with TTL
    cache.set(storage_key, encrypted_password, PASSWORD_STORAGE_TTL)
    
    logger.info(f"Stored temporary password for {user_email} (key: {storage_key[:20]}...)")
    
    return storage_key


def retrieve_password(user_email: str, session_id: str) -> Optional[str]:
    """
    Retrieve plain password from temporary storage.
    
    Args:
        user_email: User's email address
        session_id: Unique session identifier
    
    Returns:
        Plain password if found, None otherwise
    """
    storage_key = generate_password_key(user_email, session_id)
    
    encrypted_password = cache.get(storage_key)
    if not encrypted_password:
        logger.warning(f"Password not found for {user_email} (key: {storage_key[:20]}...)")
        return None
    
    try:
        # Decrypt password
        signer = Signer()
        password = signer.unsign(encrypted_password)
        
        # Delete from cache after retrieval (one-time use)
        cache.delete(storage_key)
        
        logger.info(f"Retrieved temporary password for {user_email}")
        return password
    except Exception as e:
        logger.error(f"Failed to decrypt password for {user_email}: {e}")
        return None


def delete_password(user_email: str, session_id: str) -> bool:
    """
    Delete password from temporary storage.
    
    Args:
        user_email: User's email address
        session_id: Unique session identifier
    
    Returns:
        True if deleted, False if not found
    """
    storage_key = generate_password_key(user_email, session_id)
    deleted = cache.delete(storage_key)
    
    if deleted:
        logger.info(f"Deleted temporary password for {user_email}")
    
    return deleted


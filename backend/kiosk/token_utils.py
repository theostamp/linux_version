import base64
import logging
import uuid

from django.conf import settings
from django.core import signing
from django.core.cache import caches

kiosk_logger = logging.getLogger(__name__)


def _get_cache():
    alias = getattr(settings, "KIOSK_QR_CACHE_ALIAS", "default")
    try:
        return caches[alias]
    except Exception:
        return caches['throttles']


def _nonce_cache_key(nonce: str) -> str:
    return f"kiosk_qr_nonce:{nonce}"


def generate_kiosk_token(building_id: str | int) -> str:
    ttl_seconds = int(getattr(settings, "KIOSK_QR_TTL_SECONDS", 900))
    one_time = bool(getattr(settings, "KIOSK_QR_ONE_TIME", False))
    salt = getattr(settings, "KIOSK_QR_SIGNING_SALT", "kiosk-qr")

    payload = {
        "building_id": str(building_id),
        "nonce": uuid.uuid4().hex,
    }

    token = signing.dumps(payload, salt=salt)

    if one_time:
        try:
            cache = _get_cache()
            cache.set(_nonce_cache_key(payload["nonce"]), True, timeout=ttl_seconds)
        except Exception as exc:
            kiosk_logger.warning("[KIOSK][QR] Failed to cache nonce: %s", exc)

    return token


def validate_signed_kiosk_token(building_id: str | int, token: str) -> bool:
    ttl_seconds = int(getattr(settings, "KIOSK_QR_TTL_SECONDS", 900))
    one_time = bool(getattr(settings, "KIOSK_QR_ONE_TIME", False))
    salt = getattr(settings, "KIOSK_QR_SIGNING_SALT", "kiosk-qr")

    try:
        payload = signing.loads(token, salt=salt, max_age=ttl_seconds)
    except signing.SignatureExpired:
        kiosk_logger.info("[KIOSK][QR] Token expired")
        return False
    except signing.BadSignature:
        kiosk_logger.info("[KIOSK][QR] Invalid signature")
        return False

    if str(payload.get("building_id")) != str(building_id):
        kiosk_logger.warning("[KIOSK][QR] Token building mismatch")
        return False

    if one_time:
        nonce = payload.get("nonce")
        if not nonce:
            return False
        try:
            cache = _get_cache()
            cache_key = _nonce_cache_key(nonce)
            if not cache.get(cache_key):
                return False
            cache.delete(cache_key)
        except Exception as exc:
            kiosk_logger.warning("[KIOSK][QR] Failed to validate nonce: %s", exc)

    return True


def validate_legacy_kiosk_token(building_id: str | int, token: str) -> bool:
    try:
        decoded = base64.b64decode(token).decode('utf-8')
        parts = decoded.split('-')
        if len(parts) >= 1:
            token_building_id = parts[0]
            return str(building_id) == token_building_id
    except Exception as e:
        kiosk_logger.warning("[KIOSK][QR] Invalid legacy token: %s", e)
    return False


def validate_kiosk_token(building_id: str | int, token: str) -> bool:
    if not token:
        return False
    if getattr(settings, "ENABLE_KIOSK_SIGNED_QR", False):
        return validate_signed_kiosk_token(building_id, token)
    return validate_legacy_kiosk_token(building_id, token)

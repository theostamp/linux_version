import base64
import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import List, Optional

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import EmailWebhookEvent

logger = logging.getLogger(__name__)


def _extract_signature(signature_header: Optional[str]) -> str:
    if not signature_header:
        return ""
    signature = signature_header.strip()
    if "=" not in signature:
        return signature
    parts = {}
    for part in signature.split(","):
        key, _, value = part.strip().partition("=")
        if key and value:
            parts[key.strip()] = value.strip()
    return parts.get("v1") or parts.get("signature") or signature


def _verify_signature(body: bytes, signature_header: Optional[str]) -> bool:
    secret = getattr(settings, "MAILERSEND_WEBHOOK_SECRET", "") or ""
    if not secret:
        return True

    signature = _extract_signature(signature_header)
    if not signature:
        return not getattr(settings, "MAILERSEND_WEBHOOK_VERIFY", False)

    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    if hmac.compare_digest(expected, signature):
        return True

    expected_b64 = base64.b64encode(hmac.new(secret.encode("utf-8"), body, hashlib.sha256).digest()).decode("utf-8")
    if hmac.compare_digest(expected_b64, signature):
        return True

    return not getattr(settings, "MAILERSEND_WEBHOOK_VERIFY", False)


def _parse_event_time(value: object) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        if value.isdigit():
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _coerce_events(payload: object) -> List[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        if isinstance(payload.get("events"), list):
            return [item for item in payload["events"] if isinstance(item, dict)]
        if isinstance(payload.get("data"), list):
            return [item for item in payload["data"] if isinstance(item, dict)]
        return [payload]
    return []


@csrf_exempt
def mailersend_webhook(request):
    if request.method != "POST":
        return JsonResponse({"status": "ok"})

    signature_header = request.headers.get("X-MailerSend-Signature") or request.headers.get("x-mailersend-signature")
    if not _verify_signature(request.body, signature_header):
        logger.warning("[MailerSend] Invalid signature")
        return JsonResponse({"status": "invalid_signature"}, status=401)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"status": "invalid_json"}, status=400)

    events = _coerce_events(payload)
    stored = 0
    duplicates = 0

    for event in events:
        event_id = str(event.get("id") or event.get("event_id") or event.get("eventId") or "")
        if event_id:
            exists = EmailWebhookEvent.objects.filter(provider="mailersend", event_id=event_id).exists()
            if exists:
                duplicates += 1
                continue

        message_id = str(event.get("message_id") or event.get("messageId") or event.get("message") or "")
        email = str(event.get("email") or event.get("recipient") or event.get("to") or "")
        event_type = str(event.get("type") or event.get("event") or event.get("event_type") or "")
        occurred_at = _parse_event_time(event.get("timestamp") or event.get("created_at") or event.get("created") or event.get("time"))

        EmailWebhookEvent.objects.create(
            provider="mailersend",
            event_id=event_id,
            message_id=message_id,
            email=email,
            event_type=event_type,
            occurred_at=occurred_at,
            payload=event or {},
            signature=signature_header or "",
        )
        stored += 1

    return JsonResponse(
        {
            "status": "ok",
            "received": len(events),
            "stored": stored,
            "duplicates": duplicates,
        }
    )

import hashlib
import hmac
import json
import logging
from typing import Optional, Tuple

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django_tenants.utils import schema_context

from tenants.models import Client
from users.models import CustomUser
from notifications.models import UserViberSubscription
from notifications.viber_utils import parse_viber_context_payload

logger = logging.getLogger(__name__)

UNSUBSCRIBE_KEYWORDS = {"STOP", "UNSUBSCRIBE", "ΑΚΥΡΩΣΗ", "ΔΙΑΚΟΠΗ"}


def _verify_signature(body: bytes, signature: str) -> bool:
    token = getattr(settings, "VIBER_API_TOKEN", "")
    if not token:
        return True
    digest = hmac.new(token.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, digest)


def _extract_viber_user(payload: dict) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    user = payload.get("user") or payload.get("sender") or {}
    viber_user_id = user.get("id") or payload.get("user_id")
    name = user.get("name")
    avatar = user.get("avatar")
    return viber_user_id, name, avatar


def _find_subscription_by_viber_id(viber_user_id: str) -> Tuple[Optional[str], Optional[UserViberSubscription]]:
    if not viber_user_id:
        return None, None

    for tenant in Client.objects.only("schema_name"):
        with schema_context(tenant.schema_name):
            sub = UserViberSubscription.objects.filter(viber_user_id=viber_user_id).first()
            if sub:
                return tenant.schema_name, sub

    return None, None


def _apply_unsubscribe(subscription: UserViberSubscription) -> None:
    subscription.is_subscribed = False
    subscription.unsubscribed_at = timezone.now()
    subscription.save(update_fields=["is_subscribed", "unsubscribed_at"])


@csrf_exempt
def viber_webhook(request):
    if request.method != "POST":
        return JsonResponse({"status": "ok"})

    signature = request.headers.get("X-Viber-Content-Signature") or request.headers.get("x-viber-content-signature")
    if signature and not _verify_signature(request.body, signature):
        if getattr(settings, "VIBER_WEBHOOK_VERIFY", True):
            return JsonResponse({"status": "invalid_signature"}, status=401)
        logger.warning("[Viber] Invalid signature ignored (verification disabled)")

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"status": "invalid_json"}, status=400)

    event = payload.get("event", "")
    viber_user_id, viber_name, viber_avatar = _extract_viber_user(payload)
    message_text = ""
    if isinstance(payload.get("message"), dict):
        message_text = payload.get("message", {}).get("text", "") or ""

    context = payload.get("context") or message_text.strip()
    link_data = parse_viber_context_payload(context) if context else None

    if link_data:
        schema_name = link_data.get("schema")
        user_id = link_data.get("user_id")

        if not schema_name or not user_id or not viber_user_id:
            return JsonResponse({"status": "missing_link_data"}, status=400)

        with schema_context(schema_name):
            user = CustomUser.objects.filter(id=user_id).first()
            if not user:
                return JsonResponse({"status": "user_not_found"}, status=404)

            conflict = UserViberSubscription.objects.filter(
                viber_user_id=viber_user_id
            ).exclude(user=user).first()
            if conflict:
                logger.warning("[Viber] Viber user already linked to different account")
                return JsonResponse({"status": "viber_user_conflict"}, status=409)

            subscription, created = UserViberSubscription.objects.update_or_create(
                user=user,
                defaults={
                    "viber_user_id": viber_user_id,
                    "viber_name": viber_name or "",
                    "viber_avatar": viber_avatar or "",
                    "is_subscribed": True,
                    "unsubscribed_at": None,
                },
            )

            if created:
                logger.info("[Viber] Linked subscription for user %s in %s", user_id, schema_name)

            return JsonResponse({"status": "linked"})

    # If no context, try to resolve subscription by Viber user id for unsubscribe handling.
    if viber_user_id:
        schema_name, subscription = _find_subscription_by_viber_id(viber_user_id)

        if subscription:
            if event == "unsubscribed" or message_text.strip().upper() in UNSUBSCRIBE_KEYWORDS:
                _apply_unsubscribe(subscription)
                logger.info("[Viber] Unsubscribed user %s in %s", subscription.user_id, schema_name)
            elif message_text:
                subscription.last_message_at = timezone.now()
                subscription.save(update_fields=["last_message_at"])

    return JsonResponse({"status": "ok"})

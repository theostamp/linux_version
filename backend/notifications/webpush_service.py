import json
import logging
from typing import Dict, Optional

from django.conf import settings
from pywebpush import webpush, WebPushException

from chat.models import PushSubscription

logger = logging.getLogger(__name__)


class WebPushService:
    @staticmethod
    def _resolve_subject() -> str:
        subject = (
            getattr(settings, 'VAPID_SUBJECT', '') or getattr(settings, 'DEFAULT_FROM_EMAIL', '')
        )
        if subject:
            if subject.startswith('mailto:') or subject.startswith('https://'):
                return subject
            return f"mailto:{subject}"
        return "mailto:noreply@newconcierge.app"

    @classmethod
    def is_configured(cls) -> bool:
        return bool(
            getattr(settings, 'VAPID_PUBLIC_KEY', '')
            and getattr(settings, 'VAPID_PRIVATE_KEY', '')
        )

    @classmethod
    def send_to_user(
        cls,
        *,
        user,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        ttl: int = 3600,
    ) -> int:
        if not cls.is_configured():
            logger.info("Web push skipped: VAPID keys not configured")
            return 0

        subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
        if not subscriptions:
            return 0

        payload: Dict[str, object] = {
            "title": title,
            "body": body,
        }
        if data:
            payload["data"] = data

        success_count = 0

        for subscription in subscriptions:
            subscription_info = {
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            }

            try:
                webpush(
                    subscription_info,
                    data=json.dumps(payload),
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": cls._resolve_subject()},
                    ttl=ttl,
                )
                success_count += 1
            except WebPushException as exc:
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                if status_code in (404, 410):
                    subscription.is_active = False
                    subscription.save(update_fields=["is_active"])
                    logger.info(
                        "Web push subscription expired; deactivated (user=%s, sub=%s)",
                        user.id,
                        subscription.id,
                    )
                else:
                    logger.warning(
                        "Web push failed (user=%s, sub=%s): %s",
                        user.id,
                        subscription.id,
                        exc,
                    )
            except Exception as exc:
                logger.warning(
                    "Web push error (user=%s, sub=%s): %s",
                    user.id,
                    subscription.id,
                    exc,
                )

        return success_count

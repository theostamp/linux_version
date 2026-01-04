import logging
from typing import Optional

from django.conf import settings
from django.utils.html import strip_tags

from notifications.models import NotificationPreference
from notifications.providers.viber_provider import ViberProvider
from notifications.viber_utils import format_viber_message

logger = logging.getLogger(__name__)


class ViberNotificationService:
    @staticmethod
    def _is_enabled() -> bool:
        return bool(
            getattr(settings, "VIBER_ENABLED", False)
            and getattr(settings, "VIBER_API_TOKEN", "")
        )

    @staticmethod
    def _normalize_message(message: str) -> str:
        if not message:
            return ""
        # Strip HTML if content comes from rich templates.
        text = strip_tags(message)
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)

    @staticmethod
    def _user_prefers_viber(user, building=None) -> bool:
        try:
            pref = NotificationPreference.get_user_preferences(user, building=building, category="all")
            if pref and not pref.viber_enabled:
                return False
        except Exception:
            # If preferences lookup fails, do not block delivery.
            pass
        return True

    @staticmethod
    def _get_subscription(user):
        sub = getattr(user, "viber_subscription", None)
        if sub and getattr(sub, "is_subscribed", False):
            return sub
        return None

    @classmethod
    def send_to_user(
        cls,
        *,
        user,
        message: str,
        building=None,
        office_name: str = "",
    ) -> bool:
        if not cls._is_enabled():
            return False

        if not cls._user_prefers_viber(user, building=building):
            return False

        subscription = cls._get_subscription(user)
        if not subscription:
            return False

        normalized = cls._normalize_message(message)
        if not normalized:
            return False

        building_name = getattr(building, "name", "") if building else ""
        payload = format_viber_message(
            normalized,
            building_name=building_name,
            office_name=office_name,
        )

        provider = ViberProvider()
        result = provider.send(subscription.viber_user_id, payload)

        if result and not result.success:
            error_code = str(result.error_code or "")
            error_message = (result.error_message or "").lower()
            if error_code in {"5", "6"} or "not subscribed" in error_message or "unsubscribed" in error_message:
                try:
                    subscription.unsubscribe()
                except Exception:
                    logger.warning("[Viber] Failed to mark subscription as unsubscribed")
            return False

        return True

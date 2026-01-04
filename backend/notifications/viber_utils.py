import logging
from typing import Optional, Tuple
from urllib.parse import quote

from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

VIBER_LINK_SALT = "viber-link"
VIBER_LINK_MAX_AGE_SECONDS = 30 * 60  # 30 minutes


def is_viber_configured() -> bool:
    return bool(
        getattr(settings, "VIBER_ENABLED", False)
        and getattr(settings, "VIBER_API_TOKEN", "")
        and getattr(settings, "VIBER_CHAT_URI", "")
    )


def build_viber_context_payload(*, user_id: int, schema_name: str) -> str:
    payload = {"user_id": user_id, "schema": schema_name}
    return signing.dumps(payload, salt=VIBER_LINK_SALT)


def parse_viber_context_payload(context: str) -> Optional[dict]:
    if not context:
        return None
    try:
        return signing.loads(
            context,
            salt=VIBER_LINK_SALT,
            max_age=VIBER_LINK_MAX_AGE_SECONDS,
        )
    except signing.BadSignature:
        logger.info("[Viber] Invalid or expired context payload")
        return None


def build_viber_links(context: str) -> Tuple[str, str]:
    chat_uri = getattr(settings, "VIBER_CHAT_URI", "").strip()
    if not chat_uri:
        return "", ""

    encoded = quote(context, safe="")
    app_link = f"viber://pa?chatURI={chat_uri}&context={encoded}"
    web_link = f"https://vb.me/{chat_uri}?context={encoded}"
    return app_link, web_link


def format_viber_message(message: str, *, building_name: str = "", office_name: str = "") -> str:
    parts = []
    if building_name:
        parts.append(f"🏢 {building_name}")
    if office_name:
        parts.append(f"Διαχείριση: {office_name}")
    if parts:
        parts.append("")
    parts.append(message.strip())
    return "\n".join(parts).strip()

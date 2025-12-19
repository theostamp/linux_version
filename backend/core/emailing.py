from __future__ import annotations

from email.utils import formataddr
from typing import Any, Iterable, Optional, Sequence

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import escape
from django.utils.html import strip_tags

from users.models import CustomUser


def _to_list(value: str | Sequence[str]) -> list[str]:
    if isinstance(value, str):
        return [value]
    return list(value)


def _absolute_url(maybe_path_or_url: str | None) -> str | None:
    """
    Converts a relative MEDIA URL (e.g. '/media/office_logos/x.png') to an absolute URL.
    If already absolute, returns as-is.

    Note: For email images to render reliably, the URL must be publicly reachable.
    Configure via EMAIL_PUBLIC_ASSETS_BASE_URL (recommended) or fallback to FRONTEND_URL.
    """
    if not maybe_path_or_url:
        return None
    if maybe_path_or_url.startswith("http://") or maybe_path_or_url.startswith("https://"):
        return maybe_path_or_url

    base = (getattr(settings, "EMAIL_PUBLIC_ASSETS_BASE_URL", None) or getattr(settings, "FRONTEND_URL", "")).rstrip("/")
    if not base:
        return None
    if maybe_path_or_url.startswith("/"):
        return f"{base}{maybe_path_or_url}"
    return f"{base}/{maybe_path_or_url}"


def extract_legacy_body_html(*, html: str) -> str:
    """
    Takes a full legacy HTML document and extracts <style> blocks + <body> inner HTML.
    Useful for wrapping into our base template (`emails/wrapper.html`) without nesting <html>/<body>.
    """
    raw = html or ""
    lower = raw.lower()

    # Extract <style>...</style> blocks (usually in <head>)
    style_blocks: list[str] = []
    idx = 0
    while True:
        start = lower.find("<style", idx)
        if start == -1:
            break
        start_close = lower.find(">", start)
        if start_close == -1:
            break
        end = lower.find("</style>", start_close)
        if end == -1:
            break
        style_blocks.append(raw[start : end + len("</style>")])
        idx = end + len("</style>")

    # Extract <body ...>...</body>
    body_html = raw
    body_start = lower.find("<body")
    if body_start != -1:
        body_tag_end = lower.find(">", body_start)
        body_end = lower.rfind("</body>")
        if body_tag_end != -1 and body_end != -1 and body_end > body_tag_end:
            body_html = raw[body_tag_end + 1 : body_end]

    return "\n".join(style_blocks + [body_html]).strip()


def plain_text_to_html(text: str) -> str:
    """
    Safe conversion of plain text into simple HTML for email bodies.
    """
    safe = escape(text or "")
    # Preserve new lines
    safe = safe.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>")
    return f"<div style=\"white-space: normal;\">{safe}</div>"


def _get_office_brand_user(
    *,
    sender_user: CustomUser | None = None,
    user: CustomUser | None = None,
    tenant_id: int | None = None,
    building_manager_id: int | None = None,
) -> CustomUser | None:
    """
    Resolve which user represents the 'office' for branding purposes.
    Priority:
    - explicit sender_user
    - building manager (public user id stored on Building)
    - tenant office manager (role=manager)
    - fallback: any user passed in
    """
    if sender_user:
        return sender_user

    if building_manager_id:
        manager = CustomUser.objects.filter(id=building_manager_id).first()
        if manager:
            return manager

    if tenant_id:
        manager = CustomUser.objects.filter(tenant_id=tenant_id, role=CustomUser.SystemRole.OFFICE_MANAGER).order_by("id").first()
        if manager:
            return manager

    if user and user.tenant_id:
        manager = CustomUser.objects.filter(tenant_id=user.tenant_id, role=CustomUser.SystemRole.OFFICE_MANAGER).order_by("id").first()
        if manager:
            return manager

    return user


def get_app_branding() -> dict[str, Any]:
    return {
        "name": getattr(settings, "EMAIL_APP_NAME", "New Concierge"),
        "url": getattr(settings, "FRONTEND_URL", "").rstrip("/"),
        "logo_url": _absolute_url(getattr(settings, "EMAIL_APP_LOGO_URL", None)),
        "support_email": getattr(settings, "SUPPORT_EMAIL", None) or getattr(settings, "DEFAULT_FROM_EMAIL", ""),
        "terms_url": getattr(settings, "EMAIL_TERMS_URL", None),
        "privacy_url": getattr(settings, "EMAIL_PRIVACY_URL", None),
    }


def get_email_branding(
    *,
    user: CustomUser | None = None,
    tenant_id: int | None = None,
    building_manager_id: int | None = None,
    sender_user: CustomUser | None = None,
) -> dict[str, Any]:
    office_user = _get_office_brand_user(
        sender_user=sender_user,
        user=user,
        tenant_id=tenant_id,
        building_manager_id=building_manager_id,
    )

    office_logo_url = None
    if office_user and getattr(office_user, "office_logo", None):
        try:
            office_logo_url = _absolute_url(office_user.office_logo.url)
        except Exception:
            office_logo_url = None

    office_name = (getattr(office_user, "office_name", None) or "").strip() if office_user else ""

    return {
        "office_name": office_name or None,
        "office_phone": (getattr(office_user, "office_phone", None) or "").strip() if office_user else "",
        "office_phone_emergency": (getattr(office_user, "office_phone_emergency", None) or "").strip() if office_user else "",
        "office_address": (getattr(office_user, "office_address", None) or "").strip() if office_user else "",
        "office_logo_url": office_logo_url,
        "bank_name": (getattr(office_user, "office_bank_name", None) or "").strip() if office_user else "",
        "bank_iban": (getattr(office_user, "office_bank_iban", None) or "").strip() if office_user else "",
        "bank_beneficiary": (getattr(office_user, "office_bank_beneficiary", None) or "").strip() if office_user else "",
        "reply_to": (getattr(office_user, "email", None) or "").strip() if office_user else "",
    }


def send_templated_email(
    *,
    to: str | Sequence[str],
    subject: str,
    template_html: str,
    context: Optional[dict[str, Any]] = None,
    template_text: str | None = None,
    user: CustomUser | None = None,
    tenant_id: int | None = None,
    building_manager_id: int | None = None,
    sender_user: CustomUser | None = None,
    reply_to: Sequence[str] | None = None,
    attachments: Iterable[tuple[str, bytes, str]] | None = None,
) -> bool:
    """
    Send a consistent, branded email using Django templates (HTML + text).

    - Adds default context keys: branding, app, frontend_url, year
    - Uses EmailMultiAlternatives so custom backends can extract html/text properly
    """
    to_list = _to_list(to)

    branding = get_email_branding(
        user=user,
        tenant_id=tenant_id,
        building_manager_id=building_manager_id,
        sender_user=sender_user,
    )
    app = get_app_branding()

    merged_context: dict[str, Any] = {}
    if context:
        merged_context.update(context)
    merged_context.update(
        {
            "branding": branding,
            "app": app,
            "frontend_url": getattr(settings, "FRONTEND_URL", "").rstrip("/"),
            "year": timezone.now().year,
        }
    )

    html = render_to_string(template_html, merged_context)
    if template_text:
        text = render_to_string(template_text, merged_context)
    else:
        text = strip_tags(html)

    # Ensure we keep the verified domain, but can vary the display-name per tenant/office.
    from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@newconcierge.gr")
    from_name = branding.get("office_name") or app.get("name") or "New Concierge"
    from_email = formataddr((from_name, from_addr))

    # Prefer explicit reply_to, else use office user's email if present.
    computed_reply_to: list[str] | None = None
    if reply_to:
        computed_reply_to = list(reply_to)
    else:
        office_reply_to = branding.get("reply_to") or ""
        if office_reply_to:
            computed_reply_to = [office_reply_to]

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=from_email,
        to=to_list,
        reply_to=computed_reply_to,
    )
    msg.attach_alternative(html, "text/html")

    if attachments:
        for filename, content, mimetype in attachments:
            msg.attach(filename, content, mimetype)

    sent = msg.send(fail_silently=False)
    return bool(sent)



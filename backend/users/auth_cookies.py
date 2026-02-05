from __future__ import annotations

from datetime import timedelta
from typing import Any, Optional

from django.conf import settings
from django.http import HttpRequest, HttpResponse


def _normalize_samesite(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        lowered = cleaned.lower()
        if lowered == "none":
            return "None"
        if lowered == "lax":
            return "Lax"
        if lowered == "strict":
            return "Strict"
        return cleaned
    return str(value)


def _resolve_refresh_cookie_max_age() -> int:
    configured = getattr(settings, "REFRESH_COOKIE_MAX_AGE", None)
    if isinstance(configured, int):
        return configured
    if isinstance(configured, str):
        try:
            return int(configured)
        except ValueError:
            pass

    lifetime = getattr(settings, "SIMPLE_JWT", {}).get("REFRESH_TOKEN_LIFETIME")
    if isinstance(lifetime, timedelta):
        return int(lifetime.total_seconds())

    # Fallback: 7 days
    return 7 * 24 * 60 * 60


def _resolve_refresh_cookie_settings() -> dict[str, Any]:
    name = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")
    path = getattr(settings, "REFRESH_COOKIE_PATH", "/api/")
    domain = getattr(settings, "REFRESH_COOKIE_DOMAIN", None) or None
    http_only = getattr(settings, "REFRESH_COOKIE_HTTPONLY", True)

    samesite = _normalize_samesite(
        getattr(settings, "REFRESH_COOKIE_SAMESITE", None)
        or getattr(settings, "SESSION_COOKIE_SAMESITE", None)
        or "Lax"
    )

    secure = getattr(settings, "REFRESH_COOKIE_SECURE", None)
    if secure is None:
        secure = getattr(settings, "SESSION_COOKIE_SECURE", False)

    # SameSite=None requires Secure per browser policy
    if samesite == "None" and not secure:
        secure = True

    max_age = _resolve_refresh_cookie_max_age()

    return {
        "name": name,
        "path": path,
        "domain": domain,
        "httponly": http_only,
        "secure": secure,
        "samesite": samesite,
        "max_age": max_age,
    }


def get_refresh_cookie_name() -> str:
    return _resolve_refresh_cookie_settings()["name"]


def get_refresh_token_from_request(request: HttpRequest) -> Optional[str]:
    cookie_name = get_refresh_cookie_name()
    return request.COOKIES.get(cookie_name)


def set_refresh_cookie(response: HttpResponse, refresh_token: str | None) -> HttpResponse:
    if not refresh_token:
        return response

    settings_map = _resolve_refresh_cookie_settings()
    response.set_cookie(
        settings_map["name"],
        refresh_token,
        max_age=settings_map["max_age"],
        httponly=settings_map["httponly"],
        secure=settings_map["secure"],
        samesite=settings_map["samesite"],
        domain=settings_map["domain"],
        path=settings_map["path"],
    )
    return response


def clear_refresh_cookie(response: HttpResponse) -> HttpResponse:
    settings_map = _resolve_refresh_cookie_settings()
    response.delete_cookie(
        settings_map["name"],
        domain=settings_map["domain"],
        path=settings_map["path"],
    )
    return response


def attach_refresh_cookie(response: HttpResponse, refresh_token: str | None) -> HttpResponse:
    if not refresh_token:
        return response

    set_refresh_cookie(response, refresh_token)
    try:
        if isinstance(response.data, dict):
            response.data["refresh_cookie_set"] = True
    except Exception:
        # Response might not carry .data (streaming), ignore
        pass

    return response

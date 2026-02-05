# ADR-004: Refresh Token Storage Strategy (HttpOnly Cookie)

Date: 2026-02-05

## Context
- Access/refresh JWTs were stored in `localStorage` on the frontend.
- Refresh tokens in `localStorage` increase XSS blast radius.
- The app uses tenant subdomains (`{tenant}.newconcierge.app`) and cross‑subdomain login flows (invite acceptance, OAuth callbacks).

## Options
1. Keep localStorage for refresh tokens and add CSP hardening only.
2. Move refresh tokens to HttpOnly cookies (keep access token in localStorage), update refresh/logout to read cookies, and use env configuration for cookie scope.
3. Full cookie‑based auth (HttpOnly access + refresh), removing `Authorization` header usage.

## Decision
**Option 2**.
- Implement HttpOnly refresh cookie (`REFRESH_COOKIE_*` settings), set by auth endpoints.
- Refresh endpoint reads cookie when body token is missing (idempotent, backward compatible).
- Frontend prefers cookie‑based refresh, avoiding refresh token storage when cookie is set.

## Consequences
- ✅ Reduces refresh token exposure to XSS compared to localStorage.
- ✅ Backward compatible (body refresh token still supported).
- ⚠️ Access tokens remain in localStorage (XSS risk not fully eliminated).
- ⚠️ Cross‑subdomain flows require `REFRESH_COOKIE_DOMAIN` for shared cookie scope; otherwise URL‑hash transfer still used.
- ⚠️ CSP hardening remains a follow‑up if further risk reduction is needed.

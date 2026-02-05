# ADR-002: Signed QR Token Format & Validation

Date: 2026-02-05  
Status: Accepted

## Context
- Kiosk QR onboarding currently generates token client‑side in `public-app/src/components/kiosk/widgets/QRCodeWidget.tsx` with a comment “should come from backend”.  
- Backend validation is minimal and only checks `building_id` in `backend/kiosk/views.py` (`validate_kiosk_token`).  
- Public info endpoints are `AllowAny` and rely on frontend sanitization: `public-app/src/app/api/public-info/[buildingId]/route.ts`.

Problem: QR tokens are not server‑issued, can be forged, and privacy relies on frontend only.

## Options
1. **Django signing (TimestampSigner)**  
   - Server issues signed, time‑limited token.  
   - Payload: `{building_id, issued_at, nonce}`.  
   - Optional DB record for one‑time use + audit.
2. **JWT (HMAC) token**  
   - Issue JWT with short expiry; validate on backend.
3. **DB‑stored one‑time tokens only**  
   - Store every token in DB; validate by lookup and consume on use.

## Decision
Adopt **Option 1: Django signing with time‑limited token + optional DB audit/one‑time tracking**.

## Consequences
- **Pros**: no external JWT dependency, uses Django primitives, easy expiry, supports feature flag `ENABLE_KIOSK_SIGNED_QR`.  
- **Cons**: optional DB tracking adds migration and cleanup logic; if disabled, tokens are reusable until expiry.  
- **Mitigations**: add server‑side audit logging for connect/register; rate limiting on public endpoints; enable `ENABLE_SECURE_PUBLIC_INFO` to enforce backend sanitization.

## References
- `public-app/src/components/kiosk/widgets/QRCodeWidget.tsx` (current client token)  
- `backend/kiosk/views.py` (token validation / connect/register)  
- `backend/public_info/views.py` (public info response)

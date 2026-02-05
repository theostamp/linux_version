# core/throttles.py

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from django.core.cache import caches


class AuthEndpointThrottle(UserRateThrottle):
    """
    Rate limiting για authentication endpoints
    """
    scope = 'auth_endpoints'
    rate = '10/min'  # 10 attempts per minute για authenticated users


class AuthEndpointAnonThrottle(AnonRateThrottle):
    """
    Rate limiting για authentication endpoints για anonymous users
    """
    scope = 'auth_endpoints_anon'
    rate = '5/min'  # 5 attempts per minute για anonymous users


class LoginThrottle(AnonRateThrottle):
    """
    Rate limiting για login attempts
    """
    scope = 'login'
    rate = '5/min'  # 5 login attempts per minute


class RegistrationThrottle(AnonRateThrottle):
    """
    Rate limiting για user registration
    """
    scope = 'registration'
    rate = '3/min'  # 3 registration attempts per minute


class PasswordResetThrottle(AnonRateThrottle):
    """
    Rate limiting για password reset requests
    """
    scope = 'password_reset'
    rate = '3/min'  # 3 password reset requests per minute


class InvitationThrottle(UserRateThrottle):
    """
    Rate limiting για invitation creation
    """
    scope = 'invitations'
    rate = '10/hour'  # 10 invitations per hour


class EmailVerificationThrottle(AnonRateThrottle):
    """
    Rate limiting για email verification requests
    """
    scope = 'email_verification'
    rate = '5/min'  # 5 verification requests per minute


class MyApartmentLinkEmailUserThrottle(UserRateThrottle):
    """
    Rate limiting for sending the "open on laptop" link email from my-apartment.
    50 emails per day per authenticated user. (Temporary increase)
    """
    scope = 'my_apartment_link_email_user'
    rate = '50/day'
    # Use a safe local cache alias so throttling never 500s if Redis is down/misconfigured.
    cache = caches['throttles']


class MyApartmentLinkEmailIPThrottle(AnonRateThrottle):
    """
    Additional rate limiting keyed by IP (even for authenticated users) to reduce abuse.
    """
    scope = 'my_apartment_link_email_ip'
    rate = '10/day'
    # Use a safe local cache alias so throttling never 500s if Redis is down/misconfigured.
    cache = caches['throttles']

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }


class KioskPublicThrottle(AnonRateThrottle):
    """
    Rate limiting for public kiosk endpoints (QR token, connect/register, public-info).
    """
    scope = 'kiosk_public'
    rate = '30/min'
    cache = caches['throttles']



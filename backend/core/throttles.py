# core/throttles.py

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


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

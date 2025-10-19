"""
OAuth Service for Google and Microsoft authentication
"""
import json
import logging
from typing import Dict, Any, Optional
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
import requests

logger = logging.getLogger(__name__)
User = get_user_model()


class OAuthService:
    """Service for handling OAuth authentication with Google and Microsoft"""
    
    @staticmethod
    def get_google_flow(redirect_uri: str) -> Flow:
        """Create Google OAuth flow"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=[
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
                "openid"
            ]
        )
        flow.redirect_uri = redirect_uri
        return flow
    
    @staticmethod
    def get_microsoft_flow(redirect_uri: str) -> Dict[str, str]:
        """Create Microsoft OAuth flow parameters"""
        return {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": "openid email profile",
            "response_mode": "query",
            "state": "microsoft_oauth"
        }
    
    @staticmethod
    def exchange_google_code(code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange Google authorization code for user info"""
        try:
            flow = OAuthService.get_google_flow(redirect_uri)
            flow.fetch_token(code=code)
            
            # Get user info from Google
            credentials = flow.credentials
            user_info_response = requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {credentials.token}'}
            )
            
            if user_info_response.status_code != 200:
                raise Exception("Failed to get user info from Google")
            
            user_info = user_info_response.json()
            return {
                'email': user_info.get('email'),
                'first_name': user_info.get('given_name', ''),
                'last_name': user_info.get('family_name', ''),
                'provider': 'google',
                'provider_id': user_info.get('id')
            }
            
        except Exception as e:
            logger.error(f"Google OAuth error: {e}")
            # Check if it's an invalid_grant error (code already used or expired)
            if "invalid_grant" in str(e):
                raise Exception("OAuth code has expired or already been used. Please try logging in again.")
            raise Exception("Failed to authenticate with Google")
    
    @staticmethod
    def exchange_microsoft_code(code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange Microsoft authorization code for user info"""
        try:
            # Exchange code for token
            token_response = requests.post(
                'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                data={
                    'client_id': settings.MICROSOFT_CLIENT_ID,
                    'client_secret': settings.MICROSOFT_CLIENT_SECRET,
                    'code': code,
                    'redirect_uri': redirect_uri,
                    'grant_type': 'authorization_code',
                    'scope': 'openid email profile'
                }
            )
            
            if token_response.status_code != 200:
                raise Exception("Failed to exchange code for token")
            
            token_data = token_response.json()
            access_token = token_data.get('access_token')
            
            # Get user info from Microsoft
            user_info_response = requests.get(
                'https://graph.microsoft.com/v1.0/me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if user_info_response.status_code != 200:
                raise Exception("Failed to get user info from Microsoft")
            
            user_info = user_info_response.json()
            return {
                'email': user_info.get('mail') or user_info.get('userPrincipalName'),
                'first_name': user_info.get('givenName', ''),
                'last_name': user_info.get('surname', ''),
                'provider': 'microsoft',
                'provider_id': user_info.get('id')
            }
            
        except Exception as e:
            logger.error(f"Microsoft OAuth error: {e}")
            raise Exception("Failed to authenticate with Microsoft")
    
    @staticmethod
    def get_or_create_user(oauth_data: Dict[str, Any]) -> User:
        """Get or create user from OAuth data"""
        email = oauth_data.get('email')
        if not email:
            raise Exception("No email provided by OAuth provider")
        
        try:
            # Try to get existing user
            user = User.objects.get(email__iexact=email)
            
            # Update provider info if needed
            if not hasattr(user, 'oauth_provider'):
                user.oauth_provider = oauth_data.get('provider')
                user.oauth_provider_id = oauth_data.get('provider_id')
                user.save()
            
            return user
            
        except User.DoesNotExist:
            # Create new user
            user = User.objects.create_user(
                email=email,
                first_name=oauth_data.get('first_name', ''),
                last_name=oauth_data.get('last_name', ''),
                oauth_provider=oauth_data.get('provider'),
                oauth_provider_id=oauth_data.get('provider_id'),
                is_active=True,
                email_verified=True  # OAuth providers verify email
            )
            
            logger.info(f"Created new user via OAuth: {email}")
            return user
    
    @staticmethod
    def generate_tokens(user: User) -> Dict[str, str]:
        """Generate JWT tokens for user"""
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }

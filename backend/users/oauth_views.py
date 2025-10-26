"""
OAuth Views for Google and Microsoft authentication
"""
import json
import logging
from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .oauth_service import OAuthService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_oauth_initiate(request):
    """
    Initiate Google OAuth flow
    GET /api/auth/google/
    """
    try:
        redirect_uri = request.GET.get('redirect_uri')
        state = request.GET.get('state', '{}')
        
        if not redirect_uri:
            return Response(
                {'error': 'redirect_uri is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate required Google OAuth configuration
        if not getattr(settings, 'GOOGLE_CLIENT_ID', None) or not getattr(settings, 'GOOGLE_CLIENT_SECRET', None):
            logger.error("Google OAuth not configured: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET")
            return Response(
                {'error': 'Google OAuth is not configured on the server'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Create OAuth flow
        flow = OAuthService.get_google_flow(redirect_uri)
        
        # Generate authorization URL
        authorization_url, flow_state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='select_account',
            state=state
        )
        
        return HttpResponseRedirect(authorization_url)
        
    except Exception as e:
        logger.error(f"Google OAuth initiation error: {e}")
        return Response(
            {'error': 'Failed to initiate Google OAuth'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def microsoft_oauth_initiate(request):
    """
    Initiate Microsoft OAuth flow
    GET /api/auth/microsoft/
    """
    try:
        redirect_uri = request.GET.get('redirect_uri')
        state = request.GET.get('state', '{}')
        
        if not redirect_uri:
            return Response(
                {'error': 'redirect_uri is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create OAuth flow parameters
        flow_params = OAuthService.get_microsoft_flow(redirect_uri)
        flow_params['state'] = state
        
        # Build authorization URL
        auth_url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
        query_params = '&'.join([f"{k}={v}" for k, v in flow_params.items()])
        authorization_url = f"{auth_url}?{query_params}"
        
        return HttpResponseRedirect(authorization_url)
        
    except Exception as e:
        logger.error(f"Microsoft OAuth initiation error: {e}")
        return Response(
            {'error': 'Failed to initiate Microsoft OAuth'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def oauth_callback(request):
    """
    Handle OAuth callback from both Google and Microsoft
    POST /api/auth/callback/
    """
    try:
        code = request.data.get('code')
        state = request.data.get('state', {})
        redirect_uri = request.data.get('redirect_uri')
        
        if not code or not redirect_uri:
            return Response(
                {'error': 'Missing required parameters'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine provider from state
        provider = None
        if isinstance(state, dict):
            provider = state.get('provider')
        elif isinstance(state, str):
            try:
                state_data = json.loads(state)
                provider = state_data.get('provider')
            except:
                pass
        
        if not provider:
            return Response(
                {'error': 'Provider not specified in state'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Exchange code for user info
        if provider == 'google':
            oauth_data = OAuthService.exchange_google_code(code, redirect_uri)
        elif provider == 'microsoft':
            oauth_data = OAuthService.exchange_microsoft_code(code, redirect_uri)
        else:
            return Response(
                {'error': 'Unsupported OAuth provider'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create user
        user = OAuthService.get_or_create_user(oauth_data)
        
        # Generate tokens
        tokens = OAuthService.generate_tokens(user)
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active
            }
        })
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

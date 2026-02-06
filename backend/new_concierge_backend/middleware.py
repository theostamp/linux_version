import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class JWTRefreshCookieMiddleware:
    """
    Middleware to inject the refresh token from the HTTP-only cookie
    into the request body for the SimpleJWT refresh endpoint.
    This allows the standard SimpleJWT TokenRefreshView to work with cookies
    when the frontend sends an empty body.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if we are hitting the refresh endpoint
        # We use a loose check to accommodate URL changes, but specific enough
        if 'token/refresh' in request.path and request.method == 'POST':
            refresh_cookie_name = getattr(settings, 'REFRESH_COOKIE_NAME', 'refresh_token')
            refresh_token = request.COOKIES.get(refresh_cookie_name)

            if refresh_token:
                try:
                    # Parse existing body
                    body_data = {}
                    if request.body:
                        try:
                            body_data = json.loads(request.body)
                        except json.JSONDecodeError:
                            # If body is not valid JSON, we start with empty dict
                            pass

                    # Only inject if not already present
                    if 'refresh' not in body_data:
                        body_data['refresh'] = refresh_token
                        # Update request body
                        request._body = json.dumps(body_data).encode('utf-8')
                except Exception as e:
                    logger.error(f"Error injecting refresh token from cookie: {e}")

        return self.get_response(request)

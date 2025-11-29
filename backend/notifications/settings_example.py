"""
Example settings for notification channels.
Add these to your Django settings.py or environment variables.

IMPORTANT: Never commit actual API keys to version control!
Use environment variables or a secrets manager.
"""

# =============================================================================
# SMS Configuration
# =============================================================================

# Enable/disable SMS notifications globally
SMS_ENABLED = False

# Use sandbox/test mode (no real SMS sent)
SMS_SANDBOX_MODE = True

# Default sender ID (11 chars max for alphanumeric)
SMS_DEFAULT_SENDER_ID = 'NewConcierge'

# Choose provider: 'twilio', 'vonage', 'apifon', 'yuboto', 'mock'
SMS_PROVIDER = 'mock'

# Twilio settings (https://www.twilio.com/)
SMS_TWILIO_API_KEY = ''  # Account SID
SMS_TWILIO_API_SECRET = ''  # Auth Token
SMS_TWILIO_SENDER_ID = ''  # From number (E.164 format)

# Vonage/Nexmo settings (https://www.vonage.com/)
SMS_VONAGE_API_KEY = ''
SMS_VONAGE_API_SECRET = ''
SMS_VONAGE_SENDER_ID = 'NewConcierge'

# Apifon settings (Greek provider - https://www.apifon.com/)
SMS_APIFON_API_KEY = ''  # Bearer token
SMS_APIFON_SENDER_ID = 'NewConcierge'

# Yuboto settings (Greek provider - https://www.yuboto.com/)
SMS_YUBOTO_API_KEY = ''  # Username
SMS_YUBOTO_API_SECRET = ''  # Password
SMS_YUBOTO_SENDER_ID = 'NewConcierge'


# =============================================================================
# Viber Configuration
# =============================================================================

# Enable/disable Viber notifications
VIBER_ENABLED = False

# Viber Bot API token (from Viber Admin Panel)
VIBER_API_TOKEN = ''

# Bot sender name (displayed in Viber)
VIBER_SENDER_NAME = 'New Concierge'

# Bot avatar URL (optional, should be HTTPS)
VIBER_SENDER_AVATAR = ''

# Webhook URL for receiving Viber messages
# Must be HTTPS with valid SSL certificate
VIBER_WEBHOOK_URL = ''


# =============================================================================
# Push Notifications (Firebase) Configuration
# =============================================================================

# Enable/disable push notifications
PUSH_NOTIFICATIONS_ENABLED = False

# Path to Firebase service account JSON file
FIREBASE_CREDENTIALS_PATH = ''

# Or provide credentials as dict (for containerized deployments)
# FIREBASE_CREDENTIALS_JSON = {
#     "type": "service_account",
#     "project_id": "your-project-id",
#     "private_key_id": "...",
#     "private_key": "...",
#     "client_email": "...",
#     "client_id": "...",
#     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
#     "token_uri": "https://oauth2.googleapis.com/token",
#     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
#     "client_x509_cert_url": "..."
# }

# Default notification settings
PUSH_DEFAULT_SOUND = 'default'
PUSH_DEFAULT_BADGE = 1


# =============================================================================
# Channel Fallback Configuration
# =============================================================================

# If primary channel fails, try these in order
NOTIFICATION_FALLBACK_CHANNELS = {
    'sms': ['email'],
    'viber': ['sms', 'email'],
    'push': ['email'],
}

# Retry failed notifications after these intervals (seconds)
NOTIFICATION_RETRY_INTERVALS = [60, 300, 3600]  # 1min, 5min, 1hour

# Maximum retry attempts
NOTIFICATION_MAX_RETRIES = 3


# =============================================================================
# Rate Limiting
# =============================================================================

# Maximum SMS per user per day
SMS_DAILY_LIMIT_PER_USER = 10

# Maximum push notifications per user per hour
PUSH_HOURLY_LIMIT_PER_USER = 5


# =============================================================================
# Development/Debug
# =============================================================================

# Log all outgoing notifications (for debugging)
NOTIFICATION_DEBUG_MODE = False

# Send all notifications to this email instead of actual recipients
NOTIFICATION_DEBUG_EMAIL = ''

# Allowed phone prefixes (for testing, empty = all allowed)
SMS_ALLOWED_PREFIXES = []  # e.g., ['+30', '+357'] for Greece and Cyprus


# =============================================================================
# Environment Variables Example (.env)
# =============================================================================
"""
# Add these to your .env file:

SMS_ENABLED=false
SMS_PROVIDER=mock
SMS_TWILIO_API_KEY=your_account_sid
SMS_TWILIO_API_SECRET=your_auth_token
SMS_TWILIO_SENDER_ID=+15551234567

VIBER_ENABLED=false
VIBER_API_TOKEN=your_viber_token
VIBER_SENDER_NAME=New Concierge

PUSH_NOTIFICATIONS_ENABLED=false
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
"""


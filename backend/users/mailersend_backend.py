import os
import requests
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage
import logging

logger = logging.getLogger(__name__)

class MailerSendEmailBackend(BaseEmailBackend):
    """
    MailerSend email backend for Django
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = os.getenv('MAILERSEND_API_KEY')
        self.api_url = 'https://api.mailersend.com/v1/email'
        # Use verified newconcierge.app domain
        self.from_email = os.getenv('MAILERSEND_FROM_EMAIL', 'noreply@newconcierge.app')
        logger.info(f"MailerSend backend initialized with from_email: {self.from_email}")
        
    def send_messages(self, email_messages):
        """
        Send multiple email messages using MailerSend API
        """
        if not self.api_key:
            logger.error("MailerSend API key not configured")
            return 0
            
        sent_count = 0
        for message in email_messages:
            if self._send_single_message(message):
                sent_count += 1
                
        return sent_count
    
    def _send_single_message(self, message):
        """
        Send a single email message using MailerSend API
        """
        try:
            # Extract HTML and text content from EmailMultiAlternatives
            html_content = None
            text_content = None
            
            if hasattr(message, 'alternatives') and message.alternatives:
                # Check if there's HTML content in alternatives
                for content, mimetype in message.alternatives:
                    if mimetype == 'text/html':
                        html_content = content
                        text_content = message.body
                        break
                else:
                    # No HTML found in alternatives, use body
                    text_content = message.body
            else:
                # No alternatives, use body as text
                text_content = message.body
            
            # Prepare email data for MailerSend API
            # Use message.from_email if provided, otherwise use self.from_email (verified domain)
            # This allows EmailService to override the from_email if needed
            from_email = message.from_email if message.from_email else self.from_email
            logger.info(f"Sending email from: {from_email} (message.from_email={message.from_email}, backend.from_email={self.from_email})")
            
            email_data = {
                "from": {
                    "email": from_email,
                    "name": "New Concierge"
                },
                "to": [
                    {"email": email, "name": ""} for email in message.to
                ],
                "subject": message.subject,
            }
            
            # Add text or HTML content
            if html_content:
                email_data["html"] = html_content
            if text_content:
                email_data["text"] = text_content
            
            # Disable click tracking to preserve direct links
            # This prevents MailerSend from wrapping links in tracking URLs
            email_data["settings"] = {
                "click_tracking": False,
                "open_tracking": False
            }
            
            # Add CC and BCC if present
            if message.cc:
                email_data["cc"] = [{"email": email, "name": ""} for email in message.cc]
            if message.bcc:
                email_data["bcc"] = [{"email": email, "name": ""} for email in message.bcc]
            
            # Make API request
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
            
            logger.debug(f"Sending email to MailerSend API: {self.api_url}")
            logger.debug(f"Email data: from={from_email}, to={message.to}, subject={message.subject}")
            
            response = requests.post(
                self.api_url,
                json=email_data,
                headers=headers,
                timeout=30
            )
            
            logger.debug(f"MailerSend API response: status_code={response.status_code}")
            
            if response.status_code == 202:
                response_data = {}
                if response.text:
                    try:
                        response_data = response.json()
                    except ValueError:
                        logger.warning(
                            "MailerSend returned non-JSON payload with status 202. "
                            "Response text will be logged for debugging.")
                        logger.debug(f"MailerSend raw response text: {response.text}")

                # MailerSend can accept the request (202) but still include
                # contextual errors in the payload (e.g. suppressed recipients
                # or disabled sending). Detect these conditions to avoid
                # reporting a successful send when nothing was actually queued.
                error_messages = []
                if isinstance(response_data, dict):
                    # Common error payloads observed from MailerSend
                    if response_data.get('status') == 'error':
                        error_messages.append(response_data.get('message', 'Unknown MailerSend error'))

                    errors_field = response_data.get('errors')
                    if errors_field:
                        if isinstance(errors_field, list):
                            error_messages.extend(str(item) for item in errors_field)
                        elif isinstance(errors_field, dict):
                            for key, value in errors_field.items():
                                if isinstance(value, list):
                                    error_messages.extend(str(item) for item in value)
                                else:
                                    error_messages.append(f"{key}: {value}")
                        else:
                            error_messages.append(str(errors_field))

                    message_text = response_data.get('message')
                    if isinstance(message_text, str):
                        lowered = message_text.lower()
                        if any(keyword in lowered for keyword in ['error', 'invalid', 'suppress', 'blocked']):
                            error_messages.append(message_text)

                if error_messages:
                    logger.error("❌ MailerSend reported an error despite HTTP 202 status")
                    for details in error_messages:
                        logger.error(f"   ➤ {details}")
                    logger.error(f"   Email data: from={from_email}, to={message.to}")
                    return False

                message_id = response_data.get('message_id', 'N/A') if isinstance(response_data, dict) else 'N/A'
                logger.info(f"✅ Email sent successfully via MailerSend to {message.to}")
                logger.info(f"   Message ID: {message_id}")
                logger.info(f"   From: {from_email}")
                logger.info(f"   Subject: {message.subject}")
                return True
            else:
                error_details = response.text
                try:
                    error_json = response.json()
                    error_details = error_json.get('message', error_details)
                except:
                    pass
                logger.error(f"❌ MailerSend API error: {response.status_code}")
                logger.error(f"   Response: {error_details}")
                logger.error(f"   Email data: from={from_email}, to={message.to}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send email via MailerSend: {e}")
            return False

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
            # Always use self.from_email to ensure verified domain
            from_email = self.from_email
            logger.info(f"Sending email from: {from_email}")
            
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
            
            response = requests.post(
                self.api_url,
                json=email_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 202:
                logger.info(f"Email sent successfully via MailerSend to {message.to}")
                return True
            else:
                logger.error(f"MailerSend API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send email via MailerSend: {e}")
            return False

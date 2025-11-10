import os
import requests
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage
import logging

logger = logging.getLogger(__name__)

class SendGridEmailBackend(BaseEmailBackend):
    """
    SendGrid email backend for Django
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.api_url = 'https://api.sendgrid.com/v3/mail/send'
        self.from_email = os.getenv('SENDGRID_FROM_EMAIL', 'noreply@example.com')
        
    def send_messages(self, email_messages):
        """
        Send multiple email messages using SendGrid API
        """
        if not self.api_key:
            logger.error("SendGrid API key not configured")
            return 0
            
        sent_count = 0
        for message in email_messages:
            if self._send_single_message(message):
                sent_count += 1
                
        return sent_count
    
    def _send_single_message(self, message):
        """
        Send a single email message using SendGrid API
        """
        try:
            # Prepare email data for SendGrid API
            email_data = {
                "personalizations": [
                    {
                        "to": [{"email": email} for email in message.to],
                        "subject": message.subject
                    }
                ],
                "from": {
                    "email": message.from_email or self.from_email,
                    "name": "New Concierge"
                },
                "content": [
                    {
                        "type": "text/html",
                        "value": message.body if hasattr(message, 'body') else str(message)
                    }
                ]
            }
            
            # Add CC and BCC if present
            if message.cc:
                email_data["personalizations"][0]["cc"] = [{"email": email} for email in message.cc]
            if message.bcc:
                email_data["personalizations"][0]["bcc"] = [{"email": email} for email in message.bcc]
            
            # Make API request
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                self.api_url,
                json=email_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 202:
                logger.info(f"Email sent successfully via SendGrid to {message.to}")
                return True
            else:
                logger.error(f"SendGrid API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send email via SendGrid: {e}")
            return False

"""
Custom email backend for Resend API integration
"""
import os
import requests
import json
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail import EmailMessage
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class ResendEmailBackend(BaseEmailBackend):
    """
    Custom email backend that uses Resend API for sending emails
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = os.getenv('RESEND_API_KEY')
        self.api_url = 'https://api.resend.com/emails'
        self.from_email = os.getenv('RESEND_FROM_EMAIL', 'onboarding@resend.dev')
        
    def send_messages(self, email_messages):
        """
        Send multiple email messages using Resend API
        """
        if not self.api_key:
            logger.error("RESEND_API_KEY not configured")
            return 0
            
        sent_count = 0
        for message in email_messages:
            if self._send_single_message(message):
                sent_count += 1
                
        return sent_count
    
    def _send_single_message(self, message):
        """
        Send a single email message using Resend API
        """
        try:
            # Prepare the email data
            email_data = {
                "from": message.from_email or self.from_email,
                "to": message.to,
                "subject": message.subject,
                "html": message.body if hasattr(message, 'body') else str(message),
            }
            
            # Add CC and BCC if present
            if message.cc:
                email_data["cc"] = message.cc
            if message.bcc:
                email_data["bcc"] = message.bcc
                
            # Add reply-to if present
            if message.reply_to:
                email_data["reply_to"] = message.reply_to[0] if message.reply_to else None
            
            # Send the request to Resend API
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=email_data,
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"Email sent successfully via Resend API: {message.to}")
                return True
            else:
                logger.error(f"Resend API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email via Resend API: {e}")
            return False

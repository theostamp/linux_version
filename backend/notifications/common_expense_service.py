"""
Service for automated common expense notifications.

This service handles:
1. Auto-attaching the common expense sheet (JPG) for the building/month
2. Generating personalized payment notifications (Ειδοποιητήριο) for each apartment
3. Sending emails with both the sheet and personalized data
4. Sending Push Notifications to users
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal

from django.db.models import Q
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

from .push_service import PushNotificationService

logger = logging.getLogger(__name__)


class CommonExpenseNotificationService:
    """
    Service for sending personalized common expense notifications.
    """
    
    @staticmethod
    def get_common_expense_sheet(building_id: int, month: date) -> Optional[str]:
        """
        Get the common expense sheet (JPG/image) for a building and month.
        
        Returns the file path/URL if found, None otherwise.
        """
        from financial.models import Expense
        
        # Find expenses for this building and month that have attachments
        month_start = date(month.year, month.month, 1)
        if month.month == 12:
            month_end = date(month.year + 1, 1, 1)
        else:
            month_end = date(month.year, month.month + 1, 1)
        
        # Get any expense with attachment for this month/building
        expense_with_sheet = Expense.objects.filter(
            building_id=building_id,
            month__gte=month_start,
            month__lt=month_end,
            attachment__isnull=False
        ).exclude(attachment='').first()
        
        if expense_with_sheet and expense_with_sheet.attachment:
            return expense_with_sheet.attachment.url if hasattr(expense_with_sheet.attachment, 'url') else str(expense_with_sheet.attachment)
        
        return None
    
    @staticmethod
    def get_apartment_payment_data(building_id: int, apartment_id: int, month: date) -> Dict[str, Any]:
        """
        Get the payment notification data for a specific apartment.
        This mirrors the data shown in PaymentNotificationModal.
        
        Returns a dict with all payment details for the apartment.
        """
        from financial.services import FinancialCalculationService
        from apartments.models import Apartment
        from buildings.models import Building
        
        try:
            apartment = Apartment.objects.select_related('building', 'owner').get(
                id=apartment_id,
                building_id=building_id
            )
            building = apartment.building
            
            # Use the financial calculation service to get balance data
            # This is the same data used by the frontend modal
            balance_data = FinancialCalculationService.calculate_apartment_balance(
                apartment_id=apartment_id,
                month=month
            )
            
            return {
                'apartment_id': apartment_id,
                'apartment_number': apartment.number,
                'building_name': building.name,
                'building_address': building.address,
                'owner_name': apartment.owner.get_full_name() if apartment.owner else None,
                'tenant_name': apartment.tenant.get_full_name() if hasattr(apartment, 'tenant') and apartment.tenant else None,
                'participation_mills': apartment.participation_permilles or 0,
                'month': month.strftime('%B %Y'),
                'month_display': month.strftime('%B %Y'),
                
                # Financial data
                'previous_balance': balance_data.get('previous_balance', 0),
                'expense_share': balance_data.get('expense_share', 0),
                'total_payments': balance_data.get('total_payments', 0),
                'net_obligation': balance_data.get('net_obligation', 0),
                'resident_expenses': balance_data.get('resident_expenses', 0),
                'owner_expenses': balance_data.get('owner_expenses', 0),
                
                # Breakdown
                'expense_breakdown': balance_data.get('expense_breakdown', []),
                'payment_breakdown': balance_data.get('payment_breakdown', []),
                
                # Status
                'status': 'paid' if balance_data.get('net_obligation', 0) <= 0 else 
                         'overdue' if balance_data.get('previous_balance', 0) > 0 else 'pending',
                
                # Payment deadline (15th of next month)
                'payment_deadline': date(
                    month.year + (1 if month.month == 12 else 0),
                    1 if month.month == 12 else month.month + 1,
                    15
                ).strftime('%d %B %Y'),
            }
        except Apartment.DoesNotExist:
            logger.error(f"Apartment {apartment_id} not found in building {building_id}")
            return {}
        except Exception as e:
            logger.error(f"Error getting apartment payment data: {e}")
            return {}
    
    @staticmethod
    def generate_payment_notification_html(apartment_data: Dict[str, Any], office_data: Dict[str, Any] = None) -> str:
        """
        Generate the HTML content for the payment notification (Ειδοποιητήριο).
        
        This generates an email-friendly version of the PaymentNotificationModal content.
        """
        if not apartment_data:
            return ""
        
        office_data = office_data or {}
        
        # Format currency helper
        def format_currency(amount):
            if amount is None:
                return "0,00 €"
            return f"{float(amount):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")
        
        # Build expense breakdown HTML
        expense_breakdown_html = ""
        if apartment_data.get('expense_breakdown'):
            for expense in apartment_data['expense_breakdown']:
                expense_breakdown_html += f"""
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{expense.get('expense_title', '')}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">{format_currency(expense.get('share_amount', 0))}</td>
                </tr>
                """
        
        html = f"""
        <!DOCTYPE html>
        <html lang="el">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ειδοποιητήριο Κοινοχρήστων</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="margin: 0; color: #1e40af; font-size: 18px;">{office_data.get('name', 'Γραφείο Διαχείρισης')}</h1>
                        <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">{office_data.get('address', '')}</p>
                        <p style="margin: 2px 0 0; color: #6b7280; font-size: 14px;">Τηλ: {office_data.get('phone', '')}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; color: #6b7280; font-size: 12px;">Πληρωτέο έως:</p>
                        <p style="margin: 5px 0 0; color: #dc2626; font-size: 18px; font-weight: bold;">{apartment_data.get('payment_deadline', '')}</p>
                    </div>
                </div>
            </div>
            
            <!-- Title -->
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0; color: #111827; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">
                    ΕΙΔΟΠΟΙΗΤΗΡΙΟ ΚΟΙΝΟΧΡΗΣΤΩΝ
                </h2>
                <p style="margin: 10px 0 0; color: #6b7280;">{apartment_data.get('month_display', '')}</p>
            </div>
            
            <!-- Apartment Info -->
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 16px;">🏠 Στοιχεία Διαμερίσματος</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Διαμέρισμα:</td>
                        <td style="padding: 5px 0; font-weight: bold;">{apartment_data.get('apartment_number', '')}</td>
                        <td style="padding: 5px 0; color: #6b7280;">Κτίριο:</td>
                        <td style="padding: 5px 0; font-weight: bold;">{apartment_data.get('building_name', '')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Ιδιοκτήτης:</td>
                        <td style="padding: 5px 0;">{apartment_data.get('owner_name', 'Μη καταχωρημένος')}</td>
                        <td style="padding: 5px 0; color: #6b7280;">Χιλιοστά:</td>
                        <td style="padding: 5px 0;">{apartment_data.get('participation_mills', 0)}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Payment Summary -->
            <div style="background: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
                <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px;">Ποσό Πληρωτέο:</p>
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: {'#dc2626' if apartment_data.get('net_obligation', 0) > 0 else '#16a34a'};">
                    {format_currency(abs(apartment_data.get('net_obligation', 0)))}
                </p>
            </div>
            
            <!-- Financial Breakdown -->
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 16px;">📊 Ανάλυση Οφειλών</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f9fafb;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">Προηγούμενο Υπόλοιπο:</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #7c3aed;">
                            {format_currency(apartment_data.get('previous_balance', 0))}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">Κοινόχρηστα Τρέχοντος Μήνα:</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
                            {format_currency(apartment_data.get('expense_share', 0))}
                        </td>
                    </tr>
                    <tr style="background: #f0fdf4;">
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">Πληρωμές:</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #16a34a;">
                            -{format_currency(apartment_data.get('total_payments', 0))}
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Expense Breakdown -->
            {f'''
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 16px;">📋 Ανάλυση Δαπανών</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Περιγραφή</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Ποσό</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expense_breakdown_html}
                    </tbody>
                </table>
            </div>
            ''' if expense_breakdown_html else ''}
            
            <!-- Payment Instructions -->
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #92400e; font-size: 16px;">📝 Οδηγίες Πληρωμής</h3>
                <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                    <li>Η πληρωμή πρέπει να γίνει πριν την <strong>{apartment_data.get('payment_deadline', '')}</strong></li>
                    <li>Τρόποι πληρωμής: Τραπεζική κατάθεση, Online banking, Στο γραφείο</li>
                    <li>Για απορίες, επικοινωνήστε με το γραφείο διαχείρισης</li>
                </ul>
            </div>
            
            <!-- Bank Details -->
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 16px;">🏦 Τραπεζικά Στοιχεία</h3>
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 5px 0; color: #6b7280;">IBAN:</td>
                        <td style="padding: 5px 0; font-family: monospace;">{office_data.get('iban', 'GR00 0000 0000 0000 0000 0000 000')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Τράπεζα:</td>
                        <td style="padding: 5px 0;">{office_data.get('bank_name', '')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Δικαιούχος:</td>
                        <td style="padding: 5px 0;">{office_data.get('beneficiary', office_data.get('name', ''))}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
                <p>Αυτό το email δημιουργήθηκε αυτόματα από το New Concierge</p>
                <p>{office_data.get('name', '')} - {office_data.get('address', '')}</p>
            </div>
            
        </body>
        </html>
        """
        
        return html
    
    @staticmethod
    def send_common_expense_notifications(
        building_id: int,
        month: date,
        apartment_ids: List[int] = None,
        include_sheet: bool = True,
        include_notification: bool = True,
        custom_attachment: str = None,
        custom_message: str = None,
        sender_user = None
    ) -> Dict[str, Any]:
        """
        Send common expense notifications to apartments in a building.
        
        Args:
            building_id: The building ID
            month: The month for the common expenses
            apartment_ids: Optional list of specific apartment IDs (None = all)
            include_sheet: Whether to include the common expense sheet JPG
            include_notification: Whether to include personalized payment data
            custom_attachment: Optional custom attachment path
            custom_message: Optional custom message to prepend
            sender_user: The user sending the notification (for office data)
            
        Returns:
            Dict with results: {
                'success': True/False,
                'sent_count': int,
                'failed_count': int,
                'details': [...]
            }
        """
        from apartments.models import Apartment
        from buildings.models import Building
        from django.core.mail import EmailMultiAlternatives
        from django.core.files.storage import default_storage
        import mimetypes
        
        results = {
            'success': True,
            'sent_count': 0,
            'failed_count': 0,
            'details': [],
            'sheet_attached': False,
            'notification_included': include_notification,
        }
        
        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            results['success'] = False
            results['details'].append({'error': f'Building {building_id} not found'})
            return results
        
        # Get office data from sender user
        office_data = {}
        if sender_user:
            office_data = {
                'name': getattr(sender_user, 'office_name', '') or '',
                'address': getattr(sender_user, 'office_address', '') or '',
                'phone': getattr(sender_user, 'office_phone', '') or '',
                'iban': getattr(sender_user, 'office_bank_iban', '') or '',
                'bank_name': getattr(sender_user, 'office_bank_name', '') or '',
                'beneficiary': getattr(sender_user, 'office_bank_beneficiary', '') or '',
            }
        
        # Get the common expense sheet if requested
        sheet_path = None
        if include_sheet:
            sheet_path = CommonExpenseNotificationService.get_common_expense_sheet(building_id, month)
            if sheet_path:
                results['sheet_attached'] = True
                logger.info(f"Found common expense sheet: {sheet_path}")
        
        # Use custom attachment if provided
        attachment_path = custom_attachment or sheet_path
        
        # Get apartments
        apartments_query = Apartment.objects.filter(building_id=building_id)
        if apartment_ids:
            apartments_query = apartments_query.filter(id__in=apartment_ids)
        
        apartments = apartments_query.select_related('owner_user', 'tenant_user', 'building')
        
        month_display = month.strftime('%B %Y')
        
        for apartment in apartments:
            try:
                # Get recipient email
                recipient_email = None
                if apartment.tenant_email:
                    recipient_email = apartment.tenant_email
                elif apartment.owner_email:
                    recipient_email = apartment.owner_email
                elif apartment.owner_user:
                    recipient_email = apartment.owner_user.email
                
                # Get apartment payment data
                apartment_data = {}
                if include_notification:
                    apartment_data = CommonExpenseNotificationService.get_apartment_payment_data(
                        building_id, apartment.id, month
                    )
                
                # Send Push Notification
                push_user = None
                if apartment.owner_user:
                    push_user = apartment.owner_user
                elif apartment.tenant_user:
                    push_user = apartment.tenant_user
                
                if push_user:
                    try:
                        amount_str = f"{apartment_data.get('net_obligation', 0):.2f}€"
                        PushNotificationService.send_to_user(
                            user=push_user,
                            title=f"Κοινόχρηστα {month_display}",
                            body=f"Εκδόθηκαν τα κοινόχρηστα για το διαμέρισμα {apartment.number}. Ποσό: {amount_str}",
                            data={
                                'type': 'bill', 
                                'month': month.strftime('%Y-%m'), 
                                'building_id': str(building_id),
                                'apartment_id': str(apartment.id)
                            }
                        )
                    except Exception as push_error:
                        logger.error(f"Failed to send push to user {push_user.id}: {push_error}")

                if not recipient_email:
                    results['details'].append({
                        'apartment': apartment.number,
                        'status': 'skipped',
                        'reason': 'No email address'
                    })
                    continue
                
                # Generate email content
                subject = f"Κοινόχρηστα {month_display} - {building.name} - Διαμ. {apartment.number}"
                
                # Build text content
                text_content = custom_message or ""
                if include_notification and apartment_data:
                    text_content += f"""
Αγαπητέ/ή ιδιοκτήτη/ένοικε,

Σας αποστέλλουμε το ειδοποιητήριο κοινοχρήστων για τον μήνα {month_display}.

Διαμέρισμα: {apartment.number}
Ποσό πληρωτέο: {apartment_data.get('net_obligation', 0):.2f}€
Προθεσμία πληρωμής: {apartment_data.get('payment_deadline', '')}

Με εκτίμηση,
{office_data.get('name', 'Η Διαχείριση')}
"""
                
                # Generate HTML content
                html_content = ""
                if include_notification and apartment_data:
                    html_content = CommonExpenseNotificationService.generate_payment_notification_html(
                        apartment_data, office_data
                    )
                    if custom_message:
                        # Prepend custom message to HTML
                        html_content = f"""
                        <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="margin: 0;">{custom_message}</p>
                        </div>
                        """ + html_content
                
                # Create email
                from_email = getattr(settings, 'MAILERSEND_FROM_EMAIL', None) or \
                            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@newconcierge.app')
                
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=from_email,
                    to=[recipient_email]
                )
                
                if html_content:
                    email.attach_alternative(html_content, 'text/html')
                
                # Attach the sheet if available
                if attachment_path:
                    try:
                        if default_storage.exists(attachment_path):
                            with default_storage.open(attachment_path, 'rb') as f:
                                content = f.read()
                                filename = attachment_path.split('/')[-1]
                                mimetype, _ = mimetypes.guess_type(filename)
                                email.attach(filename, content, mimetype or 'application/octet-stream')
                    except Exception as attach_error:
                        logger.warning(f"Could not attach file: {attach_error}")
                
                # Send email
                email.send()
                
                results['sent_count'] += 1
                results['details'].append({
                    'apartment': apartment.number,
                    'email': recipient_email,
                    'status': 'sent',
                    'amount': apartment_data.get('net_obligation', 0) if apartment_data else None
                })
                
            except Exception as e:
                results['failed_count'] += 1
                results['details'].append({
                    'apartment': apartment.number,
                    'status': 'failed',
                    'error': str(e)
                })
                logger.error(f"Error sending to apartment {apartment.number}: {e}")
        
        results['success'] = results['failed_count'] == 0
        return results

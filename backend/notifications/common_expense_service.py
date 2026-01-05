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

from django.db import connection
from django.db.models import Q
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django_tenants.utils import get_public_schema_name, get_tenant_domain_model, schema_context

from .push_service import PushNotificationService
from .webpush_service import WebPushService
from .viber_notification_service import ViberNotificationService
from core.emailing import _absolute_url, extract_legacy_body_html, send_templated_email

logger = logging.getLogger(__name__)


class CommonExpenseNotificationService:
    """
    Service for sending personalized common expense notifications.
    """

    @staticmethod
    def _resolve_tenant_frontend_base() -> str:
        """
        Resolve the correct tenant frontend base URL for links inside emails.
        """
        fallback = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
        schema_name = getattr(connection, 'schema_name', None)
        if not schema_name:
            return fallback

        public_schema = get_public_schema_name()
        if schema_name == public_schema:
            return fallback

        try:
            with schema_context(public_schema):
                DomainModel = get_tenant_domain_model()
                domain = (
                    DomainModel.objects.filter(tenant__schema_name=schema_name)
                    .order_by('-is_primary', 'id')
                    .first()
                )
            if domain and domain.domain:
                scheme = 'http' if 'localhost' in domain.domain else 'https'
                return f"{scheme}://{domain.domain}"
        except Exception as exc:
            logger.warning("Tenant domain lookup failed for schema %s: %s", schema_name, exc)

        return fallback

    @staticmethod
    def get_common_expense_sheet(building_id: int, month: date) -> Optional[str]:
        """
        Get the common expense sheet (JPG/image) for a building and month.

        Returns the storage path if found, None otherwise.
        """
        from financial.models import CommonExpensePeriod, Expense

        # Find expenses for this building and month that have attachments
        # NOTE: Expense uses `date` (not `month`).
        month_start = date(month.year, month.month, 1)
        if month.month == 12:
            month_end = date(month.year + 1, 1, 1)
        else:
            month_end = date(month.year, month.month + 1, 1)

        period = CommonExpensePeriod.objects.filter(
            building_id=building_id,
            start_date__lt=month_end,
            end_date__gte=month_start,
        ).order_by('-start_date').first()

        if period and period.sheet_attachment:
            return period.sheet_attachment.name or str(period.sheet_attachment)

        # Get any expense with attachment for this month/building
        expense_with_sheet = (
            Expense.objects.filter(
                building_id=building_id,
                date__gte=month_start,
                date__lt=month_end,
                attachment__isnull=False,
            )
            .exclude(attachment="")
            .first()
        )

        if expense_with_sheet and expense_with_sheet.attachment:
            return expense_with_sheet.attachment.name or str(expense_with_sheet.attachment)

        return None

    @staticmethod
    def get_apartment_payment_data(building_id: int, apartment_id: int, month: date) -> Dict[str, Any]:
        """
        Get the payment notification data for a specific apartment.
        This mirrors the data shown in PaymentNotificationModal.

        Returns a dict with all payment details for the apartment.
        """
        from financial.balance_service import BalanceCalculationService
        from financial.models import Expense, Transaction, Payment
        from apartments.models import Apartment
        from buildings.models import Building
        from django.db.models import Sum

        try:
            apartment = Apartment.objects.select_related('building', 'owner_user', 'tenant_user').get(
                id=apartment_id,
                building_id=building_id
            )
            building = apartment.building

            dashboard_balance = None
            try:
                from financial.services import FinancialDashboardService

                month_str = month.strftime('%Y-%m')
                balances = FinancialDashboardService(building_id=building_id).get_apartment_balances(month=month_str)
                dashboard_balance = next((b for b in balances if int(b.get('id')) == int(apartment_id)), None)
            except Exception as e:
                logger.warning(f"Dashboard balance lookup failed for apartment {apartment_id}: {e}")

            # Calculate previous balance (before current month)
            month_start = date(month.year, month.month, 1)
            previous_balance = BalanceCalculationService.calculate_historical_balance(
                apartment, month_start, include_management_fees=True
            )

            # Calculate current month's expense share
            if month.month == 12:
                month_end = date(month.year + 1, 1, 1)
            else:
                month_end = date(month.year, month.month + 1, 1)

            # Get expenses for this month (Expense uses `date`)
            expenses = Expense.objects.filter(
                building_id=building_id,
                date__gte=month_start,
                date__lt=month_end,
            )

            # Calculate apartment's share based on participation mills
            total_expense = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            mills = apartment.participation_mills or apartment.participation_permilles or 0
            expense_share = (total_expense * Decimal(mills)) / Decimal('1000') if mills else Decimal('0')

            # Get payments for this month
            payments_this_month = Payment.objects.filter(
                apartment=apartment,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            # Calculate net obligation
            net_obligation = float(previous_balance) + float(expense_share) - float(payments_this_month)

            # Get expense breakdown
            expense_breakdown = []
            for expense in expenses:
                share = (expense.amount * Decimal(mills)) / Decimal('1000') if mills else Decimal('0')
                expense_breakdown.append({
                    'expense_title': expense.title or expense.category,
                    'share_amount': float(share)
                })

            # Override with dashboard snapshot if available (matches modal)
            if dashboard_balance:
                try:
                    previous_balance = Decimal(str(dashboard_balance.get('previous_balance', previous_balance)))
                    expense_share = Decimal(str(dashboard_balance.get('expense_share', expense_share)))
                    payments_this_month = Decimal(str(dashboard_balance.get('month_payments', payments_this_month)))
                    total_payments = Decimal(str(dashboard_balance.get('total_payments', payments_this_month)))
                    net_obligation = Decimal(str(dashboard_balance.get('net_obligation', net_obligation)))
                    resident_expenses = Decimal(str(dashboard_balance.get('resident_expenses', expense_share)))
                    owner_expenses = Decimal(str(dashboard_balance.get('owner_expenses', 0)))
                    previous_resident_expenses = Decimal(str(dashboard_balance.get('previous_resident_expenses', 0)))
                    previous_owner_expenses = Decimal(str(dashboard_balance.get('previous_owner_expenses', 0)))
                except Exception as e:
                    logger.warning(f"Dashboard balance override failed for apartment {apartment_id}: {e}")
                    total_payments = payments_this_month
                    previous_resident_expenses = Decimal('0.00')
                    previous_owner_expenses = Decimal('0.00')
            else:
                total_payments = payments_this_month
                previous_resident_expenses = Decimal('0.00')
                previous_owner_expenses = Decimal('0.00')
                resident_expenses = Decimal(expense_share)
                owner_expenses = Decimal('0.00')

            return {
                'building_id': building_id,
                'apartment_id': apartment_id,
                'apartment_number': apartment.number,
                'building_name': building.name,
                'building_address': building.address,
                'owner_name': apartment.owner_user.get_full_name() if apartment.owner_user else apartment.owner_name or None,
                'tenant_name': apartment.tenant_user.get_full_name() if apartment.tenant_user else apartment.tenant_name or None,
                'participation_mills': mills,
                'month': month.strftime('%B %Y'),
                'month_display': month.strftime('%B %Y'),
                'month_key': month.strftime('%Y-%m'),

                # Financial data
                'previous_balance': float(previous_balance),
                'expense_share': float(expense_share),
                'total_payments': float(total_payments),
                'net_obligation': float(net_obligation),
                'resident_expenses': float(resident_expenses),
                'owner_expenses': float(owner_expenses),
                'previous_resident_expenses': float(previous_resident_expenses),
                'previous_owner_expenses': float(previous_owner_expenses),

                # Breakdown
                'expense_breakdown': expense_breakdown,
                'payment_breakdown': [],

                # Status
                'status': 'paid' if net_obligation <= 0 else
                         'overdue' if float(previous_balance) > 0 else 'pending',

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
            logger.error(f"Error getting apartment payment data: {e}", exc_info=True)
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

        def to_float(value):
            try:
                return float(value)
            except Exception:
                return 0.0

        def format_currency_or_dash(amount, threshold=0.3):
            if abs(to_float(amount)) <= threshold:
                return "-"
            return format_currency(amount)

        net_obligation_value = to_float(apartment_data.get('net_obligation', 0))
        net_obligation_color = '#dc2626' if net_obligation_value > 0 else '#16a34a' if net_obligation_value < 0 else '#111827'
        net_obligation_display = format_currency(abs(net_obligation_value))

        tenant_name = apartment_data.get('tenant_name') or ""
        building_name = apartment_data.get('building_name', '') or ""
        owner_name = apartment_data.get('owner_name', 'Μη καταχωρημένος')
        participation_mills = apartment_data.get('participation_mills', 0)

        info_row_2_label_left = "Ένοικος" if tenant_name else "Χιλιοστά Συμμετοχής"
        info_row_2_value_left = tenant_name or participation_mills
        info_row_2_label_right = "Χιλιοστά Συμμετοχής" if tenant_name else "Κτίριο"
        info_row_2_value_right = participation_mills if tenant_name else building_name

        previous_balance_value = apartment_data.get('previous_balance', 0)
        previous_owner_expenses = apartment_data.get('previous_owner_expenses', 0)
        previous_resident_expenses = apartment_data.get('previous_resident_expenses', 0)
        has_prev_owner = to_float(previous_owner_expenses) > 0.3
        has_prev_resident = to_float(previous_resident_expenses) > 0.3

        previous_breakdown_html = ""
        if has_prev_owner or has_prev_resident:
            owner_prefix = "├─" if has_prev_resident else "└─"
            resident_prefix = "└─" if has_prev_owner else "├─"
            previous_breakdown_html = f"""
            <div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #d8b4fe;">
                {f'''
                <div style="display: flex; justify-content: space-between; color: #b91c1c; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 11px;">{owner_prefix}</span>
                        <span>Δαπάνες Ιδιοκτήτη</span>
                        <span style="border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; font-size: 11px; padding: 1px 6px; border-radius: 6px;">Δ</span>
                    </div>
                    <span style="font-weight: 600;">{format_currency(previous_owner_expenses)}</span>
                </div>
                ''' if has_prev_owner else ''}
                {f'''
                <div style="display: flex; justify-content: space-between; color: #15803d;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 11px;">{resident_prefix}</span>
                        <span>Δαπάνες Ενοίκου</span>
                        <span style="border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; font-size: 11px; padding: 1px 6px; border-radius: 6px;">Ε</span>
                    </div>
                    <span style="font-weight: 600;">{format_currency(previous_resident_expenses)}</span>
                </div>
                ''' if has_prev_resident else ''}
            </div>
            """

        sheet_url = apartment_data.get('sheet_url') or ""
        sheet_attached = bool(apartment_data.get('sheet_attached'))
        sheet_name = apartment_data.get('sheet_name') or "Φύλλο Κοινοχρήστων"
        sheet_download_url = apartment_data.get('sheet_download_url') or ""
        sheet_is_image = sheet_url.lower().endswith(('.jpg', '.jpeg', '.png'))
        sheet_section_html = ""
        if sheet_attached:
            sheet_link_html = f"""
            <div style="margin-top: 6px;">
                <a href="{sheet_url}" style="color: #1d4ed8; text-decoration: underline;">Προβολή {sheet_name}</a>
            </div>
            """ if sheet_url else ""
            sheet_download_link_html = f"""
            <div style="margin-top: 6px;">
                <a href="{sheet_download_url}" style="color: #1d4ed8; text-decoration: underline;">Λήψη φύλλου κοινοχρήστων</a>
            </div>
            """ if sheet_download_url else ""
            sheet_preview_html = f"""
            <div style="margin-top: 12px;">
                <img src="{sheet_url}" alt="{sheet_name}" style="width: 100%; max-width: 640px; border-radius: 8px; border: 1px solid #e5e7eb;" />
            </div>
            """ if sheet_url and sheet_is_image else ""
            sheet_section_html = f"""
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px; color: #0f172a; font-size: 16px;">📄 Φύλλο Κοινοχρήστων</h3>
                <p style="margin: 0; color: #475569; font-size: 13px;">Το φύλλο κοινοχρήστων επισυνάπτεται στο email για συνολική εικόνα.</p>
                {sheet_link_html}
                {sheet_download_link_html}
                {sheet_preview_html}
            </div>
            """
        elif sheet_download_url:
            sheet_section_html = f"""
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px; color: #0f172a; font-size: 16px;">📄 Φύλλο Κοινοχρήστων</h3>
                <p style="margin: 0; color: #475569; font-size: 13px;">Μπορείτε να κατεβάσετε το πλήρες φύλλο κοινοχρήστων από τον σύνδεσμο.</p>
                <div style="margin-top: 6px;">
                    <a href="{sheet_download_url}" style="color: #1d4ed8; text-decoration: underline;">Λήψη φύλλου κοινοχρήστων</a>
                </div>
            </div>
            """

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
            <title>Ειδοποιητήριο Πληρωμής Κοινοχρήστων</title>
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
                    ΕΙΔΟΠΟΙΗΤΗΡΙΟ ΠΛΗΡΩΜΗΣ ΚΟΙΝΟΧΡΗΣΤΩΝ
                </h2>
                <p style="margin: 10px 0 0; color: #6b7280;">{apartment_data.get('month_display', '')}</p>
            </div>

            <!-- Apartment Info -->
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 16px;">🏠 Στοιχεία Διαμερίσματος</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px 0; color: #6b7280;">Αριθμός Διαμερίσματος:</td>
                        <td style="padding: 5px 0; font-weight: bold;">{apartment_data.get('apartment_number', '')}</td>
                        <td style="padding: 5px 0; color: #6b7280;">Ιδιοκτήτης:</td>
                        <td style="padding: 5px 0; font-weight: bold;">{owner_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #6b7280;">{info_row_2_label_left}:</td>
                        <td style="padding: 5px 0;">{info_row_2_value_left}</td>
                        <td style="padding: 5px 0; color: #6b7280;">{info_row_2_label_right}:</td>
                        <td style="padding: 5px 0;">{info_row_2_value_right}</td>
                    </tr>
                </table>
            </div>

            <!-- Payment Info -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px; color: #1e3a8a; font-size: 16px;">💳 Πληροφορίες Πληρωμής</h3>
                <div style="text-align: center; margin-bottom: 16px;">
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px;">Ποσό Πληρωτέο:</p>
                    <p style="margin: 0; font-size: 30px; font-weight: bold; color: {net_obligation_color};">
                        {net_obligation_display}
                    </p>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
                    <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; color: #065f46; font-size: 13px; margin-bottom: 6px;">
                            <span>Δαπάνες Ενοίκου</span>
                            <span style="border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; font-size: 11px; padding: 1px 6px; border-radius: 6px;">Ε</span>
                        </div>
                        <div style="font-size: 18px; font-weight: 700; color: #15803d;">
                            {format_currency_or_dash(apartment_data.get('resident_expenses', 0))}
                        </div>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; color: #7f1d1d; font-size: 13px; margin-bottom: 6px;">
                            <span>Δαπάνες Ιδιοκτήτη</span>
                            <span style="border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; font-size: 11px; padding: 1px 6px; border-radius: 6px;">Δ</span>
                        </div>
                        <div style="font-size: 18px; font-weight: 700; color: #b91c1c;">
                            {format_currency_or_dash(apartment_data.get('owner_expenses', 0))}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Financial Breakdown -->
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 16px;">📊 Ανάλυση Οφειλών</h3>
                <div style="background: #f3e8ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: #6b21a8;">
                        <span>Παλαιότερες Οφειλές:</span>
                        <span>{format_currency_or_dash(previous_balance_value)}</span>
                    </div>
                    {previous_breakdown_html}
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                        <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Ποσό Κοινοχρήστων (Τρέχων):</div>
                        <div style="font-size: 16px; font-weight: 600;">
                            {format_currency(apartment_data.get('expense_share', 0))}
                        </div>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                        <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Σύνολο Πληρωμών:</div>
                        <div style="font-size: 16px; font-weight: 600; color: #16a34a;">
                            {format_currency(apartment_data.get('total_payments', 0))}
                        </div>
                    </div>
                </div>
            </div>

            {sheet_section_html}

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
        period_id: Optional[int] = None,
        include_sheet: bool = True,
        include_notification: bool = True,
        custom_attachment: str = None,
        custom_message: str = None,
        subject_prefix: str = None,
        sender_user = None,
        mark_period_sent: bool = False,
        sent_source: str = None,
        skip_if_already_sent: bool = False
    ) -> Dict[str, Any]:
        """
        Send common expense notifications to apartments in a building.

        Args:
            building_id: The building ID
            month: The month for the common expenses
            apartment_ids: Optional list of specific apartment IDs (None = all)
            period_id: Optional CommonExpensePeriod ID to pin the sheet to a specific issue run
            include_sheet: Whether to include the common expense sheet JPG
            include_notification: Whether to include personalized payment data
            custom_attachment: Optional custom attachment path
            custom_message: Optional custom message to prepend
            subject_prefix: Optional subject prefix to override default
            sender_user: The user sending the notification (for office data)
            mark_period_sent: Whether to mark the period as notified
            sent_source: Optional marker for audit/logging ("manual", "auto")
            skip_if_already_sent: Skip sending if the period has notifications_sent_at

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
            'skipped': False,
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

        # Resolve the period for this month (used for dedupe/marking)
        period = None
        try:
            from financial.models import CommonExpensePeriod
            if period_id:
                period = CommonExpensePeriod.objects.filter(
                    id=period_id,
                    building_id=building_id,
                ).first()
            if not period:
                month_start = date(month.year, month.month, 1)
                if month.month == 12:
                    month_end = date(month.year + 1, 1, 1)
                else:
                    month_end = date(month.year, month.month + 1, 1)
                period = CommonExpensePeriod.objects.filter(
                    building_id=building_id,
                    start_date__lt=month_end,
                    end_date__gte=month_start,
                ).order_by('-start_date').first()
        except Exception as period_error:
            logger.warning("Common expense period lookup failed: %s", period_error)

        if skip_if_already_sent and period and period.notifications_sent_at:
            results['skipped'] = True
            results['details'].append({
                'status': 'skipped',
                'reason': 'already_sent'
            })
            return results

        # Get the common expense sheet if requested
        sheet_path = None
        if include_sheet:
            if period and period.sheet_attachment:
                sheet_path = period.sheet_attachment.name or str(period.sheet_attachment)
            else:
                sheet_path = CommonExpenseNotificationService.get_common_expense_sheet(building_id, month)
            if sheet_path:
                results['sheet_attached'] = True
                logger.info(f"Found common expense sheet: {sheet_path}")

        # Use custom attachment if provided
        attachment_path = custom_attachment or sheet_path
        sheet_url = None
        sheet_name = None
        if include_sheet and attachment_path:
            sheet_name = attachment_path.split('/')[-1]
            if attachment_path.startswith('http://') or attachment_path.startswith('https://'):
                sheet_url = attachment_path
            else:
                try:
                    sheet_url = default_storage.url(attachment_path)
                except Exception:
                    sheet_url = attachment_path
            sheet_url = _absolute_url(sheet_url) or sheet_url

        # Get apartments
        apartments_query = Apartment.objects.filter(building_id=building_id)
        if apartment_ids:
            apartments_query = apartments_query.filter(id__in=apartment_ids)

        apartments = apartments_query.select_related('owner_user', 'tenant_user', 'building')

        month_display = month.strftime('%B %Y')
        month_key = month.strftime('%Y-%m')
        frontend_base = CommonExpenseNotificationService._resolve_tenant_frontend_base()
        sheet_download_url = (
            f"{frontend_base}/common-expenses/sheet?building_id={building_id}"
            f"&period_id={period.id}" if (frontend_base and period) else
            f"{frontend_base}/common-expenses/sheet?building_id={building_id}&month={month_key}"
            if frontend_base else ""
        )

        custom_message_html = ""
        if custom_message:
            custom_message_html = custom_message.replace("\r\n", "\n").replace("\n", "<br>")

        for apartment in apartments:
            try:
                # Get recipient email
                recipient_email = None
                if apartment.tenant_email:
                    recipient_email = apartment.tenant_email
                elif apartment.tenant_user and apartment.tenant_user.email:
                    recipient_email = apartment.tenant_user.email
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
                    apartment_data['sheet_attached'] = bool(attachment_path)
                    apartment_data['sheet_url'] = sheet_url or ""
                    apartment_data['sheet_name'] = sheet_name or ""
                    apartment_data['sheet_download_url'] = sheet_download_url

                # Send Push Notification
                push_user = None
                if apartment.owner_user:
                    push_user = apartment.owner_user
                elif apartment.tenant_user:
                    push_user = apartment.tenant_user

                if push_user:
                    try:
                        amount_str = f"{apartment_data.get('net_obligation', 0):.2f}€"
                        ViberNotificationService.send_to_user(
                            user=push_user,
                            message=(
                                f"Εκδόθηκαν τα κοινόχρηστα για το διαμέρισμα {apartment.number}. "
                                f"Ποσό: {amount_str}"
                            ),
                            building=apartment.building,
                            office_name=office_data.get('name', '') if office_data else '',
                        )
                        WebPushService.send_to_user(
                            user=push_user,
                            title=f"Κοινόχρηστα {month_display}",
                            body=f"Εκδόθηκαν τα κοινόχρηστα για το διαμέρισμα {apartment.number}. Ποσό: {amount_str}",
                            data={
                                'type': 'bill',
                                'month': month.strftime('%Y-%m'),
                                'building_id': str(building_id),
                                'apartment_id': str(apartment.id),
                                'url': '/my-apartment',
                            },
                        )
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
                subject_base = (subject_prefix or f"Κοινόχρηστα {month_display}").strip()
                if not subject_base:
                    subject_base = f"Κοινόχρηστα {month_display}"
                subject = f"{subject_base} - {building.name} - Διαμ. {apartment.number}"

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
                            <p style="margin: 0;">{custom_message_html}</p>
                        </div>
                        """ + html_content

                # Create email
                # Note: we use send_templated_email() to enforce consistent header/footer branding.
                # We'll pass the generated HTML as legacy body and wrap it with `emails/wrapper.html`.

                attachments = []
                # Attach the sheet if available
                if attachment_path:
                    try:
                        if default_storage.exists(attachment_path):
                            with default_storage.open(attachment_path, 'rb') as f:
                                content = f.read()
                                filename = attachment_path.split('/')[-1]
                                mimetype, _ = mimetypes.guess_type(filename)
                                attachments.append((filename, content, mimetype or 'application/octet-stream'))
                    except Exception as attach_error:
                        logger.warning(f"Could not attach file: {attach_error}")

                # Send email
                body_html = extract_legacy_body_html(html=html_content) if html_content else ""
                send_templated_email(
                    to=recipient_email,
                    subject=subject,
                    template_html="emails/wrapper.html",
                    context={"body_html": body_html, "wrapper_title": subject},
                    sender_user=sender_user,
                    building_manager_id=getattr(building, "manager_id", None),
                    attachments=attachments or None,
                )

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

        if mark_period_sent and period and results['sent_count'] > 0:
            try:
                from django.utils import timezone
                period.notifications_sent_at = timezone.now()
                period.save(update_fields=['notifications_sent_at'])
            except Exception as mark_error:
                logger.warning("Failed to mark period as notified: %s", mark_error)

        results['success'] = results['failed_count'] == 0
        return results

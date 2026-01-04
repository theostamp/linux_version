"""
Debt Reminder Breakdown Service

Στόχος: Ενιαία λογική αποστολής υπενθύμισης οφειλών (με ανάλυση) που μπορεί να
χρησιμοποιηθεί τόσο από API endpoint όσο και από scheduled tasks.

Κύρια χαρακτηριστικά:
- Υπολογισμός οφειλών βάσει month snapshot (FinancialDashboardService.get_apartment_balances)
- Δημιουργία Notification + NotificationRecipient records
 - Αποστολή email ανά διαμέρισμα με περιεχόμενο τύπου "Ειδοποιητήριο Πληρωμής"
- Weekly dedupe helper (Δευτέρα–Κυριακή) με βάση Notification.status='sent'
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.utils import timezone

from apartments.models import Apartment
from buildings.models import Building
from core.emailing import extract_legacy_body_html, send_templated_email
from notifications.common_expense_service import CommonExpenseNotificationService
from notifications.models import Notification, NotificationRecipient
from notifications.services import NotificationService
from notifications.push_service import PushNotificationService
from notifications.webpush_service import WebPushService
from notifications.viber_notification_service import ViberNotificationService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DebtReminderSendResult:
    notification_id: Optional[int]
    month: str
    sent: int
    failed: int
    skipped: int
    details: List[Dict[str, Any]]


class DebtReminderBreakdownService:
    SUBJECT_KEYWORD = "Υπενθύμιση Οφειλών"

    @staticmethod
    def get_current_week_window(now: Optional[datetime] = None) -> tuple[datetime, datetime]:
        """
        Επιστρέφει [week_start, week_end) για την τρέχουσα εβδομάδα (Δευτέρα→επόμενη Δευτέρα),
        σε timezone Europe/Athens (settings.TIME_ZONE μέσω django.utils.timezone).
        """
        now = now or timezone.now()
        local_now = timezone.localtime(now)
        week_start = (local_now - timedelta(days=local_now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(days=7)
        return week_start, week_end

    @classmethod
    def has_sent_this_week(cls, building: Building, now: Optional[datetime] = None) -> bool:
        """
        True αν υπάρχει Notification (status='sent') για το building μέσα στην τρέχουσα εβδομάδα.
        """
        week_start, week_end = cls.get_current_week_window(now)
        return Notification.objects.filter(
            building=building,
            status="sent",
            subject__icontains=cls.SUBJECT_KEYWORD,
            created_at__gte=week_start,
            created_at__lt=week_end,
        ).exists()

    @staticmethod
    def _fmt_money(value) -> str:
        try:
            return f"{Decimal(str(value)):.2f}€"
        except Exception:
            return "0.00€"

    @classmethod
    def send_debt_reminders(
        cls,
        *,
        building: Building,
        created_by,
        month: str,
        min_debt: Decimal = Decimal("0"),
        apartment_ids: Optional[List[int]] = None,
        custom_message: str = "",
        create_notification_if_empty: bool = True,
    ) -> DebtReminderSendResult:
        """
        Αποστολή εξατομικευμένων υπενθυμίσεων οφειλών (με breakdown) για building.

        - Αν create_notification_if_empty=False και δεν υπάρχει κανένας παραλήπτης πάνω από min_debt,
          δεν δημιουργεί Notification record.
        """
        from financial.services import FinancialDashboardService

        custom_message = (custom_message or "").strip()

        # Fetch month snapshot balances
        dashboard = FinancialDashboardService(building_id=building.id)
        balances = dashboard.get_apartment_balances(month=month)
        balances_by_id = {int(b["id"]): b for b in balances if b.get("id") is not None}

        month_display = month
        payment_deadline = ""
        try:
            year, mon = map(int, month.split('-'))
            month_names = {
                1: 'Ιανουάριος', 2: 'Φεβρουάριος', 3: 'Μάρτιος', 4: 'Απρίλιος',
                5: 'Μάιος', 6: 'Ιούνιος', 7: 'Ιούλιος', 8: 'Αύγουστος',
                9: 'Σεπτέμβριος', 10: 'Οκτώβριος', 11: 'Νοέμβριος', 12: 'Δεκέμβριος'
            }
            month_genitive = {
                1: 'Ιανουαρίου', 2: 'Φεβρουαρίου', 3: 'Μαρτίου', 4: 'Απριλίου',
                5: 'Μαΐου', 6: 'Ιουνίου', 7: 'Ιουλίου', 8: 'Αυγούστου',
                9: 'Σεπτεμβρίου', 10: 'Οκτωβρίου', 11: 'Νοεμβρίου', 12: 'Δεκεμβρίου'
            }
            month_display = f"{month_names.get(mon, month)} {year}"
            deadline_month = 1 if mon == 12 else mon + 1
            deadline_year = year + 1 if mon == 12 else year
            payment_deadline = f"15 {month_genitive.get(deadline_month, '')} {deadline_year}".strip()
        except Exception:
            month_display = month
            payment_deadline = ""

        office_data = {}
        if created_by:
            office_data = {
                'name': getattr(created_by, 'office_name', '') or '',
                'address': getattr(created_by, 'office_address', '') or '',
                'phone': getattr(created_by, 'office_phone', '') or '',
                'iban': getattr(created_by, 'office_bank_iban', '') or '',
                'bank_name': getattr(created_by, 'office_bank_name', '') or '',
                'beneficiary': getattr(created_by, 'office_bank_beneficiary', '') or '',
            }

        # Determine target apartments
        if apartment_ids:
            target_apartments = Apartment.objects.filter(building=building, id__in=apartment_ids)
        else:
            target_apartments = Apartment.objects.filter(building=building)

        # Pre-scan: determine if any recipient is eligible (avoid creating spammy empty notifications for automation)
        eligible_count = 0
        for apartment in target_apartments:
            recipient_email = apartment.occupant_email or apartment.owner_email
            if not recipient_email:
                continue
            bal = balances_by_id.get(int(apartment.id))
            if not bal:
                continue
            try:
                total_due_raw = Decimal(str(bal.get("net_obligation", 0)))
            except Exception:
                total_due_raw = Decimal("0")
            if total_due_raw > min_debt:
                eligible_count += 1
                break

        if eligible_count == 0 and not create_notification_if_empty:
            logger.info(
                "[DebtReminderBreakdown] No eligible recipients for building=%s month=%s (min_debt=%s). Skipping.",
                building.id,
                month,
                min_debt,
            )
            return DebtReminderSendResult(
                notification_id=None,
                month=month,
                sent=0,
                failed=0,
                skipped=0,
                details=[],
            )

        # Create Notification record
        subject_base = f"{cls.SUBJECT_KEYWORD} {month} - {building.name}"
        notification = NotificationService.create_notification(
            building=building,
            created_by=created_by,
            subject=subject_base,
            body="Personalized debt reminders with breakdown (sent per recipient)",
            sms_body="",
            notification_type="email",
            priority="normal",
            scheduled_at=None,
            template=None,
        )

        sent = 0
        failed = 0
        skipped = 0
        details: List[Dict[str, Any]] = []

        for apartment in target_apartments:
            recipient_email = apartment.occupant_email or apartment.owner_email
            recipient_name = apartment.occupant_name

            recipient = NotificationRecipient.objects.create(
                notification=notification,
                apartment=apartment,
                recipient_name=recipient_name or f"Διαμέρισμα {apartment.number}",
                email=recipient_email or "",
                phone=apartment.occupant_phone or "",
                status="pending",
            )

            email_ok = False
            push_ok = False
            viber_ok = False
            email_error_reason = None

            bal = balances_by_id.get(int(apartment.id))
            if not bal:
                recipient.mark_as_failed("No balance data")
                skipped += 1
                details.append({"apartment": apartment.number, "status": "skipped", "reason": "No balance data"})
                continue

            try:
                total_due_raw = Decimal(str(bal.get("net_obligation", 0)))
            except Exception:
                total_due_raw = Decimal("0")

            if total_due_raw <= min_debt:
                recipient.mark_as_failed("Below threshold")
                skipped += 1
                details.append(
                    {
                        "apartment": apartment.number,
                        "status": "skipped",
                        "reason": "Below threshold",
                        "total_due": str(total_due_raw),
                    }
                )
                continue

            apartment_data = {
                'apartment_number': apartment.number,
                'building_name': building.name or building.street,
                'building_address': getattr(building, 'address', '') or getattr(building, 'street', ''),
                'owner_name': bal.get('owner_name') or apartment.owner_name or '',
                'tenant_name': bal.get('tenant_name') or apartment.tenant_name or '',
                'participation_mills': bal.get('participation_mills') or apartment.participation_mills or 0,
                'month_display': month_display,
                'previous_balance': bal.get('previous_balance', 0),
                'expense_share': bal.get('expense_share', 0),
                'resident_expenses': bal.get('resident_expenses', 0),
                'owner_expenses': bal.get('owner_expenses', 0),
                'previous_resident_expenses': bal.get('previous_resident_expenses', 0),
                'previous_owner_expenses': bal.get('previous_owner_expenses', 0),
                'total_payments': bal.get('total_payments', 0),
                'net_obligation': total_due_raw,
                'payment_deadline': payment_deadline,
            }

            subject = f"{cls.SUBJECT_KEYWORD} {month} - Διαμέρισμα {apartment.number} ({building.name})"

            if not recipient_email:
                email_error_reason = "No email address"
            else:
                try:
                    html_content = CommonExpenseNotificationService.generate_payment_notification_html(
                        apartment_data,
                        office_data,
                    )
                    if custom_message:
                        html_content = f"""
                        <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="margin: 0;">{custom_message}</p>
                        </div>
                        """ + html_content
                    body_html = extract_legacy_body_html(html=html_content)
                    ok = send_templated_email(
                        to=recipient_email,
                        subject=subject,
                        template_html="emails/wrapper.html",
                        context={"body_html": body_html, "wrapper_title": subject},
                        building_manager_id=getattr(building, "manager_id", None),
                        sender_user=created_by,
                    )
                    if ok:
                        email_ok = True
                    else:
                        email_error_reason = "Not sent"
                except Exception as e:
                    email_error_reason = str(e)

            push_user = apartment.owner_user or apartment.tenant_user
            if push_user:
                try:
                    amount_str = cls._fmt_money(total_due_raw)
                    viber_ok = ViberNotificationService.send_to_user(
                        user=push_user,
                        message=(
                            f"Υπενθύμιση οφειλής για το διαμέρισμα {apartment.number}. "
                            f"Ποσό: {amount_str}"
                        ),
                        building=building,
                        office_name=office_data.get('name', '') if office_data else '',
                    )
                    webpush_ok = WebPushService.send_to_user(
                        user=push_user,
                        title=f"{cls.SUBJECT_KEYWORD} {month_display}",
                        body=f"Υπενθύμιση οφειλής για το διαμέρισμα {apartment.number}. Ποσό: {amount_str}",
                        data={
                            'type': 'debt_reminder',
                            'month': month,
                            'building_id': str(building.id),
                            'apartment_id': str(apartment.id),
                            'url': '/my-apartment',
                        },
                    )
                    fcm_ok = PushNotificationService.send_to_user(
                        user=push_user,
                        title=f"{cls.SUBJECT_KEYWORD} {month_display}",
                        body=f"Υπενθύμιση οφειλής για το διαμέρισμα {apartment.number}. Ποσό: {amount_str}",
                        data={
                            'type': 'debt_reminder',
                            'month': month,
                            'building_id': str(building.id),
                            'apartment_id': str(apartment.id),
                        },
                    )
                    push_ok = bool(webpush_ok or fcm_ok)
                except Exception as push_error:
                    logger.warning(
                        "Web push failed for debt reminder (user=%s, apartment=%s): %s",
                        push_user.id,
                        apartment.id,
                        push_error,
                    )

            if email_ok or push_ok or viber_ok:
                recipient.mark_as_sent()
                sent += 1
                details.append(
                    {
                        "apartment": apartment.number,
                        "status": "sent",
                        "email": recipient_email or "",
                        "total_due": str(total_due_raw),
                    }
                )
            else:
                recipient.mark_as_failed(email_error_reason or "No delivery channels")
                failed += 1
                details.append(
                    {
                        "apartment": apartment.number,
                        "status": "failed",
                        "email": recipient_email or "",
                        "error": email_error_reason or "No delivery channels",
                    }
                )

        notification.total_recipients = sent + failed + skipped
        notification.successful_sends = sent
        notification.failed_sends = failed
        notification.completed_at = timezone.now()

        # ✅ Confirmation rule:
        # - status='sent' if at least one recipient was sent successfully
        # - status='failed' only if nothing was sent
        notification.status = "sent" if sent > 0 else "failed"
        notification.save(
            update_fields=["total_recipients", "successful_sends", "failed_sends", "completed_at", "status"]
        )

        return DebtReminderSendResult(
            notification_id=notification.id,
            month=month,
            sent=sent,
            failed=failed,
            skipped=skipped,
            details=details,
        )

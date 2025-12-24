"""
Debt Reminder Breakdown Service

Στόχος: Ενιαία λογική αποστολής υπενθύμισης οφειλών (με ανάλυση) που μπορεί να
χρησιμοποιηθεί τόσο από API endpoint όσο και από scheduled tasks.

Κύρια χαρακτηριστικά:
- Υπολογισμός οφειλών βάσει month snapshot (FinancialDashboardService.get_apartment_balances)
- Δημιουργία Notification + NotificationRecipient records
- Αποστολή email ανά διαμέρισμα με template emails/debt_reminder_breakdown.html
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
from core.emailing import send_templated_email
from notifications.models import Notification, NotificationRecipient
from notifications.services import NotificationService

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

            if not recipient_email:
                recipient.mark_as_failed("No email address")
                skipped += 1
                details.append({"apartment": apartment.number, "status": "skipped", "reason": "No email address"})
                continue

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

            previous_balance = cls._fmt_money(bal.get("previous_balance", 0))
            expense_share = Decimal(str(bal.get("expense_share", 0) or 0))
            reserve_fund_share = Decimal(str(bal.get("reserve_fund_share", 0) or 0))
            month_expenses_total = cls._fmt_money(expense_share + reserve_fund_share)

            ctx = {
                "occupant_name": recipient_name or "Αγαπητέ/ή ένοικε",
                "apartment_number": apartment.number,
                "building_name": building.name,
                "month_label": month,
                "previous_balance": previous_balance,
                "month_expenses_total": month_expenses_total,
                "resident_expenses": cls._fmt_money(bal.get("resident_expenses", 0)),
                "owner_expenses": cls._fmt_money(bal.get("owner_expenses", 0)),
                "reserve_fund_share": cls._fmt_money(reserve_fund_share) if reserve_fund_share else "",
                "month_payments": cls._fmt_money(bal.get("month_payments", 0)),
                "total_due": cls._fmt_money(total_due_raw),
                "payment_deadline": "",
                "custom_message": custom_message,
            }

            try:
                ok = send_templated_email(
                    to=recipient_email,
                    subject=f"{cls.SUBJECT_KEYWORD} {month} - Διαμέρισμα {apartment.number} ({building.name})",
                    template_html="emails/debt_reminder_breakdown.html",
                    context=ctx,
                    building_manager_id=getattr(building, "manager_id", None),
                )
                if ok:
                    recipient.mark_as_sent()
                    sent += 1
                    details.append(
                        {"apartment": apartment.number, "status": "sent", "email": recipient_email, "total_due": str(total_due_raw)}
                    )
                else:
                    recipient.mark_as_failed("Not sent (send() returned 0)")
                    failed += 1
                    details.append({"apartment": apartment.number, "status": "failed", "email": recipient_email, "error": "Not sent"})
            except Exception as e:
                recipient.mark_as_failed(str(e))
                failed += 1
                details.append({"apartment": apartment.number, "status": "failed", "email": recipient_email, "error": str(e)})

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



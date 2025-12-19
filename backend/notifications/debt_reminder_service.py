"""
Debt Reminder Service - Automated Personalized Payment Reminders

This service automatically sends personalized debt reminder emails to apartments
with outstanding balances, filling in all financial details automatically.

Χαρακτηριστικά:
- Αυτόματη συμπλήρωση ποσών οφειλών ανά διαμέρισμα
- Εξατομικευμένα emails με λεπτομερή οικονομικά στοιχεία
- Υποστήριξη για πολλαπλούς τύπους υπενθυμίσεων
- Αυτόματη ενημέρωση για τον τρέχον μήνα και έτος
"""

import logging
from decimal import Decimal
from datetime import date, datetime
from typing import Dict, List, Optional, Any
from calendar import monthrange

from django.db.models import Sum, Q
from django.utils import timezone
from django.conf import settings
from django.template import Template, Context

from apartments.models import Apartment
from buildings.models import Building
from financial.models import Expense, Transaction, Payment, MonthlyBalance
from financial.balance_service import BalanceCalculationService
from .models import NotificationTemplate, Notification, NotificationRecipient
from .services import NotificationService
from core.emailing import plain_text_to_html, send_templated_email

logger = logging.getLogger(__name__)


class DebtReminderService:
    """
    Service για αυτοματοποιημένη αποστολή υπενθυμίσεων οφειλών
    με εξατομικευμένα οικονομικά δεδομένα ανά διαμέρισμα
    """

    GREEK_MONTHS = {
        1: 'Ιανουάριος', 2: 'Φεβρουάριος', 3: 'Μάρτιος', 4: 'Απρίλιος',
        5: 'Μάιος', 6: 'Ιούνιος', 7: 'Ιούλιος', 8: 'Αύγουστος',
        9: 'Σεπτέμβριος', 10: 'Οκτώβριος', 11: 'Νοέμβριος', 12: 'Δεκέμβριος'
    }

    GREEK_MONTHS_GENITIVE = {
        1: 'Ιανουαρίου', 2: 'Φεβρουαρίου', 3: 'Μαρτίου', 4: 'Απριλίου',
        5: 'Μαΐου', 6: 'Ιουνίου', 7: 'Ιουλίου', 8: 'Αυγούστου',
        9: 'Σεπτεμβρίου', 10: 'Οκτωβρίου', 11: 'Νοεμβρίου', 12: 'Δεκεμβρίου'
    }

    @staticmethod
    def get_apartment_financial_context(
        apartment: Apartment,
        target_month: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Δημιουργία πλήρους financial context για ένα διαμέρισμα

        Args:
            apartment: Το διαμέρισμα για το οποίο θέλουμε τα δεδομένα
            target_month: Μήνας αναφοράς (default: τρέχων μήνας)

        Returns:
            Dict με όλα τα οικονομικά δεδομένα έτοιμα για template rendering
        """
        if not target_month:
            target_month = timezone.now().date().replace(day=1)

        # Βασικά στοιχεία διαμερίσματος
        context = {
            # Στοιχεία διαμερίσματος
            'apartment_number': apartment.number,
            'apartment_floor': apartment.floor or 'Ισόγειο',
            'owner_name': apartment.owner_name or 'Αγαπητέ Κύριε/Κυρία',
            'occupant_name': apartment.occupant_name or apartment.owner_name or 'Αγαπητέ Κύριε/Κυρία',
            'owner_email': apartment.owner_email,
            'occupant_email': apartment.occupant_email,
            
            # Στοιχεία κτιρίου
            'building_name': apartment.building.name or apartment.building.street,
            'building_address': apartment.building.street,
            'building_city': apartment.building.city or 'Αθήνα',
            
            # Ημερομηνίες
            'current_month': DebtReminderService.GREEK_MONTHS[target_month.month],
            'current_month_genitive': DebtReminderService.GREEK_MONTHS_GENITIVE[target_month.month],
            'current_year': target_month.year,
            'month_year': f"{target_month.month:02d}/{target_month.year}",
            'today_date': timezone.now().strftime('%d/%m/%Y'),
            
            # Χιλιοστά
            'participation_mills': apartment.participation_mills or 0,
            'heating_mills': apartment.heating_mills or 0,
            'elevator_mills': apartment.elevator_mills or 0,
        }

        # Υπολογισμός οικονομικών
        financial_data = DebtReminderService._calculate_apartment_financials(
            apartment, target_month
        )
        context.update(financial_data)

        return context

    @staticmethod
    def _calculate_apartment_financials(
        apartment: Apartment,
        target_month: date
    ) -> Dict[str, Any]:
        """
        Υπολογισμός λεπτομερών οικονομικών στοιχείων διαμερίσματος

        Returns:
            Dict με οικονομικά δεδομένα
        """
        # Τρέχον υπόλοιπο (+ = οφειλή, - = πίστωση)
        current_balance = apartment.current_balance

        # Υπολογισμός προηγούμενης οφειλής (μέχρι αρχή του μήνα)
        previous_balance = BalanceCalculationService.calculate_historical_balance(
            apartment=apartment,
            end_date=target_month,
            include_management_fees=True,
            include_reserve_fund=True
        )

        # Δαπάνες τρέχοντος μήνα
        month_end = target_month.replace(
            day=monthrange(target_month.year, target_month.month)[1]
        )
        
        current_month_expenses = Expense.objects.filter(
            apartment=apartment,
            date__gte=target_month,
            date__lte=month_end,
            is_deleted=False
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        # Πληρωμές τρέχοντος μήνα
        current_month_payments = Payment.objects.filter(
            apartment=apartment,
            payment_date__gte=target_month,
            payment_date__lte=month_end
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        # Ανεξόφλητες δαπάνες με λεπτομέρειες
        unpaid_expenses = Expense.objects.filter(
            apartment=apartment,
            is_deleted=False
        ).exclude(
            id__in=Transaction.objects.filter(
                apartment=apartment,
                transaction_type=TransactionType.PAYMENT
            ).values_list('related_expense_id', flat=True)
        ).order_by('date')

        # Λίστα ανεξόφλητων δαπανών
        unpaid_expenses_list = []
        total_unpaid = Decimal('0.00')
        
        for expense in unpaid_expenses[:10]:  # Πρώτες 10 για να μη γίνει το email τεράστιο
            unpaid_expenses_list.append({
                'date': expense.date.strftime('%d/%m/%Y'),
                'description': expense.description or expense.get_category_display(),
                'amount': f"{expense.amount:.2f}€",
            })
            total_unpaid += expense.amount

        # Στοιχεία μηνιαίου balance
        try:
            monthly_balance = MonthlyBalance.objects.get(
                building=apartment.building,
                year=target_month.year,
                month=target_month.month
            )
            total_building_expenses = monthly_balance.total_expenses
            total_building_collected = monthly_balance.total_collected
            building_collection_rate = (
                (total_building_collected / total_building_expenses * 100)
                if total_building_expenses > 0 else Decimal('0.00')
            )
        except MonthlyBalance.DoesNotExist:
            total_building_expenses = Decimal('0.00')
            total_building_collected = Decimal('0.00')
            building_collection_rate = Decimal('0.00')

        # Υπολογισμός ημερών καθυστέρησης για παλαιότερη οφειλή
        oldest_unpaid = unpaid_expenses.first()
        days_overdue = 0
        if oldest_unpaid:
            days_overdue = (timezone.now().date() - oldest_unpaid.date).days

        return {
            # Υπόλοιπα
            'current_balance': f"{abs(current_balance):.2f}€",
            'current_balance_raw': abs(current_balance),
            'is_debt': current_balance > 0,
            'is_credit': current_balance < 0,
            'previous_balance': f"{abs(previous_balance):.2f}€",
            'previous_balance_raw': abs(previous_balance),
            
            # Τρέχοντα μήνα
            'current_month_expenses': f"{current_month_expenses:.2f}€",
            'current_month_payments': f"{current_month_payments:.2f}€",
            'current_month_net': f"{(current_month_expenses - current_month_payments):.2f}€",
            
            # Ανεξόφλητες δαπάνες
            'total_unpaid': f"{total_unpaid:.2f}€",
            'total_unpaid_raw': total_unpaid,
            'unpaid_count': unpaid_expenses.count(),
            'unpaid_expenses_list': unpaid_expenses_list,
            'has_unpaid': unpaid_expenses.exists(),
            'days_overdue': days_overdue,
            
            # Στοιχεία κτιρίου
            'building_total_expenses': f"{total_building_expenses:.2f}€",
            'building_total_collected': f"{total_building_collected:.2f}€",
            'building_collection_rate': f"{building_collection_rate:.1f}%",
            
            # Payment info
            'payment_deadline': (target_month.replace(day=10) if target_month.day < 10 
                                else (target_month + timezone.timedelta(days=32)).replace(day=10)).strftime('%d/%m/%Y'),
        }

    @staticmethod
    def send_personalized_reminders(
        building: Building,
        template: NotificationTemplate,
        created_by,
        min_debt_amount: Decimal = Decimal('0.01'),
        target_month: Optional[date] = None,
        send_to_all: bool = False,
        test_mode: bool = False,
        test_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Αποστολή εξατομικευμένων υπενθυμίσεων οφειλών σε διαμερίσματα

        Args:
            building: Το κτίριο για το οποίο στέλνουμε υπενθυμίσεις
            template: Το template υπενθύμισης
            created_by: Ο χρήστης που κάνει την αποστολή
            min_debt_amount: Ελάχιστο ποσό οφειλής για αποστολή (default: 0.01€)
            target_month: Μήνας αναφοράς (default: τρέχων)
            send_to_all: Αν True, στέλνει σε όλα τα διαμερίσματα (για ενημερωτικά emails)
            test_mode: Αν True, δεν στέλνει πραγματικά emails
            test_email: Email για test αποστολή

        Returns:
            Dict με αποτελέσματα αποστολής
        """
        if not target_month:
            target_month = timezone.now().date().replace(day=1)

        logger.info(f"📧 Starting debt reminder campaign for {building.name}")
        logger.info(f"📅 Target month: {target_month.strftime('%m/%Y')}")
        logger.info(f"💰 Minimum debt: {min_debt_amount}€")

        # Βρες διαμερίσματα με οφειλές (ή όλα αν send_to_all=True)
        apartments = Apartment.objects.filter(building=building)
        
        if not send_to_all:
            apartments = apartments.filter(current_balance__gt=min_debt_amount)

        logger.info(f"🏠 Found {apartments.count()} apartments to notify")

        results = {
            'total_apartments': apartments.count(),
            'emails_sent': 0,
            'emails_failed': 0,
            'total_debt_notified': Decimal('0.00'),
            'failed_apartments': [],
            'sent_apartments': []
        }

        # Δημιουργία notification record
        notification = Notification.objects.create(
            building=building,
            created_by=created_by,
            subject=f"Υπενθύμιση Οφειλών - {target_month.strftime('%m/%Y')}",
            body="Personalized emails - see individual recipients",
            notification_type='email',
            priority='normal',
            status='sending',
            template=template
        )

        for apartment in apartments:
            try:
                # Δημιουργία εξατομικευμένου context
                context = DebtReminderService.get_apartment_financial_context(
                    apartment, target_month
                )

                # Render template με context
                rendered = template.render(context)

                # Επιλογή email παραλήπτη (προτίμηση: occupant, αλλιώς owner)
                recipient_email = test_email or apartment.occupant_email or apartment.owner_email
                recipient_name = apartment.occupant_name or apartment.owner_name

                if not recipient_email:
                    logger.warning(f"⚠️ Apartment {apartment.number}: No email address")
                    results['emails_failed'] += 1
                    results['failed_apartments'].append({
                        'apartment': apartment.number,
                        'reason': 'No email address'
                    })
                    continue

                # Δημιουργία recipient record
                recipient = NotificationRecipient.objects.create(
                    notification=notification,
                    apartment=apartment,
                    recipient_name=recipient_name or f"Διαμέρισμα {apartment.number}",
                    email=recipient_email,
                    phone=apartment.occupant_phone or apartment.owner_phone or '',
                    status='pending'
                )

                # Αποστολή email (αν όχι test mode)
                if not test_mode:
                    try:
                        send_templated_email(
                            to=recipient_email,
                            subject=rendered['subject'],
                            template_html="emails/wrapper.html",
                            context={
                                "body_html": plain_text_to_html(rendered["body"]),
                                "wrapper_title": rendered["subject"],
                            },
                            building_manager_id=getattr(building, "manager_id", None),
                        )
                        
                        recipient.mark_as_sent()
                        results['emails_sent'] += 1
                        results['total_debt_notified'] += context['current_balance_raw']
                        results['sent_apartments'].append({
                            'apartment': apartment.number,
                            'email': recipient_email,
                            'debt': f"{context['current_balance_raw']:.2f}€"
                        })
                        
                        logger.info(
                            f"✅ Sent to {apartment.number} ({recipient_email}) - "
                            f"Debt: {context['current_balance_raw']:.2f}€"
                        )

                    except Exception as e:
                        recipient.mark_as_failed(str(e))
                        results['emails_failed'] += 1
                        results['failed_apartments'].append({
                            'apartment': apartment.number,
                            'reason': str(e)
                        })
                        logger.error(f"❌ Failed to send to {apartment.number}: {e}")
                else:
                    # Test mode - just log
                    recipient.mark_as_sent()
                    results['emails_sent'] += 1
                    logger.info(f"🧪 TEST MODE: Would send to {apartment.number} ({recipient_email})")

            except Exception as e:
                results['emails_failed'] += 1
                results['failed_apartments'].append({
                    'apartment': apartment.number,
                    'reason': str(e)
                })
                logger.error(f"❌ Error processing {apartment.number}: {e}")
                continue

        # Update notification statistics
        notification.total_recipients = results['total_apartments']
        notification.successful_sends = results['emails_sent']
        notification.failed_sends = results['emails_failed']
        notification.completed_at = timezone.now()
        notification.status = 'sent' if results['emails_failed'] == 0 else 'failed'
        notification.save()

        logger.info(f"✅ Campaign completed: {results['emails_sent']} sent, {results['emails_failed']} failed")
        logger.info(f"💰 Total debt notified: {results['total_debt_notified']:.2f}€")

        return results

    @staticmethod
    def create_default_debt_reminder_template(building: Building) -> NotificationTemplate:
        """
        Δημιουργία προεπιλεγμένου template για υπενθύμιση οφειλών

        Returns:
            NotificationTemplate instance
        """
        template = NotificationTemplate.objects.create(
            building=building,
            name="Υπενθύμιση Οφειλών Κοινοχρήστων",
            category="reminder",
            description="Εξατομικευμένη υπενθύμιση με αυτόματη συμπλήρωση οικονομικών στοιχείων",
            subject="Υπενθύμιση Οφειλών {{current_month_genitive}} {{current_year}} - Διαμέρισμα {{apartment_number}}",
            body_template="""Αγαπητέ/ή {{occupant_name}},

Σας ενημερώνουμε για την κατάσταση του λογαριασμού σας για το διαμέρισμα {{apartment_number}} στο κτίριο {{building_name}}.

📊 ΟΙΚΟΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ ({{month_year}}):

💰 Τρέχον Υπόλοιπο: {{current_balance}}
📅 Προηγούμενη Οφειλή: {{previous_balance}}
📈 Δαπάνες Μήνα: {{current_month_expenses}}
💳 Πληρωμές Μήνα: {{current_month_payments}}

⚠️ ΑΝΕΞΟΦΛΗΤΕΣ ΔΑΠΑΝΕΣ:
Σύνολο Ανεξόφλητων: {{total_unpaid}} ({{unpaid_count}} δαπάνες)
Ημέρες Καθυστέρησης: {{days_overdue}} ημέρες

🏢 ΣΤΟΙΧΕΙΑ ΚΤΙΡΙΟΥ:
Συνολικές Δαπάνες Κτιρίου: {{building_total_expenses}}
Συνολικά Εισπραχθέντα: {{building_total_collected}}
Ποσοστό Είσπραξης: {{building_collection_rate}}

⏰ ΠΡΟΘΕΣΜΙΑ ΠΛΗΡΩΜΗΣ: {{payment_deadline}}

Για περισσότερες πληροφορίες, επικοινωνήστε με τη διαχείριση.

Με εκτίμηση,
Η Διαχείριση του {{building_name}}
""",
            sms_template="Υπενθύμιση οφειλών {{current_month}}: {{current_balance}}. Προθεσμία: {{payment_deadline}}",
            is_active=True
        )

        logger.info(f"✅ Created default debt reminder template for {building.name}")
        return template


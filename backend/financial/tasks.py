"""
Celery tasks για αυτόματες οικονομικές λειτουργίες
"""
from celery import shared_task
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from buildings.models import Building
from apartments.models import Apartment
from .models import Expense
import logging

logger = logging.getLogger(__name__)


@shared_task
def create_monthly_management_fees():
    """
    Δημιουργεί τα management fees για όλα τα κτίρια για τον τρέχοντα μήνα.
    Τρέχει την 1η μέρα κάθε μήνα.

    Λαμβάνει υπόψη το financial_system_start_date για να μην δημιουργεί
    management fees για μήνες πριν την έναρξη του οικονομικού συστήματος.
    """
    today = date.today()
    current_month_start = date(today.year, today.month, 1)

    logger.info(f"🔄 Starting monthly management fees creation for {today.strftime('%B %Y')}")

    # Βρες όλα τα κτίρια που έχουν management_fee_per_apartment > 0
    buildings = Building.objects.filter(
        management_fee_per_apartment__isnull=False,
        management_fee_per_apartment__gt=0
    )

    created_count = 0
    skipped_count = 0
    error_count = 0

    for building in buildings:
        try:
            # ✅ ΔΙΟΡΘΩΣΗ: Αφαίρεση περιορισμού financial_system_start_date
            # Το σύστημα δημιουργεί management fees χωρίς αυτόν τον περιορισμό

            # Έλεγχος αν ήδη υπάρχουν management fees για τον τρέχοντα μήνα
            existing = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=today.year,
                date__month=today.month
            ).exists()

            if existing:
                logger.info(f"⏭️ Management fees already exist for building {building.name} for {today.strftime('%B %Y')}")
                skipped_count += 1
                continue

            # Δημιουργία management fees expense
            # ΔΙΟΡΘΩΣΗ: Ημερομηνία είναι η ΠΡΩΤΗ του μήνα (όχι τελευταία)
            # Έτσι τα management fees εμφανίζονται ως προηγούμενες οφειλές τον ΕΠΟΜΕΝΟ μήνα
            expense_date = current_month_start  # Πρώτη του μήνα

            # Υπολογισμός συνολικού ποσού
            apartments_count = Apartment.objects.filter(building=building).count()
            total_amount = building.management_fee_per_apartment * apartments_count

            expense = Expense.objects.create(
                building=building,
                title=f'Διαχειριστικά Έξοδα {today.strftime("%B %Y")}',
                amount=total_amount,
                date=expense_date,  # ΔΙΟΡΘΩΣΗ: Πρώτη του μήνα
                due_date=expense_date,
                category='management_fees',
                expense_type='management_fee',  # ΔΙΟΡΘΩΣΗ: Προσθήκη expense_type για αναγνώριση
                description=f'Αυτόματη καταχώρηση διαχειριστικών εξόδων για {today.strftime("%B %Y")}\n'
                           f'Ποσό ανά διαμέρισμα: {building.management_fee_per_apartment}€\n'
                           f'Αριθμός διαμερισμάτων: {apartments_count}\n'
                           f'Συνολικό ποσό: {total_amount}€',
                distribution_type='equal_share',  # ΔΙΟΡΘΩΣΗ: equal_share (όχι equal)
                payer_responsibility='resident',  # Τα management fees πληρώνονται από τον ενοίκο
                approved=True
            )

            logger.info(
                f"✅ Created management fees for building {building.name}: "
                f"€{total_amount} ({apartments_count} apartments × €{building.management_fee_per_apartment})"
            )
            created_count += 1

        except Exception as e:
            logger.error(f"❌ Error creating management fees for building {building.name}: {str(e)}")
            error_count += 1

    logger.info(
        f"✅ Monthly management fees creation completed: "
        f"{created_count} created, {skipped_count} skipped, {error_count} errors"
    )

    return {
        'created': created_count,
        'skipped': skipped_count,
        'errors': error_count,
        'month': today.strftime('%B %Y')
    }


@shared_task
def backfill_management_fees(building_id: int, start_month: str, end_month: str = None):
    """
    Δημιουργεί management fees για προηγούμενους μήνες (backfill).

    Args:
        building_id: ID του κτιρίου
        start_month: Μήνας έναρξης σε μορφή 'YYYY-MM'
        end_month: Μήνας λήξης σε μορφή 'YYYY-MM' (προαιρετικό, default: τρέχων μήνας)

    Returns:
        Dict με αποτελέσματα
    """
    try:
        building = Building.objects.get(id=building_id)
    except Building.DoesNotExist:
        logger.error(f"❌ Building with ID {building_id} not found")
        return {'error': 'Building not found'}

    if not building.management_fee_per_apartment or building.management_fee_per_apartment <= 0:
        logger.error(f"❌ Building {building.name} has no management_fee_per_apartment set")
        return {'error': 'No management fee configured'}

    # Parse start_month
    try:
        start_year, start_mon = map(int, start_month.split('-'))
        start_date = date(start_year, start_mon, 1)
    except (ValueError, AttributeError):
        logger.error(f"❌ Invalid start_month format: {start_month}")
        return {'error': 'Invalid start_month format'}

    # Parse end_month (default to current month)
    if end_month:
        try:
            end_year, end_mon = map(int, end_month.split('-'))
            end_date = date(end_year, end_mon, 1)
        except (ValueError, AttributeError):
            logger.error(f"❌ Invalid end_month format: {end_month}")
            return {'error': 'Invalid end_month format'}
    else:
        today = date.today()
        end_date = date(today.year, today.month, 1)

    # ✅ ΔΙΟΡΘΩΣΗ: Αφαίρεση περιορισμού financial_system_start_date
    # Το σύστημα δημιουργεί management fees χωρίς αυτόν τον περιορισμό

    logger.info(f"🔄 Starting management fees backfill for {building.name} from {start_date} to {end_date}")

    apartments_count = Apartment.objects.filter(building=building).count()
    total_amount = building.management_fee_per_apartment * apartments_count

    created_count = 0
    skipped_count = 0
    current_date = start_date

    while current_date <= end_date:
        # Έλεγχος αν ήδη υπάρχουν
        existing = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=current_date.year,
            date__month=current_date.month
        ).exists()

        if existing:
            logger.info(f"⏭️ Management fees already exist for {current_date.strftime('%B %Y')}")
            skipped_count += 1
        else:
            # ΔΙΟΡΘΩΣΗ: Ημερομηνία είναι η ΠΡΩΤΗ του μήνα (όχι τελευταία)
            # current_date είναι ήδη η πρώτη του μήνα
            expense_date = current_date

            Expense.objects.create(
                building=building,
                title=f'Διαχειριστικά Έξοδα {current_date.strftime("%B %Y")}',
                amount=total_amount,
                date=expense_date,  # ΔΙΟΡΘΩΣΗ: Πρώτη του μήνα
                due_date=expense_date,
                category='management_fees',
                expense_type='management_fee',  # ΔΙΟΡΘΩΣΗ: Προσθήκη expense_type
                description=f'Backfill διαχειριστικών εξόδων για {current_date.strftime("%B %Y")}\n'
                           f'Ποσό ανά διαμέρισμα: {building.management_fee_per_apartment}€\n'
                           f'Αριθμός διαμερισμάτων: {apartments_count}\n'
                           f'Συνολικό ποσό: {total_amount}€',
                distribution_type='equal_share',  # ΔΙΟΡΘΩΣΗ: equal_share (όχι equal)
                payer_responsibility='resident',
                approved=True
            )

            logger.info(f"✅ Created management fees for {current_date.strftime('%B %Y')}: €{total_amount}")
            created_count += 1

        # Επόμενος μήνας
        if current_date.month == 12:
            current_date = date(current_date.year + 1, 1, 1)
        else:
            current_date = date(current_date.year, current_date.month + 1, 1)

    result = {
        'building': building.name,
        'created': created_count,
        'skipped': skipped_count,
        'start_month': start_month,
        'end_month': end_month or 'current'
    }

    logger.info(f"✅ Backfill completed: {result}")
    return result

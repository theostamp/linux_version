# backend/financial/signals.py
"""
Django signals για αυτόματη ενημέρωση οικονομικών υπολοίπων
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from decimal import Decimal

from .models import Transaction, Payment, Expense, CommonExpensePeriod
from core.utils import publish_building_event
from django.db.models import Sum


@receiver(post_save, sender=Transaction)
def update_apartment_balance_on_transaction(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση υπολοίπου διαμερίσματος όταν δημιουργείται/ενημερώνεται συναλλαγή
    """
    if not instance.apartment:
        return  # Δεν υπάρχει διαμέρισμα, δεν ενημερώνουμε
    
    try:
        with transaction.atomic():
            apartment = instance.apartment
            
            # Υπολογισμός νέου υπολοίπου από όλες τις συναλλαγές
            transactions = Transaction.objects.filter(
                apartment=apartment
            ).order_by('date', 'id')
            
            new_balance = Decimal('0.00')
            
            for trans in transactions:
                # Τύποι που προσθέτουν στο υπόλοιπο (εισπράξεις)
                if trans.type in ['common_expense_payment', 'payment_received', 'refund']:
                    new_balance += trans.amount
                # Τύποι που αφαιρούν από το υπόλοιπο (χρεώσεις)
                elif trans.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                  'interest_charge', 'penalty_charge']:
                    new_balance -= trans.amount
                # Για balance_adjustment χρησιμοποιούμε το balance_after
                elif trans.type == 'balance_adjustment':
                    if trans.balance_after is not None:
                        new_balance = trans.balance_after
            
            # Ενημέρωση του διαμερίσματος
            if apartment.current_balance != new_balance:
                apartment.current_balance = new_balance
                apartment.save(update_fields=['current_balance'])
                
                print(f"✅ Ενημερώθηκε υπόλοιπο διαμερίσματος {apartment.number}: {new_balance:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση υπολοίπου διαμερίσματος: {e}")


@receiver(post_delete, sender=Transaction)
def recalculate_apartment_balance_on_transaction_delete(sender, instance, **kwargs):
    """
    Επαναυπολογισμός υπολοίπου διαμερίσματος όταν διαγράφεται συναλλαγή
    """
    if not instance.apartment:
        return
    
    try:
        with transaction.atomic():
            apartment = instance.apartment
            
            # Επαναυπολογισμός από όλες τις εναπομείναντες συναλλαγές
            transactions = Transaction.objects.filter(
                apartment=apartment
            ).order_by('date', 'id')
            
            new_balance = Decimal('0.00')
            
            for trans in transactions:
                if trans.type in ['common_expense_payment', 'payment_received', 'refund']:
                    new_balance += trans.amount
                elif trans.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                  'interest_charge', 'penalty_charge']:
                    new_balance -= trans.amount
                elif trans.type == 'balance_adjustment':
                    if trans.balance_after is not None:
                        new_balance = trans.balance_after
            
            apartment.current_balance = new_balance
            apartment.save(update_fields=['current_balance'])
            
            print(f"✅ Επαναυπολογίστηκε υπόλοιπο διαμερίσματος {apartment.number}: {new_balance:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στον επαναυπολογισμό υπολοίπου διαμερίσματος: {e}")


@receiver(post_save, sender=Payment)
def update_apartment_balance_on_payment(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση υπολοίπου διαμερίσματος όταν δημιουργείται/ενημερώνεται πληρωμή
    """
    try:
        with transaction.atomic():
            apartment = instance.apartment
            
            # Υπολογισμός νέου υπολοίπου από πληρωμές
            payments = Payment.objects.filter(apartment=apartment)
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός χρεώσεων από CommonExpenseCalculator
            try:
                from financial.services import CommonExpenseCalculator
                calculator = CommonExpenseCalculator(apartment.building.id)
                shares = calculator.calculate_shares()
                apartment_charges = shares.get(apartment.id, {}).get('total_amount', Decimal('0.00'))
            except Exception:
                # Fallback: χρήση transactions αν ο calculator αποτύχει
                transactions = Transaction.objects.filter(apartment=apartment, type__in=[
                    'common_expense_charge', 'expense_created', 'expense_issued'
                ])
                apartment_charges = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Νέο υπόλοιπο = πληρωμές - χρεώσεις
            new_balance = total_payments - apartment_charges
            
            if apartment.current_balance != new_balance:
                old_balance = apartment.current_balance
                apartment.current_balance = new_balance
                apartment.save(update_fields=['current_balance'])
                
                print(f"✅ Payment Signal: Διαμέρισμα {apartment.number}: {old_balance:,.2f}€ → {new_balance:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση υπολοίπου διαμερίσματος από payment: {e}")


@receiver(post_save, sender=Payment)
def update_building_reserve_on_payment(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση αποθεματικού κτιρίου όταν δημιουργείται/ενημερώνεται πληρωμή
    """
    try:
        with transaction.atomic():
            building = instance.apartment.building
            
            # Υπολογισμός νέου αποθεματικού από όλες τις πληρωμές
            payments = Payment.objects.filter(
                apartment__building=building
            )
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός συνολικών δαπανών
            expenses = Expense.objects.filter(building=building)
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Νέο αποθεματικό = πληρωμές - δαπάνες
            new_reserve = total_payments - total_expenses
            
            if building.current_reserve != new_reserve:
                building.current_reserve = new_reserve
                building.save(update_fields=['current_reserve'])
                
                print(f"✅ Ενημερώθηκε αποθεματικό κτιρίου {building.name}: {new_reserve:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση αποθεματικού κτιρίου: {e}")


@receiver(post_delete, sender=Payment)
def recalculate_apartment_balance_on_payment_delete(sender, instance, **kwargs):
    """
    Επαναυπολογισμός υπολοίπου διαμερίσματος όταν διαγράφεται πληρωμή
    """
    try:
        with transaction.atomic():
            apartment = instance.apartment
            
            # Υπολογισμός νέου υπολοίπου από εναπομείναντες πληρωμές
            payments = Payment.objects.filter(apartment=apartment)
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός χρεώσεων
            try:
                from financial.services import CommonExpenseCalculator
                calculator = CommonExpenseCalculator(apartment.building.id)
                shares = calculator.calculate_shares()
                apartment_charges = shares.get(apartment.id, {}).get('total_amount', Decimal('0.00'))
            except Exception:
                transactions = Transaction.objects.filter(apartment=apartment, type__in=[
                    'common_expense_charge', 'expense_created', 'expense_issued'
                ])
                apartment_charges = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Νέο υπόλοιπο = πληρωμές - χρεώσεις
            new_balance = total_payments - apartment_charges
            
            old_balance = apartment.current_balance
            apartment.current_balance = new_balance
            apartment.save(update_fields=['current_balance'])
            
            print(f"✅ Payment Delete Signal: Διαμέρισμα {apartment.number}: {old_balance:,.2f}€ → {new_balance:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στον επαναυπολογισμό υπολοίπου διαμερίσματος από payment delete: {e}")


@receiver(post_delete, sender=Payment)
def recalculate_building_reserve_on_payment_delete(sender, instance, **kwargs):
    """
    Επαναυπολογισμός αποθεματικού κτιρίου όταν διαγράφεται πληρωμή
    """
    try:
        with transaction.atomic():
            building = instance.apartment.building
            
            # Επαναυπολογισμός από όλες τις εναπομείναντες πληρωμές
            payments = Payment.objects.filter(
                apartment__building=building
            )
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            expenses = Expense.objects.filter(building=building)
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            new_reserve = total_payments - total_expenses
            
            building.current_reserve = new_reserve
            building.save(update_fields=['current_reserve'])
            
            print(f"✅ Επαναυπολογίστηκε αποθεματικό κτιρίου {building.name}: {new_reserve:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στον επαναυπολογισμό αποθεματικού κτιρίου: {e}")


@receiver(post_save, sender=Expense)
def create_transactions_for_expense(sender, instance, created, **kwargs):
    """
    Αυτόματη δημιουργία συναλλαγών όταν δημιουργείται δαπάνη
    """
    if created:  # Όλες οι δαπάνες θεωρούνται εκδοθείσες
        try:
            with transaction.atomic():
                # Καλούμε τη μέθοδο που δημιουργεί συναλλαγές για όλα τα διαμερίσματα
                instance._create_apartment_transactions()
                print(f"✅ Expense Signal: Δημιουργήθηκαν συναλλαγές για δαπάνη '{instance.title}'")
        except Exception as e:
            print(f"❌ Σφάλμα στη δημιουργία συναλλαγών για δαπάνη: {e}")


@receiver(post_save, sender=Expense)
def update_building_reserve_on_expense(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση αποθεματικού κτιρίου όταν δημιουργείται/ενημερώνεται δαπάνη
    """
    try:
        with transaction.atomic():
            building = instance.building
            
            # Υπολογισμός νέου αποθεματικού
            payments = Payment.objects.filter(
                apartment__building=building
            )
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            expenses = Expense.objects.filter(building=building)
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            new_reserve = total_payments - total_expenses
            
            if building.current_reserve != new_reserve:
                building.current_reserve = new_reserve
                building.save(update_fields=['current_reserve'])
                
                print(f"✅ Ενημερώθηκε αποθεματικού κτιρίου {building.name}: {new_reserve:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση αποθεματικού κτιρίου: {e}")


@receiver(post_delete, sender=Expense)
def recalculate_building_reserve_on_expense_delete(sender, instance, **kwargs):
    """
    Επαναυπολογισμός αποθεματικού κτιρίου όταν διαγράφεται δαπάνη
    """
    try:
        with transaction.atomic():
            building = instance.building
            
            # Επαναυπολογισμός
            payments = Payment.objects.filter(
                apartment__building=building
            )
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            expenses = Expense.objects.filter(building=building)
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            new_reserve = total_payments - total_expenses
            
            building.current_reserve = new_reserve
            building.save(update_fields=['current_reserve'])
            
            print(f"✅ Επαναυπολογίστηκε αποθεματικό κτιρίου {building.name}: {new_reserve:,.2f}€")
    
    except Exception as e:
        print(f"❌ Σφάλμα στον επαναυπολογισμό αποθεματικού κτιρίου: {e}")


# --- Maintenance integration: Unlink maintenance payment receipts on expense delete ---
@receiver(post_delete, sender=Expense)
def unlink_maintenance_receipts_on_expense_delete(sender, instance, **kwargs):
    """
    Όταν διαγραφεί μια δαπάνη, αποσυνδέουμε τυχόν αποδείξεις πληρωμών συντήρησης που την αναφέρονται.
    """
    try:
        from maintenance.models import PaymentReceipt
        # Collect affected receipts for notification payloads
        affected = list(PaymentReceipt.objects.filter(linked_expense_id=instance.id))
        # Unlink in bulk
        PaymentReceipt.objects.filter(id__in=[r.id for r in affected]).update(linked_expense=None)
        # Broadcast event per affected maintenance
        for r in affected:
            try:
                maint = r.scheduled_maintenance
                if not maint:
                    continue
                publish_building_event(
                    building_id=instance.building_id,
                    event_type="maintenance.expense_deleted",
                    payload={
                        "message": f"Δαπάνη διαγράφηκε. Επιστροφή στο έργο: {maint.title}",
                        "link": f"/maintenance/scheduled/{maint.id}",
                        "receipt_id": r.id,
                        "maintenance_id": maint.id,
                    },
                )
            except Exception:
                # Do not block signal on notification errors
                pass
    except Exception as e:
        print(f"⚠️ Αποτυχία αποσύνδεσης αποδείξεων συντήρησης από δαπάνη {instance.id}: {e}")


@receiver(post_save, sender='buildings.Building')
def update_financial_data_on_building_change(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση οικονομικών δεδομένων όταν αλλάζει το κτίριο (π.χ. management fee)
    """
    try:
        with transaction.atomic():
            # Έλεγχος αν άλλαξε το management_fee_per_apartment
            if not created and hasattr(instance, '_state') and instance._state.fields_cache:
                # Αν υπάρχει αλλαγή στο management fee, ενημερώνουμε όλες τις σχετικές οικονομικές καταστάσεις
                print(f"✅ Building Signal: Ενημερώθηκε κτίριο {instance.name}")
                print(f"📊 Νέα αμοιβή διαχείρισης: {instance.management_fee_per_apartment}€/διαμέρισμα")

                # Εδώ μπορούμε να προσθέσουμε επιπλέον λογική για ενημέρωση
                # π.χ. invalidate cache, notify frontend, etc.

    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση οικονομικών δεδομένων από αλλαγή κτιρίου: {e}")


@receiver(post_save, sender=CommonExpensePeriod)
def create_notification_event_for_common_expenses(sender, instance, created, **kwargs):
    """
    Αυτόματη δημιουργία NotificationEvent όταν δημιουργείται φύλλο κοινοχρήστων
    """
    if created:
        try:
            # Import here to avoid circular imports
            from notifications.services import NotificationEventService

            # Create notification event
            NotificationEventService.create_event(
                event_type='common_expense',
                building=instance.building,
                title=f"Νέο Φύλλο Κοινοχρήστων: {instance.period_name}",
                description=f"Δημιουργήθηκε φύλλο κοινοχρήστων για την περίοδο {instance.period_name}. "
                           f"Συνολικά έξοδα: {instance.total_expenses:.2f}€",
                url=f"/financial/common-expenses/{instance.id}",
                is_urgent=False,
                icon='💰',
                event_date=instance.end_date,
            )

            print(f"✅ Created NotificationEvent for CommonExpensePeriod: {instance.period_name}")

        except Exception as e:
            print(f"❌ Error creating NotificationEvent for CommonExpensePeriod: {e}")

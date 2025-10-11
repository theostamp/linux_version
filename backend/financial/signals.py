# backend/financial/signals.py
"""
Django signals για αυτόματη ενημέρωση οικονομικών υπολοίπων

Updated: 2025-10-03 - Migrated to use BalanceCalculationService
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from decimal import Decimal

from .models import Transaction, Payment, Expense, CommonExpensePeriod
from .balance_service import BalanceCalculationService
from core.utils import publish_building_event
from django.db.models import Sum


@receiver(post_save, sender=Transaction)
def update_apartment_balance_on_transaction(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση υπολοίπου διαμερίσματος όταν δημιουργείται/ενημερώνεται συναλλαγή

    SIMPLIFIED: Now uses BalanceCalculationService for centralized logic
    """
    if not instance.apartment:
        return  # Δεν υπάρχει διαμέρισμα, δεν ενημερώνουμε

    try:
        with transaction.atomic():
            # ✅ SIMPLIFIED: Use BalanceCalculationService
            new_balance = BalanceCalculationService.update_apartment_balance(
                instance.apartment
            )

            print(f"✅ Ενημερώθηκε υπόλοιπο διαμερίσματος {instance.apartment.number}: {new_balance:,.2f}€")

    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση υπολοίπου διαμερίσματος: {e}")


@receiver(post_delete, sender=Transaction)
def recalculate_apartment_balance_on_transaction_delete(sender, instance, **kwargs):
    """
    Επαναυπολογισμός υπολοίπου διαμερίσματος όταν διαγράφεται συναλλαγή

    SIMPLIFIED: Now uses BalanceCalculationService for centralized logic
    """
    if not instance.apartment:
        return

    try:
        with transaction.atomic():
            # ✅ SIMPLIFIED: Use BalanceCalculationService
            new_balance = BalanceCalculationService.update_apartment_balance(
                instance.apartment
            )

            print(f"✅ Επαναυπολογίστηκε υπόλοιπο διαμερίσματος {instance.apartment.number}: {new_balance:,.2f}€")

    except Exception as e:
        print(f"❌ Σφάλμα στον επαναυπολογισμό υπολοίπου διαμερίσματος: {e}")


# ❌ DELETED: update_apartment_balance_on_payment
# This signal was removed because Payment creates a Transaction,
# and the Transaction signal (update_apartment_balance_on_transaction) handles the balance update.
# This eliminates double processing and O(N²) complexity.


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


# ❌ DELETED: recalculate_apartment_balance_on_payment_delete
# This signal was removed because Payment deletion deletes the associated Transaction,
# and the Transaction delete signal handles the balance update.
# This eliminates double processing.


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
def auto_create_common_expense_period(sender, instance, created, **kwargs):
    """
    Αυτόματη δημιουργία ή ενημέρωση CommonExpensePeriod όταν δημιουργείται δαπάνη

    CRITICAL: Αυτό το signal εξασφαλίζει ότι κάθε δαπάνη συμπεριλαμβάνεται σε κοινόχρηστα.
    ΜΗΝ ΔΙΑΓΡΑΨΕΤΕ - Χωρίς αυτό, οι δαπάνες δεν κατανέμονται στα διαμερίσματα.
    """
    if created:
        try:
            from datetime import date
            import calendar

            with transaction.atomic():
                # Προσδιορισμός μήνα από την ημερομηνία της δαπάνης
                expense_date = instance.date
                year = expense_date.year
                month = expense_date.month

                # Υπολογισμός ημερομηνιών περιόδου
                start_date = date(year, month, 1)
                last_day = calendar.monthrange(year, month)[1]
                end_date = date(year, month, last_day)

                # Όνομα περιόδου
                month_names = {
                    1: 'Ιανουαρίου', 2: 'Φεβρουαρίου', 3: 'Μαρτίου', 4: 'Απριλίου',
                    5: 'Μαΐου', 6: 'Ιουνίου', 7: 'Ιουλίου', 8: 'Αυγούστου',
                    9: 'Σεπτεμβρίου', 10: 'Οκτωβρίου', 11: 'Νοεμβρίου', 12: 'Δεκεμβρίου'
                }
                period_name = f"Κοινόχρηστα {month_names[month]} {year}"

                # Έλεγχος αν υπάρχει ήδη περίοδος για τον μήνα
                existing_period = CommonExpensePeriod.objects.filter(
                    building=instance.building,
                    start_date__lte=end_date,
                    end_date__gte=start_date
                ).first()

                if existing_period:
                    print(f"✅ Expense Signal: Η δαπάνη '{instance.title}' προστέθηκε στην υπάρχουσα περίοδο '{existing_period.period_name}'")
                else:
                    # Δημιουργία νέας περιόδου
                    new_period = CommonExpensePeriod.objects.create(
                        building=instance.building,
                        period_name=period_name,
                        start_date=start_date,
                        end_date=end_date
                    )
                    print(f"✅ Expense Signal: Δημιουργήθηκε νέα περίοδος '{period_name}' για δαπάνη '{instance.title}'")

        except Exception as e:
            print(f"❌ Σφάλμα στην αυτόματη δημιουργία CommonExpensePeriod: {e}")


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


@receiver(post_save, sender=Expense)
def update_monthly_balance_on_expense(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση MonthlyBalance όταν προστίθεται δαπάνη.
    
    Αυτό διασφαλίζει ότι το MonthlyBalance είναι πάντα up-to-date και μπορεί
    να χρησιμοποιηθεί ως single source of truth για τις παλαιότερες οφειλές.
    """
    try:
        from .models import MonthlyBalance
        
        with transaction.atomic():
            building = instance.building
            expense_date = instance.date
            year = expense_date.year
            month = expense_date.month
            
            # Get or create MonthlyBalance για τον μήνα της δαπάνης
            monthly_balance, mb_created = MonthlyBalance.objects.get_or_create(
                building=building,
                year=year,
                month=month,
                defaults={
                    'total_expenses': Decimal('0.00'),
                    'total_payments': Decimal('0.00'),
                    'previous_obligations': Decimal('0.00'),
                    'carry_forward': Decimal('0.00'),
                    'reserve_fund_amount': Decimal('0.00'),
                    'management_fees': Decimal('0.00'),
                    'scheduled_maintenance_amount': Decimal('0.00'),
                }
            )
            
            # Υπολογισμός total_expenses για τον μήνα από όλες τις δαπάνες
            from datetime import date as dt
            month_start = dt(year, month, 1)
            if month == 12:
                month_end = dt(year + 1, 1, 1)
            else:
                month_end = dt(year, month + 1, 1)
            
            month_expenses = Expense.objects.filter(
                building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός total_payments για τον μήνα
            from .models import Payment
            month_payments = Payment.objects.filter(
                apartment__building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Ενημέρωση MonthlyBalance
            monthly_balance.total_expenses = month_expenses
            monthly_balance.total_payments = month_payments
            
            # Υπολογισμός carry_forward (οφειλές που μεταφέρονται στον επόμενο μήνα)
            # carry_forward = expenses - payments (θετικό αν υπάρχουν οφειλές)
            monthly_balance.carry_forward = month_expenses - month_payments
            
            monthly_balance.save()
            
            if mb_created:
                print(f"✅ Δημιουργήθηκε MonthlyBalance για {month:02d}/{year}: Expenses=€{month_expenses}, Carry=€{monthly_balance.carry_forward}")
            else:
                print(f"✅ Ενημερώθηκε MonthlyBalance για {month:02d}/{year}: Expenses=€{month_expenses}, Carry=€{monthly_balance.carry_forward}")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση MonthlyBalance: {e}")


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


@receiver(post_delete, sender=Expense)
def update_monthly_balance_on_expense_delete(sender, instance, **kwargs):
    """
    Αυτόματη ενημέρωση MonthlyBalance όταν διαγράφεται δαπάνη.
    """
    try:
        from .models import MonthlyBalance
        
        with transaction.atomic():
            building = instance.building
            expense_date = instance.date
            year = expense_date.year
            month = expense_date.month
            
            # Βρίσκουμε το MonthlyBalance
            monthly_balance = MonthlyBalance.objects.filter(
                building=building,
                year=year,
                month=month
            ).first()
            
            if not monthly_balance:
                return  # Δεν υπάρχει, τίποτα να κάνουμε
            
            # Επαναυπολογισμός
            from datetime import date as dt
            month_start = dt(year, month, 1)
            if month == 12:
                month_end = dt(year + 1, 1, 1)
            else:
                month_end = dt(year, month + 1, 1)
            
            month_expenses = Expense.objects.filter(
                building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            from .models import Payment
            month_payments = Payment.objects.filter(
                apartment__building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            monthly_balance.total_expenses = month_expenses
            monthly_balance.total_payments = month_payments
            monthly_balance.carry_forward = month_expenses - month_payments
            monthly_balance.save()
            
            print(f"✅ Επαναυπολογίστηκε MonthlyBalance για {month:02d}/{year}: Expenses=€{month_expenses}, Carry=€{monthly_balance.carry_forward}")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην επαναυπολόγηση MonthlyBalance: {e}")


@receiver(post_save, sender=Payment)
def update_monthly_balance_on_payment(sender, instance, created, **kwargs):
    """
    Αυτόματη ενημέρωση MonthlyBalance όταν προστίθεται πληρωμή.
    """
    try:
        from .models import MonthlyBalance
        
        with transaction.atomic():
            building = instance.apartment.building
            payment_date = instance.date
            year = payment_date.year
            month = payment_date.month
            
            # Get or create MonthlyBalance
            monthly_balance, mb_created = MonthlyBalance.objects.get_or_create(
                building=building,
                year=year,
                month=month,
                defaults={
                    'total_expenses': Decimal('0.00'),
                    'total_payments': Decimal('0.00'),
                    'previous_obligations': Decimal('0.00'),
                    'carry_forward': Decimal('0.00'),
                    'reserve_fund_amount': Decimal('0.00'),
                    'management_fees': Decimal('0.00'),
                    'scheduled_maintenance_amount': Decimal('0.00'),
                }
            )
            
            # Υπολογισμός
            from datetime import date as dt
            month_start = dt(year, month, 1)
            if month == 12:
                month_end = dt(year + 1, 1, 1)
            else:
                month_end = dt(year, month + 1, 1)
            
            month_expenses = Expense.objects.filter(
                building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            month_payments = Payment.objects.filter(
                apartment__building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            monthly_balance.total_expenses = month_expenses
            monthly_balance.total_payments = month_payments
            monthly_balance.carry_forward = month_expenses - month_payments
            monthly_balance.save()
            
            if mb_created:
                print(f"✅ Δημιουργήθηκε MonthlyBalance για {month:02d}/{year} (Payment): Payments=€{month_payments}, Carry=€{monthly_balance.carry_forward}")
            else:
                print(f"✅ Ενημερώθηκε MonthlyBalance για {month:02d}/{year} (Payment): Payments=€{month_payments}, Carry=€{monthly_balance.carry_forward}")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην ενημέρωση MonthlyBalance από Payment: {e}")


@receiver(post_delete, sender=Payment)
def update_monthly_balance_on_payment_delete(sender, instance, **kwargs):
    """
    Αυτόματη ενημέρωση MonthlyBalance όταν διαγράφεται πληρωμή.
    """
    try:
        from .models import MonthlyBalance
        
        with transaction.atomic():
            building = instance.apartment.building
            payment_date = instance.date
            year = payment_date.year
            month = payment_date.month
            
            monthly_balance = MonthlyBalance.objects.filter(
                building=building,
                year=year,
                month=month
            ).first()
            
            if not monthly_balance:
                return
            
            # Επαναυπολογισμός
            from datetime import date as dt
            month_start = dt(year, month, 1)
            if month == 12:
                month_end = dt(year + 1, 1, 1)
            else:
                month_end = dt(year, month + 1, 1)
            
            month_expenses = Expense.objects.filter(
                building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            month_payments = Payment.objects.filter(
                apartment__building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            monthly_balance.total_expenses = month_expenses
            monthly_balance.total_payments = month_payments
            monthly_balance.carry_forward = month_expenses - month_payments
            monthly_balance.save()
            
            print(f"✅ Επαναυπολογίστηκε MonthlyBalance για {month:02d}/{year} (Payment Delete): Payments=€{month_payments}, Carry=€{monthly_balance.carry_forward}")
    
    except Exception as e:
        print(f"❌ Σφάλμα στην επαναυπολόγηση MonthlyBalance από Payment delete: {e}")


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
    Αυτόματη ενημέρωση οικονομικών δεδομένων όταν αλλάζει το κτίριο
    
    UPDATED 2025-10-10: Αυτόματη δημιουργία monthly charges όταν ορίζεται το πακέτο
    """
    try:
        # ✅ NEW 2025-10-10: Αυτόματη δημιουργία monthly charges
        # Όταν ορίζεται το financial_system_start_date ή το management_fee_per_apartment
        if instance.financial_system_start_date and instance.management_fee_per_apartment:
            # Έλεγχος αν έχουν ήδη δημιουργηθεί charges
            existing_charges = Transaction.objects.filter(
                building=instance,
                type='management_fee_charge'
            ).exists()
            
            if not existing_charges:
                # 🚀 Αυτόματη δημιουργία retroactive charges
                print(f"🚀 Building Signal: Auto-creating monthly charges for {instance.name}")
                print(f"   Start date: {instance.financial_system_start_date}")
                print(f"   Management fee: {instance.management_fee_per_apartment}€/apartment")
                
                try:
                    from datetime import date
                    from .monthly_charge_service import MonthlyChargeService
                    
                    # Δημιουργία charges από την έναρξη μέχρι τώρα
                    results = MonthlyChargeService.create_charges_for_building(
                        building_id=instance.id,
                        start_month=instance.financial_system_start_date,
                        end_month=date.today().replace(day=1)
                    )
                    
                    total_transactions = sum(r.get('transactions_created', 0) for r in results)
                    print(f"✅ Auto-created {len(results)} months of charges ({total_transactions} transactions)")
                    
                except Exception as e:
                    print(f"⚠️ Could not auto-create monthly charges: {e}")
                    print(f"   Run manually: python manage.py create_monthly_charges --schema demo --building {instance.id} --retroactive")
        
        # Original signal logic
        if not created:
            print(f"✅ Building Signal: Ενημερώθηκε κτίριο {instance.name}")
            if instance.management_fee_per_apartment:
                print(f"📊 Αμοιβή διαχείρισης: {instance.management_fee_per_apartment}€/διαμέρισμα")

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

            # Υπολογισμός συνολικών εξόδων από τις δαπάνες της περιόδου
            period_expenses = Expense.objects.filter(
                building=instance.building,
                date__gte=instance.start_date,
                date__lte=instance.end_date
            )
            total_expenses = sum(exp.amount for exp in period_expenses) if period_expenses.exists() else Decimal('0.00')

            # Create notification event
            NotificationEventService.create_event(
                event_type='common_expense',
                building=instance.building,
                title=f"Νέο Φύλλο Κοινοχρήστων: {instance.period_name}",
                description=f"Δημιουργήθηκε φύλλο κοινοχρήστων για την περίοδο {instance.period_name}. "
                           f"Συνολικά έξοδα: {total_expenses:.2f}€",
                url=f"/financial/common-expenses/{instance.id}",
                is_urgent=False,
                icon='💰',
                event_date=instance.end_date,
            )

            print(f"✅ Created NotificationEvent for CommonExpensePeriod: {instance.period_name}")

        except Exception as e:
            print(f"❌ Error creating NotificationEvent for CommonExpensePeriod: {e}")

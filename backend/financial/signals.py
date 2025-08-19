# backend/financial/signals.py
"""
Django signals για αυτόματη ενημέρωση οικονομικών υπολοίπων
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from decimal import Decimal
from django.utils import timezone

from .models import Transaction, Payment, Expense
from apartments.models import Apartment
from buildings.models import Building


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
                
                print(f"✅ Ενημερώθηκε αποθεματικό κτιρίου {building.name}: {new_reserve:,.2f}€")
    
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


# Import που λείπει
from django.db.models import Sum

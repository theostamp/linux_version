import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment, Expense
from apartments.models import Apartment
from decimal import Decimal
from datetime import datetime
from django.utils import timezone

def convert_existing_payments_to_transactions():
    """Μετατροπή υπάρχουσων πληρωμών σε συναλλαγές"""
    with schema_context('demo'):
        print("🔄 ΜΕΤΑΤΡΟΠΗ ΠΛΗΡΩΜΩΝ ΣΕ ΣΥΝΑΛΛΑΓΕΣ")
        print("=" * 50)
        
        payments = Payment.objects.all()
        converted_count = 0
        
        for payment in payments:
            # Έλεγχος αν υπάρχει ήδη συναλλαγή για αυτή την πληρωμή
            existing_transaction = Transaction.objects.filter(
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if existing_transaction:
                print(f"   ⏭️  Πληρωμή {payment.id} ({payment.amount}€) - Υπάρχει ήδη συναλλαγή")
                continue
            
            try:
                # Υπολογισμός υπολοίπων
                previous_balance = payment.apartment.current_balance or Decimal('0.00')
                new_balance = previous_balance + payment.amount
                
                # Convert payment.date (DateField) to DateTimeField for Transaction
                payment_datetime = datetime.combine(payment.date, datetime.min.time())
                if timezone.is_naive(payment_datetime):
                    payment_datetime = timezone.make_aware(payment_datetime)
                
                # Δημιουργία συναλλαγής
                Transaction.objects.create(
                    building=payment.apartment.building,
                    apartment=payment.apartment,
                    date=payment_datetime,
                    apartment_number=payment.apartment.number,
                    type='common_expense_payment',
                    description=f"Είσπραξη κοινοχρήστων από {payment.apartment.number} - {payment.get_method_display()}",
                    amount=payment.amount,
                    balance_before=previous_balance,
                    balance_after=new_balance,
                    reference_id=str(payment.id),
                    reference_type='payment',
                    notes=payment.notes,
                    created_by='System (Retroactive Conversion)'
                )
                
                converted_count += 1
                print(f"   ✅ Πληρωμή {payment.id} ({payment.amount}€) - Μετατράπηκε σε συναλλαγή")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα στη μετατροπή πληρωμής {payment.id}: {e}")
        
        print(f"\n📊 ΣΥΝΟΛΟ: Μετατράπηκαν {converted_count} πληρωμές σε συναλλαγές")
        print("=" * 50)

def convert_existing_expenses_to_transactions():
    """Μετατροπή όλων των δαπανών σε συναλλαγές"""
    with schema_context('demo'):
        print("🔄 ΜΕΤΑΤΡΟΠΗ ΔΑΠΑΝΩΝ ΣΕ ΣΥΝΑΛΛΑΓΕΣ")
        print("=" * 50)
        
        # Όλες οι δαπάνες θεωρούνται εκδοθείσες (αφού αφαιρέθηκε το is_issued field)
        expenses = Expense.objects.all()
        converted_count = 0
        
        for expense in expenses:
            # Έλεγχος αν υπάρχουν ήδη συναλλαγές για αυτή την δαπάνη
            existing_transactions = Transaction.objects.filter(
                reference_id=str(expense.id),
                reference_type='expense'
            )
            
            if existing_transactions.exists():
                print(f"   ⏭️  Δαπάνη {expense.id} ({expense.title}) - Υπάρχουν ήδη συναλλαγές")
                continue
            
            try:
                # Καλούμε τη μέθοδο που δημιουργεί συναλλαγές για όλα τα διαμερίσματα
                expense._create_apartment_transactions()
                converted_count += 1
                print(f"   ✅ Δαπάνη {expense.id} ({expense.title}) - Μετατράπηκε σε συναλλαγές")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα στη μετατροπή δαπάνης {expense.id}: {e}")
        
        print(f"\n📊 ΣΥΝΟΛΟ: Μετατράπηκαν {converted_count} δαπάνες σε συναλλαγές")
        print("=" * 50)

def recalculate_all_apartment_balances():
    """Επαναυπολογισμός όλων των υπολοίπων διαμερισμάτων"""
    with schema_context('demo'):
        print("🔄 ΕΠΑΝΑΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("=" * 50)
        
        apartments = Apartment.objects.all()
        updated_count = 0
        
        for apartment in apartments:
            try:
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
                    old_balance = apartment.current_balance
                    apartment.current_balance = new_balance
                    apartment.save(update_fields=['current_balance'])
                    updated_count += 1
                    print(f"   ✅ Διαμέρισμα {apartment.number}: {old_balance:,.2f}€ → {new_balance:,.2f}€")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα στον επαναυπολογισμό διαμερίσματος {apartment.number}: {e}")
        
        print(f"\n📊 ΣΥΝΟΛΟ: Ενημερώθηκαν {updated_count} διαμερίσματα")
        print("=" * 50)

def main():
    """Κύρια συνάρτηση μετατροπής"""
    print("🚀 ΕΝΑΡΞΗ ΑΥΤΟΜΑΤΗΣ ΜΕΤΑΤΡΟΠΗΣ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 60)
    
    # 1. Μετατροπή πληρωμών σε συναλλαγές
    convert_existing_payments_to_transactions()
    
    # 2. Μετατροπή δαπανών σε συναλλαγές
    convert_existing_expenses_to_transactions()
    
    # 3. Επαναυπολογισμός υπολοίπων
    recalculate_all_apartment_balances()
    
    print("\n🎉 ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΜΕΤΑΤΡΟΠΗ!")
    print("=" * 60)
    
    # Τελική αναφορά
    with schema_context('demo'):
        total_transactions = Transaction.objects.count()
        total_payments = Payment.objects.count()
        total_expenses = Expense.objects.count()
    
    print("📊 ΤΕΛΙΚΗ ΑΝΑΦΟΡΑ:")
    print(f"   Συναλλαγές: {total_transactions}")
    print(f"   Πληρωμές: {total_payments}")
    print(f"   Εκδοθείσες δαπάνες: {total_expenses}")
    print("=" * 60)

if __name__ == "__main__":
    main()

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment, Apartment
from decimal import Decimal

def investigate_balance_b3():
    """Ερεύνηση υπολογισμού υπολοίπου διαμερίσματος Β3"""
    
    with schema_context('demo'):
        try:
            # Βρίσκουμε το διαμέρισμα Β3 (με ελληνικό Β)
            apartment = Apartment.objects.get(number='Β3')
            print(f"🏠 Διαμέρισμα: {apartment.number}")
            print(f"👤 Ιδιοκτήτης: {apartment.owner_name}")
            print(f"📊 Τρέχον υπόλοιπο από DB: €{apartment.current_balance:,.2f}")
            print("=" * 60)
            
            # 1. Όλες οι πληρωμές
            print("💰 ΠΛΗΡΩΜΕΣ:")
            payments = Payment.objects.filter(apartment=apartment).order_by('date', 'id')
            total_payments = Decimal('0.00')
            
            for payment in payments:
                print(f"   📅 {payment.date}: €{payment.amount:,.2f} - {payment.get_method_display()}")
                print(f"      Τύπος: {payment.get_payment_type_display()}")
                print(f"      Αποθεματικό: €{payment.reserve_fund_amount:,.2f}")
                total_payments += payment.amount
            
            print(f"   📈 Σύνολο πληρωμών: €{total_payments:,.2f}")
            print()
            
            # 2. Όλες οι συναλλαγές
            print("💳 ΣΥΝΑΛΛΑΓΕΣ:")
            transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'id')
            total_charges = Decimal('0.00')
            total_credits = Decimal('0.00')
            
            for transaction in transactions:
                print(f"   📅 {transaction.date}: €{transaction.amount:,.2f} - {transaction.type}")
                print(f"      Περιγραφή: {transaction.description}")
                print(f"      Υπόλοιπο μετά: €{transaction.balance_after:,.2f}")
                
                if transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                      'interest_charge', 'penalty_charge']:
                    total_charges += transaction.amount
                elif transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                    total_credits += transaction.amount
            
            print(f"   📈 Σύνολο χρεώσεων: €{total_charges:,.2f}")
            print(f"   📈 Σύνολο εισπράξεων: €{total_credits:,.2f}")
            print()
            
            # 3. Υπολογισμός υπολοίπου
            print("🧮 ΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΟΥ:")
            
            # Μέθοδος 1: Από πληρωμές και συναλλαγές
            balance_from_payments = total_payments - total_charges + total_credits
            print(f"   💳 Από πληρωμές και συναλλαγές: €{balance_from_payments:,.2f}")
            
            # Μέθοδος 2: Από συναλλαγές μόνο
            balance_from_transactions = total_credits - total_charges
            print(f"   💳 Από συναλλαγές μόνο: €{balance_from_transactions:,.2f}")
            
            # Μέθοδος 3: Progressive calculation
            print("   📊 Προοδευτικός υπολογισμός:")
            running_balance = Decimal('0.00')
            
            # Συνδυάζουμε πληρωμές και συναλλαγές
            all_items = []
            
            for payment in payments:
                all_items.append({
                    'date': payment.date,
                    'type': 'payment',
                    'amount': payment.amount,
                    'description': f'Πληρωμή - {payment.get_method_display()}'
                })
            
            for transaction in transactions:
                all_items.append({
                    'date': transaction.date,
                    'type': transaction.type,
                    'amount': transaction.amount,
                    'description': transaction.description
                })
            
            # Ταξινόμηση κατά ημερομηνία (μετατροπή σε string για σύγκριση)
            all_items.sort(key=lambda x: (str(x['date']), x['type'] == 'payment'))
            
            for item in all_items:
                if item['type'] == 'payment':
                    running_balance += item['amount']
                elif item['type'] in ['common_expense_payment', 'payment_received', 'refund']:
                    running_balance += item['amount']
                elif item['type'] in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                    'interest_charge', 'penalty_charge']:
                    running_balance -= item['amount']
                
                print(f"      {item['date']}: {item['description']} -> €{running_balance:,.2f}")
            
            print(f"   🎯 Τελικό προοδευτικό υπόλοιπο: €{running_balance:,.2f}")
            print()
            
            # 4. Σύγκριση
            print("🔍 ΣΥΓΚΡΙΣΗ:")
            print(f"   📊 DB υπόλοιπο: €{apartment.current_balance:,.2f}")
            print(f"   📊 Προοδευτικό: €{running_balance:,.2f}")
            print(f"   📊 Από πληρωμές: €{balance_from_payments:,.2f}")
            
            if abs(running_balance - apartment.current_balance) < Decimal('0.01'):
                print("   ✅ Υπολογισμός σωστός!")
            else:
                print(f"   ⚠️ Διαφορά: €{running_balance - apartment.current_balance:,.2f}")
            
        except Apartment.DoesNotExist:
            print("❌ Το διαμέρισμα Β3 δεν βρέθηκε")
        except Exception as e:
            print(f"❌ Σφάλμα: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    investigate_balance_b3()

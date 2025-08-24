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

def fix_balance_b3():
    """Διόρθωση υπολοίπου διαμερίσματος Β3"""
    
    with schema_context('demo'):
        try:
            # Βρίσκουμε το διαμέρισμα Β3
            apartment = Apartment.objects.get(number='Β3')
            print(f"🏠 Διαμέρισμα: {apartment.number}")
            print(f"👤 Ιδιοκτήτης: {apartment.owner_name}")
            print(f"📊 Τρέχον υπόλοιπο από DB: €{apartment.current_balance:,.2f}")
            print("=" * 60)
            
            # Υπολογισμός σωστού υπολοίπου από συναλλαγές
            transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'id')
            correct_balance = Decimal('0.00')
            
            print("🧮 Υπολογισμός σωστού υπολοίπου:")
            for transaction in transactions:
                if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                    correct_balance += transaction.amount
                    print(f"   ➕ {transaction.date}: +€{transaction.amount:,.2f} ({transaction.type})")
                elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                        'interest_charge', 'penalty_charge']:
                    correct_balance -= transaction.amount
                    print(f"   ➖ {transaction.date}: -€{transaction.amount:,.2f} ({transaction.type})")
            
            print(f"   🎯 Σωστό υπόλοιπο: €{correct_balance:,.2f}")
            print()
            
            # Σύγκριση
            current_balance = apartment.current_balance
            difference = correct_balance - current_balance
            
            print("🔍 Σύγκριση:")
            print(f"   📊 Τρέχον υπόλοιπο: €{current_balance:,.2f}")
            print(f"   📊 Σωστό υπόλοιπο: €{correct_balance:,.2f}")
            print(f"   📊 Διαφορά: €{difference:,.2f}")
            
            if abs(difference) > Decimal('0.01'):
                print(f"   ⚠️  Χρειάζεται διόρθωση!")
                
                # Ερώτηση για διόρθωση
                print(f"\n🔧 Θέλετε να διορθώσω το υπόλοιπο; (y/n): ", end="")
                response = input().strip().lower()
                
                if response == 'y':
                    # Ενημέρωση του υπόλοίπου
                    apartment.current_balance = correct_balance
                    apartment.save(update_fields=['current_balance'])
                    
                    print(f"   ✅ Ενημερώθηκε το υπόλοιπο: €{current_balance:,.2f} → €{correct_balance:,.2f}")
                    
                    # Δημιουργία balance adjustment transaction
                    from datetime import datetime
                    
                    adjustment_transaction = Transaction.objects.create(
                        building=apartment.building,
                        apartment=apartment,
                        date=datetime.now(),
                        type='balance_adjustment',
                        description=f'Διόρθωση υπολοίπου διαμερίσματος {apartment.number}',
                        amount=Decimal('0.00'),
                        balance_after=correct_balance,
                        notes=f'Αυτόματη διόρθωση από €{current_balance:,.2f} σε €{correct_balance:,.2f}'
                    )
                    
                    print(f"   📝 Δημιουργήθηκε balance adjustment transaction (ID: {adjustment_transaction.id})")
                else:
                    print("   ❌ Διόρθωση ακυρώθηκε")
            else:
                print("   ✅ Το υπόλοιπο είναι σωστό!")
            
        except Apartment.DoesNotExist:
            print("❌ Το διαμέρισμα Β3 δεν βρέθηκε")
        except Exception as e:
            print(f"❌ Σφάλμα: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    fix_balance_b3()

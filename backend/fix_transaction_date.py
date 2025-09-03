import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Transaction

def fix_transaction_date():
    """Fix the transaction date discrepancy for apartment 3"""
    
    building_id = 6  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔧 ΔΙΟΡΘΩΣΗ ΗΜΕΡΟΜΗΝΙΑΣ ΣΥΝΑΛΛΑΓΗΣ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # Βρες τη συναλλαγή που χρειάζεται διόρθωση
        transaction_to_fix = Transaction.objects.filter(
            building_id=building_id,
            apartment_number=3,
            amount=Decimal('65.35'),
            type='common_expense_payment'
        ).first()
        
        if not transaction_to_fix:
            print("❌ Δεν βρέθηκε η συναλλαγή για διόρθωση")
            return
        
        print("📋 Βρέθηκε συναλλαγή:")
        print(f"   - ID: {transaction_to_fix.id}")
        print(f"   - Τρέχουσα ημερομηνία: {transaction_to_fix.date}")
        print(f"   - Ποσό: {transaction_to_fix.amount}€")
        print(f"   - Reference: {transaction_to_fix.reference_type}:{transaction_to_fix.reference_id}")
        
        # Βρες την αντίστοιχη πληρωμή
        if transaction_to_fix.reference_type == 'payment' and transaction_to_fix.reference_id:
            try:
                payment_id = int(transaction_to_fix.reference_id)
                payment = Payment.objects.get(id=payment_id)
                
                print("\n💰 Αντίστοιχη πληρωμή:")
                print(f"   - ID: {payment.id}")
                print(f"   - Ημερομηνία: {payment.date}")
                print(f"   - Ποσό: {payment.amount}€")
                
                # Διόρθωση της ημερομηνίας της συναλλαγής
                old_date = transaction_to_fix.date
                new_date = datetime.combine(payment.date, datetime.min.time())
                
                print("\n🔧 Διόρθωση ημερομηνίας:")
                print(f"   - Παλιά ημερομηνία: {old_date}")
                print(f"   - Νέα ημερομηνία: {new_date}")
                
                # Ενημέρωση της συναλλαγής
                transaction_to_fix.date = new_date
                transaction_to_fix.save()
                
                print("✅ Η ημερομηνία διορθώθηκε επιτυχώς!")
                
                # Επιβεβαίωση
                transaction_to_fix.refresh_from_db()
                print(f"✅ Επιβεβαίωση - Νέα ημερομηνία: {transaction_to_fix.date}")
                
            except (ValueError, Payment.DoesNotExist) as e:
                print(f"❌ Σφάλμα: {str(e)}")
        else:
            print("❌ Η συναλλαγή δεν έχει έγκυρη αναφορά σε πληρωμή")
        
        print()
        print("=" * 60)
        print("✅ Διόρθωση ολοκληρώθηκε!")

if __name__ == "__main__":
    fix_transaction_date()

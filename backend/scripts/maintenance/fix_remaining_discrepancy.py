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

def fix_remaining_discrepancy():
    """Fix the remaining 1-day discrepancy"""
    
    building_id = 6  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔧 ΔΙΟΡΘΩΣΗ ΤΕΛΙΚΗΣ ΑΣΥΜΦΩΝΙΑΣ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # Βρες τη συναλλαγή
        transaction = Transaction.objects.filter(
            building_id=building_id,
            apartment_number=3,
            amount=Decimal('65.35'),
            type='common_expense_payment'
        ).first()
        
        if not transaction:
            print("❌ Δεν βρέθηκε η συναλλαγή")
            return
        
        # Βρες την πληρωμή
        payment = Payment.objects.get(id=88)
        
        print("📋 Τρέχουσα κατάσταση:")
        print(f"   - Πληρωμή ημερομηνία: {payment.date}")
        print(f"   - Συναλλαγή ημερομηνία: {transaction.date}")
        
        # Διόρθωση - χρησιμοποιούμε την ίδια ημερομηνία με την πληρωμή
        new_date = datetime.combine(payment.date, datetime.min.time())
        
        print("\n🔧 Διόρθωση:")
        print(f"   - Νέα ημερομηνία συναλλαγής: {new_date}")
        
        transaction.date = new_date
        transaction.save()
        
        print("✅ Η διόρθωση ολοκληρώθηκε!")
        
        # Επιβεβαίωση
        transaction.refresh_from_db()
        print(f"✅ Επιβεβαίωση - Τελική ημερομηνία: {transaction.date}")
        
        print()
        print("=" * 60)
        print("✅ Διόρθωση ολοκληρώθηκε!")

if __name__ == "__main__":
    fix_remaining_discrepancy()

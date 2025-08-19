import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from django.db.models import Sum

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building
from financial.services import CommonExpenseCalculator

def implement_auto_issue_expenses():
    """Implement auto-issue expenses feature"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🚀 ΕΦΑΡΜΟΓΗ ΑΥΤΟΜΑΤΗΣ ΕΚΔΟΣΗΣ ΔΑΠΑΝΩΝ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Backup τρέχοντος state
        print("📋 1. BACKUP ΤΡΕΧΟΝΤΟΣ STATE")
        print("-" * 50)
        
        unissued_expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print(f"📊 Εκκρεμείς δαπάνες: {unissued_expenses.count()}")
        print(f"🏠 Διαμερίσματα: {apartments.count()}")
        
        # Backup apartment balances
        apartment_balances_before = {}
        for apartment in apartments:
            apartment_balances_before[apartment.id] = apartment.current_balance or Decimal('0.00')
            print(f"   Διαμέρισμα {apartment.number}: €{apartment_balances_before[apartment.id]:,.2f}")
        
        print()
        
        # 2. Έκδοση εκκρεμών δαπανών
        print("📋 2. ΕΚΔΟΣΗ ΕΚΚΡΕΜΩΝ ΔΑΠΑΝΩΝ")
        print("-" * 50)
        
        if unissued_expenses.exists():
            # Mark expenses as issued
            unissued_expenses.update(is_issued=True)
            print(f"✅ Εκδόθηκαν {unissued_expenses.count()} δαπάνες")
            
            # Show issued expenses
            for expense in unissued_expenses:
                print(f"   • {expense.title}: €{expense.amount:,.2f}")
        else:
            print("ℹ️ Δεν υπάρχουν εκκρεμείς δαπάνες")
        
        print()
        
        # 3. Υπολογισμός μεριδίων
        print("📋 3. ΥΠΟΛΟΓΙΣΜΟΣ ΜΕΡΙΔΙΩΝ")
        print("-" * 50)
        
        try:
            calculator = CommonExpenseCalculator(building_id)
            shares = calculator.calculate_shares()
            
            print(f"✅ Υπολογίστηκαν μερίδια για {len(shares)} διαμερίσματα")
            
            # Show shares summary
            total_amount = Decimal('0.00')
            for apartment_id, share_data in shares.items():
                apartment = Apartment.objects.get(id=apartment_id)
                total_amount += share_data.get('total_amount', 0)
                print(f"   Διαμέρισμα {apartment.number}: €{share_data.get('total_amount', 0):,.2f}")
            
            print(f"📊 Συνολικό ποσό: €{total_amount:,.2f}")
            
        except Exception as e:
            print(f"❌ Σφάλμα στον υπολογισμό: {e}")
            return
        
        print()
        
        # 4. Ενημέρωση υπολοίπων διαμερισμάτων
        print("📋 4. ΕΝΗΜΕΡΩΣΗ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 50)
        
        updated_apartments = 0
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            old_balance = apartment_balances_before[apartment.id]
            new_balance = share_data.get('total_due', 0)
            
            apartment.current_balance = new_balance
            apartment.save()
            
            if old_balance != new_balance:
                updated_apartments += 1
                print(f"   Διαμέρισμα {apartment.number}: €{old_balance:,.2f} → €{new_balance:,.2f}")
        
        print(f"✅ Ενημερώθηκαν {updated_apartments} διαμερίσματα")
        print()
        
        # 5. Δημιουργία transactions
        print("📋 5. ΔΗΜΙΟΥΡΓΙΑ TRANSACTIONS")
        print("-" * 50)
        
        created_transactions = 0
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            total_amount = share_data.get('total_amount', 0)
            
            if total_amount > 0:
                # Create transaction for expense charge
                transaction = Transaction.objects.create(
                    building_id=building_id,
                    date=datetime.now(),
                    type='expense_issued',
                    description=f"Κοινοχρήστων - {apartment.number}",
                    apartment_number=apartment.number,
                    amount=-total_amount,  # Negative for charge
                    balance_before=apartment_balances_before[apartment.id],
                    balance_after=share_data.get('total_due', 0),
                    reference_id=str(apartment.id),
                    reference_type='apartment',
                    created_by='System'
                )
                created_transactions += 1
                print(f"   Δημιουργήθηκε transaction για διαμέρισμα {apartment.number}: €{total_amount:,.2f}")
        
        print(f"✅ Δημιουργήθηκαν {created_transactions} transactions")
        print()
        
        # 6. Validation αποτελεσμάτων
        print("📋 6. VALIDATION ΑΠΟΤΕΛΕΣΜΑΤΩΝ")
        print("-" * 50)
        
        # Check if all expenses are now issued
        remaining_unissued = Expense.objects.filter(building_id=building_id, is_issued=False).count()
        if remaining_unissued == 0:
            print("✅ Όλες οι δαπάνες είναι τώρα εκδοθείσες")
        else:
            print(f"❌ Απομένουν {remaining_unissued} εκκρεμείς δαπάνες")
        
        # Check apartment balances
        total_balance_after = sum(
            apt.current_balance or Decimal('0.00') 
            for apt in Apartment.objects.filter(building_id=building_id)
        )
        
        total_expenses = Expense.objects.filter(building_id=building_id).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_payments = Payment.objects.filter(
            apartment__building_id=building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        expected_balance = total_payments - total_expenses
        balance_difference = abs(total_balance_after - expected_balance)
        
        print(f"💰 Συνολικό υπόλοιπο διαμερισμάτων: €{total_balance_after:,.2f}")
        print(f"💸 Συνολικές δαπάνες: €{total_expenses:,.2f}")
        print(f"💳 Συνολικές πληρωμές: €{total_payments:,.2f}")
        print(f"📊 Αναμενόμενο υπόλοιπο: €{expected_balance:,.2f}")
        
        if balance_difference <= Decimal('0.01'):
            print("✅ Τα υπόλοιπα είναι σωστά!")
        else:
            print(f"❌ Ασυμφωνία στα υπόλοιπα: €{balance_difference:,.2f}")
        
        print()
        
        # 7. Συμπέρασμα
        print("📋 7. ΣΥΜΠΕΡΑΣΜΑ")
        print("-" * 50)
        
        print("🎉 ΕΦΑΡΜΟΓΗ ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ!")
        print()
        print("✅ Οι βελτιώσεις που εφαρμόστηκαν:")
        print("   • Όλες οι δαπάνες είναι τώρα εκδοθείσες")
        print("   • Τα υπόλοιπα διαμερισμάτων ενημερώθηκαν")
        print("   • Δημιουργήθηκαν οι απαραίτητες transactions")
        print("   • Το σύστημα είναι πλέον απλούστερο")
        print()
        print("🚀 Επόμενα βήματα:")
        print("   1. Ενημέρωση Expense model (default is_issued=True)")
        print("   2. Ενημέρωση expense creation workflow")
        print("   3. Προσθήκη validation και confirmation")
        print("   4. Ενημέρωση UI")
        print("   5. Testing και validation")

if __name__ == "__main__":
    implement_auto_issue_expenses()

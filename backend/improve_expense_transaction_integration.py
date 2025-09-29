#!/usr/bin/env python3
"""
Script to demonstrate improved expense and transaction integration with better validation.
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Building, Expense, Transaction
from django.db.models import Sum

def improve_expense_transaction_integration():
    """Demonstrate improved expense and transaction integration"""
    
    with schema_context('demo'):
        print("🚀 ΒΕΛΤΙΩΜΕΝΗ ΕΝΤΕΓΡΑΣΗ ΔΑΠΑΝΩΝ ΚΑΙ ΣΥΝΑΛΛΑΓΩΝ")
        print("=" * 60)
        
        # 1. Έλεγχος τρέχουσας κατάστασης
        print("\n📊 ΕΛΕΓΧΟΣ ΤΡΕΧΟΥΣΑΣ ΚΑΤΑΣΤΑΣΗΣ:")
        print("-" * 40)
        
        # Βρες όλα τα κτίρια
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"\n🏢 ΚΤΙΡΙΟ: {building.name}")
            print(f"   📍 {building.address}")
            
            # Έλεγχος δαπανών
            expenses = Expense.objects.filter(building=building)
            total_expenses = expenses.count()
            total_expenses_amount = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Έλεγχος συναλλαγών
            transactions = Transaction.objects.filter(building=building)
            total_transactions = transactions.count()
            
            # Έλεγχος συναλλαγών που αντιστοιχούν σε δαπάνες
            expense_transactions = transactions.filter(
                type__in=['expense_created', 'expense_issued'],
                reference_type='expense'
            )
            total_expense_transactions = expense_transactions.count()
            
            print(f"   💸 Δαπάνες: {total_expenses} (€{total_expenses_amount})")
            print(f"   💳 Συναλλαγές: {total_transactions}")
            print(f"   🔗 Συναλλαγές δαπανών: {total_expense_transactions}")
            
            # Έλεγχος για ασυμφωνίες
            if total_expenses > 0 and total_expense_transactions == 0:
                print("   ⚠️  ΠΡΟΒΛΗΜΑ: Δαπάνες χωρίς συναλλαγές!")
            elif total_expenses != total_expense_transactions:
                print("   ⚠️  ΠΡΟΒΛΗΜΑ: Ασυμφωνία δαπανών-συναλλαγών!")
            else:
                print("   ✅ ΣΩΣΤΗ ΕΝΤΕΓΡΑΣΗ")
        
        # 2. Προτεινόμενες βελτιώσεις
        print("\n🔧 ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΒΕΛΤΙΩΣΕΙΣ:")
        print("-" * 40)
        
        print("1️⃣ ΒΕΛΤΙΩΜΕΝΟ EXPENSEVIEWSET:")
        print("""
class ExpenseViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        expense = serializer.save()
        
        try:
            # Αυτόματη δημιουργία συναλλαγών
            self.create_transactions_for_expense(expense)
            
            # Επιβεβαίωση δημιουργίας
            self.verify_transaction_creation(expense)
            
        except Exception as e:
            # Rollback αν αποτύχει
            expense.delete()
            raise ValidationError(f"Σφάλμα στη δημιουργία συναλλαγών: {str(e)}")
    
    def create_transactions_for_expense(self, expense):
        # Υπολογισμός κατανομής
        shares = self.calculate_expense_shares(expense)
        
        # Δημιουργία συναλλαγών με transaction
        with transaction.atomic():
            for apartment_id, amount in shares.items():
                apartment = Apartment.objects.get(id=apartment_id)
                
                # Δημιουργία συναλλαγής
                Transaction.objects.create(
                    building=expense.building,
                    apartment=apartment,
                    date=expense.date,
                    type='expense_issued',
                    amount=-amount,
                    description=f"Χρέωση: {expense.title}",
                    reference_id=str(expense.id),
                    reference_type='expense'
                )
                
                # Ενημέρωση υπολοίπου
                apartment.current_balance -= amount
                apartment.save()
    
    def verify_transaction_creation(self, expense):
        # Έλεγχος ότι δημιουργήθηκαν οι συναλλαγές
        transactions = Transaction.objects.filter(
            reference_id=str(expense.id),
            reference_type='expense'
        )
        
        if not transactions.exists():
            raise ValidationError("Δεν δημιουργήθηκαν συναλλαγές για τη δαπάνη")
        """)
        
        print("\n2️⃣ VALIDATION SERVICE:")
        print("""
class ExpenseTransactionValidator:
    @staticmethod
    def validate_expense_transactions():
        # Έλεγχος όλων των δαπανών
        expenses_without_transactions = []
        
        for expense in Expense.objects.all():
            transactions = Transaction.objects.filter(
                reference_id=str(expense.id),
                reference_type='expense'
            )
            
            if not transactions.exists():
                expenses_without_transactions.append(expense)
        
        return expenses_without_transactions
    
    @staticmethod
    def auto_fix_missing_transactions():
        # Αυτόματη δημιουργία συναλλαγών για δαπάνες που λείπουν
        missing_expenses = ExpenseTransactionValidator.validate_expense_transactions()
        
        for expense in missing_expenses:
            # Δημιουργία συναλλαγών
            pass
        """)
        
        print("\n3️⃣ BACKGROUND TASK:")
        print("""
@shared_task
def verify_expense_transaction_integrity():
    # Εκτέλεση σε background
    validator = ExpenseTransactionValidator()
    missing_expenses = validator.validate_expense_transactions()
    
    if missing_expenses:
        # Notification για missing transactions
        notify_admin_about_missing_transactions(missing_expenses)
        
        # Αυτόματη δημιουργία
        validator.auto_fix_missing_transactions()
        """)
        
        # 3. Εφαρμογή βελτιώσεων
        print("\n🛠️ ΕΦΑΡΜΟΓΗ ΒΕΛΤΙΩΣΕΩΝ:")
        print("-" * 40)
        
        print("📝 ΒΗΜΑ 1: Δημιουργία Validation Service")
        print("   - Έλεγχος ασυμφωνιών δαπανών-συναλλαγών")
        print("   - Αυτόματη δημιουργία συναλλαγών που λείπουν")
        print("   - Notification system για προβλήματα")
        
        print("\n📝 ΒΗΜΑ 2: Βελτίωση ExpenseViewSet")
        print("   - Atomic transactions για συνεπή δεδομένα")
        print("   - Rollback σε περίπτωση σφάλματος")
        print("   - Επιβεβαίωση δημιουργίας συναλλαγών")
        
        print("\n📝 ΒΗΜΑ 3: Background Monitoring")
        print("   - Περιοδικός έλεγχος ακεραιότητας")
        print("   - Αυτόματη δημιουργία συναλλαγών")
        print("   - Alert system για προβλήματα")
        
        # 4. Παράδειγμα εφαρμογής
        print("\n💡 ΠΑΡΑΔΕΙΓΜΑ ΕΦΑΡΜΟΓΗΣ:")
        print("-" * 40)
        
        print("🔸 ΣΕΝΑΡΙΟ: Καταχώρηση Δαπάνης ΔΕΗ")
        print("""
1. Χρήστης καταχωρεί δαπάνη ΔΕΗ €500
2. Σύστημα δημιουργεί expense record
3. Σύστημα υπολογίζει κατανομή (€50 ανά διαμέρισμα)
4. Σύστημα δημιουργεί 10 συναλλαγές (atomic)
5. Σύστημα ενημερώνει 10 υπολοίπα διαμερισμάτων
6. Σύστημα επιβεβαιώνει δημιουργία συναλλαγών
7. Σύστημα επιστρέφει επιτυχία

ΑΝ ΑΠΟΤΥΧΕΙ ΣΤΟ ΒΗΜΑ 4-6:
- Rollback όλων των αλλαγών
- Διαγραφή expense record
- Επιστροφή σφάλματος
        """)
        
        # 5. Πλεονεκτήματα
        print("\n🎯 ΠΛΕΟΝΕΚΤΗΜΑΤΑ ΤΗΣ ΒΕΛΤΙΩΣΗΣ:")
        print("-" * 40)
        
        print("✅ ΑΤΟΜΙΚΟΤΗΤΑ:")
        print("   - Όλες οι αλλαγές γίνονται μαζί ή καθόλου")
        print("   - Δεν υπάρχουν ημίτελες καταστάσεις")
        print("   - Συνεπή δεδομένα πάντα")
        
        print("\n✅ ΕΠΙΒΕΒΑΙΩΣΗ:")
        print("   - Έλεγχος ότι δημιουργήθηκαν οι συναλλαγές")
        print("   - Validation πριν την ολοκλήρωση")
        print("   - Error handling με rollback")
        
        print("\n✅ ΜΟΝΙΤΟΡΙΝΓΚ:")
        print("   - Background έλεγχος ακεραιότητας")
        print("   - Αυτόματη δημιουργία συναλλαγών που λείπουν")
        print("   - Alert system για προβλήματα")
        
        # 6. Συμπέρασμα
        print("\n📊 ΣΥΜΠΕΡΑΣΜΑ:")
        print("-" * 40)
        
        print("🎯 Η ΔΙΑΧΩΡΙΣΗ ΔΑΠΑΝΩΝ ΚΑΙ ΣΥΝΑΛΛΑΓΩΝ ΕΙΝΑΙ ΣΩΣΤΗ")
        print("   - Ευελιξία στη διαχείριση")
        print("   - Διαφορετικοί τύποι κατανομής")
        print("   - Audit trail και ιστορικό")
        
        print("\n🎯 ΑΛΛΑ ΧΡΕΙΑΖΕΤΑΙ ΒΕΛΤΙΩΜΕΝΗ ΕΝΤΕΓΡΑΣΗ:")
        print("   - Atomic transactions για συνεπή δεδομένα")
        print("   - Validation και επιβεβαίωση")
        print("   - Background monitoring και auto-fix")
        print("   - Error handling με rollback")
        
        print("\n✅ ΤΟ ΣΥΣΤΗΜΑ ΕΧΕΙ ΤΗ ΒΑΣΙΚΗ ΛΟΓΙΚΗ")
        print("   - Αυτόματη δημιουργία συναλλαγών")
        print("   - Χρειάζεται βελτίωση στην αξιοπιστία")
        print("   - Χρειάζεται καλύτερο error handling")

if __name__ == "__main__":
    improve_expense_transaction_integration()

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.utils import timezone
from financial.models import Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def create_expenses_and_charges():
    """Δημιουργία δαπανών και χρεώσεων κοινοχρήστων"""
    
    print("🔄 ΔΗΜΙΟΥΡΓΙΑ ΔΑΠΑΝΩΝ ΚΑΙ ΧΡΕΩΣΕΩΝ ΚΟΙΝΟΧΡΗΣΤΩΝ")
    print("=" * 60)
    
    with schema_context('demo'):
        # Έλεγχος υπάρχοντων δαπανών
        existing_expenses = Expense.objects.count()
        if existing_expenses > 0:
            print(f"⚠️  Υπάρχουν ήδη {existing_expenses} δαπάνες!")
            response = input("Θέλετε να συνεχίσετε; (y/N): ")
            if response.lower() != 'y':
                print("❌ Ακυρώθηκε η διαδικασία.")
                return
        
        # Λήψη κτιρίου και διαμερισμάτων
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο.")
            return
        
        apartments = Apartment.objects.filter(
            number__in=['Α1', 'Α2', 'Α3', 'Β1', 'Β2', 'Β3', 'Γ1', 'Γ2', 'Γ3', 'Δ1']
        ).order_by('number')
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"🏠 Διαμερίσματα: {apartments.count()}")
        
        # Δημιουργία δαπανών για τους 6 μήνες (Ιανουάριος - Ιούνιος 2024)
        months = [
            (2024, 1, "Ιανουάριος 2024"),
            (2024, 2, "Φεβρουάριος 2024"),
            (2024, 3, "Μάρτιος 2024"),
            (2024, 4, "Απρίλιος 2024"),
            (2024, 5, "Μάιος 2024"),
            (2024, 6, "Ιούνιος 2024"),
        ]
        
        created_expenses = 0
        created_charges = 0
        error_count = 0
        
        print("\n🔄 ΔΗΜΙΟΥΡΓΙΑ ΔΑΠΑΝΩΝ ΚΑΙ ΧΡΕΩΣΕΩΝ:")
        print("-" * 50)
        
        for year, month, month_name in months:
            try:
                # Δημιουργία δαπάνης κοινοχρήστων
                expense_date = date(year, month, 15)  # 15η του μήνα
                expense_amount = Decimal('150.00')  # Συνολική δαπάνη ανά μήνα
                
                expense = Expense.objects.create(
                    building=building,
                    title=f"Κοινόχρηστα {month_name}",
                    amount=expense_amount,
                    date=expense_date,
                    category='cleaning',
                    expense_type='regular',
                    distribution_type='by_participation_mills',
                    notes=f"Αυτόματη δημιουργία δαπάνης για {month_name}"
                )
                
                created_expenses += 1
                print(f"✅ Δημιουργήθηκε δαπάνη: {expense.title} ({expense_amount}€)")
                
                # Δημιουργία χρεώσεων για κάθε διαμέρισμα
                for apartment in apartments:
                    # Υπολογισμός μεριδίου βάσει χιλιοστών
                    participation_mills = apartment.participation_mills or Decimal('100.00')
                    share_amount = (expense_amount * participation_mills) / Decimal('1000.00')
                    
                    # Δημιουργία συναλλαγής χρέωσης
                    charge_transaction = Transaction.objects.create(
                        building=building,
                        date=timezone.make_aware(datetime.combine(expense_date, datetime.min.time())),
                        type='common_expense_charge',
                        status='completed',
                        description=f"Χρέωση κοινοχρήστων {month_name} - {apartment.number}",
                        apartment_number=apartment.number,
                        apartment=apartment,
                        amount=-share_amount,  # Αρνητικό ποσό για χρέωση
                        balance_before=apartment.current_balance,
                        balance_after=apartment.current_balance - share_amount,
                        reference_id=str(expense.id),
                        reference_type='expense',
                        notes=f"Αυτόματη χρέωση από δαπάνη {expense.id}. Χιλιοστά: {participation_mills}",
                        created_by='system_audit'
                    )
                    
                    # Ενημέρωση υπόλοιπου διαμερίσματος
                    apartment.current_balance -= share_amount
                    apartment.save()
                    
                    created_charges += 1
                    print(f"  💸 Χρέωση {apartment.number}: {share_amount:.2f}€ (χιλιοστά: {participation_mills})")
                
                print(f"  📊 Συνολικές χρεώσεις {month_name}: {expense_amount}€")
                print()
                
            except Exception as e:
                error_count += 1
                print(f"❌ Σφάλμα στη δημιουργία {month_name}: {str(e)}")
        
        # Σύνοψη
        print("📋 ΣΥΝΟΨΗ:")
        print("-" * 20)
        print(f"✅ Δημιουργήθηκαν: {created_expenses} δαπάνες")
        print(f"💸 Δημιουργήθηκαν: {created_charges} χρεώσεις")
        print(f"❌ Σφάλματα: {error_count}")
        
        if created_expenses > 0:
            print(f"\n🎉 Επιτυχής δημιουργία {created_expenses} δαπανών και {created_charges} χρεώσεων!")
            print("💡 Τώρα μπορείτε να εκτελέσετε τον έλεγχο μεταφοράς υπολοίπων.")
        else:
            print("\n⚠️  Δεν δημιουργήθηκαν δαπάνες.")

def verify_expenses_and_charges():
    """Έλεγχος της δημιουργίας δαπανών και χρεώσεων"""
    
    print("\n🔍 ΕΛΕΓΧΟΣ ΔΗΜΙΟΥΡΓΙΑΣ ΔΑΠΑΝΩΝ ΚΑΙ ΧΡΕΩΣΕΩΝ:")
    print("=" * 60)
    
    with schema_context('demo'):
        expenses = Expense.objects.all()
        transactions = Transaction.objects.all()
        
        print(f"📉 Δαπάνες: {expenses.count()}")
        print(f"💳 Συναλλαγές: {transactions.count()}")
        
        # Ανάλυση συναλλαγών ανά τύπο
        transaction_types = transactions.values('type').annotate(
            count=django.db.models.Count('id'),
            total_amount=django.db.models.Sum('amount')
        ).order_by('type')
        
        print("\n📋 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 30)
        
        for tx_type in transaction_types:
            print(f"🔸 {tx_type['type']}:")
            print(f"   - Πλήθος: {tx_type['count']}")
            print(f"   - Συνολικό ποσό: {tx_type['total_amount']:.2f}€")
        
        # Έλεγχος υπολοίπων διαμερισμάτων
        print("\n🏢 ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 30)
        
        apartments = Apartment.objects.filter(
            number__in=['Α1', 'Α2', 'Α3', 'Β1', 'Β2', 'Β3', 'Γ1', 'Γ2', 'Γ3', 'Δ1']
        ).order_by('number')
        
        total_balance = Decimal('0.00')
        
        for apartment in apartments:
            balance = apartment.current_balance
            total_balance += balance
            
            if balance > 0:
                status = "✅ Πιστωτικό"
            elif balance < 0:
                status = "❌ Χρεωστικό"
            else:
                status = "⚖️  Μηδενικό"
            
            print(f"  - {apartment.number}: {balance:.2f}€ ({status})")
        
        print(f"\n📊 ΣΥΝΟΛΙΚΟ ΥΠΟΛΟΙΠΟ: {total_balance:.2f}€")
        
        if total_balance == Decimal('0.00'):
            print("✅ Το συνολικό υπόλοιπο είναι σωστό (0.00€)")
        else:
            print(f"⚠️  Το συνολικό υπόλοιπο δεν είναι μηδενικό: {total_balance:.2f}€")

if __name__ == "__main__":
    create_expenses_and_charges()
    verify_expenses_and_charges()

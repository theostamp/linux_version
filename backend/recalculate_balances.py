import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.utils import timezone
from financial.models import Transaction
from apartments.models import Apartment
from buildings.models import Building

def recalculate_balances():
    """Επαναυπολογισμός υπολοίπων από συναλλαγές"""
    
    print("🔄 ΕΠΑΝΑΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ ΑΠΟ ΣΥΝΑΛΛΑΓΕΣ")
    print("=" * 50)
    
    with schema_context('demo'):
        # Έλεγχος συναλλαγών
        transactions = Transaction.objects.all().order_by('date', 'created_at')
        print(f"📊 Βρέθηκαν {transactions.count()} συναλλαγές")
        
        if transactions.count() == 0:
            print("❌ Δεν βρέθηκαν συναλλαγές για επαναυπολογισμό.")
            return
        
        # Λήψη διαμερισμάτων
        apartments = Apartment.objects.all()
        print(f"🏢 Βρέθηκαν {apartments.count()} διαμερίσματα")
        
        # Αρχικοποίηση μετρητών
        updated_count = 0
        error_count = 0
        
        print("\n🔄 ΕΠΑΝΑΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ:")
        print("-" * 40)
        
        for apartment in apartments:
            try:
                # Λήψη συναλλαγών για το διαμέρισμα
                apartment_transactions = transactions.filter(apartment=apartment).order_by('date', 'created_at')
                
                if apartment_transactions.count() == 0:
                    print(f"⏭️  Διαμέρισμα {apartment.number}: Δεν έχει συναλλαγές")
                    continue
                
                # Αρχικοποίηση υπολοίπου
                calculated_balance = Decimal('0.00')
                
                # Υπολογισμός υπολοίπου από συναλλαγές
                for transaction in apartment_transactions:
                    calculated_balance += transaction.amount
                
                # Έλεγχος αν το υπολογισμένο υπόλοιπο διαφέρει από το τρέχον
                current_balance = apartment.current_balance
                difference = calculated_balance - current_balance
                
                if abs(difference) > Decimal('0.01'):  # Ανοχή 1 λεπτού
                    print(f"🔄 Διαμέρισμα {apartment.number}:")
                    print(f"   - Τρέχον υπόλοιπο: {current_balance:.2f}€")
                    print(f"   - Υπολογισμένο: {calculated_balance:.2f}€")
                    print(f"   - Διαφορά: {difference:.2f}€")
                    
                    # Ενημέρωση υπολοίπου
                    apartment.current_balance = calculated_balance
                    apartment.save()
                    
                    print(f"   ✅ Ενημερώθηκε σε: {calculated_balance:.2f}€")
                    updated_count += 1
                else:
                    print(f"✅ Διαμέρισμα {apartment.number}: Υπόλοιπο σωστό ({calculated_balance:.2f}€)")
                
            except Exception as e:
                error_count += 1
                print(f"❌ Σφάλμα στο διαμέρισμα {apartment.number}: {str(e)}")
        
        # Σύνοψη
        print("\n📋 ΣΥΝΟΨΗ ΕΠΑΝΑΥΠΟΛΟΓΙΣΜΟΥ:")
        print("-" * 30)
        print(f"✅ Ενημερώθηκαν: {updated_count} διαμερίσματα")
        print(f"❌ Σφάλματα: {error_count}")
        print(f"📊 Συνολικά διαμερίσματα: {apartments.count()}")
        
        if updated_count > 0:
            print(f"\n🎉 Επιτυχής επαναυπολογισμός {updated_count} υπολοίπων!")
        else:
            print("\n✅ Όλα τα υπόλοιπα είναι ήδη σωστά!")

def verify_balance_calculation():
    """Έλεγχος της ακρίβειας των υπολογισμών"""
    
    print("\n🔍 ΕΛΕΓΧΟΣ ΑΚΡΙΒΕΙΑΣ ΥΠΟΛΟΓΙΣΜΩΝ:")
    print("=" * 50)
    
    with schema_context('demo'):
        transactions = Transaction.objects.all()
        apartments = Apartment.objects.all()
        
        print(f"📊 Συναλλαγές: {transactions.count()}")
        print(f"🏢 Διαμερίσματα: {apartments.count()}")
        
        # Έλεγχος ανά διαμέρισμα
        print("\n🏢 ΕΛΕΓΧΟΣ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        print("-" * 30)
        
        total_calculated = Decimal('0.00')
        total_current = Decimal('0.00')
        
        for apartment in apartments:
            apartment_transactions = transactions.filter(apartment=apartment)
            calculated_balance = sum(t.amount for t in apartment_transactions)
            current_balance = apartment.current_balance
            
            total_calculated += calculated_balance
            total_current += current_balance
            
            print(f"Διαμέρισμα {apartment.number}:")
            print(f"  - Συναλλαγές: {apartment_transactions.count()}")
            print(f"  - Υπολογισμένο: {calculated_balance:.2f}€")
            print(f"  - Τρέχον: {current_balance:.2f}€")
            
            if abs(calculated_balance - current_balance) <= Decimal('0.01'):
                print(f"  ✅ Σωστό")
            else:
                print(f"  ❌ Διαφορά: {calculated_balance - current_balance:.2f}€")
            print()
        
        # Συνολικός έλεγχος
        print("📊 ΣΥΝΟΛΙΚΟΣ ΕΛΕΓΧΟΣ:")
        print("-" * 25)
        print(f"Συνολικό υπολογισμένο: {total_calculated:.2f}€")
        print(f"Συνολικό τρέχον: {total_current:.2f}€")
        print(f"Διαφορά: {total_calculated - total_current:.2f}€")
        
        if abs(total_calculated - total_current) <= Decimal('0.01'):
            print("✅ Όλα τα υπόλοιπα είναι σωστά!")
        else:
            print("❌ Υπάρχουν διαφορές στα υπόλοιπα.")

def test_balance_transfer():
    """Έλεγχος μεταφοράς υπολοίπων μεταξύ μηνών"""
    
    print("\n🔄 ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ:")
    print("=" * 50)
    
    with schema_context('demo'):
        # Λήψη διαμερισμάτων με συναλλαγές
        apartments_with_transactions = Apartment.objects.filter(transactions__isnull=False).distinct()
        
        print(f"📊 Διαμερίσματα με συναλλαγές: {apartments_with_transactions.count()}")
        
        for apartment in apartments_with_transactions:
            # Λήψη συναλλαγών ανά μήνα
            transactions = apartment.transactions.all().order_by('date')
            
            if transactions.count() == 0:
                continue
            
            print(f"\n🏢 Διαμέρισμα {apartment.number}:")
            
            # Ομαδοποίηση ανά μήνα
            monthly_balances = {}
            for transaction in transactions:
                month_key = transaction.date.strftime('%Y-%m')
                if month_key not in monthly_balances:
                    monthly_balances[month_key] = Decimal('0.00')
                monthly_balances[month_key] += transaction.amount
            
            # Εμφάνιση ανά μήνα
            for month, balance in sorted(monthly_balances.items()):
                print(f"  - {month}: {balance:.2f}€")
            
            print(f"  - Τρέχον υπόλοιπο: {apartment.current_balance:.2f}€")

if __name__ == "__main__":
    recalculate_balances()
    verify_balance_calculation()
    test_balance_transfer()

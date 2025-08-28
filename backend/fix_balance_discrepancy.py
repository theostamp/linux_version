#!/usr/bin/env python3
"""
🔧 ΔΙΟΡΘΩΣΗ ΔΙΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ - New Concierge

Στόχος: Διόρθωση της διαφοράς 1,800.00€ μεταξύ transactions και apartment balances
Προτεραιότητα: ΚΡΙΣΙΜΗ - Ακρίβεια οικονομικών δεδομένων

Αυτό το script:
1. Εντοπίζει τη διαφορά υπολοίπων
2. Επαναυπολογίζει τα balances από transactions
3. Διορθώνει τα apartment balances
4. Επιβεβαιώνει τη διόρθωση
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime
from django.db.models import Sum

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment, Apartment
from buildings.models import Building

def print_header(title):
    """Εκτυπώνει επικεφαλίδα με διαχωριστικά"""
    print("\n" + "="*80)
    print(f"🔧 {title}")
    print("="*80)

def print_section(title):
    """Εκτυπώνει τμήμα με διαχωριστικά"""
    print(f"\n📋 {title}")
    print("-" * 60)

def format_currency(amount):
    """Μορφοποίηση ποσού σε ευρώ"""
    return f"{float(amount):,.2f}€"

class BalanceDiscrepancyFixer:
    """Κλάση για τη διόρθωση της διαφοράς υπολοίπων"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        
        print_header(f"ΔΙΟΡΘΩΣΗ ΔΙΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ - {self.building.name}")
        print(f"🏢 Κτίριο: {self.building.name}")
        print(f"📍 Διεύθυνση: {self.building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {self.apartments.count()}")
        print(f"📅 Ημερομηνία διόρθωσης: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    def analyze_discrepancy(self):
        """Ανάλυση της διαφοράς υπολοίπων"""
        print_section("🔍 ΑΝΑΛΥΣΗ ΔΙΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        
        # Υπολογισμός συνολικού υπολοίπου από transactions
        transactions = Transaction.objects.filter(building_id=self.building_id)
        total_balance_from_transactions = transactions.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Υπολογισμός συνολικού υπολοίπου από διαμερίσματα
        total_balance_from_apartments = sum(
            apt.current_balance or Decimal('0.00') for apt in self.apartments
        )
        
        print(f"📊 Υπόλοιπο από συναλλαγές: {format_currency(total_balance_from_transactions)}")
        print(f"📊 Υπόλοιπο από διαμερίσματα: {format_currency(total_balance_from_apartments)}")
        
        # Υπολογισμός διαφοράς
        discrepancy = total_balance_from_apartments - total_balance_from_transactions
        print(f"⚠️  Διαφορά: {format_currency(discrepancy)}")
        
        if abs(discrepancy) > Decimal('0.01'):
            print(f"❌ ΠΡΟΒΛΗΜΑ: Υπάρχει διαφορά υπολοίπων!")
            return True, discrepancy
        else:
            print(f"✅ Δεν υπάρχει διαφορά υπολοίπων")
            return False, Decimal('0.00')
    
    def analyze_apartment_balances(self):
        """Ανάλυση υπολοίπων ανά διαμέρισμα"""
        print_section("🏠 ΑΝΑΛΥΣΗ ΥΠΟΛΟΙΠΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        
        apartment_issues = []
        
        for apt in self.apartments:
            # Υπολογισμός υπολοίπου από συναλλαγές
            apt_transactions = Transaction.objects.filter(apartment=apt)
            calculated_balance = apt_transactions.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            # Τρέχον υπόλοιπο
            current_balance = apt.current_balance or Decimal('0.00')
            
            # Υπολογισμός διαφοράς
            difference = current_balance - calculated_balance
            
            print(f"🏠 {apt.number}:")
            print(f"   📊 Τρέχον: {format_currency(current_balance)}")
            print(f"   🔄 Υπολογισμένο: {format_currency(calculated_balance)}")
            print(f"   ⚠️  Διαφορά: {format_currency(difference)}")
            
            if abs(difference) > Decimal('0.01'):
                apartment_issues.append({
                    'apartment': apt,
                    'current_balance': current_balance,
                    'calculated_balance': calculated_balance,
                    'difference': difference
                })
                print(f"   ❌ ΧΡΕΙΑΖΕΤΑΙ ΔΙΟΡΘΩΣΗ")
            else:
                print(f"   ✅ ΣΩΣΤΟ")
        
        return apartment_issues
    
    def fix_apartment_balances(self, apartment_issues):
        """Διόρθωση υπολοίπων διαμερισμάτων"""
        print_section("🔧 ΔΙΟΡΘΩΣΗ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        
        if not apartment_issues:
            print("✅ Δεν χρειάζεται διόρθωση")
            return
        
        print(f"🔧 Θα διορθωθούν {len(apartment_issues)} διαμερίσματα")
        
        for issue in apartment_issues:
            apt = issue['apartment']
            old_balance = issue['current_balance']
            new_balance = issue['calculated_balance']
            
            print(f"🏠 Διόρθωση {apt.number}:")
            print(f"   📊 Παλιό: {format_currency(old_balance)}")
            print(f"   📊 Νέο: {format_currency(new_balance)}")
            print(f"   🔄 Διαφορά: {format_currency(issue['difference'])}")
            
            # Ενημέρωση υπολοίπου
            apt.current_balance = new_balance
            apt.save()
            
            print(f"   ✅ ΔΙΟΡΘΩΘΗΚΕ")
    
    def verify_fix(self):
        """Επιβεβαίωση της διόρθωσης"""
        print_section("✅ ΕΠΙΒΕΒΑΙΩΣΗ ΔΙΟΡΘΩΣΗΣ")
        
        # Επαναληπτική ανάλυση διαφοράς
        has_discrepancy, discrepancy = self.analyze_discrepancy()
        
        if not has_discrepancy:
            print("✅ Η διόρθωση ήταν επιτυχής!")
            print("✅ Όλα τα υπολοίπα είναι συνεπή")
            return True
        else:
            print(f"❌ Η διόρθωση απέτυχε!")
            print(f"❌ Παραμένει διαφορά: {format_currency(discrepancy)}")
            return False
    
    def generate_fix_report(self):
        """Δημιουργία αναφοράς διόρθωσης"""
        print_section("📊 ΑΝΑΦΟΡΑ ΔΙΟΡΘΩΣΗΣ")
        
        # Στατιστικά πριν τη διόρθωση
        print("📈 ΣΤΑΤΙΣΤΙΚΑ ΠΡΙΝ ΤΗ ΔΙΟΡΘΩΣΗ:")
        
        transactions = Transaction.objects.filter(building_id=self.building_id)
        total_transactions = transactions.count()
        total_transaction_amount = transactions.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        print(f"   📊 Συνολικές συναλλαγές: {total_transactions}")
        print(f"   💰 Συνολικό ποσό συναλλαγών: {format_currency(total_transaction_amount)}")
        
        # Στατιστικά μετά τη διόρθωση
        print("\n📈 ΣΤΑΤΙΣΤΙΚΑ ΜΕΤΑ ΤΗ ΔΙΟΡΘΩΣΗ:")
        
        total_apartment_balance = sum(
            apt.current_balance or Decimal('0.00') for apt in self.apartments
        )
        
        print(f"   💰 Συνολικό υπόλοιπο διαμερισμάτων: {format_currency(total_apartment_balance)}")
        
        # Έλεγχος συνέπειας
        balance_difference = abs(total_transaction_amount - total_apartment_balance)
        if balance_difference < Decimal('0.01'):
            print(f"   ✅ Υπολοίπα συνεπή (διαφορά < 0.01€)")
        else:
            print(f"   ❌ Υπολοίπα μη συνεπή (διαφορά: {format_currency(balance_difference)})")
    
    def run_complete_fix(self):
        """Εκτέλεση πλήρους διόρθωσης"""
        print_header("🚀 ΕΝΑΡΞΗ ΔΙΟΡΘΩΣΗΣ")
        
        try:
            # 1. Ανάλυση διαφοράς
            has_discrepancy, discrepancy = self.analyze_discrepancy()
            
            if not has_discrepancy:
                print("✅ Δεν χρειάζεται διόρθωση")
                return True
            
            # 2. Ανάλυση ανά διαμέρισμα
            apartment_issues = self.analyze_apartment_balances()
            
            # 3. Διόρθωση υπολοίπων
            self.fix_apartment_balances(apartment_issues)
            
            # 4. Επιβεβαίωση διόρθωσης
            fix_successful = self.verify_fix()
            
            # 5. Αναφορά διόρθωσης
            self.generate_fix_report()
            
            if fix_successful:
                print_header("✅ ΔΙΟΡΘΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ")
                print("🎯 Όλα τα υπολοίπα είναι τώρα συνεπή!")
                print("📊 Η οικονομική αρχιτεκτονική είναι πλήρως επαληθεύσιμη!")
            else:
                print_header("❌ ΔΙΟΡΘΩΣΗ ΑΠΕΤΥΧΕ")
                print("⚠️  Χρειάζεται περαιτέρω έρευνα")
            
            return fix_successful
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά τη διόρθωση: {str(e)}")
            raise

def main():
    """Κύρια συνάρτηση"""
    print_header("🔧 ΔΙΟΡΘΩΣΗ ΔΙΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ - New Concierge")
    
    # Εκτέλεση διόρθωσης για το demo building
    with schema_context('demo'):
        fixer = BalanceDiscrepancyFixer(building_id=1)  # Αραχώβης 12
        success = fixer.run_complete_fix()
        
        if success:
            print("\n🎯 Η οικονομική αρχιτεκτονική είναι τώρα πλήρως σωστή!")
        else:
            print("\n⚠️  Χρειάζεται περαιτέρω έρευνα για τη διόρθωση")

if __name__ == "__main__":
    main()



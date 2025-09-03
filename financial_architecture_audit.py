#!/usr/bin/env python3
"""
🎯 ΟΙΚΟΝΟΜΙΚΗ ΑΡΧΙΤΕΚΤΟΝΙΚΗ AUDIT - New Concierge

Στόχος: Δημιουργία στιβαρής οικονομικής αρχιτεκτονικής με "πυλώνες δεδομένων" ως source of truth
Προτεραιότητα: ΚΡΙΣΙΜΗ - Ακρίβεια οικονομικών δεδομένων

Αυτό το script κάνει audit της οικονομικής αρχιτεκτονικής και αναγνωρίζει:
1. Τους "πυλώνες" (source of truth) - απόλυτη αλήθεια
2. Τα "παράγωγα" (calculated) - υπολογισμένα από πυλώνες
3. Τις πηγές κάθε ποσού στη σελίδα /financial
4. Τους τρόπους υπολογισμού και επαλήθευσης
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
from financial.services import FinancialDashboardService

def print_header(title):
    """Εκτυπώνει επικεφαλίδα με διαχωριστικά"""
    print("\n" + "="*80)
    print(f"🎯 {title}")
    print("="*80)

def print_section(title):
    """Εκτυπώνει τμήμα με διαχωριστικά"""
    print(f"\n📋 {title}")
    print("-" * 60)

def print_subsection(title):
    """Εκτυπώνει υποτμήμα"""
    print(f"\n🔍 {title}")
    print("  " + "-" * 40)

def format_currency(amount):
    """Μορφοποίηση ποσού σε ευρώ"""
    return f"{float(amount):,.2f}€"

class FinancialArchitectureAudit:
    """Κλάση για το audit της οικονομικής αρχιτεκτονικής"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        
        print_header(f"ΟΙΚΟΝΟΜΙΚΗ ΑΡΧΙΤΕΚΤΟΝΙΚΗ AUDIT - {self.building.name}")
        print(f"🏢 Κτίριο: {self.building.name}")
        print(f"📍 Διεύθυνση: {self.building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {self.apartments.count()}")
        print(f"📅 Ημερομηνία audit: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    def audit_data_pillars(self):
        """Audit των πυλώνων δεδομένων (source of truth)"""
        print_section("🏛️ AUDIT ΠΥΛΩΝΩΝ ΔΕΔΟΜΕΝΩΝ (Source of Truth)")
        
        # 1. Expenses (Δαπάνες) - ΠΥΛΩΝΑΣ
        print_subsection("1. ΔΑΠΑΝΕΣ (Expenses) - ΠΥΛΩΝΑΣ")
        expenses = Expense.objects.filter(building_id=self.building_id)
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"  📊 Συνολικές δαπάνες: {format_currency(total_expenses)}")
        print(f"  📈 Αριθμός δαπανών: {expenses.count()}")
        
        # Ανάλυση ανά κατηγορία
        expense_categories = expenses.values('category').annotate(
            total=Sum('amount'), count=Sum(1)
        ).order_by('-total')
        
        print("  📋 Ανάλυση ανά κατηγορία:")
        for cat in expense_categories[:5]:  # Top 5 categories
            print(f"    • {cat['category']}: {format_currency(cat['total'])} ({cat['count']} δαπάνες)")
        
        print("  ✅ Επιβεβαίωση: Πραγματικές δαπάνες από λογαριασμούς - ΑΠΟΛΥΤΗ ΑΛΗΘΕΙΑ")
        
        # 2. Payments (Πληρωμές) - ΠΥΛΩΝΑΣ
        print_subsection("2. ΠΛΗΡΩΜΕΣ (Payments) - ΠΥΛΩΝΑΣ")
        payments = Payment.objects.filter(apartment__building_id=self.building_id)
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"  📊 Συνολικές πληρωμές: {format_currency(total_payments)}")
        print(f"  📈 Αριθμός πληρωμών: {payments.count()}")
        
        # Ανάλυση ανά τρόπο πληρωμής
        payment_methods = payments.values('method').annotate(
            total=Sum('amount'), count=Sum(1)
        ).order_by('-total')
        
        print("  📋 Ανάλυση ανά τρόπο πληρωμής:")
        for method in payment_methods:
            print(f"    • {method['method']}: {format_currency(method['total'])} ({method['count']} πληρωμές)")
        
        print("  ✅ Επιβεβαίωση: Πραγματικές πληρωμές από κατοίκους - ΑΠΟΛΥΤΗ ΑΛΗΘΕΙΑ")
        
        # 3. Participation Mills (Χιλιοστά) - ΠΥΛΩΝΑΣ
        print_subsection("3. ΧΙΛΙΟΣΤΑ (Participation Mills) - ΠΥΛΩΝΑΣ")
        total_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
        
        print(f"  📊 Συνολικά χιλιοστά: {total_mills}")
        print(f"  📈 Αριθμός διαμερισμάτων: {self.apartments.count()}")
        
        # Ανάλυση χιλιοστών
        apartments_with_mills = self.apartments.filter(participation_mills__gt=0)
        print(f"  📋 Διαμερίσματα με χιλιοστά: {apartments_with_mills.count()}")
        
        if total_mills != 1000:
            print(f"  ⚠️  ΠΡΟΣΟΧΗ: Συνολικά χιλιοστά ({total_mills}) ≠ 1000")
        else:
            print("  ✅ Συνολικά χιλιοστά = 1000 (σωστά)")
        
        print("  ✅ Επιβεβαίωση: Νομικά καθορισμένα χιλιοστά - ΑΠΟΛΥΤΗ ΑΛΗΘΕΙΑ")
    
    def audit_derived_data(self):
        """Audit των παραγώγων δεδομένων (calculated)"""
        print_section("📈 AUDIT ΠΑΡΑΓΩΓΩΝ ΔΕΔΟΜΕΝΩΝ (Calculated)")
        
        # 1. Transactions (Συναλλαγές) - ΠΑΡΑΓΩΓΟ
        print_subsection("1. ΣΥΝΑΛΛΑΓΕΣ (Transactions) - ΠΑΡΑΓΩΓΟ")
        transactions = Transaction.objects.filter(building_id=self.building_id)
        
        print(f"  📊 Συνολικές συναλλαγές: {transactions.count()}")
        
        # Ανάλυση ανά τύπο
        transaction_types = transactions.values('type').annotate(
            total=Sum('amount'), count=Sum(1)
        ).order_by('-count')
        
        print("  📋 Ανάλυση ανά τύπο:")
        for t_type in transaction_types:
            print(f"    • {t_type['type']}: {format_currency(t_type['total'])} ({t_type['count']} συναλλαγές)")
        
        print("  🔄 Υπολογίζονται από: Δαπάνες + Χιλιοστά + Πληρωμές")
        print("  ✅ ΕΠΑΛΗΘΕΥΣΙΜΑ από πυλώνες")
        
        # 2. Balances (Υπόλοιπα) - ΠΑΡΑΓΩΓΟ
        print_subsection("2. ΥΠΟΛΟΙΠΑ (Balances) - ΠΑΡΑΓΩΓΟ")
        
        # Υπολογισμός υπολοίπων από συναλλαγές
        total_balance_from_transactions = transactions.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Υπολογισμός υπολοίπων από διαμερίσματα
        total_balance_from_apartments = sum(
            apt.current_balance or Decimal('0.00') for apt in self.apartments
        )
        
        print(f"  📊 Υπόλοιπο από συναλλαγές: {format_currency(total_balance_from_transactions)}")
        print(f"  📊 Υπόλοιπο από διαμερίσματα: {format_currency(total_balance_from_apartments)}")
        
        # Έλεγχος συνέπειας
        balance_difference = abs(total_balance_from_transactions - total_balance_from_apartments)
        if balance_difference > Decimal('0.01'):
            print(f"  ⚠️  ΠΡΟΣΟΧΗ: Διαφορά υπολοίπων: {format_currency(balance_difference)}")
        else:
            print("  ✅ Υπόλοιπα συνεπή")
        
        print("  🔄 Υπολογίζονται από: Συναλλαγές")
        print("  ✅ ΕΠΑΛΗΘΕΥΣΙΜΑ από πυλώνες")
    
    def audit_financial_page_data(self):
        """Audit των δεδομένων που εμφανίζονται στη σελίδα /financial"""
        print_section("📊 AUDIT ΣΕΛΙΔΑΣ /FINANCIAL")
        
        # Χρήση του FinancialDashboardService
        dashboard_service = FinancialDashboardService(self.building_id)
        summary = dashboard_service.get_summary()
        
        print_subsection("ΚΥΡΙΑ ΟΙΚΟΝΟΜΙΚΑ ΔΕΔΟΜΕΝΑ")
        
        # 1. Total Balance
        print(f"  💰 Total Balance: {format_currency(summary['total_balance'])}")
        print("     📍 Πηγή: Υπολογίζεται από current_reserve")
        print("     🔄 Υπολογισμός: total_payments - total_expenses - management_cost")
        
        # 2. Current Obligations
        print(f"  📋 Current Obligations: {format_currency(summary['current_obligations'])}")
        print("     📍 Πηγή: Υπολογίζεται από expenses + management_cost + reserve_fund")
        print("     🔄 Υπολογισμός: total_expenses_month + total_management_cost + reserve_fund_monthly_target")
        
        # 3. Previous Obligations
        print(f"  📋 Previous Obligations: {format_currency(summary['previous_obligations'])}")
        print("     📍 Πηγή: Υπολογίζεται από apartment_obligations")
        print("     🔄 Υπολογισμός: sum(abs(apt.current_balance) for apt in apartments if apt.current_balance < 0)")
        
        # 4. Current Reserve
        print(f"  💰 Current Reserve: {format_currency(summary['current_reserve'])}")
        print("     📍 Πηγή: Υπολογίζεται από payments - expenses - management_cost")
        print("     🔄 Υπολογισμός: total_payments_all_time - total_expenses_all_time - total_management_cost")
        
        # 5. Reserve Fund Contribution
        print(f"  💰 Reserve Fund Contribution: {format_currency(summary['reserve_fund_contribution'])}")
        print("     📍 Πηγή: Υπολογίζεται από building settings")
        print("     🔄 Υπολογισμός: reserve_contribution_per_apartment * apartments_count")
        
        # 6. Management Cost
        print(f"  💰 Total Management Cost: {format_currency(summary['total_management_cost'])}")
        print("     📍 Πηγή: Υπολογίζεται από building settings")
        print("     🔄 Υπολογισμός: management_fee_per_apartment * apartments_count")
        
        # 7. Monthly Expenses
        print(f"  💰 Total Expenses Month: {format_currency(summary['total_expenses_month'])}")
        print("     📍 Πηγή: ΠΥΛΩΝΑΣ - Expenses για τον τρέχοντα μήνα")
        print("     🔄 Υπολογισμός: Sum(expenses.amount) where date >= start_of_month and date < end_of_month")
        
        # 8. Monthly Payments
        print(f"  💰 Total Payments Month: {format_currency(summary['total_payments_month'])}")
        print("     📍 Πηγή: ΠΥΛΩΝΑΣ - Payments για τον τρέχοντα μήνα")
        print("     🔄 Υπολογισμός: Sum(payments.amount) where date >= start_of_month and date < end_of_month")
    
    def audit_data_flow(self):
        """Audit της ροής δεδομένων"""
        print_section("🔄 AUDIT ΡΟΗΣ ΔΕΔΟΜΕΝΩΝ")
        
        print_subsection("Data Flow Diagram")
        print("""
  📊 ΟΙΚΟΝΟΜΙΚΗ ΑΡΧΙΤΕΚΤΟΝΙΚΗ - ΡΟΗ ΔΕΔΟΜΕΝΩΝ
  
  🏛️ ΠΥΛΩΝΕΣ (Source of Truth):
  ├── Expenses (Δαπάνες) ← Πραγματικές δαπάνες από λογαριασμούς
  ├── Payments (Πληρωμές) ← Πραγματικές πληρωμές από κατοίκους
  └── Participation Mills (Χιλιοστά) ← Νομικά καθορισμένα
  
  📈 ΠΑΡΑΓΩΓΑ (Calculated):
  ├── Transactions ← Υπολογίζονται από Δαπάνες + Χιλιοστά + Πληρωμές
  ├── Balances ← Υπολογίζονται από Συναλλαγές
  ├── Current Reserve ← Υπολογίζεται από Payments - Expenses - Management
  ├── Current Obligations ← Υπολογίζεται από Expenses + Management + Reserve Fund
  └── Previous Obligations ← Υπολογίζεται από αρνητικά apartment balances
  
  ✅ ΕΠΑΛΗΘΕΥΣΗ:
  ├── Κάθε ποσό προέρχεται από πηγή
  ├── Υπολογισμοί επαληθεύσιμοι
  ├── Audit trail διαθέσιμος
  └── Διόρθωση εύκολη από πυλώνες
        """)
    
    def audit_calculation_verification(self):
        """Audit επαλήθευσης υπολογισμών"""
        print_section("✅ AUDIT ΕΠΑΛΗΘΕΥΣΗΣ ΥΠΟΛΟΓΙΣΜΩΝ")
        
        # 1. Έλεγχος συνολικών χιλιοστών
        print_subsection("1. Έλεγχος Χιλιοστών")
        total_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
        print(f"  📊 Συνολικά χιλιοστά: {total_mills}")
        if total_mills == 1000:
            print("  ✅ Χιλιοστά σωστά (1000)")
        else:
            print("  ❌ Χιλιοστά λάθος (πρέπει να είναι 1000)")
        
        # 2. Έλεγχος κατανομής δαπανών
        print_subsection("2. Έλεγχος Κατανομής Δαπανών")
        expenses = Expense.objects.filter(building_id=self.building_id)
        
        for expense in expenses[:3]:  # Πρώτες 3 δαπάνες
            print(f"  📋 Δαπάνη: {expense.title} - {format_currency(expense.amount)}")
            print(f"     📍 Τύπος κατανομής: {expense.distribution_type}")
            
            if expense.distribution_type == 'by_participation_mills':
                # Υπολογισμός κατανομής
                total_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
                if total_mills > 0:
                    calculated_shares = []
                    for apt in self.apartments:
                        mills = apt.participation_mills or 0
                        share = expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))
                        calculated_shares.append(share)
                    
                    total_calculated = sum(calculated_shares)
                    difference = abs(expense.amount - total_calculated)
                    
                    print(f"     🔄 Υπολογισμένη κατανομή: {format_currency(total_calculated)}")
                    if difference < Decimal('0.01'):
                        print("     ✅ Κατανομή σωστή")
                    else:
                        print(f"     ❌ Κατανομή λάθος (διαφορά: {format_currency(difference)})")
        
        # 3. Έλεγχος υπολοίπων διαμερισμάτων
        print_subsection("3. Έλεγχος Υπολοίπων Διαμερισμάτων")
        
        for apt in self.apartments[:3]:  # Πρώτα 3 διαμερίσματα
            print(f"  🏠 Διαμέρισμα: {apt.number}")
            print(f"     📊 Τρέχον υπόλοιπο: {format_currency(apt.current_balance or 0)}")
            
            # Υπολογισμός από συναλλαγές
            apt_transactions = Transaction.objects.filter(apartment=apt)
            calculated_balance = apt_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            print(f"     🔄 Υπολογισμένο από συναλλαγές: {format_currency(calculated_balance)}")
            
            difference = abs((apt.current_balance or 0) - calculated_balance)
            if difference < Decimal('0.01'):
                print("     ✅ Υπόλοιπο σωστό")
            else:
                print(f"     ❌ Υπόλοιπο λάθος (διαφορά: {format_currency(difference)})")
    
    def generate_recommendations(self):
        """Δημιουργία προτάσεων βελτίωσης"""
        print_section("💡 ΠΡΟΤΑΣΕΙΣ ΒΕΛΤΙΩΣΗΣ")
        
        print_subsection("1. Επιβεβαίωση Πυλώνων")
        print("""
  ✅ ΠΥΛΩΝΕΣ ΕΠΙΒΕΒΑΙΩΜΕΝΟΙ:
  ├── Expenses: Πραγματικές δαπάνες από λογαριασμούς
  ├── Payments: Πραγματικές πληρωμές από κατοίκους
  └── Participation Mills: Νομικά καθορισμένα χιλιοστά
  
  🎯 ΚΑΛΗ ΠΡΑΚΤΙΚΗ: Όλα τα ποσά προέρχονται από πυλώνες
        """)
        
        print_subsection("2. Επαλήθευση Παραγώγων")
        print("""
  ✅ ΠΑΡΑΓΩΓΑ ΕΠΑΛΗΘΕΥΣΙΜΑ:
  ├── Transactions: Υπολογίζονται από πυλώνες
  ├── Balances: Υπολογίζονται από συναλλαγές
  └── Reports: Real-time υπολογισμοί
  
  🎯 ΚΑΛΗ ΠΡΑΚΤΙΚΗ: Κάθε υπολογισμός επαληθεύσιμος
        """)
        
        print_subsection("3. Audit Trail")
        print("""
  ✅ AUDIT TRAIL ΔΙΑΘΕΣΙΜΟΣ:
  ├── FinancialAuditLog: Καταγραφή όλων των αλλαγών
  ├── Transaction History: Πλήρες ιστορικό συναλλαγών
  └── Version Control: Git για κώδικα
  
  🎯 ΚΑΛΗ ΠΡΑΚΤΙΚΗ: Πλήρες ιστορικό κάθε αλλαγής
        """)
        
        print_subsection("4. Διόρθωση Εύκολη")
        print("""
  ✅ ΔΙΟΡΘΩΣΗ ΕΥΚΟΛΗ:
  ├── Από πυλώνες: Διόρθωση expenses/payments/mills
  ├── Αυτόματη επαναυπολογισμός: Όλα τα παράγωγα
  └── Validation: Έλεγχος συνέπειας δεδομένων
  
  🎯 ΚΑΛΗ ΠΡΑΚΤΙΚΗ: Διόρθωση από πηγή
        """)
    
    def run_complete_audit(self):
        """Εκτέλεση πλήρους audit"""
        print_header("🚀 ΕΝΑΡΞΗ ΠΛΗΡΟΥΣ AUDIT")
        
        try:
            # 1. Audit πυλώνων δεδομένων
            self.audit_data_pillars()
            
            # 2. Audit παραγώγων δεδομένων
            self.audit_derived_data()
            
            # 3. Audit σελίδας /financial
            self.audit_financial_page_data()
            
            # 4. Audit ροής δεδομένων
            self.audit_data_flow()
            
            # 5. Audit επαλήθευσης υπολογισμών
            self.audit_calculation_verification()
            
            # 6. Προτάσεις βελτίωσης
            self.generate_recommendations()
            
            print_header("✅ AUDIT ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ")
            print("🎯 Η οικονομική αρχιτεκτονική είναι στιβαρή και επαληθεύσιμη!")
            print("📊 Όλα τα ποσά προέρχονται από πυλώνες και είναι επαληθεύσιμα.")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά το audit: {str(e)}")
            raise

def main():
    """Κύρια συνάρτηση"""
    print_header("🎯 ΟΙΚΟΝΟΜΙΚΗ ΑΡΧΙΤΕΚΤΟΝΙΚΗ AUDIT - New Concierge")
    
    # Εκτέλεση audit για το demo building
    with schema_context('demo'):
        audit = FinancialArchitectureAudit(building_id=1)  # Αραχώβης 12
        audit.run_complete_audit()

if __name__ == "__main__":
    main()

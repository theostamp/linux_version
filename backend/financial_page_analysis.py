#!/usr/bin/env python3
"""
🔍 ΑΝΑΛΥΣΗ ΣΕΛΙΔΑΣ /FINANCIAL - New Concierge

Στόχος: Σάρωση και ανάλυση κάθε tab της σελίδας /financial
Προτεραιότητα: Βελτίωση κατανοητότητας οικονομικών στοιχείων

Αυτό το script:
1. Αναλύει κάθε tab της σελίδας /financial
2. Εντοπίζει οικονομικά στοιχεία που χρειάζονται βελτίωση
3. Προτείνει πιο κατανοητούς όρους
4. Ακολουθεί τη ροή του χρήματος
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime
from django.db.models import Sum, Q

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment, Apartment
from buildings.models import Building
from financial.services import FinancialDashboardService, CommonExpenseCalculator

def print_header(title):
    """Εκτυπώνει επικεφαλίδα με διαχωριστικά"""
    print("\n" + "="*80)
    print(f"🔍 {title}")
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

class FinancialPageAnalyzer:
    """Κλάση για την ανάλυση της σελίδας /financial"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        
        print_header(f"ΑΝΑΛΥΣΗ ΣΕΛΙΔΑΣ /FINANCIAL - {self.building.name}")
        print(f"🏢 Κτίριο: {self.building.name}")
        print(f"📍 Διεύθυνση: {self.building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {self.apartments.count()}")
        print(f"📅 Ημερομηνία ανάλυσης: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    def analyze_building_overview(self):
        """Ανάλυση του Building Overview Section"""
        print_section("🏛️ BUILDING OVERVIEW SECTION")
        
        # Χρήση του FinancialDashboardService
        dashboard_service = FinancialDashboardService(self.building_id)
        summary = dashboard_service.get_summary()
        
        print_subsection("1. ΟΙΚΟΝΟΜΙΚΕΣ ΥΠΟΧΡΕΩΣΕΙΣ ΠΕΡΙΟΔΟΥ")
        
        # Πραγματικά έξοδα
        real_expenses = summary.get('total_expenses_month', 0)
        print(f"  📊 Πραγματικά έξοδα: {format_currency(real_expenses)}")
        print(f"     🔍 ΠΡΟΒΛΗΜΑ: Ο όρος 'Πραγματικά έξοδα' μπορεί να προκαλέσει σύγχυση")
        print(f"     💡 ΠΡΟΤΑΣΗ: 'Δαπάνες του μήνα' ή 'Μηνιαίες δαπάνες'")
        print(f"     📍 Πηγή: Expenses για τον τρέχοντα μήνα")
        
        # Κόστος διαχείρισης
        management_cost = summary.get('total_management_cost', 0)
        print(f"  📊 Κόστος διαχείρισης: {format_currency(management_cost)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Κατανοητός και σωστός")
        print(f"     📍 Πηγή: Building settings (management_fee_per_apartment)")
        
        # Εισφορά αποθεματικού
        reserve_fund = summary.get('reserve_fund_monthly_target', 0)
        print(f"  📊 Εισφορά αποθεματικού: {format_currency(reserve_fund)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Κατανοητός και σωστός")
        print(f"     📍 Πηγή: Building settings (reserve_fund_goal / duration)")
        
        # Μηνιαίες υποχρεώσεις
        total_monthly_obligations = real_expenses + management_cost + reserve_fund
        print(f"  📊 Μηνιαίες υποχρεώσεις: {format_currency(total_monthly_obligations)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Κατανοητός και σωστός")
        print(f"     📍 Πηγή: Υπολογισμός (Δαπάνες + Διαχείριση + Αποθεματικό)")
        
        print_subsection("2. ΤΡΕΧΟΝ ΥΠΟΛΟΙΠΟ")
        
        # Total Balance
        total_balance = summary.get('total_balance', 0)
        print(f"  📊 Τρέχον υπόλοιπο: {format_currency(total_balance)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Κατανοητός και σωστός")
        print(f"     📍 Πηγή: Υπολογισμός (Πληρωμές - Δαπάνες - Διαχείριση)")
        
        # Current Reserve
        current_reserve = summary.get('current_reserve', 0)
        print(f"  📊 Τρέχον ταμείο: {format_currency(current_reserve)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Κατανοητός και σωστός")
        print(f"     📍 Πηγή: Υπολογισμός (Πληρωμές - Δαπάνες - Διαχείριση)")
        
        print_subsection("3. ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ")
        
        # Previous Obligations
        previous_obligations = summary.get('previous_obligations', 0)
        print(f"  📊 Παλαιότερες οφειλές: {format_currency(previous_obligations)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Κατανοητός και σωστός")
        print(f"     📍 Πηγή: Αρνητικά apartment balances")
    
    def analyze_calculator_tab(self):
        """Ανάλυση του Calculator Tab (Κοινοχρήστων)"""
        print_section("🧮 CALCULATOR TAB - ΚΟΙΝΟΧΡΗΣΤΩΝ")
        
        print_subsection("1. ΥΠΟΛΟΓΙΣΜΟΣ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        
        # Χρήση του CommonExpenseCalculator
        calculator = CommonExpenseCalculator(self.building_id)
        shares = calculator.calculate_shares()
        
        print(f"  📊 Συνολικό ποσό κοινοχρήστων: {format_currency(sum(share.get('total_amount', 0) for share in shares.values()))}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Κοινοχρήστων' είναι κατανοητός")
        print(f"     📍 Πηγή: Υπολογισμός από δαπάνες και χιλιοστά")
        
        print_subsection("2. ΚΑΤΑΝΟΜΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        
        for apt_id, share_data in list(shares.items())[:3]:  # Πρώτα 3 διαμερίσματα
            apartment = Apartment.objects.get(id=apt_id)
            total_amount = share_data.get('total_amount', 0)
            print(f"  🏠 {apartment.number}: {format_currency(total_amount)}")
            print(f"     📍 Χιλιοστά: {apartment.participation_mills}")
            print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Κατανομή' είναι κατανοητός")
    
    def analyze_expenses_tab(self):
        """Ανάλυση του Expenses Tab"""
        print_section("💰 EXPENSES TAB - ΔΑΠΑΝΕΣ")
        
        expenses = Expense.objects.filter(building_id=self.building_id)
        
        print_subsection("1. ΛΙΣΤΑ ΔΑΠΑΝΩΝ")
        
        print(f"  📊 Συνολικές δαπάνες: {format_currency(expenses.aggregate(total=Sum('amount'))['total'] or 0)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Δαπάνες' είναι κατανοητός")
        print(f"     📍 Πηγή: ΠΥΛΩΝΑΣ - Πραγματικές δαπάνες από λογαριασμούς")
        
        print_subsection("2. ΚΑΤΗΓΟΡΙΕΣ ΔΑΠΑΝΩΝ")
        
        expense_categories = expenses.values('category').annotate(
            total=Sum('amount'), count=Sum(1)
        ).order_by('-total')
        
        for cat in expense_categories[:3]:
            print(f"  📋 {cat['category']}: {format_currency(cat['total'])} ({cat['count']} δαπάνες)")
            print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Κατηγορίες είναι κατανοητές")
    
    def analyze_payments_tab(self):
        """Ανάλυση του Payments Tab"""
        print_section("💳 PAYMENTS TAB - ΕΙΣΠΡΑΞΕΙΣ")
        
        payments = Payment.objects.filter(apartment__building_id=self.building_id)
        
        print_subsection("1. ΛΙΣΤΑ ΕΙΣΠΡΑΞΕΩΝ")
        
        print(f"  📊 Συνολικές εισπράξεις: {format_currency(payments.aggregate(total=Sum('amount'))['total'] or 0)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Εισπράξεις' είναι κατανοητός")
        print(f"     📍 Πηγή: ΠΥΛΩΝΑΣ - Πραγματικές πληρωμές από κατοίκους")
        
        print_subsection("2. ΤΡΟΠΟΙ ΠΛΗΡΩΜΗΣ")
        
        payment_methods = payments.values('method').annotate(
            total=Sum('amount'), count=Sum(1)
        ).order_by('-total')
        
        for method in payment_methods:
            print(f"  💳 {method['method']}: {format_currency(method['total'])} ({method['count']} πληρωμές)")
            print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Τρόποι πληρωμής είναι κατανοητοί")
    
    def analyze_meters_tab(self):
        """Ανάλυση του Meters Tab"""
        print_section("📊 METERS TAB - ΜΕΤΡΗΤΕΣ")
        
        from financial.models import MeterReading
        
        meter_readings = MeterReading.objects.filter(apartment__building_id=self.building_id)
        
        print_subsection("1. ΜΕΤΡΗΣΕΙΣ")
        
        print(f"  📊 Συνολικές μετρήσεις: {meter_readings.count()}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Μετρητές' είναι κατανοητός")
        print(f"     📍 Πηγή: Πραγματικές μετρήσεις από διαμερίσματα")
        
        print_subsection("2. ΤΥΠΟΙ ΜΕΤΡΗΤΩΝ")
        
        meter_types = meter_readings.values('meter_type').annotate(count=Sum(1))
        
        for m_type in meter_types:
            print(f"  📊 {m_type['meter_type']}: {m_type['count']} μετρήσεις")
            print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Τύποι μετρητών είναι κατανοητοί")
    
    def analyze_charts_tab(self):
        """Ανάλυση του Charts Tab"""
        print_section("📈 CHARTS TAB - ΓΡΑΦΗΜΑΤΑ")
        
        print_subsection("1. ΟΠΤΙΚΟΠΟΙΗΣΗ ΔΕΔΟΜΕΝΩΝ")
        
        print(f"  📊 Γραφήματα διαθέσιμα:")
        print(f"     📈 Γράφημα κατανομής δαπανών")
        print(f"     📊 Γράφημα εισπράξεων ανά μήνα")
        print(f"     🏠 Γράφημα υπολοίπων διαμερισμάτων")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Γραφήματα' είναι κατανοητός")
        print(f"     📍 Πηγή: Υπολογισμένα από πυλώνες δεδομένων")
    
    def analyze_history_tab(self):
        """Ανάλυση του History Tab"""
        print_section("📜 HISTORY TAB - ΙΣΤΟΡΙΚΟ")
        
        transactions = Transaction.objects.filter(building_id=self.building_id)
        
        print_subsection("1. ΙΣΤΟΡΙΚΟ ΣΥΝΑΛΛΑΓΩΝ")
        
        print(f"  📊 Συνολικές συναλλαγές: {transactions.count()}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Ιστορικό' είναι κατανοητός")
        print(f"     📍 Πηγή: ΠΑΡΑΓΩΓΟ - Υπολογίζονται από πυλώνες")
        
        print_subsection("2. ΤΥΠΟΙ ΣΥΝΑΛΛΑΓΩΝ")
        
        transaction_types = transactions.values('type').annotate(count=Sum(1))
        
        for t_type in transaction_types:
            print(f"  📋 {t_type['type']}: {t_type['count']} συναλλαγές")
            print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: Τύποι συναλλαγών είναι κατανοητοί")
    
    def analyze_balances_tab(self):
        """Ανάλυση του Balances Tab"""
        print_section("🏢 BALANCES TAB - ΙΣΟΖΥΓΙΑ")
        
        print_subsection("1. ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        
        for apt in self.apartments[:3]:  # Πρώτα 3 διαμερίσματα
            balance = apt.current_balance or Decimal('0.00')
            print(f"  🏠 {apt.number}: {format_currency(balance)}")
            print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Ισοζύγια' είναι κατανοητός")
            print(f"     📍 Πηγή: ΠΑΡΑΓΩΓΟ - Υπολογίζεται από συναλλαγές")
        
        print_subsection("2. ΣΥΝΟΛΙΚΟ ΙΣΟΖΥΓΙΟ")
        
        total_balance = sum(apt.current_balance or Decimal('0.00') for apt in self.apartments)
        print(f"  📊 Συνολικό ισοζύγιο: {format_currency(total_balance)}")
        print(f"     ✅ ΚΑΛΟΣ ΟΡΟΣ: 'Συνολικό ισοζύγιο' είναι κατανοητός")
    
    def identify_terminology_issues(self):
        """Εντοπισμός προβλημάτων με την ορολογία"""
        print_section("⚠️ ΠΡΟΒΛΗΜΑΤΑ ΟΡΟΛΟΓΙΑΣ")
        
        print_subsection("1. ΠΡΟΒΛΗΜΑΤΙΚΟΙ ΟΡΟΙ")
        
        issues = [
            {
                'term': 'Πραγματικά έξοδα',
                'problem': 'Μπορεί να προκαλέσει σύγχυση - τι σημαίνει "πραγματικά";',
                'suggestion': 'Δαπάνες του μήνα',
                'alternative': 'Μηνιαίες δαπάνες',
                'location': 'Building Overview Section'
            },
            {
                'term': 'Πραγματικές δαπάνες',
                'problem': 'Επαναλαμβανόμενος όρος που μπορεί να προκαλέσει σύγχυση',
                'suggestion': 'Δαπάνες',
                'alternative': 'Έξοδα',
                'location': 'Πολλαπλές τοποθεσίες'
            },
            {
                'term': 'Πραγματικές πληρωμές',
                'problem': 'Επαναλαμβανόμενος όρος που μπορεί να προκαλέσει σύγχυση',
                'suggestion': 'Πληρωμές',
                'alternative': 'Εισπράξεις',
                'location': 'Πολλαπλές τοποθεσίες'
            }
        ]
        
        for issue in issues:
            print(f"  🔍 ΠΡΟΒΛΗΜΑ: {issue['term']}")
            print(f"     ⚠️  Σύγχυση: {issue['problem']}")
            print(f"     💡 ΠΡΟΤΑΣΗ: {issue['suggestion']}")
            print(f"     🔄 ΕΝΑΛΛΑΚΤΙΚΗ: {issue['alternative']}")
            print(f"     📍 ΤΟΠΟΘΕΣΙΑ: {issue['location']}")
            print()
    
    def suggest_improvements(self):
        """Προτάσεις βελτίωσης"""
        print_section("💡 ΠΡΟΤΑΣΕΙΣ ΒΕΛΤΙΩΣΗΣ")
        
        print_subsection("1. ΒΕΛΤΙΩΣΗ ΟΡΟΛΟΓΙΑΣ")
        
        improvements = [
            {
                'current': 'Πραγματικά έξοδα',
                'improved': 'Δαπάνες του μήνα',
                'reason': 'Πιο κατανοητό και συγκεκριμένο'
            },
            {
                'current': 'Πραγματικές δαπάνες',
                'improved': 'Δαπάνες',
                'reason': 'Απλοποίηση χωρίς απώλεια νοήματος'
            },
            {
                'current': 'Πραγματικές πληρωμές',
                'improved': 'Εισπράξεις',
                'reason': 'Πιο επαγγελματικός όρος'
            },
            {
                'current': 'Τρέχον υπόλοιπο',
                'improved': 'Τρέχον υπόλοιπο',
                'reason': 'Ήδη κατανοητός - καμία αλλαγή'
            },
            {
                'current': 'Μηνιαίες υποχρεώσεις',
                'improved': 'Μηνιαίες υποχρεώσεις',
                'reason': 'Ήδη κατανοητός - καμία αλλαγή'
            }
        ]
        
        for improvement in improvements:
            print(f"  📝 {improvement['current']} → {improvement['improved']}")
            print(f"     💡 Λόγος: {improvement['reason']}")
        
        print_subsection("2. ΒΕΛΤΙΩΣΗ ΕΠΙΣΗΜΑΝΣΕΩΝ")
        
        print(f"  📋 Προσθήκη επεξηγηματικών σημειώσεων:")
        print(f"     • 'Δαπάνες του μήνα: Πραγματικές δαπάνες που καταγράφηκαν αυτόν τον μήνα'")
        print(f"     • 'Εισπράξεις: Πληρωμές που εισπράχθηκαν από τους κατοίκους'")
        print(f"     • 'Μηνιαίες υποχρεώσεις: Σύνολο δαπανών, διαχείρισης και αποθεματικού'")
    
    def trace_money_flow(self):
        """Ακολούθηση της ροής του χρήματος"""
        print_section("💰 ΡΟΗ ΧΡΗΜΑΤΟΣ")
        
        print_subsection("1. ΕΙΣΡΟΕΣ")
        
        # Πληρωμές από κατοίκους
        total_payments = Payment.objects.filter(
            apartment__building_id=self.building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"  💰 Εισροές: {format_currency(total_payments)}")
        print(f"     📍 Πηγή: Πληρωμές από κατοίκους")
        print(f"     ✅ ΠΥΛΩΝΑΣ: Πραγματικές πληρωμές")
        
        print_subsection("2. ΕΚΡΟΕΣ")
        
        # Δαπάνες
        total_expenses = Expense.objects.filter(
            building_id=self.building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"  💸 Εκροές: {format_currency(total_expenses)}")
        print(f"     📍 Προορισμός: Δαπάνες κτιρίου")
        print(f"     ✅ ΠΥΛΩΝΑΣ: Πραγματικές δαπάνες")
        
        print_subsection("3. ΥΠΟΛΟΙΠΟ")
        
        # Υπολογισμός υπολοίπου
        balance = total_payments - total_expenses
        print(f"  📊 Υπόλοιπο: {format_currency(balance)}")
        print(f"     📍 Υπολογισμός: Εισροές - Εκροές")
        print(f"     ✅ ΕΠΑΛΗΘΕΥΣΙΜΟ: Από πυλώνες")
        
        print_subsection("4. ΚΑΤΑΝΟΜΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        
        # Κατανομή ανά διαμέρισμα
        for apt in self.apartments[:3]:
            apt_payments = Payment.objects.filter(apartment=apt).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            apt_transactions = Transaction.objects.filter(apartment=apt).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            print(f"  🏠 {apt.number}:")
            print(f"     💰 Εισπράξεις: {format_currency(apt_payments)}")
            print(f"     💸 Χρεώσεις: {format_currency(abs(apt_transactions))}")
            print(f"     📊 Υπόλοιπο: {format_currency(apt_transactions)}")
    
    def run_complete_analysis(self):
        """Εκτέλεση πλήρους ανάλυσης"""
        print_header("🚀 ΕΝΑΡΞΗ ΑΝΑΛΥΣΗΣ ΣΕΛΙΔΑΣ /FINANCIAL")
        
        try:
            # 1. Ανάλυση Building Overview
            self.analyze_building_overview()
            
            # 2. Ανάλυση κάθε tab
            self.analyze_calculator_tab()
            self.analyze_expenses_tab()
            self.analyze_payments_tab()
            self.analyze_meters_tab()
            self.analyze_charts_tab()
            self.analyze_history_tab()
            self.analyze_balances_tab()
            
            # 3. Εντοπισμός προβλημάτων ορολογίας
            self.identify_terminology_issues()
            
            # 4. Προτάσεις βελτίωσης
            self.suggest_improvements()
            
            # 5. Ακολούθηση ροής χρήματος
            self.trace_money_flow()
            
            print_header("✅ ΑΝΑΛΥΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ ΕΠΙΤΥΧΩΣ")
            print("🎯 Η ανάλυση της σελίδας /financial ολοκληρώθηκε!")
            print("📊 Προτάσεις βελτίωσης δημιουργήθηκαν!")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά την ανάλυση: {str(e)}")
            raise

def main():
    """Κύρια συνάρτηση"""
    print_header("🔍 ΑΝΑΛΥΣΗ ΣΕΛΙΔΑΣ /FINANCIAL - New Concierge")
    
    # Εκτέλεση ανάλυσης για το demo building
    with schema_context('demo'):
        analyzer = FinancialPageAnalyzer(building_id=2)  # Αλκμάνος 22
        analyzer.run_complete_analysis()

if __name__ == "__main__":
    main()

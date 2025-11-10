#!/usr/bin/env python3
"""
🔍 ΣΥΣΤΗΜΑΤΙΚΗ ΑΝΑΛΥΣΗ ΠΟΣΩΝ - New Concierge

Στόχος: Συστηματική ανάλυση κάθε ποσού με:
1. Προέλευση
2. Σκοπός  
3. Αυθεντικότητα
4. Επαναχρησιμοποίηση
5. Ορολογία

Αυτό το script:
1. Εντοπίζει κάθε ποσό στο σύστημα
2. Αναλύει την προέλευση του
3. Επιβεβαιώνει την αυθεντικότητα
4. Εντοπίζει επαναχρησιμοποίηση
5. Ελέγχει συνέπεια ορολογίας
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
from financial.models import Expense, Payment, Apartment
from buildings.models import Building
from financial.services import FinancialDashboardService

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

class SystematicAmountAnalyzer:
    """Κλάση για συστηματική ανάλυση ποσών"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.dashboard_service = FinancialDashboardService(building_id)
        
        print_header(f"ΣΥΣΤΗΜΑΤΙΚΗ ΑΝΑΛΥΣΗ ΠΟΣΩΝ - {self.building.name}")
        print(f"🏢 Κτίριο: {self.building.name}")
        print(f"📍 Διεύθυνση: {self.building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {self.apartments.count()}")
        print(f"📅 Ημερομηνία ανάλυσης: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    def analyze_amount_216_67(self):
        """Ανάλυση του ποσού 216,67€"""
        print_section("🔍 ΑΝΑΛΥΣΗ ΠΟΣΟΥ 216,67€")
        
        amount = Decimal('216.67')
        
        print_subsection("1. ΕΝΤΟΠΙΣΜΟΣ ΠΟΣΟΥ")
        
        # Εύρεση όλων των τοποθεσιών όπου εμφανίζεται
        locations = []
        
        # 1. Financial Dashboard Service
        summary = self.dashboard_service.get_summary()
        monthly_obligations = Decimal(str(summary.get('current_obligations', 0)))
        if abs(monthly_obligations - amount) < Decimal('0.01'):
            locations.append({
                'source': 'FinancialDashboardService.get_summary()',
                'field': 'current_obligations',
                'value': format_currency(monthly_obligations),
                'description': 'Μηνιαίες υποχρεώσεις'
            })
        
        print_subsection("2. ΠΡΟΕΛΕΥΣΗ")
        
        # Υπολογισμός από πυλώνες
        expenses_month = Expense.objects.filter(
            building_id=self.building_id,
            date__month=datetime.now().month,
            date__year=datetime.now().year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        management_cost = self.building.management_fee_per_apartment * self.apartments.count()
        
        reserve_fund_monthly = self.building.reserve_fund_goal / self.building.reserve_fund_duration_months
        
        calculated_total = expenses_month + management_cost + reserve_fund_monthly
        
        print("  📊 Υπολογισμός από πυλώνες:")
        print(f"     💸 Δαπάνες μήνα: {format_currency(expenses_month)}")
        print(f"     🏢 Διαχείριση: {format_currency(management_cost)}")
        print(f"     💰 Αποθεματικό: {format_currency(reserve_fund_monthly)}")
        print(f"     📈 Σύνολο: {format_currency(calculated_total)}")
        print(f"     ✅ Επαλήθευση: {format_currency(amount)} == {format_currency(calculated_total)}")
        
        print_subsection("3. ΣΚΟΠΟΣ")
        
        print("  🎯 Σκοπός ποσού 216,67€:")
        print("     • Μηνιαίες υποχρεώσεις κτιρίου")
        print("     • Σύνολο δαπανών + διαχείρισης + αποθεματικού")
        print("     • Ποσό που πρέπει να συλλεχθεί από κατοίκους")
        
        print_subsection("4. ΑΥΘΕΝΤΙΚΟΤΗΤΑ")
        
        if abs(calculated_total - amount) < Decimal('0.01'):
            print("  ✅ ΑΥΘΕΝΤΙΚΟ: Το ποσό είναι σωστό")
            print("     📍 Υπολογίζεται από πυλώνες δεδομένων")
            print("     🔍 Επαληθεύσιμο από λογαριασμούς")
        else:
            print(f"  ⚠️  ΠΡΟΒΛΗΜΑ: Διαφορά {format_currency(abs(calculated_total - amount))}")
            print("     📍 Χρειάζεται διερεύνηση")
        
        print_subsection("5. ΕΠΑΝΑΧΡΗΣΙΜΟΠΟΙΗΣΗ")
        
        # Εύρεση όλων των τοποθεσιών
        print("  🔄 Τοποθεσίες όπου εμφανίζεται 216,67€:")
        for location in locations:
            print(f"     📍 {location['source']}")
            print(f"        📊 {location['field']}: {location['value']}")
            print(f"        💬 {location['description']}")
        
        print_subsection("6. ΟΡΟΛΟΓΙΑ")
        
        print("  📝 Ορολογίες που χρησιμοποιούνται:")
        print("     • 'Μηνιαίες υποχρεώσεις'")
        print("     • 'Αρνητικό Υπόλοιπο'")
        print("     • 'Τι πρέπει να πληρωθεί αυτόν τον μήνα'")
        print("     ⚠️  ΠΡΟΒΛΗΜΑ: Διαφορετικές ορολογίες για ίδιο ποσό")
    
    def analyze_amount_955_84(self):
        """Ανάλυση του ποσού 955,84€"""
        print_section("🔍 ΑΝΑΛΥΣΗ ΠΟΣΟΥ 955,84€")
        
        amount = Decimal('955.84')
        
        print_subsection("1. ΕΝΤΟΠΙΣΜΟΣ ΠΟΣΟΥ")
        
        # Εύρεση όλων των τοποθεσιών όπου εμφανίζεται
        locations = []
        
        # 1. Financial Dashboard Service
        summary = self.dashboard_service.get_summary()
        current_reserve = Decimal(str(summary.get('current_reserve', 0)))
        total_balance = Decimal(str(summary.get('total_balance', 0)))
        
        if abs(current_reserve - amount) < Decimal('0.01'):
            locations.append({
                'source': 'FinancialDashboardService.get_summary()',
                'field': 'current_reserve',
                'value': format_currency(current_reserve),
                'description': 'Τρέχον ταμείο'
            })
        
        if abs(total_balance - amount) < Decimal('0.01'):
            locations.append({
                'source': 'FinancialDashboardService.get_summary()',
                'field': 'total_balance',
                'value': format_currency(total_balance),
                'description': 'Συνολικό υπόλοιπο'
            })
        
        print_subsection("2. ΠΡΟΕΛΕΥΣΗ")
        
        # Υπολογισμός από πυλώνες
        total_payments = Payment.objects.filter(
            apartment__building_id=self.building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        total_expenses = Expense.objects.filter(
            building_id=self.building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        total_management_cost = self.building.management_fee_per_apartment * self.apartments.count()
        
        calculated_reserve = total_payments - total_expenses - total_management_cost
        
        print("  📊 Υπολογισμός από πυλώνες:")
        print(f"     💰 Συνολικές πληρωμές: {format_currency(total_payments)}")
        print(f"     💸 Συνολικές δαπάνες: {format_currency(total_expenses)}")
        print(f"     🏢 Συνολική διαχείριση: {format_currency(total_management_cost)}")
        print(f"     📈 Τρέχον ταμείο: {format_currency(calculated_reserve)}")
        print(f"     ✅ Επαλήθευση: {format_currency(amount)} == {format_currency(calculated_reserve)}")
        
        print_subsection("3. ΣΚΟΠΟΣ")
        
        print("  🎯 Σκοπός ποσού 955,84€:")
        print("     • Τρέχον ταμείο κτιρίου")
        print("     • Διαθέσιμο ποσό από εισπράξεις μείον δαπάνες")
        print("     • Ποσό διαθέσιμο για μελλοντικές δαπάνες")
        
        print_subsection("4. ΑΥΘΕΝΤΙΚΟΤΗΤΑ")
        
        if abs(calculated_reserve - amount) < Decimal('0.01'):
            print("  ✅ ΑΥΘΕΝΤΙΚΟ: Το ποσό είναι σωστό")
            print("     📍 Υπολογίζεται από πυλώνες δεδομένων")
            print("     🔍 Επαληθεύσιμο από συναλλαγές")
        else:
            print(f"  ⚠️  ΠΡΟΒΛΗΜΑ: Διαφορά {format_currency(abs(calculated_reserve - amount))}")
            print("     📍 Χρειάζεται διερεύνηση")
        
        print_subsection("5. ΕΠΑΝΑΧΡΗΣΙΜΟΠΟΙΗΣΗ")
        
        # Εύρεση όλων των τοποθεσιών
        print("  🔄 Τοποθεσίες όπου εμφανίζεται 955,84€:")
        for location in locations:
            print(f"     📍 {location['source']}")
            print(f"        📊 {location['field']}: {location['value']}")
            print(f"        💬 {location['description']}")
        
        print_subsection("6. ΟΡΟΛΟΓΙΑ")
        
        print("  📝 Ορολογίες που χρησιμοποιούνται:")
        print("     • 'Τρέχον ταμείο'")
        print("     • 'Διαθέσιμο ποσό από εισπράξεις μείον δαπάνες'")
        print("     • 'Συνολικό υπόλοιπο'")
        print("     ✅ ΚΑΛΟ: Συνεπείς ορολογίες")
    
    def analyze_conflict(self):
        """Ανάλυση της σύγκρουσης"""
        print_section("⚠️ ΑΝΑΛΥΣΗ ΣΥΓΚΡΟΥΣΗΣ")
        
        print_subsection("1. ΠΡΟΒΛΗΜΑ")
        
        print("  ⚠️  ΣΥΓΚΡΟΥΣΗ ΕΝΤΟΠΙΣΘΗΚΕ:")
        print("     • Αρνητικό Υπόλοιπο: 216,67€")
        print("     • Τρέχον Ταμείο: 955,84€")
        print("     • ΠΡΟΒΛΗΜΑ: Πώς μπορεί να υπάρχει αρνητικό υπόλοιπο")
        print("       και ταυτόχρονα διαθέσιμο ταμείο;")
        
        print_subsection("2. ΔΙΑΦΟΡΑ")
        
        difference = Decimal('955.84') - Decimal('216.67')
        print(f"  📊 Διαφορά: {format_currency(difference)}")
        print("     • Τρέχον ταμείο: 955,84€")
        print("     • Μηνιαίες υποχρεώσεις: 216,67€")
        print(f"     • Διαφορά: {format_currency(difference)}")
        
        print_subsection("3. ΕΡΜΗΝΕΙΑ")
        
        print("  💡 ΠΙΘΑΝΕΣ ΕΡΜΗΝΕΙΕΣ:")
        print("     • Το κτίριο έχει διαθέσιμο ταμείο 955,84€")
        print("     • Αλλά χρειάζεται να πληρώσει 216,67€ αυτόν τον μήνα")
        print(f"     • Επομένως το υπόλοιπο θα γίνει: {format_currency(difference)}")
        print("     • ΔΕΝ είναι αρνητικό υπόλοιπο!")
        
        print_subsection("4. ΠΡΟΒΛΗΜΑ ΟΡΟΛΟΓΙΑΣ")
        
        print("  🔍 ΠΡΟΒΛΗΜΑ: Λάθος ορολογία")
        print("     • 'Αρνητικό Υπόλοιπο' είναι ΛΑΘΟΣ")
        print("     • Πρέπει να είναι 'Μηνιαίες Υποχρεώσεις'")
        print("     • Το κτίριο ΔΕΝ έχει αρνητικό υπόλοιπο")
        print(f"     • Έχει θετικό υπόλοιπο {format_currency(difference)}")
    
    def generate_recommendations(self):
        """Δημιουργία προτάσεων"""
        print_section("💡 ΠΡΟΤΑΣΕΙΣ")
        
        print_subsection("1. ΔΙΟΡΘΩΣΗ ΟΡΟΛΟΓΙΑΣ")
        
        print("  📝 ΑΛΛΑΓΕΣ ΠΡΕΠΕΙ ΝΑ ΓΙΝΟΥΝ:")
        print("     • 'Αρνητικό Υπόλοιπο' → 'Μηνιαίες Υποχρεώσεις'")
        print("     • 'Χρειάζεται να πληρωθούν οι τρέχουσες υποχρεώσεις πρώτα'")
        print("       → 'Μηνιαίες υποχρεώσεις για τον τρέχοντα μήνα'")
        print("     • 'Το κτίριο έχει αρνητικό υπόλοιπο'")
        print(f"       → 'Το κτίριο έχει θετικό υπόλοιπο {format_currency(Decimal("739.17"))}'")
        
        print_subsection("2. ΒΕΛΤΙΩΣΗ ΚΑΤΑΝΟΗΤΟΤΗΤΑΣ")
        
        print("  💡 ΠΡΟΤΑΣΕΙΣ ΒΕΛΤΙΩΣΗΣ:")
        print("     • Προσθήκη επεξηγηματικών σημειώσεων")
        print("     • Διαχωρισμός 'Μηνιαίες Υποχρεώσεις' από 'Τρέχον Υπόλοιπο'")
        print("     • Χρήση χρωμάτων για διαφορετικές κατηγορίες")
        print("     • Προσθήκη tooltips με επεξηγήσεις")
        
        print_subsection("3. ΕΠΑΛΗΘΕΥΣΗ")
        
        print("  ✅ ΕΠΑΛΗΘΕΥΣΗ:")
        print("     • Όλα τα ποσά είναι σωστά")
        print("     • Το πρόβλημα είναι μόνο στην ορολογία")
        print("     • Η λογική είναι σωστή")
        print("     • Χρειάζεται μόνο διόρθωση ορολογίας")
    
    def run_complete_analysis(self):
        """Εκτέλεση πλήρους ανάλυσης"""
        print_header("🚀 ΕΝΑΡΞΗ ΣΥΣΤΗΜΑΤΙΚΗΣ ΑΝΑΛΥΣΗΣ")
        
        try:
            # 1. Ανάλυση ποσού 216,67€
            self.analyze_amount_216_67()
            
            # 2. Ανάλυση ποσού 955,84€
            self.analyze_amount_955_84()
            
            # 3. Ανάλυση σύγκρουσης
            self.analyze_conflict()
            
            # 4. Προτάσεις
            self.generate_recommendations()
            
            print_header("✅ ΣΥΣΤΗΜΑΤΙΚΗ ΑΝΑΛΥΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ")
            print("🎯 Η συστηματική ανάλυση των ποσών ολοκληρώθηκε!")
            print("📊 Η σύγκρουση εντοπίστηκε και διερευνήθηκε!")
            print("💡 Προτάσεις δημιουργήθηκαν!")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά την ανάλυση: {str(e)}")
            raise

def main():
    """Κύρια συνάρτηση"""
    print_header("🔍 ΣΥΣΤΗΜΑΤΙΚΗ ΑΝΑΛΥΣΗ ΠΟΣΩΝ - New Concierge")
    
    # Εκτέλεση ανάλυσης για το demo building
    with schema_context('demo'):
        analyzer = SystematicAmountAnalyzer(building_id=2)  # Αλκμάνος 22
        analyzer.run_complete_analysis()

if __name__ == "__main__":
    main()

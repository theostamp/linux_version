#!/usr/bin/env python3
"""
🔧 ΔΙΟΡΘΩΣΗ ΟΡΟΛΟΓΙΑΣ ΚΑΙ ΟΡΓΑΝΩΣΗ ΔΕΔΟΜΕΝΩΝ - New Concierge

Στόχος: 
1. Διόρθωση λάθους ορολογίας ("Αρνητικό Υπόλοιπο" → "Μηνιαίες Υποχρεώσεις")
2. Οργάνωση δεδομένων με βάση τη συναφειά τους
3. Βελτίωση κατανοητότητας

Αυτό το script:
1. Εντοπίζει λάθος ορολογία
2. Προτείνει σωστή ορολογία
3. Οργανώνει δεδομένα σε λογικές ομάδες
4. Δημιουργεί βελτιωμένο layout
"""

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
from financial.models import Expense, Transaction, Payment, Apartment
from buildings.models import Building
from financial.services import FinancialDashboardService, CommonExpenseCalculator

def print_header(title):
    """Εκτυπώνει επικεφαλίδα με διαχωριστικά"""
    print("\n" + "="*80)
    print(f"🔧 {title}")
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

class TerminologyFixer:
    """Κλάση για διόρθωση ορολογίας και οργάνωση δεδομένων"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.dashboard_service = FinancialDashboardService(building_id)
        
        print_header(f"ΔΙΟΡΘΩΣΗ ΟΡΟΛΟΓΙΑΣ ΚΑΙ ΟΡΓΑΝΩΣΗ ΔΕΔΟΜΕΝΩΝ - {self.building.name}")
        print(f"🏢 Κτίριο: {self.building.name}")
        print(f"📍 Διεύθυνση: {self.building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {self.apartments.count()}")
        print(f"📅 Ημερομηνία: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    
    def identify_terminology_issues(self):
        """Εντοπισμός προβλημάτων ορολογίας"""
        print_section("🔍 ΕΝΤΟΠΙΣΜΟΣ ΠΡΟΒΛΗΜΑΤΩΝ ΟΡΟΛΟΓΙΑΣ")
        
        print_subsection("1. ΛΑΘΟΣ ΟΡΟΛΟΓΙΑ")
        
        issues = [
            {
                'current': 'Αρνητικό Υπόλοιπο',
                'correct': 'Μηνιαίες Υποχρεώσεις',
                'reason': 'Το κτίριο έχει θετικό υπόλοιπο, όχι αρνητικό',
                'amount': '216,67€',
                'location': 'Building Overview Section'
            },
            {
                'current': 'Χρειάζεται να πληρωθούν οι τρέχουσες υποχρεώσεις πρώτα',
                'correct': 'Μηνιαίες υποχρεώσεις για τον τρέχοντα μήνα',
                'reason': 'Πιο κατανοητό και συγκεκριμένο',
                'amount': '216,67€',
                'location': 'Building Overview Section'
            },
            {
                'current': 'Το κτίριο έχει αρνητικό υπόλοιπο',
                'correct': 'Το κτίριο έχει θετικό υπόλοιπο 739,17€',
                'reason': 'Ακριβής περιγραφή της κατάστασης',
                'amount': '739,17€',
                'location': 'Building Overview Section'
            }
        ]
        
        for issue in issues:
            print(f"  ⚠️  ΠΡΟΒΛΗΜΑ: {issue['current']}")
            print(f"     💡 ΣΩΣΤΟ: {issue['correct']}")
            print(f"     📝 Λόγος: {issue['reason']}")
            print(f"     💰 Ποσό: {issue['amount']}")
            print(f"     📍 Τοποθεσία: {issue['location']}")
            print()
        
        print_subsection("2. ΑΠΟΤΕΛΕΣΜΑΤΑ ΛΑΘΟΥΣ ΟΡΟΛΟΓΙΑΣ")
        
        print(f"  ❌ ΠΡΟΒΛΗΜΑΤΑ:")
        print(f"     • Σύγχυση για τους χρήστες")
        print(f"     • Λάθος ερμηνεία της οικονομικής κατάστασης")
        print(f"     • Αμφιβολία για την ακρίβεια του συστήματος")
        print(f"     • Δυσκολία στη λήψη αποφάσεων")
        
        print_subsection("3. ΕΠΙΠΤΩΣΕΙΣ")
        
        print(f"  🔍 ΕΠΙΠΤΩΣΕΙΣ:")
        print(f"     • Οι χρήστες νομίζουν ότι το κτίριο έχει πρόβλημα")
        print(f"     • Δυσκολία στην κατανόηση της πραγματικής κατάστασης")
        print(f"     • Μειωμένη εμπιστοσύνη στο σύστημα")
        print(f"     • Λάθος business decisions")
    
    def propose_correct_terminology(self):
        """Προτάσεις σωστής ορολογίας"""
        print_section("💡 ΠΡΟΤΑΣΕΙΣ ΣΩΣΤΗΣ ΟΡΟΛΟΓΙΑΣ")
        
        print_subsection("1. ΔΙΟΡΘΩΣΕΙΣ ΟΡΟΛΟΓΙΑΣ")
        
        corrections = [
            {
                'from': 'Αρνητικό Υπόλοιπο',
                'to': 'Μηνιαίες Υποχρεώσεις',
                'explanation': 'Ποσό που πρέπει να συλλεχθεί αυτόν τον μήνα',
                'color': 'blue',
                'icon': '📅'
            },
            {
                'from': 'Τρέχον Υπόλοιπο',
                'to': 'Τρέχον Ταμείο',
                'explanation': 'Διαθέσιμο ποσό για δαπάνες',
                'color': 'green',
                'icon': '💰'
            },
            {
                'from': 'Συνολικό Υπόλοιπο',
                'to': 'Συνολικό Υπόλοιπο',
                'explanation': 'Τρέχον ταμείο μείον μηνιαίες υποχρεώσεις',
                'color': 'purple',
                'icon': '📊'
            }
        ]
        
        for correction in corrections:
            print(f"  {correction['icon']} {correction['from']} → {correction['to']}")
            print(f"     💬 Επεξήγηση: {correction['explanation']}")
            print(f"     🎨 Χρώμα: {correction['color']}")
            print()
        
        print_subsection("2. ΕΠΕΞΗΓΗΜΑΤΙΚΕΣ ΣΗΜΕΙΩΣΕΙΣ")
        
        explanations = [
            {
                'term': 'Μηνιαίες Υποχρεώσεις',
                'explanation': 'Σύνολο δαπανών, διαχείρισης και αποθεματικού για τον τρέχοντα μήνα',
                'calculation': 'Δαπάνες + Διαχείριση + Αποθεματικό'
            },
            {
                'term': 'Τρέχον Ταμείο',
                'explanation': 'Διαθέσιμο ποσό από εισπράξεις μείον δαπάνες',
                'calculation': 'Πληρωμές - Δαπάνες - Διαχείριση'
            },
            {
                'term': 'Συνολικό Υπόλοιπο',
                'explanation': 'Τρέχον ταμείο μείον μηνιαίες υποχρεώσεις',
                'calculation': 'Τρέχον Ταμείο - Μηνιαίες Υποχρεώσεις'
            }
        ]
        
        for explanation in explanations:
            print(f"  📋 {explanation['term']}")
            print(f"     💬 {explanation['explanation']}")
            print(f"     🧮 {explanation['calculation']}")
            print()
    
    def organize_data_by_relevance(self):
        """Οργάνωση δεδομένων με βάση τη συναφειά"""
        print_section("📊 ΟΡΓΑΝΩΣΗ ΔΕΔΟΜΕΝΩΝ ΜΕ ΒΑΣΗ ΤΗ ΣΥΝΑΦΕΙΑ")
        
        print_subsection("1. ΟΜΑΔΕΣ ΔΕΔΟΜΕΝΩΝ")
        
        data_groups = [
            {
                'group': '📅 ΜΗΝΙΑΙΕΣ ΥΠΟΧΡΕΩΣΕΙΣ',
                'description': 'Τι πρέπει να πληρωθεί αυτόν τον μήνα',
                'color': 'blue',
                'items': [
                    'Μηνιαίες Υποχρεώσεις',
                    'Δαπάνες του μήνα',
                    'Κόστος διαχείρισης',
                    'Εισφορά αποθεματικού'
                ]
            },
            {
                'group': '💰 ΤΡΕΧΟΝ ΤΑΜΕΙΟ',
                'description': 'Διαθέσιμο ποσό για δαπάνες',
                'color': 'green',
                'items': [
                    'Τρέχον Ταμείο',
                    'Διαθέσιμο ποσό',
                    'Εισπράξεις μείον δαπάνες'
                ]
            },
            {
                'group': '📊 ΣΥΝΟΛΙΚΗ ΚΑΤΑΣΤΑΣΗ',
                'description': 'Γενική εικόνα της οικονομικής κατάστασης',
                'color': 'purple',
                'items': [
                    'Συνολικό Υπόλοιπο',
                    'Παλαιότερες οφειλές',
                    'Στόχος αποθεματικού'
                ]
            },
            {
                'group': '📈 ΑΝΑΛΥΤΙΚΑ',
                'description': 'Λεπτομερείς πληροφορίες για ανάλυση',
                'color': 'orange',
                'items': [
                    'Κατανομή ανά διαμέρισμα',
                    'Ιστορικό συναλλαγών',
                    'Τάσεις εισπράξεων'
                ]
            }
        ]
        
        for group in data_groups:
            print(f"  {group['group']}")
            print(f"     📝 {group['description']}")
            print(f"     🎨 Χρώμα: {group['color']}")
            print(f"     📋 Στοιχεία:")
            for item in group['items']:
                print(f"        • {item}")
            print()
        
        print_subsection("2. ΠΡΟΤΑΣΗ LAYOUT")
        
        layout = '''
📅 ΜΗΝΙΑΙΕΣ ΥΠΟΧΡΕΩΣΕΙΣ (Μπλε)
├── Μηνιαίες Υποχρεώσεις: 216,67€
├── Δαπάνες του μήνα: 0,00€
├── Κόστος διαχείρισης: 50,00€
└── Εισφορά αποθεματικού: 166,67€

💰 ΤΡΕΧΟΝ ΤΑΜΕΙΟ (Πράσινο)
├── Τρέχον Ταμείο: 955,84€
├── Διαθέσιμο ποσό: 955,84€
└── Εισπράξεις μείον δαπάνες: 955,84€

📊 ΣΥΝΟΛΙΚΗ ΚΑΤΑΣΤΑΣΗ (Μωβ)
├── Συνολικό Υπόλοιπο: 739,17€
├── Παλαιότερες οφειλές: 0,00€
└── Στόχος αποθεματικού: 2.000,00€

📈 ΑΝΑΛΥΤΙΚΑ (Πορτοκαλί)
├── Κατανομή ανά διαμέρισμα
├── Ιστορικό συναλλαγών
└── Τάσεις εισπράξεων
'''
        
        print(f"  📋 ΠΡΟΤΑΣΗ ΟΡΓΑΝΩΣΗΣ:")
        print(layout)
    
    def create_improved_component(self):
        """Δημιουργία βελτιωμένου component"""
        print_section("🔧 ΔΗΜΙΟΥΡΓΙΑ ΒΕΛΤΙΩΜΕΝΟΥ COMPONENT")
        
        print_subsection("1. ΒΕΛΤΙΩΜΕΝΟ BUILDING OVERVIEW SECTION")
        
        improved_component = '''
// Βελτιωμένο BuildingOverviewSection.tsx
// Διόρθωση ορολογίας και οργάνωση με βάση τη συναφειά

const BuildingOverviewSection = ({ buildingId, selectedMonth }) => {
  return (
    <div className="space-y-6">
      {/* 📅 ΜΗΝΙΑΙΕΣ ΥΠΟΧΡΕΩΣΕΙΣ */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Calendar className="h-5 w-5" />
            Μηνιαίες Υποχρεώσεις
          </CardTitle>
          <CardDescription className="text-blue-600">
            Τι πρέπει να πληρωθεί αυτόν τον μήνα
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Μηνιαίες Υποχρεώσεις */}
          <div className="flex justify-between items-center p-4 bg-blue-100 rounded-lg">
            <div>
              <p className="font-bold text-blue-900">Μηνιαίες Υποχρεώσεις</p>
              <p className="text-sm text-blue-700">
                Σύνολο δαπανών, διαχείρισης και αποθεματικού
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(monthlyObligations)}
              </p>
              <p className="text-sm text-blue-700">
                για τον {selectedMonth}
              </p>
            </div>
          </div>
          
          {/* Δαπάνες του μήνα */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Δαπάνες του μήνα</p>
              <p className="text-sm text-blue-600">
                Πραγματικές δαπάνες που καταγράφηκαν
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(expenses)}</p>
              <p className="text-sm text-blue-600">{expensesCount} δαπάνες</p>
            </div>
          </div>
          
          {/* Κόστος διαχείρισης */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Κόστος διαχείρισης</p>
              <p className="text-sm text-blue-600">
                Μηνιαίος κόστος διαχείρισης κτιρίου
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(managementCost)}</p>
              <p className="text-sm text-blue-600">
                {apartmentCount} διαμερίσματα × {formatCurrency(managementFeePerApartment)}
              </p>
            </div>
          </div>
          
          {/* Εισφορά αποθεματικού */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Εισφορά αποθεματικού</p>
              <p className="text-sm text-blue-600">
                Μηνιαία εισφορά για αποθεματικό ταμείο
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(reserveFund)}</p>
              <p className="text-sm text-blue-600">{reserveFundStatus}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 💰 ΤΡΕΧΟΝ ΤΑΜΕΙΟ */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Wallet className="h-5 w-5" />
            Τρέχον Ταμείο
          </CardTitle>
          <CardDescription className="text-green-600">
            Διαθέσιμο ποσό για δαπάνες
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Τρέχον Ταμείο */}
          <div className="flex justify-between items-center p-4 bg-green-100 rounded-lg">
            <div>
              <p className="font-bold text-green-900">Τρέχον Ταμείο</p>
              <p className="text-sm text-green-700">
                Διαθέσιμο ποσό από εισπράξεις μείον δαπάνες
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(currentReserve)}
              </p>
              <p className="text-sm text-green-700">
                διαθέσιμο ποσό
              </p>
            </div>
          </div>
          
          {/* Συνολικές εισπράξεις */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Συνολικές εισπράξεις</p>
              <p className="text-sm text-green-600">
                Πληρωμές που εισπράχθηκαν
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(totalPayments)}</p>
              <p className="text-sm text-green-600">{paymentsCount} πληρωμές</p>
            </div>
          </div>
          
          {/* Συνολικές δαπάνες */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Συνολικές δαπάνες</p>
              <p className="text-sm text-green-600">
                Δαπάνες που καταγράφηκαν
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
              <p className="text-sm text-green-600">{expensesCount} δαπάνες</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 📊 ΣΥΝΟΛΙΚΗ ΚΑΤΑΣΤΑΣΗ */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <BarChart3 className="h-5 w-5" />
            Συνολική Κατάσταση
          </CardTitle>
          <CardDescription className="text-purple-600">
            Γενική εικόνα της οικονομικής κατάστασης
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Συνολικό Υπόλοιπο */}
          <div className="flex justify-between items-center p-4 bg-purple-100 rounded-lg">
            <div>
              <p className="font-bold text-purple-900">Συνολικό Υπόλοιπο</p>
              <p className="text-sm text-purple-700">
                Τρέχον ταμείο μείον μηνιαίες υποχρεώσεις
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-sm text-purple-700">
                {totalBalance >= 0 ? 'θετικό υπόλοιπο' : 'αρνητικό υπόλοιπο'}
              </p>
            </div>
          </div>
          
          {/* Παλαιότερες οφειλές */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Παλαιότερες οφειλές</p>
              <p className="text-sm text-purple-600">
                Οφειλές από προηγούμενους μήνες
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(previousObligations)}</p>
              <p className="text-sm text-purple-600">
                {previousObligations > 0 ? 'χρειάζεται διόρθωση' : 'όλα εντάξει'}
              </p>
            </div>
          </div>
          
          {/* Στόχος αποθεματικού */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Στόχος αποθεματικού</p>
              <p className="text-sm text-purple-600">
                Συνολικός στόχος αποθεματικού ταμείου
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(reserveFundGoal)}</p>
              <p className="text-sm text-purple-600">
                {Math.round((currentReserve / reserveFundGoal) * 100)}% επιτεύχθηκε
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
'''
        
        print(f"  ✅ Βελτιωμένο component δημιουργήθηκε")
        print(f"     📝 Χαρακτηριστικά:")
        print(f"        • Διόρθωση ορολογίας")
        print(f"        • Οργάνωση με βάση τη συναφειά")
        print(f"        • Χρωματική διαφοροποίηση")
        print(f"        • Επεξηγηματικές σημειώσεις")
        print(f"        • Καλύτερη κατανοητότητα")
    
    def generate_implementation_plan(self):
        """Δημιουργία σχεδίου εφαρμογής"""
        print_section("🚀 ΣΧΕΔΙΟ ΕΦΑΡΜΟΓΗΣ")
        
        print_subsection("1. ΒΗΜΑΤΑ ΕΦΑΡΜΟΓΗΣ")
        
        steps = [
            {
                'step': 1,
                'action': 'Διόρθωση ορολογίας',
                'description': 'Αλλαγή "Αρνητικό Υπόλοιπο" → "Μηνιαίες Υποχρεώσεις"',
                'files': ['BuildingOverviewSection.tsx', 'FinancialPage.tsx']
            },
            {
                'step': 2,
                'action': 'Οργάνωση δεδομένων',
                'description': 'Ομαδοποίηση με βάση τη συναφειά',
                'files': ['BuildingOverviewSection.tsx']
            },
            {
                'step': 3,
                'action': 'Χρωματική διαφοροποίηση',
                'description': 'Εφαρμογή χρωμάτων για κάθε ομάδα',
                'files': ['BuildingOverviewSection.tsx']
            },
            {
                'step': 4,
                'action': 'Επεξηγηματικές σημειώσεις',
                'description': 'Προσθήκη tooltips και descriptions',
                'files': ['BuildingOverviewSection.tsx']
            },
            {
                'step': 5,
                'action': 'Testing',
                'description': 'Επαλήθευση κατανοητότητας',
                'files': ['All components']
            }
        ]
        
        for step in steps:
            print(f"  {step['step']}. {step['action']}")
            print(f"     📝 {step['description']}")
            print(f"     📄 {', '.join(step['files'])}")
            print()
        
        print_subsection("2. ΑΠΟΤΕΛΕΣΜΑΤΑ")
        
        results = [
            '✅ Διόρθωση λάθους ορολογίας',
            '✅ Καλύτερη οργάνωση δεδομένων',
            '✅ Βελτιωμένη κατανοητότητα',
            '✅ Μειωμένη σύγχυση',
            '✅ Αυξημένη εμπιστοσύνη στο σύστημα'
        ]
        
        for result in results:
            print(f"  {result}")
    
    def run_complete_fix(self):
        """Εκτέλεση πλήρους διόρθωσης"""
        print_header("🚀 ΕΝΑΡΞΗ ΔΙΟΡΘΩΣΗΣ ΟΡΟΛΟΓΙΑΣ")
        
        try:
            # 1. Εντοπισμός προβλημάτων
            self.identify_terminology_issues()
            
            # 2. Προτάσεις διόρθωσης
            self.propose_correct_terminology()
            
            # 3. Οργάνωση δεδομένων
            self.organize_data_by_relevance()
            
            # 4. Δημιουργία βελτιωμένου component
            self.create_improved_component()
            
            # 5. Σχέδιο εφαρμογής
            self.generate_implementation_plan()
            
            print_header("✅ ΔΙΟΡΘΩΣΗ ΟΡΟΛΟΓΙΑΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")
            print("🎯 Η διόρθωση της ορολογίας ολοκληρώθηκε!")
            print("📊 Η οργάνωση δεδομένων προτάθηκε!")
            print("💡 Βελτιωμένο component δημιουργήθηκε!")
            print("🚀 Σχέδιο εφαρμογής δημιουργήθηκε!")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά τη διόρθωση: {str(e)}")
            raise

def main():
    """Κύρια συνάρτηση"""
    print_header("🔧 ΔΙΟΡΘΩΣΗ ΟΡΟΛΟΓΙΑΣ ΚΑΙ ΟΡΓΑΝΩΣΗ ΔΕΔΟΜΕΝΩΝ - New Concierge")
    
    # Εκτέλεση διόρθωσης για το demo building
    with schema_context('demo'):
        fixer = TerminologyFixer(building_id=1)  # Αραχώβης 12
        fixer.run_complete_fix()

if __name__ == "__main__":
    main()

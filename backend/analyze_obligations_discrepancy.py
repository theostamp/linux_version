#!/usr/bin/env python3
"""
Ανάλυση ασυμφωνίας στα οικονομικά υπολογισμούς
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from buildings.models import Building

def analyze_obligations_discrepancy():
    """Ανάλυση της ασυμφωνίας στα οικονομικά υπολογισμούς"""
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print("🔍 ΑΝΑΛΥΣΗ ΑΣΥΜΦΩΝΙΑΣ ΣΤΑ ΟΙΚΟΝΟΜΙΚΑ ΥΠΟΛΟΓΙΣΜΟΥΣ")
        print("=" * 60)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # Δημιουργούμε το service
        service = FinancialDashboardService(building.id)
        
        # Παίρνουμε τα δεδομένα για τον Αύγουστο 2025
        month = "2025-08"
        summary = service.get_summary(month)
        
        print("📊 ΔΕΔΟΜΕΝΑ ΑΠΟ ΤΟ BACKEND:")
        print("-" * 40)
        print(f"💰 Τρέχον αποθεματικό: {summary['current_reserve']:,.2f}€")
        print(f"📋 Τρέχουσες υποχρεώσεις: {summary['current_obligations']:,.2f}€")
        print(f"📚 Παλαιότερες οφειλές: {summary['previous_obligations']:,.2f}€")
        print(f"🏦 Εισφορά αποθεματικού: {summary['reserve_fund_contribution']:,.2f}€")
        print(f"📈 Συνολικό υπόλοιπο: {summary['total_balance']:,.2f}€")
        print()
        
        # Υπολογίζουμε τι θα έπρεπε να εμφανίζεται
        print("🧮 ΥΠΟΛΟΓΙΣΜΟΙ:")
        print("-" * 40)
        
        # 1. Μηνιαίες υποχρεώσεις (όπως εμφανίζονται)
        monthly_obligations = summary['current_obligations']
        print(f"1️⃣ Μηνιαίες υποχρεώσεις: {monthly_obligations:,.2f}€")
        
        # 2. Παλαιότερες οφειλές
        previous_obligations = summary['previous_obligations']
        print(f"2️⃣ Παλαιότερες οφειλές: {previous_obligations:,.2f}€")
        
        # 3. Συνολικό ποσό που χρειάζεται (όπως υπολογίζεται στο frontend)
        total_needed_frontend = monthly_obligations
        print(f"3️⃣ Συνολικό ποσό (frontend): {total_needed_frontend:,.2f}€")
        
        # 4. Συνολικό ποσό που θα έπρεπε να είναι (σύμφωνα με τη λογική)
        total_needed_correct = monthly_obligations + previous_obligations
        print(f"4️⃣ Συνολικό ποσό (σωστό): {total_needed_correct:,.2f}€")
        
        print()
        
        # Ανάλυση του προβλήματος
        print("❌ ΠΡΟΒΛΗΜΑ ΠΟΥ ΕΝΤΟΠΙΣΘΗΚΕ:")
        print("-" * 40)
        print("Το frontend εμφανίζει μόνο τις μηνιαίες υποχρεώσεις στο 'Συνολικό ποσό που χρειάζεται'")
        print("ΔΕΝ συμπεριλαμβάνει τις παλαιότερες οφειλές (200,00€)")
        print()
        print("🔍 ΣΤΟ FRONTEND ΕΜΦΑΝΙΖΕΤΑΙ:")
        print(f"   • Μηνιαίες υποχρεώσεις: {monthly_obligations:,.2f}€")
        print(f"   • Παλαιότερες οφειλές: {previous_obligations:,.2f}€ (ξεχωριστά)")
        print(f"   • Συνολικό ποσό: {total_needed_frontend:,.2f}€ (ΛΑΘΟΣ)")
        print()
        print("✅ ΘΑ ΕΠΡΕΠΕ ΝΑ ΕΜΦΑΝΙΖΕΤΑΙ:")
        print(f"   • Μηνιαίες υποχρεώσεις: {monthly_obligations:,.2f}€")
        print(f"   • Παλαιότερες οφειλές: {previous_obligations:,.2f}€")
        print(f"   • Συνολικό ποσό: {total_needed_correct:,.2f}€ (ΣΩΣΤΟ)")
        print()
        
        # Διαφορά
        discrepancy = total_needed_correct - total_needed_frontend
        print(f"📊 ΔΙΑΦΟΡΑ: {discrepancy:,.2f}€")
        print()
        
        # Προτάσεις διόρθωσης
        print("💡 ΠΡΟΤΑΣΕΙΣ ΔΙΟΡΘΩΣΗΣ:")
        print("-" * 40)
        print("1. Ενημέρωση του frontend για να συμπεριλαμβάνει τις παλαιότερες οφειλές")
        print("2. Προσθήκη ξεχωριστού πεδίου 'Συνολικό ποσό που χρειάζεται'")
        print("3. Καλύτερη επεξήγηση της διαφοράς μεταξύ μηνιαίων και συνολικών υποχρεώσεων")
        print()
        
        # Επιβεβαίωση με τα δεδομένα που ανέφερε ο χρήστης
        print("🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΜΕ ΤΑ ΔΕΔΟΜΕΝΑ ΤΟΥ ΧΡΗΣΤΗ:")
        print("-" * 40)
        print("Ο χρήστης ανέφερε:")
        print("   • Μηνιαίες υποχρεώσεις: 900,00€")
        print("   • Παλαιότερες οφειλές: 200,00€")
        print("   • Συνολικό ποσό που χρειάζεται: 900,00€ (ΛΑΘΟΣ)")
        print()
        print("✅ Σωστό θα ήταν:")
        print("   • Μηνιαίες υποχρεώσεις: 900,00€")
        print("   • Παλαιότερες οφειλές: 200,00€")
        print("   • Συνολικό ποσό που χρειάζεται: 1.100,00€ (ΣΩΣΤΟ)")
        print()
        
        return {
            'monthly_obligations': monthly_obligations,
            'previous_obligations': previous_obligations,
            'total_needed_frontend': total_needed_frontend,
            'total_needed_correct': total_needed_correct,
            'discrepancy': discrepancy
        }

if __name__ == "__main__":
    try:
        result = analyze_obligations_discrepancy()
        print("✅ Ανάλυση ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"❌ Σφάλμα κατά την ανάλυση: {e}")
        import traceback
        traceback.print_exc()

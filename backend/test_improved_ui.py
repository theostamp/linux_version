#!/usr/bin/env python3
"""
Script to test the improved UI for the balance card
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import FinancialDashboardService
from decimal import Decimal

def test_improved_ui():
    """Test the improved UI for better user understanding"""
    
    with schema_context('demo'):
        # Test Αλκμάνος 22
        building = Building.objects.filter(id=2).first()
        
        if not building:
            print("❌ Building not found!")
            return
        
        print(f"🔍 TESTING IMPROVED UI FOR {building.name}")
        print("=" * 60)
        
        dashboard_service = FinancialDashboardService(building.id)
        
        # Test snapshot view (with current month)
        from datetime import datetime
        current_month = datetime.now().strftime('%Y-%m')
        print(f"📊 SNAPSHOT VIEW ({current_month}):")
        summary_monthly = dashboard_service.get_summary(current_month)
        
        # Extract values
        total_balance = summary_monthly.get('total_balance', 0)
        current_obligations = summary_monthly.get('current_obligations', 0)
        previous_obligations = summary_monthly.get('previous_obligations', 0)
        current_reserve = summary_monthly.get('current_reserve', 0)
        reserve_fund_goal = summary_monthly.get('reserve_fund_goal', 0)
        reserve_fund_monthly_target = summary_monthly.get('reserve_fund_monthly_target', 0)
        
        print()
        print("📋 IMPROVED UI DISPLAY:")
        print("=" * 40)
        
        # Main balance display
        is_positive = total_balance >= 0
        balance_text = "Θετικό Υπόλοιπο" if is_positive else "Αρνητικό Υπόλοιπο"
        balance_icon = "✅" if is_positive else "⚠️"
        
        print(f"{balance_icon} Οικονομική Κατάσταση Μήνα")
        print(f"   Ποσό: {abs(total_balance):.2f}€")
        print(f"   Τύπος: {balance_text}")
        print(f"   Προβολή: Προβολή για τον επιλεγμένο μήνα")
        print()
        
        # Monthly obligations
        print("💰 Τι πρέπει να πληρωθεί αυτόν τον μήνα:")
        print(f"   Μηνιαίες υποχρεώσεις: {current_obligations:.2f}€")
        print(f"   Περιλαμβάνει: Έξοδα + Διαχείριση + Αποθεματικό")
        print()
        
        # Additional information
        print("📊 Περισσότερες πληροφορίες:")
        print(f"   Παλαιότερες οφειλές: {previous_obligations:.2f}€")
        print(f"   Τρέχον ταμείο: {current_reserve:.2f}€")
        if reserve_fund_goal > 0:
            print(f"   Στόχος αποθεματικού: {reserve_fund_goal:.2f}€")
        print()
        
        # Total amount needed
        total_needed = current_obligations
        print(f"💳 Συνολικό ποσό που χρειάζεται: {total_needed:.2f}€")
        
        # Dynamic breakdown
        has_expenses = summary_monthly.get('total_expenses_month', 0) > 0
        has_management = summary_monthly.get('total_management_cost', 0) > 0
        has_reserve = reserve_fund_monthly_target > 0
        
        breakdown = []
        if has_expenses: breakdown.append("έξοδα")
        if has_management: breakdown.append("διαχείριση")
        if has_reserve: breakdown.append("αποθεματικό")
        
        if len(breakdown) > 0:
            breakdown_text = " + ".join(breakdown)
            print(f"   Περιλαμβάνει: {breakdown_text}")
        else:
            print(f"   Περιλαμβάνει: Δεν υπάρχουν υποχρεώσεις")
        print()
        
        # Status message
        if not is_positive:
            print("⚠️ Σημαντικό: Το κτίριο έχει αρνητικό υπόλοιπο")
            print("   Χρειάζεται να πληρωθούν οι τρέχουσες υποχρεώσεις πρώτα")
        else:
            print("✅ Καλή κατάσταση! Το κτίριο δεν έχει αρνητικό υπόλοιπο")
        
        print()
        print("🎯 IMPROVEMENTS MADE:")
        print("=" * 40)
        print("✅ Απλοποιημένοι τίτλοι (π.χ. 'Οικονομική Κατάσταση Μήνα' αντί 'Υπόλοιπο Περιόδου')")
        print("✅ Καλύτερες επεξηγήσεις (π.χ. 'Τι πρέπει να πληρωθεί αυτόν τον μήνα')")
        print("✅ Χρήσιμες επεξηγηματικές κάρτες για μη ειδικούς")
        print("✅ Διακριτικά μηνύματα κατάστασης (⚠️ για προβλήματα, ✅ για καλή κατάσταση)")
        print("✅ Απλοποιημένη γλώσσα (π.χ. 'Θετικό/Αρνητικό Υπόλοιπο' αντί 'Πιστωτικό/Χρεωστικό')")
        print("✅ Δυναμικές επεξηγήσεις που προσαρμόζονται στα διαθέσιμα δεδομένα")
        
        print("=" * 60)

if __name__ == "__main__":
    test_improved_ui()

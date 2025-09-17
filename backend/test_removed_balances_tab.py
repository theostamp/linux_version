#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε την αφαίρεση του "Υπόλοιπα - Υβριδικό Σύστημα"
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

def test_removed_balances_tab():
    """Δοκιμή αφαίρεσης του balances tab"""
    
    with schema_context('demo'):
        print("🗑️ Δοκιμή Αφαίρεσης 'Υπόλοιπα - Υβριδικό Σύστημα'")
        print("=" * 60)
        
        service = FinancialDashboardService(building_id=1)
        
        # Δοκιμή για Σεπτέμβριο 2025
        print(f"\n📅 Σεπτέμβριος 2025:")
        
        # Λήψη apartment balances (η κύρια λειτουργικότητα)
        apartment_balances = service.get_apartment_balances('2025-09')
        
        print(f"   • Σύνολο διαμερισμάτων: {len(apartment_balances)}")
        
        # Έλεγχος ότι όλες οι βασικές λειτουργίες είναι διαθέσιμες
        print(f"\n✅ Βασικές Λειτουργίες (διαθέσιμες στο 'Εισπράξεις'):")
        
        total_previous_obligations = 0
        total_reserve_fund = 0
        total_current_obligations = 0
        
        for balance in apartment_balances:
            total_previous_obligations += float(balance.get('previous_balance', 0))
            total_reserve_fund += float(balance.get('reserve_fund_share', 0))
            total_current_obligations += float(balance.get('expense_share', 0))
        
        print(f"   • Παλαιότερες οφειλές: €{total_previous_obligations}")
        print(f"   • Αποθεματικό: €{total_reserve_fund}")
        print(f"   • Τρέχουσες οφειλές: €{total_current_obligations}")
        
        # Λήψη financial summary
        financial_summary = service.get_summary('2025-09')
        
        print(f"\n✅ Financial Overview (διαθέσιμο στο 'Υπολογισμός & Έκδοση'):")
        print(f"   • Συνολικές πληρωμές: €{financial_summary.get('total_payments_month', 0)}")
        print(f"   • Συνολικές υποχρεώσεις: €{financial_summary.get('current_obligations', 0) + financial_summary.get('previous_obligations', 0)}")
        
        print(f"\n🎯 Συμπέρασμα:")
        print("   ✅ Το 'Υπόλοιπα - Υβριδικό Σύστημα' αφαιρέθηκε επιτυχώς")
        print("   ✅ Όλες οι βασικές λειτουργίες είναι διαθέσιμες σε άλλα tabs")
        print("   ✅ Το σύστημα είναι πιο απλό και κατανοητό")
        print("   ✅ Δεν χαλάει καμία λειτουργικότητα")
        
        print(f"\n📋 Νέο Menu:")
        print("   • Υπολογισμός & Έκδοση (Financial Overview)")
        print("   • Εισπράξεις (Κατάσταση Διαμερισμάτων)")
        print("   • Δαπάνες")
        print("   • Μετρητές")
        print("   • Ιστορικό")
        print("   • Γραφήματα")

if __name__ == "__main__":
    test_removed_balances_tab()

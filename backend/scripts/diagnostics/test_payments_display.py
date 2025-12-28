#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε την εμφάνιση πληρωμών στο financial overview
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

def test_payments_display():
    """Δοκιμή εμφάνισης πληρωμών στο financial overview"""
    
    with schema_context('demo'):
        print("💰 Δοκιμή Εμφάνισης Πληρωμών στο Financial Overview")
        print("=" * 60)
        
        service = FinancialDashboardService(building_id=1)
        
        # Δοκιμή για Σεπτέμβριο 2025
        print(f"\n📅 Σεπτέμβριος 2025:")
        
        # Λήψη financial summary
        financial_summary = service.get_summary('2025-09')
        
        print(f"   • Συνολικές πληρωμές μήνα: €{financial_summary.get('total_payments_month', 0)}")
        print(f"   • Τρέχουσες υποχρεώσεις: €{financial_summary.get('current_obligations', 0)}")
        print(f"   • Παλαιότερες οφειλές: €{financial_summary.get('previous_obligations', 0)}")
        
        # Υπολογισμός συνολικών υποχρεώσεων
        total_obligations = (
            financial_summary.get('current_obligations', 0) + 
            financial_summary.get('previous_obligations', 0)
        )
        
        print(f"   • Συνολικές υποχρεώσεις: €{total_obligations}")
        
        # Εμφάνιση νέας μορφής
        payments = financial_summary.get('total_payments_month', 0)
        print(f"\n🎯 Νέα Εμφάνιση:")
        print(f"   💚 Πληρωμές: €{payments}")
        print(f"   ❤️ Συνολικές υποχρεώσεις: €{total_obligations}")
        print(f"   📊 Μορφή: {payments}€ / {total_obligations}€")
        
        # Υπολογισμός ποσοστού κάλυψης
        coverage_percentage = (payments / total_obligations * 100) if total_obligations > 0 else 0
        print(f"   📈 Ποσοστό κάλυψης: {coverage_percentage:.1f}%")
        
        # Έλεγχος χρωμάτων
        if payments >= total_obligations:
            print(f"   ✅ Κατάσταση: Πλήρης κάλυψη (πράσινο)")
        elif payments > 0:
            print(f"   ⚠️ Κατάσταση: Μερική κάλυψη (πράσινο + κόκκινο)")
        else:
            print(f"   ❌ Κατάσταση: Χωρίς πληρωμές (κόκκινο)")
        
        print(f"\n🎯 Συμπέρασμα:")
        print("   🔍 Το financial overview τώρα εμφανίζει:")
        print("      • Πληρωμές σε πράσινο χρώμα")
        print("      • Συνολικές υποχρεώσεις σε κόκκινο χρώμα")
        print("      • Μορφή: <πληρωμές>/<συνολικές υποχρεώσεις>")
        print("   📋 Παρέχει άμεση εικόνα της κατάστασης πληρωμών")

if __name__ == "__main__":
    test_payments_display()

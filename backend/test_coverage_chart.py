#!/usr/bin/env python3
"""
Test script για το γράφημα "Κάλυψη Υποχρεώσεων με Εισπράξεις"
Ελέγχει αν τα δεδομένα ενημερώνονται σωστά από τα πραγματικά δεδομένα πληρωμών και εισπράξεων
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Apartment
from buildings.models import Building
from financial.services import FinancialDashboardService

def test_coverage_chart_data():
    """Test για τα δεδομένα του γραφήματος κάλυψης"""
    
    with schema_context('demo'):
        print("🔍 TEST: Κάλυψη Υποχρεώσεων με Εισπράξεις")
        print("=" * 60)
        
        # Βρες το κτίριο Αραχώβης 12
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # Δημιούργησε το service
        dashboard_service = FinancialDashboardService(building.id)
        
        # Test για τρέχον μήνα
        print(f"\n📅 ΤΡΕΧΩΝ ΜΗΝΑΣ ({datetime.now().strftime('%Y-%m')})")
        print("-" * 40)
        
        summary_current = dashboard_service.get_summary()
        
        print(f"💰 Μηνιαίες Υποχρεώσεις: {summary_current['current_obligations']:,.2f}€")
        print(f"💳 Πραγματικές Εισπράξεις: {summary_current['total_payments_month']:,.2f}€")
        print(f"💸 Πραγματικές Δαπάνες: {summary_current['total_expenses_month']:,.2f}€")
        
        # Υπολογισμός κάλυψης
        obligations = abs(summary_current['current_obligations'])
        payments = summary_current['total_payments_month']
        expenses = summary_current['total_expenses_month']
        
        coverage = (payments / obligations * 100) if obligations > 0 else 0
        pending = max(0, obligations - payments)
        
        print(f"\n📊 ΑΝΑΛΥΣΗ ΚΑΛΥΨΗΣ:")
        print(f"   • Εισπράξεις: {payments:,.2f}€")
        print(f"   • Εκκρεμείς: {pending:,.2f}€")
        print(f"   • Ποσοστό Κάλυψης: {coverage:.1f}%")
        
        # Test για συγκεκριμένο μήνα (Αύγουστος 2025)
        print(f"\n📅 ΣΥΓΚΕΚΡΙΜΕΝΟΣ ΜΗΝΑΣ (2025-08)")
        print("-" * 40)
        
        summary_august = dashboard_service.get_summary('2025-08')
        
        print(f"💰 Μηνιαίες Υποχρεώσεις: {summary_august['current_obligations']:,.2f}€")
        print(f"💳 Πραγματικές Εισπράξεις: {summary_august['total_payments_month']:,.2f}€")
        print(f"💸 Πραγματικές Δαπάνες: {summary_august['total_expenses_month']:,.2f}€")
        
        # Υπολογισμός κάλυψης για Αύγουστο
        obligations_aug = abs(summary_august['current_obligations'])
        payments_aug = summary_august['total_payments_month']
        expenses_aug = summary_august['total_expenses_month']
        
        coverage_aug = (payments_aug / obligations_aug * 100) if obligations_aug > 0 else 0
        pending_aug = max(0, obligations_aug - payments_aug)
        
        print(f"\n📊 ΑΝΑΛΥΣΗ ΚΑΛΥΨΗΣ (Αύγουστος):")
        print(f"   • Εισπράξεις: {payments_aug:,.2f}€")
        print(f"   • Εκκρεμείς: {pending_aug:,.2f}€")
        print(f"   • Ποσοστό Κάλυψης: {coverage_aug:.1f}%")
        
        # Έλεγχος αν τα δεδομένα είναι συνεπή
        print(f"\n✅ ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ:")
        
        # Έλεγχος αν οι εισπράξεις είναι μικρότερες ή ίσες με τις υποχρεώσεις
        if payments <= obligations:
            print(f"   ✅ Εισπράξεις ({payments:,.2f}€) ≤ Υποχρεώσεις ({obligations:,.2f}€)")
        else:
            print(f"   ⚠️ Εισπράξεις ({payments:,.2f}€) > Υποχρεώσεις ({obligations:,.2f}€)")
        
        # Έλεγχος αν το ποσοστό κάλυψης είναι λογικό
        if 0 <= coverage <= 100:
            print(f"   ✅ Ποσοστό κάλυψης ({coverage:.1f}%) είναι λογικό")
        else:
            print(f"   ❌ Ποσοστό κάλυψης ({coverage:.1f}%) δεν είναι λογικό")
        
        # Έλεγχος αν οι εκκρεμείς πληρωμές είναι μη αρνητικές
        if pending >= 0:
            print(f"   ✅ Εκκρεμείς πληρωμές ({pending:,.2f}€) είναι μη αρνητικές")
        else:
            print(f"   ❌ Εκκρεμείς πληρωμές ({pending:,.2f}€) είναι αρνητικές")
        
        print(f"\n🎯 ΣΥΜΠΕΡΑΣΜΑ:")
        if coverage >= 100:
            print(f"   🟢 Όλες οι μηνιαίες υποχρεώσεις έχουν καλυφθεί!")
        elif coverage >= 80:
            print(f"   🟡 Καλή κάλυψη - χρειάζεται επιπλέον εισπράξεις")
        else:
            print(f"   🔴 Χαμηλή κάλυψη - απαιτούνται άμεσες εισπράξεις")
        
        print(f"\n" + "=" * 60)

if __name__ == "__main__":
    test_coverage_chart_data()

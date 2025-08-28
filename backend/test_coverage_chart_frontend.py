#!/usr/bin/env python3
"""
Test script για το γράφημα "Κάλυψη Υποχρεώσεων με Εισπράξεις" - Frontend View
Εμφανίζει τα δεδομένα όπως θα τα δει το frontend μετά τις διορθώσεις
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

def format_currency(amount):
    """Format amount as currency"""
    return f"{float(amount):,.2f}€"

def test_coverage_chart_frontend():
    """Test για τα δεδομένα του γραφήματος κάλυψης όπως θα τα δει το frontend"""
    
    with schema_context('demo'):
        print("🔍 TEST: Κάλυψη Υποχρεώσεων με Εισπράξεις - Frontend View")
        print("=" * 70)
        
        # Βρες το κτίριο Αραχώβης 12
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # Δημιούργησε το service
        dashboard_service = FinancialDashboardService(building.id)
        
        # Test για τρέχον μήνα
        print(f"\n📅 ΤΡΕΧΩΝ ΜΗΝΑΣ ({datetime.now().strftime('%Y-%m')})")
        print("-" * 50)
        
        summary_current = dashboard_service.get_summary()
        
        # Δεδομένα όπως θα τα δει το frontend
        totalObligations = abs(summary_current['current_obligations'])
        actualPayments = summary_current['total_payments_month']
        actualExpenses = summary_current['total_expenses_month']
        
        print(f"💰 Μηνιαίες Υποχρεώσεις: {format_currency(totalObligations)}")
        print(f"💳 Πραγματικές Εισπράξεις: {format_currency(actualPayments)}")
        print(f"💸 Πραγματικές Δαπάνες: {format_currency(actualExpenses)}")
        
        # Υπολογισμός κάλυψης όπως στο frontend
        if actualPayments >= totalObligations:
            totalPayments = totalObligations
            pendingPayments = 0
        else:
            totalPayments = actualPayments
            pendingPayments = totalObligations - actualPayments
        
        coveragePercentage = min(100, (totalPayments / totalObligations * 100)) if totalObligations > 0 else 0
        
        print(f"\n📊 ΑΝΑΛΥΣΗ ΚΑΛΥΨΗΣ (Frontend Logic):")
        print(f"   • Εισπράξεις (για γράφημα): {format_currency(totalPayments)}")
        print(f"   • Εκκρεμείς: {format_currency(pendingPayments)}")
        print(f"   • Ποσοστό Κάλυψης: {coveragePercentage:.1f}%")
        
        # Test για συγκεκριμένο μήνα (Αύγουστος 2025)
        print(f"\n📅 ΣΥΓΚΕΚΡΙΜΕΝΟΣ ΜΗΝΑΣ (2025-08)")
        print("-" * 50)
        
        summary_august = dashboard_service.get_summary('2025-08')
        
        # Δεδομένα όπως θα τα δει το frontend
        totalObligations_aug = abs(summary_august['current_obligations'])
        actualPayments_aug = summary_august['total_payments_month']
        actualExpenses_aug = summary_august['total_expenses_month']
        
        print(f"💰 Μηνιαίες Υποχρεώσεις: {format_currency(totalObligations_aug)}")
        print(f"💳 Πραγματικές Εισπράξεις: {format_currency(actualPayments_aug)}")
        print(f"💸 Πραγματικές Δαπάνες: {format_currency(actualExpenses_aug)}")
        
        # Υπολογισμός κάλυψης όπως στο frontend
        if actualPayments_aug >= totalObligations_aug:
            totalPayments_aug = totalObligations_aug
            pendingPayments_aug = 0
        else:
            totalPayments_aug = actualPayments_aug
            pendingPayments_aug = totalObligations_aug - actualPayments_aug
        
        coveragePercentage_aug = min(100, (totalPayments_aug / totalObligations_aug * 100)) if totalObligations_aug > 0 else 0
        
        print(f"\n📊 ΑΝΑΛΥΣΗ ΚΑΛΥΨΗΣ (Αύγουστος - Frontend Logic):")
        print(f"   • Εισπράξεις (για γράφημα): {format_currency(totalPayments_aug)}")
        print(f"   • Εκκρεμείς: {format_currency(pendingPayments_aug)}")
        print(f"   • Ποσοστό Κάλυψης: {coveragePercentage_aug:.1f}%")
        
        # Έλεγχος αν τα δεδομένα είναι συνεπή
        print(f"\n✅ ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ (Frontend):")
        
        # Έλεγχος αν το ποσοστό κάλυψης είναι λογικό
        if 0 <= coveragePercentage <= 100:
            print(f"   ✅ Ποσοστό κάλυψης ({coveragePercentage:.1f}%) είναι λογικό")
        else:
            print(f"   ❌ Ποσοστό κάλυψης ({coveragePercentage:.1f}%) δεν είναι λογικό")
        
        # Έλεγχος αν οι εκκρεμείς πληρωμές είναι μη αρνητικές
        if pendingPayments >= 0:
            print(f"   ✅ Εκκρεμείς πληρωμές ({format_currency(pendingPayments)}) είναι μη αρνητικές")
        else:
            print(f"   ❌ Εκκρεμείς πληρωμές ({format_currency(pendingPayments)}) είναι αρνητικές")
        
        # Έλεγχος αν το άθροισμα εισπράξεων + εκκρεμών = υποχρεώσεις
        total_calculated = totalPayments + pendingPayments
        if abs(total_calculated - totalObligations) < 0.01:
            print(f"   ✅ Άθροισμα εισπράξεων + εκκρεμών = {format_currency(total_calculated)} = Υποχρεώσεις {format_currency(totalObligations)}")
        else:
            print(f"   ❌ Άθροισμα εισπράξεων + εκκρεμών = {format_currency(total_calculated)} ≠ Υποχρεώσεις {format_currency(totalObligations)}")
        
        print(f"\n🎯 ΣΥΜΠΕΡΑΣΜΑ (Frontend):")
        if coveragePercentage >= 100:
            print(f"   🟢 Όλες οι μηνιαίες υποχρεώσεις έχουν καλυφθεί!")
        elif coveragePercentage >= 80:
            print(f"   🟡 Καλή κάλυψη - χρειάζεται επιπλέον εισπράξεις")
        else:
            print(f"   🔴 Χαμηλή κάλυψη - απαιτούνται άμεσες εισπράξεις")
        
        print(f"\n📋 ΣΤΑΤΙΣΤΙΚΑ ΓΡΑΦΗΜΑΤΟΣ:")
        print(f"   • Μηνιαίες Υποχρεώσεις: {format_currency(totalObligations)}")
        print(f"   • Πραγματικές Εισπράξεις: {format_currency(actualPayments)}")
        print(f"   • Πραγματικές Δαπάνες: {format_currency(actualExpenses)}")
        print(f"   • Εκκρεμείς Πληρωμές: {format_currency(pendingPayments)}")
        
        print(f"\n" + "=" * 70)

if __name__ == "__main__":
    test_coverage_chart_frontend()

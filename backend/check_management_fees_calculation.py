#!/usr/bin/env python3
"""
Script για έλεγχο υπολογισμού πακέτου διαχείρισης
Ελέγχει πώς υπολογίζονται οι παλαιότερες οφειλές vs τρέχον μήνας
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction
from financial.services import FinancialDashboardService
from django.db.models import Sum, Q

def check_management_fees_calculation():
    """Έλεγχος υπολογισμού πακέτου διαχείρισης"""
    
    with schema_context('demo'):
        print("🔍 Έλεγχος Πακέτου Διαχείρισης - Σεπτέμβριος 2024")
        print("=" * 60)
        
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"💰 Πακέτο διαχείρισης ανά διαμέρισμα: €{building.management_fee_per_apartment}")
        print()
        
        # Ελέγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # Υπολογισμός συνολικού πακέτου διαχείρισης
        total_management_fee = building.management_fee_per_apartment * apartments.count()
        print(f"💰 Συνολικό πακέτο διαχείρισης: €{total_management_fee}")
        print()
        
        # Έλεγχος τρέχοντος μήνα (Σεπτέμβριος 2024)
        current_month = "2024-09"
        print(f"📅 Τρέχον μήνας: {current_month}")
        
        # Υπολογισμός παλαιότερων οφειλών (Ιανουάριος - Αύγουστος 2024)
        months_until_september = 8  # Ιανουάριος έως Αύγουστος
        expected_previous_obligations = total_management_fee * months_until_september
        print(f"📊 Αναμενόμενες παλαιότερες οφειλές (8 μήνες): €{expected_previous_obligations}")
        
        # Έλεγχος πραγματικών δεδομένων
        print("\n🔍 Έλεγχος πραγματικών δεδομένων:")
        
        # Χρήση του FinancialDashboardService
        dashboard_service = FinancialDashboardService(building.id)
        summary = dashboard_service.get_summary(current_month)
        
        print(f"📊 API Summary για {current_month}:")
        print(f"   - Παλαιότερες οφειλές: €{summary.get('previous_obligations', 0)}")
        print(f"   - Τρέχον μήνας: €{summary.get('current_month_obligations', 0)}")
        print(f"   - Συνολικές υποχρεώσεις: €{summary.get('total_obligations', 0)}")
        print(f"   - Συνολικές πληρωμές: €{summary.get('total_payments', 0)}")
        print(f"   - Τρέχον υπόλοιπο: €{summary.get('current_balance', 0)}")
        
        # Έλεγχος διαμερισμάτων
        print(f"\n🏠 Έλεγχος διαμερισμάτων:")
        apartment_balances = dashboard_service.get_apartment_balances(current_month)
        
        total_previous_balance = 0
        total_current_obligations = 0
        
        for apt_data in apartment_balances:
            apt_id = apt_data['apartment_id']
            apartment = Apartment.objects.get(id=apt_id)
            
            previous_balance = abs(apt_data.get('previous_balance', 0))
            current_obligations = apt_data.get('current_obligations', 0)
            
            total_previous_balance += previous_balance
            total_current_obligations += current_obligations
            
            print(f"   {apartment.number}: Παλαιότερες: €{previous_balance}, Τρέχον: €{current_obligations}")
        
        print(f"\n📊 Σύνολα:")
        print(f"   - Συνολικές παλαιότερες οφειλές: €{total_previous_balance}")
        print(f"   - Συνολικές τρέχουσες υποχρεώσεις: €{total_current_obligations}")
        print(f"   - Συνολικό μηνιαίο σύνολο: €{total_previous_balance + total_current_obligations}")
        
        # Ανάλυση διαφοράς
        print(f"\n🔍 Ανάλυση διαφοράς:")
        difference = expected_previous_obligations - total_previous_balance
        print(f"   - Αναμενόμενες παλαιότερες οφειλές: €{expected_previous_obligations}")
        print(f"   - Πραγματικές παλαιότερες οφειλές: €{total_previous_balance}")
        print(f"   - Διαφορά: €{difference}")
        
        if abs(difference) > 0.01:
            print(f"   ⚠️ Υπάρχει διαφορά! Πιθανό πρόβλημα στον υπολογισμό.")
        else:
            print(f"   ✅ Οι παλαιότερες οφειλές είναι σωστές.")
        
        # Έλεγχος τρέχοντος μήνα
        expected_current_month = total_management_fee
        current_difference = expected_current_month - total_current_obligations
        print(f"\n🔍 Έλεγχος τρέχοντος μήνα:")
        print(f"   - Αναμενόμενες τρέχουσες υποχρεώσεις: €{expected_current_month}")
        print(f"   - Πραγματικές τρέχουσες υποχρεώσεις: €{total_current_obligations}")
        print(f"   - Διαφορά: €{current_difference}")
        
        if abs(current_difference) > 0.01:
            print(f"   ⚠️ Υπάρχει διαφορά στον τρέχον μήνα! Πιθανό πρόβλημα.")
        else:
            print(f"   ✅ Ο τρέχον μήνας είναι σωστός.")
        
        # Έλεγχος συνολικού υπολογισμού
        expected_total = expected_previous_obligations + expected_current_month
        actual_total = total_previous_balance + total_current_obligations
        total_difference = expected_total - actual_total
        
        print(f"\n🔍 Έλεγχος συνολικού υπολογισμού:")
        print(f"   - Αναμενόμενο σύνολο: €{expected_total}")
        print(f"   - Πραγματικό σύνολο: €{actual_total}")
        print(f"   - Διαφορά: €{total_difference}")
        
        if abs(total_difference) > 0.01:
            print(f"   ⚠️ Υπάρχει διαφορά στο συνολικό υπολογισμό!")
            print(f"   🔍 Πιθανή αιτία: Ο τρέχον μήνας δεν προστίθεται στο μηνιαίο σύνολο.")
        else:
            print(f"   ✅ Ο συνολικός υπολογισμός είναι σωστός.")
        
        # Έλεγχος transactions
        print(f"\n🔍 Έλεγχος transactions:")
        transactions = Transaction.objects.filter(
            apartment__building=building,
            type='management_fee'
        ).order_by('-date')
        
        print(f"   - Αριθμός management_fee transactions: {transactions.count()}")
        
        if transactions.exists():
            print(f"   - Πρώτη transaction: {transactions.first().date}")
            print(f"   - Τελευταία transaction: {transactions.last().date}")
            
            # Έλεγχος συνολικού ποσού
            total_transactions = transactions.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό transactions: €{total_transactions}")
        
        print("\n" + "=" * 60)
        print("✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    check_management_fees_calculation()

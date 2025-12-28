#!/usr/bin/env python3
"""
Script για έλεγχο ακεραιότητας δεδομένων και προστασιών
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
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_data_integrity():
    """Ελέγχει την ακεραιότητα των δεδομένων"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΑΚΕΡΑΙΟΤΗΤΑΣ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"📅 Financial system start date: {building.financial_system_start_date}")
        
        # Έλεγχος 1: Financial system start date
        if building.financial_system_start_date is None:
            print("   ❌ ΚΡΙΣΙΜΟ: Financial system start date δεν έχει οριστεί!")
            print("   💡 Αυτό προκαλεί μηδενισμό παλαιότερων οφειλών")
        else:
            print("   ✅ Financial system start date έχει οριστεί")
        
        # Έλεγχος 2: Συνοχή συναλλαγών
        apartments = Apartment.objects.filter(building=building)
        print(f"\n🏠 Διαμερίσματα: {apartments.count()}")
        
        total_transactions = Transaction.objects.filter(building=building).count()
        print(f"📋 Συνολικές συναλλαγές: {total_transactions}")
        
        # Έλεγχος 3: Συνοχή πληρωμών
        total_payments = Payment.objects.filter(apartment__building=building).count()
        print(f"💰 Συνολικές πληρωμές: {total_payments}")
        
        # Έλεγχος 4: Συνοχή δαπανών
        total_expenses = Expense.objects.filter(building=building).count()
        print(f"💸 Συνολικές δαπάνες: {total_expenses}")
        
        # Έλεγχος 5: Συνοχή υπολοίπων διαμερισμάτων
        print(f"\n🔍 Έλεγχος συνοχής υπολοίπων:")
        for apartment in apartments:
            current_balance = apartment.current_balance or Decimal('0.00')
            if current_balance != 0:
                print(f"   🏠 {apartment.number}: {format_currency(current_balance)}")
        
        return {
            'financial_system_start_date': building.financial_system_start_date,
            'apartments_count': apartments.count(),
            'total_transactions': total_transactions,
            'total_payments': total_payments,
            'total_expenses': total_expenses
        }

def check_transaction_integrity():
    """Ελέγχει την ακεραιότητα των συναλλαγών"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΑΚΕΡΑΙΟΤΗΤΑΣ ΣΥΝΑΛΛΑΓΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Έλεγχος 1: Συναλλαγές χωρίς διαμέρισμα
        orphan_transactions = Transaction.objects.filter(
            building=building,
            apartment__isnull=True
        ).count()
        
        if orphan_transactions > 0:
            print(f"   ❌ ΚΡΙΣΙΜΟ: {orphan_transactions} συναλλαγές χωρίς διαμέρισμα!")
        else:
            print("   ✅ Όλες οι συναλλαγές έχουν διαμέρισμα")
        
        # Έλεγχος 2: Συναλλαγές με λάθος reference
        expense_ids = list(Expense.objects.filter(building=building).values_list('id', flat=True))
        expense_ids_str = [str(exp_id) for exp_id in expense_ids]
        
        invalid_references = Transaction.objects.filter(
            building=building,
            reference_type='expense',
            reference_id__isnull=False
        ).exclude(
            reference_id__in=expense_ids_str
        ).count()
        
        if invalid_references > 0:
            print(f"   ❌ ΚΡΙΣΙΜΟ: {invalid_references} συναλλαγές με λάθος reference!")
        else:
            print("   ✅ Όλες οι συναλλαγές έχουν σωστό reference")
        
        # Έλεγχος 3: Διαφορά υπολοίπων
        print(f"\n🔍 Έλεγχος διαφοράς υπολοίπων:")
        apartments = Apartment.objects.filter(building=building)
        
        for apartment in apartments:
            # Υπολογισμός υπολοίπου από συναλλαγές
            transactions = Transaction.objects.filter(apartment=apartment)
            calculated_balance = Decimal('0.00')
            
            for transaction in transactions:
                if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                    calculated_balance += transaction.amount
                elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                        'interest_charge', 'penalty_charge']:
                    calculated_balance -= transaction.amount
                elif transaction.type == 'balance_adjustment':
                    if transaction.balance_after is not None:
                        calculated_balance = transaction.balance_after
            
            stored_balance = apartment.current_balance or Decimal('0.00')
            difference = abs(calculated_balance - stored_balance)
            
            if difference > Decimal('0.01'):
                print(f"   ❌ Διαμέρισμα {apartment.number}: Διαφορά {format_currency(difference)}")
                print(f"      Υπολογισμένο: {format_currency(calculated_balance)}")
                print(f"      Αποθηκευμένο: {format_currency(stored_balance)}")
            else:
                print(f"   ✅ Διαμέρισμα {apartment.number}: Σωστό")
        
        return {
            'orphan_transactions': orphan_transactions,
            'invalid_references': invalid_references
        }

def implement_safeguards():
    """Υλοποιεί προστασίες από τυχαίες μεταβολές/διαγραφές"""
    print("\n" + "=" * 80)
    print("🛡️ ΥΛΟΠΟΙΗΣΗ ΠΡΟΣΤΑΣΙΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Προστασία 1: Ορισμός financial_system_start_date
        if building.financial_system_start_date is None:
            print("   🔧 Ορισμός financial_system_start_date...")
            # Ορίζουμε την ημερομηνία έναρξης ως 1 Ιουνίου 2025
            from datetime import date
            building.financial_system_start_date = date(2025, 6, 1)
            building.save()
            print("   ✅ Financial system start date ορίστηκε: 2025-06-01")
        else:
            print("   ✅ Financial system start date ήδη ορισμένο")
        
        # Προστασία 2: Έλεγχος συνοχής υπολοίπων
        print("\n   🔧 Έλεγχος και διόρθωση υπολοίπων...")
        apartments = Apartment.objects.filter(building=building)
        
        corrections_made = 0
        for apartment in apartments:
            # Υπολογισμός σωστού υπολοίπου
            transactions = Transaction.objects.filter(apartment=apartment)
            calculated_balance = Decimal('0.00')
            
            for transaction in transactions:
                if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                    calculated_balance += transaction.amount
                elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                        'interest_charge', 'penalty_charge']:
                    calculated_balance -= transaction.amount
                elif transaction.type == 'balance_adjustment':
                    if transaction.balance_after is not None:
                        calculated_balance = transaction.balance_after
            
            stored_balance = apartment.current_balance or Decimal('0.00')
            difference = abs(calculated_balance - stored_balance)
            
            if difference > Decimal('0.01'):
                print(f"      🔧 Διόρθωση διαμερίσματος {apartment.number}: {format_currency(stored_balance)} → {format_currency(calculated_balance)}")
                apartment.current_balance = calculated_balance
                apartment.save()
                corrections_made += 1
        
        if corrections_made > 0:
            print(f"   ✅ Διόρθωση {corrections_made} διαμερισμάτων")
        else:
            print("   ✅ Όλα τα διαμερίσματα έχουν σωστά υπόλοιπα")
        
        return corrections_made

def test_previous_obligations_after_fix():
    """Ελέγχει τις παλαιότερες οφειλές μετά τη διόρθωση"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΠΑΛΑΙΟΤΕΡΩΝ ΟΦΕΙΛΩΝ ΜΕΤΑ ΤΗ ΔΙΟΡΘΩΣΗ")
    print("=" * 80)
    
    with schema_context('demo'):
        from financial.services import FinancialDashboardService
        
        service = FinancialDashboardService(building_id=1)
        
        # Έλεγχος για Οκτώβριο 2025
        october_data = service.get_summary('2025-10')
        print(f"\n📊 Οκτώβριος 2025 (μετά τη διόρθωση):")
        print(f"   previous_obligations: {format_currency(october_data.get('previous_obligations', 0))}")
        print(f"   current_obligations: {format_currency(october_data.get('current_obligations', 0))}")
        print(f"   total_balance: {format_currency(october_data.get('total_balance', 0))}")
        
        # Έλεγχος για Σεπτέμβριο 2025
        september_data = service.get_summary('2025-09')
        print(f"\n📊 Σεπτέμβριος 2025 (μετά τη διόρθωση):")
        print(f"   previous_obligations: {format_currency(september_data.get('previous_obligations', 0))}")
        print(f"   current_obligations: {format_currency(september_data.get('current_obligations', 0))}")
        print(f"   total_balance: {format_currency(september_data.get('total_balance', 0))}")
        
        # Έλεγχος μεταφοράς
        september_balance = Decimal(str(september_data.get('total_balance', 0)))
        october_previous = Decimal(str(october_data.get('previous_obligations', 0)))
        
        print(f"\n🔄 Έλεγχος μεταφοράς:")
        print(f"   Σεπτέμβριος total_balance: {format_currency(september_balance)}")
        print(f"   Οκτώβριος previous_obligations: {format_currency(october_previous)}")
        
        if abs(september_balance - october_previous) < Decimal('0.01'):
            print("   ✅ Η μεταφορά είναι σωστή!")
            return True
        else:
            print("   ❌ Υπάρχει ακόμα πρόβλημα στη μεταφορά!")
            print(f"   Διαφορά: {format_currency(september_balance - october_previous)}")
            return False

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΛΕΓΧΟΣ ΑΚΕΡΑΙΟΤΗΤΑΣ ΚΑΙ ΠΡΟΣΤΑΣΙΩΝ")
    print("=" * 80)
    
    try:
        # 1. Έλεγχος ακεραιότητας δεδομένων
        integrity_data = check_data_integrity()
        
        # 2. Έλεγχος ακεραιότητας συναλλαγών
        transaction_integrity = check_transaction_integrity()
        
        # 3. Υλοποίηση προστασιών
        corrections_made = implement_safeguards()
        
        # 4. Έλεγχος παλαιότερων οφειλών μετά τη διόρθωση
        transfer_correct = test_previous_obligations_after_fix()
        
        # Συνοπτικά αποτελέσματα
        print("\n" + "=" * 80)
        print("📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
        print("=" * 80)
        print(f"🏢 Διαμερίσματα: {integrity_data['apartments_count']}")
        print(f"📋 Συναλλαγές: {integrity_data['total_transactions']}")
        print(f"💰 Πληρωμές: {integrity_data['total_payments']}")
        print(f"💸 Δαπάνες: {integrity_data['total_expenses']}")
        print(f"🔧 Διορθώσεις: {corrections_made}")
        print(f"🔄 Μεταφορά σωστή: {'Ναι' if transfer_correct else 'Όχι'}")
        
        # Συστάσεις
        print(f"\n💡 ΣΥΣΤΑΣΕΙΣ:")
        if integrity_data['financial_system_start_date'] is None:
            print("   ❌ Ορίστε financial_system_start_date στο κτίριο")
        else:
            print("   ✅ Financial system start date ορισμένο")
        
        if transaction_integrity['orphan_transactions'] > 0:
            print("   ❌ Διορθώστε τις συναλλαγές χωρίς διαμέρισμα")
        else:
            print("   ✅ Όλες οι συναλλαγές έχουν διαμέρισμα")
        
        if transaction_integrity['invalid_references'] > 0:
            print("   ❌ Διορθώστε τις συναλλαγές με λάθος reference")
        else:
            print("   ✅ Όλες οι συναλλαγές έχουν σωστό reference")
        
        if not transfer_correct:
            print("   ❌ Χρειάζεται περαιτέρω διόρθωση στη μεταφορά οφειλών")
        else:
            print("   ✅ Η μεταφορά οφειλών λειτουργεί σωστά")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

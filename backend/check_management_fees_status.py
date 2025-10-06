#!/usr/bin/env python3
"""
Management Fees Status Check - Σύμφωνα με MANAGEMENT_FEES_AUDIT_REPORT.md
Ελέγχει την τρέχουσα κατάσταση των Management Fees για τον τρέχοντα μήνα
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import CommonExpenseCalculator
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction
from datetime import datetime, date

def check_management_fees_status():
    """Ελέγχει την κατάσταση των Management Fees σύμφωνα με την audit report"""
    
    print("🔍 MANAGEMENT FEES STATUS CHECK")
    print("=" * 50)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name} ({building.address})")
            print(f"📅 Financial System Start Date: {building.financial_system_start_date}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID=1")
            return
        
        # Ελέγχουμε τα διαμερίσματα
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # Ελέγχουμε τα Management Fees expenses για το τρέχον έτος
        from datetime import datetime
        current_year = datetime.now().year
        management_expenses_current = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=current_year
        ).order_by('date')
        
        print(f"\n📊 MANAGEMENT FEES EXPENSES {current_year}:")
        print(f"Αριθμός expenses: {management_expenses_current.count()}")
        
        total_management_current = 0
        for expense in management_expenses_current:
            print(f"  - {expense.date.strftime('%Y-%m')}: €{expense.amount:.2f}")
            total_management_current += expense.amount
        
        print(f"Συνολικό ποσό {current_year}: €{total_management_current:.2f}")
        
        # Ελέγχουμε τον υπολογισμό για Σεπτέμβριο 2024
        print(f"\n🧮 ΥΠΟΛΟΓΙΣΜΟΣ ΣΕΠΤΕΜΒΡΙΟΥ 2024:")
        
        try:
            calculator = CommonExpenseCalculator(building.id, "2024-09")  # Σεπτέμβριος 2024
            
            # Ελέγχουμε τις διαθέσιμες μεθόδους
            print(f"🔍 Διαθέσιμες μέθοδοι: {[method for method in dir(calculator) if not method.startswith('_')]}")
            
            # Παίρνουμε τα δεδομένα από το calculate_shares
            shares_data = calculator.calculate_shares()
            
            print(f"📊 Στοιχεία από calculate_shares:")
            print(f"  - Total expenses: €{shares_data.get('total_expenses', 0):.2f}")
            print(f"  - Apartments count: {shares_data.get('apartments_count', 0)}")
            
            # Ελέγχουμε τα management fees expenses για 2024
            management_expenses_2024 = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=2024
            )
            
            print(f"\n📊 MANAGEMENT FEES EXPENSES 2024:")
            total_management_2024 = 0
            for expense in management_expenses_2024:
                print(f"  - {expense.date.strftime('%Y-%m')}: €{expense.amount:.2f}")
                total_management_2024 += expense.amount
            
            print(f"Συνολικό ποσό 2024: €{total_management_2024:.2f}")
            
            # Ελέγχουμε τα management fees expenses για 2025
            management_expenses_2025 = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=2025
            )
            
            print(f"\n📊 MANAGEMENT FEES EXPENSES 2025:")
            total_management_2025 = 0
            for expense in management_expenses_2025:
                print(f"  - {expense.date.strftime('%Y-%m')}: €{expense.amount:.2f}")
                total_management_2025 += expense.amount
            
            print(f"Συνολικό ποσό 2025: €{total_management_2025:.2f}")
            
            # Ελέγχουμε τα transactions για management fees
            management_transactions = Transaction.objects.filter(
                building=building,
                type='management_fee'
            )
            
            print(f"\n📊 MANAGEMENT FEE TRANSACTIONS:")
            total_transactions = 0
            for transaction in management_transactions:
                print(f"  - {transaction.date.strftime('%Y-%m-%d')} Apt {transaction.apartment_number}: €{transaction.amount:.2f}")
                total_transactions += transaction.amount
            
            print(f"Συνολικό ποσό transactions: €{total_transactions:.2f}")
            
            # Ελέγχουμε όλα τα expenses στο σύστημα
            all_expenses = Expense.objects.filter(building=building)
            print(f"\n📊 ΟΛΑ ΤΑ EXPENSES ΣΤΟ ΣΥΣΤΗΜΑ:")
            print(f"Συνολικός αριθμός expenses: {all_expenses.count()}")
            
            for expense in all_expenses:
                print(f"  - {expense.date.strftime('%Y-%m')} {expense.category}: €{expense.amount:.2f}")
            
            # Ελέγχουμε όλα τα transactions στο σύστημα
            all_transactions = Transaction.objects.filter(building=building)
            print(f"\n📊 ΟΛΑ ΤΑ TRANSACTIONS ΣΤΟ ΣΥΣΤΗΜΑ:")
            print(f"Συνολικός αριθμός transactions: {all_transactions.count()}")
            
            transaction_types = {}
            for transaction in all_transactions:
                trans_type = transaction.type
                if trans_type not in transaction_types:
                    transaction_types[trans_type] = 0
                transaction_types[trans_type] += 1
            
            for trans_type, count in transaction_types.items():
                print(f"  - {trans_type}: {count} transactions")
            
            # Επαλήθευση σύμφωνα με την audit report
            print(f"\n✅ ΕΠΑΛΗΘΕΥΣΗ ΑΠΟ AUDIT REPORT:")
            expected_previous = 80.00  # 8 μήνες × €10.00
            expected_current = 10.00   # Σεπτέμβριος management fees
            expected_total = 90.00     # €80.00 + €10.00
            
            print(f"Αναμενόμενες παλαιότερες οφειλές: €{expected_previous:.2f}")
            print(f"Αναμενόμενες τρέχουσες υποχρεώσεις: €{expected_current:.2f}")
            print(f"Αναμενόμενο συνολικό: €{expected_total:.2f}")
            
            # Τρέχουσα κατάσταση
            actual_previous = total_management_2024
            actual_current = 0  # Δεν υπάρχουν management fees για Σεπτέμβριο 2024
            actual_total = actual_previous + actual_current
            
            print(f"\n🎯 ΤΡΕΧΟΥΣΑ ΚΑΤΑΣΤΑΣΗ:")
            print(f"Παλαιότερες οφειλές: €{actual_previous:.2f}")
            print(f"Τρέχουσες υποχρεώσεις: €{actual_current:.2f}")
            print(f"Συνολικό: €{actual_total:.2f}")
            
            if actual_previous == 0 and actual_current == 0:
                print(f"\n⚠️ ΠΡΟΒΛΗΜΑ: ΔΕΝ ΥΠΑΡΧΟΥΝ MANAGEMENT FEES ΣΤΟ ΣΥΣΤΗΜΑ!")
                print(f"Η audit report περιγράφει ότι πρέπει να υπάρχουν €90.00 management fees")
                print(f"αλλά το σύστημα δεν έχει κανένα management fee expense ή transaction")
            else:
                print(f"\n🎉 MANAGEMENT FEES ΥΠΑΡΧΟΥΝ ΣΤΟ ΣΥΣΤΗΜΑ!")
                
        except Exception as e:
            print(f"❌ Σφάλμα στον υπολογισμό: {e}")
            import traceback
            traceback.print_exc()
        
        # Ελέγχουμε και τον Σεπτέμβριο 2025 για year isolation
        print(f"\n🔄 ΕΛΕΓΧΟΣ YEAR ISOLATION (ΣΕΠΤΕΜΒΡΙΟΣ 2025):")
        # Ελέγχος year isolation
        print(f"\n🔄 ΕΛΕΓΧΟΣ YEAR ISOLATION:")
        print(f"Management fees 2024: €{total_management_2024:.2f}")
        print(f"Management fees 2025: €{total_management_2025:.2f}")
        
        if total_management_2024 == 0 and total_management_2025 > 0:
            print(f"✅ Year Isolation: Σωστό (δεν υπάρχουν management fees για 2024)")
        elif total_management_2024 > 0 and total_management_2025 > 0:
            print(f"⚠️ Year Isolation: Υπάρχουν management fees και για 2024 και για 2025")
        else:
            print(f"❌ Year Isolation: Πρόβλημα - δεν υπάρχουν management fees για κανένα έτος")

if __name__ == "__main__":
    check_management_fees_status()

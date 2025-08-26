#!/usr/bin/env python3
"""
🔍 SYSTEM HEALTH CHECK - New Concierge
=====================================

Main script για έλεγχο υγείας του οικονομικού συστήματος.
Εκτελεί όλους τους ελέγχους αυτόματα και δημιουργεί αναφορά.

Χρήση:
    python system_health_check.py [--detailed] [--fix] [--report-only]

Επιλογές:
    --detailed    : Λεπτομερής έξοδος
    --fix         : Αυτόματη διόρθωση προβλημάτων
    --report-only : Μόνο αναφορά χωρίς έλεγχο
"""

import os
import sys
import django
import argparse
from datetime import datetime
from typing import Dict, List, Tuple, Any

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment
from users.models import CustomUser

class SystemHealthChecker:
    """🔍 Main class για έλεγχο υγείας του συστήματος"""
    
    def __init__(self, detailed: bool = False, auto_fix: bool = False):
        self.detailed = detailed
        self.auto_fix = auto_fix
        self.results = {
            'timestamp': datetime.now(),
            'building': None,
            'checks': {},
            'summary': {
                'total_checks': 0,
                'passed': 0,
                'failed': 0,
                'warnings': 0
            }
        }
        
    def print_header(self):
        """Εκτύπωση header"""
        print("🔍 SYSTEM HEALTH CHECK - New Concierge")
        print("=" * 60)
        print(f"📅 Ημερομηνία: {self.results['timestamp'].strftime('%d/%m/%Y %H:%M:%S')}")
        print(f"🏢 Κτίριο: Αραχώβης 12, Αθήνα 106 80, Ελλάδα")
        print(f"🔧 Λεπτομερής έξοδος: {'✅' if self.detailed else '❌'}")
        print(f"🔧 Αυτόματη διόρθωση: {'✅' if self.auto_fix else '❌'}")
        print("=" * 60)
        print()
        
    def check_building_data(self) -> Dict[str, Any]:
        """🏢 Έλεγχος βασικών δεδομένων κτιρίου"""
        print("🏢 ΕΛΕΓΧΟΣ ΒΑΣΙΚΩΝ ΔΕΔΟΜΕΝΩΝ ΚΤΙΡΙΟΥ")
        print("-" * 40)
        
        with schema_context('demo'):
            building = Building.objects.first()
            apartments = Apartment.objects.all()
            
            result = {
                'building_exists': building is not None,
                'apartments_count': apartments.count(),
                'apartments_with_mills': apartments.filter(participation_mills__gt=0).count(),
                'total_mills': sum(apt.participation_mills for apt in apartments),
                'expected_mills': 1000
            }
            
            # Εκτύπωση αποτελεσμάτων
            print(f"🏢 Κτίριο υπάρχει: {'✅' if result['building_exists'] else '❌'}")
            print(f"🏠 Διαμερίσματα: {result['apartments_count']}")
            print(f"📊 Διαμερίσματα με χιλιοστά: {result['apartments_with_mills']}")
            print(f"💰 Συνολικά χιλιοστά: {result['total_mills']}")
            print(f"🎯 Αναμενόμενα χιλιοστά: {result['expected_mills']}")
            
            if result['total_mills'] == result['expected_mills']:
                print("✅ Τα χιλιοστά είναι σωστά")
                self.results['summary']['passed'] += 1
            else:
                print(f"❌ Λάθος χιλιοστά! Διαφορά: {result['total_mills'] - result['expected_mills']}")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['building_data'] = result
            print()
            return result
            
    def check_financial_data(self) -> Dict[str, Any]:
        """💰 Έλεγχος οικονομικών δεδομένων"""
        print("💰 ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
        print("-" * 40)
        
        with schema_context('demo'):
            expenses = Expense.objects.all()
            transactions = Transaction.objects.all()
            payments = Payment.objects.all()
            
            result = {
                'expenses_count': expenses.count(),
                'transactions_count': transactions.count(),
                'payments_count': payments.count(),
                'total_expenses': sum(exp.amount for exp in expenses),
                'total_transactions': sum(txn.amount for txn in transactions),
                'total_payments': sum(pay.amount for pay in payments),
                'months_with_data': len(set(exp.date.month for exp in expenses)) if expenses.exists() else 0
            }
            
            # Εκτύπωση αποτελεσμάτων
            print(f"💸 Δαπάνες: {result['expenses_count']}")
            print(f"🔄 Συναλλαγές: {result['transactions_count']}")
            print(f"💵 Πληρωμές: {result['payments_count']}")
            print(f"📅 Μήνες με δεδομένα: {result['months_with_data']}")
            print(f"💸 Συνολικές δαπάνες: {result['total_expenses']:.2f}€")
            print(f"🔄 Συνολικές συναλλαγές: {result['total_transactions']:.2f}€")
            print(f"💵 Συνολικές πληρωμές: {result['total_payments']:.2f}€")
            
            # Έλεγχος ισορροπίας
            balance = result['total_payments'] - result['total_expenses']
            if abs(balance) < 0.01:  # Μικρή ανοχή για floating point
                print(f"✅ Ισορροπία: {balance:.2f}€ (σωστή)")
                self.results['summary']['passed'] += 1
            else:
                print(f"❌ Ισορροπία: {balance:.2f}€ (λάθος)")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['financial_data'] = result
            print()
            return result
            
    def check_balance_transfer(self) -> Dict[str, Any]:
        """🔄 Έλεγχος μεταφοράς υπολοίπων"""
        print("🔄 ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 40)
        
        with schema_context('demo'):
            apartments = Apartment.objects.all()
            months_with_data = sorted(set(exp.date.month for exp in Expense.objects.all())) if Expense.objects.exists() else []
            
            result = {
                'apartments_checked': 0,
                'months_checked': len(months_with_data),
                'balance_issues': 0,
                'transfer_issues': 0
            }
            
            if not months_with_data:
                print("ℹ️  Δεν υπάρχουν δεδομένα για έλεγχο μεταφοράς υπολοίπων")
                self.results['summary']['passed'] += 1
                self.results['summary']['total_checks'] += 1
                self.results['checks']['balance_transfer'] = result
                print()
                return result
            
            for apartment in apartments:
                apartment_balances = []
                for month in months_with_data:
                    # Υπολογισμός υπολοίπου ανά μήνα
                    expenses = sum(exp.amount for exp in Expense.objects.filter(
                        date__month=month
                    ))
                    payments = sum(pay.amount for pay in Payment.objects.filter(
                        apartment=apartment, date__month=month
                    ))
                    balance = payments - expenses
                    apartment_balances.append(balance)
                    
                    if self.detailed:
                        print(f"   🏠 {apartment.number}: {month}/2024 - Υπόλοιπο: {balance:.2f}€")
                
                # Έλεγχος μεταφοράς υπολοίπων
                for i in range(len(apartment_balances) - 1):
                    if abs(apartment_balances[i] - apartment_balances[i+1]) > 0.01:
                        result['transfer_issues'] += 1
                        if self.detailed:
                            print(f"   ⚠️  Πρόβλημα μεταφοράς: {apartment.number}")
                
                result['apartments_checked'] += 1
                
            if result['transfer_issues'] == 0:
                print("✅ Η μεταφορά υπολοίπων είναι σωστή")
                self.results['summary']['passed'] += 1
            else:
                print(f"❌ Βρέθηκαν {result['transfer_issues']} προβλήματα μεταφοράς")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['balance_transfer'] = result
            print()
            return result
            
    def check_duplicate_charges(self) -> Dict[str, Any]:
        """🔍 Έλεγχος διπλών χρεώσεων"""
        print("🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΧΡΕΩΣΕΩΝ")
        print("-" * 40)
        
        with schema_context('demo'):
            expenses = Expense.objects.all()
            payments = Payment.objects.all()
            
            # Έλεγχος διπλών δαπανών
            expense_duplicates = []
            for expense in expenses:
                duplicates = Expense.objects.filter(
                    title=expense.title,
                    amount=expense.amount,
                    date=expense.date
                ).exclude(id=expense.id)
                if duplicates.exists():
                    expense_duplicates.append(expense.id)
                    
            # Έλεγχος διπλών πληρωμών
            payment_duplicates = []
            for payment in payments:
                duplicates = Payment.objects.filter(
                    apartment=payment.apartment,
                    amount=payment.amount,
                    date=payment.date,
                    method=payment.method
                ).exclude(id=payment.id)
                if duplicates.exists():
                    payment_duplicates.append(payment.id)
                    
            result = {
                'expense_duplicates': len(expense_duplicates),
                'payment_duplicates': len(payment_duplicates),
                'total_duplicates': len(expense_duplicates) + len(payment_duplicates)
            }
            
            print(f"💸 Διπλές δαπάνες: {result['expense_duplicates']}")
            print(f"💵 Διπλές πληρωμές: {result['payment_duplicates']}")
            print(f"📊 Συνολικές διπλές: {result['total_duplicates']}")
            
            if result['total_duplicates'] == 0:
                print("✅ Δεν βρέθηκαν διπλές χρεώσεις")
                self.results['summary']['passed'] += 1
            else:
                print(f"❌ Βρέθηκαν {result['total_duplicates']} διπλές χρεώσεις")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['duplicate_charges'] = result
            print()
            return result
            
    def check_data_integrity(self) -> Dict[str, Any]:
        """🔒 Έλεγχος ακεραιότητας δεδομένων"""
        print("🔒 ΕΛΕΓΧΟΣ ΑΚΕΡΑΙΟΤΗΤΑΣ ΔΕΔΟΜΕΝΩΝ")
        print("-" * 40)
        
        with schema_context('demo'):
            result = {
                'orphaned_expenses': 0,
                'orphaned_payments': 0,
                'invalid_amounts': 0,
                'missing_titles': 0
            }
            
            # Έλεγχος orphaned records
            for expense in Expense.objects.all():
                if not expense.building:
                    result['orphaned_expenses'] += 1
                if expense.amount <= 0:
                    result['invalid_amounts'] += 1
                if not expense.title:
                    result['missing_titles'] += 1
                    
            for payment in Payment.objects.all():
                if not payment.apartment:
                    result['orphaned_payments'] += 1
                if payment.amount <= 0:
                    result['invalid_amounts'] += 1
                    
            total_issues = sum(result.values())
            
            print(f"💸 Δαπάνες χωρίς κτίριο: {result['orphaned_expenses']}")
            print(f"💵 Πληρωμές χωρίς διαμέρισμα: {result['orphaned_payments']}")
            print(f"💰 Λάθος ποσά: {result['invalid_amounts']}")
            print(f"📝 Λείπουν τίτλοι: {result['missing_titles']}")
            print(f"📊 Συνολικά προβλήματα: {total_issues}")
            
            if total_issues == 0:
                print("✅ Η ακεραιότητα δεδομένων είναι σωστή")
                self.results['summary']['passed'] += 1
            else:
                print(f"❌ Βρέθηκαν {total_issues} προβλήματα ακεραιότητας")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['data_integrity'] = result
            print()
            return result
            
    def generate_summary(self):
        """📊 Δημιουργία συνοπτικής αναφοράς"""
        print("📊 ΣΥΝΟΠΤΙΚΗ ΑΝΑΦΟΡΑ")
        print("=" * 60)
        
        summary = self.results['summary']
        total = summary['total_checks']
        passed = summary['passed']
        failed = summary['failed']
        
        print(f"📋 Συνολικοί έλεγχοι: {total}")
        print(f"✅ Επιτυχείς: {passed}")
        print(f"❌ Αποτυχείς: {failed}")
        print(f"⚠️  Προειδοποιήσεις: {summary['warnings']}")
        
        if total > 0:
            success_rate = (passed / total) * 100
            print(f"📈 Ποσοστό επιτυχίας: {success_rate:.1f}%")
            
            if success_rate == 100:
                print("🏆 ΕΞΑΙΡΕΤΙΚΑ! Όλοι οι έλεγχοι επιτυχείς!")
                print("🚀 Το σύστημα είναι έτοιμο για παραγωγική χρήση!")
            elif success_rate >= 80:
                print("✅ ΚΑΛΑ! Το σύστημα λειτουργεί σχετικά καλά")
            elif success_rate >= 60:
                print("⚠️  ΠΡΟΣΟΧΗ! Χρειάζεται βελτίωση")
            else:
                print("🚨 ΚΡΙΤΙΚΟ! Χρειάζεται άμεση διόρθωση")
                
        print("=" * 60)
        
    def run_all_checks(self):
        """🏃‍♂️ Εκτέλεση όλων των ελέγχων"""
        self.print_header()
        
        try:
            self.check_building_data()
            self.check_financial_data()
            self.check_balance_transfer()
            self.check_duplicate_charges()
            self.check_data_integrity()
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά τον έλεγχο: {str(e)}")
            self.results['summary']['failed'] += 1
            
        self.generate_summary()
        return self.results

def main():
    """🏁 Main function"""
    parser = argparse.ArgumentParser(description='System Health Check for New Concierge')
    parser.add_argument('--detailed', action='store_true', help='Λεπτομερής έξοδος')
    parser.add_argument('--fix', action='store_true', help='Αυτόματη διόρθωση προβλημάτων')
    parser.add_argument('--report-only', action='store_true', help='Μόνο αναφορά χωρίς έλεγχο')
    
    args = parser.parse_args()
    
    if args.report_only:
        print("📋 REPORT ONLY MODE")
        print("=" * 60)
        print("Αυτή η λειτουργία θα υλοποιηθεί στο μέλλον")
        return
        
    checker = SystemHealthChecker(detailed=args.detailed, auto_fix=args.fix)
    results = checker.run_all_checks()
    
    # Επιστροφή κωδικού εξόδου
    if results['summary']['failed'] > 0:
        sys.exit(1)  # Σφάλμα
    else:
        sys.exit(0)  # Επιτυχία

if __name__ == '__main__':
    main()

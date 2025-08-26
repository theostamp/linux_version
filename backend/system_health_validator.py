#!/usr/bin/env python3
"""
🏥 System Health Validator

Σκοπός: Συνολικός έλεγχος υγείας του συστήματος με αυτόματη ανάλυση και αναφορές
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from typing import Dict, List, Any

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db import models
from financial.models import Transaction, Expense, Payment
from apartments.models import Apartment
from buildings.models import Building

class SystemHealthValidator:
    """Validator για συνολική υγεία του συστήματος"""
    
    def __init__(self):
        self.results = {
            'overall_health': 'unknown',
            'checks_performed': 0,
            'issues_found': 0,
            'warnings': 0,
            'successes': 0,
            'details': {},
            'timestamp': datetime.now().isoformat(),
            'recommendations': []
        }
    
    def validate_all(self) -> Dict[str, Any]:
        """Εκτέλεση όλων των ελέγχων"""
        
        print("🏥 SYSTEM HEALTH VALIDATION")
        print("=" * 60)
        
        with schema_context('demo'):
            # 1. Building Data Validation
            self.validate_buildings()
            
            # 2. Apartment Data Validation
            self.validate_apartments()
            
            # 3. Financial Data Validation
            self.validate_financial_data()
            
            # 4. Balance Consistency Validation
            self.validate_balance_consistency()
            
            # 5. Reserve Fund Validation
            self.validate_reserve_funds()
            
            # 6. Participation Mills Validation
            self.validate_participation_mills()
            
            # 7. Transaction Integrity Validation
            self.validate_transaction_integrity()
            
            # 8. Data Completeness Validation
            self.validate_data_completeness()
        
        # Calculate overall health
        self.calculate_overall_health()
        
        return self.results
    
    def validate_buildings(self):
        """Έλεγχος δεδομένων κτιρίων"""
        
        print("\n🏢 BUILDING DATA VALIDATION")
        print("-" * 40)
        
        buildings = Building.objects.all()
        building_issues = []
        building_warnings = []
        building_successes = 0
        
        for building in buildings:
            # Έλεγχος βασικών πεδίων
            if not building.name:
                building_issues.append(f"Κτίριο {building.id}: Χωρίς όνομα")
            
            if not building.address:
                building_warnings.append(f"Κτίριο {building.name}: Χωρίς διεύθυνση")
            
            # Έλεγχος αποθεματικού
            if building.current_reserve < 0:
                building_issues.append(f"Κτίριο {building.name}: Αρνητικό αποθεματικό ({building.current_reserve}€)")
            
            # Έλεγχος ρυθμίσεων αποθεματικού
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                if monthly_target <= 0:
                    building_issues.append(f"Κτίριο {building.name}: Λάθος μηνιαία δόση ({monthly_target}€)")
            else:
                building_warnings.append(f"Κτίριο {building.name}: Δεν έχουν οριστεί στόχος ή διάρκεια αποθεματικού")
            
            building_successes += 1
        
        self.results['details']['buildings'] = {
            'total': buildings.count(),
            'issues': building_issues,
            'warnings': building_warnings,
            'successes': building_successes
        }
        
        self.results['issues_found'] += len(building_issues)
        self.results['warnings'] += len(building_warnings)
        self.results['successes'] += building_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {buildings.count()} κτίρια")
        print(f"   Issues: {len(building_issues)}, Warnings: {len(building_warnings)}")
    
    def validate_apartments(self):
        """Έλεγχος δεδομένων διαμερισμάτων"""
        
        print("\n🏠 APARTMENT DATA VALIDATION")
        print("-" * 40)
        
        apartments = Apartment.objects.all()
        apartment_issues = []
        apartment_warnings = []
        apartment_successes = 0
        
        for apartment in apartments:
            # Έλεγχος βασικών πεδίων
            if not apartment.number:
                apartment_issues.append(f"Διαμέρισμα {apartment.id}: Χωρίς αριθμό")
            
            if not apartment.building:
                apartment_issues.append(f"Διαμέρισμα {apartment.number}: Χωρίς κτίριο")
            
            # Έλεγχος χιλιοστίμων
            if apartment.participation_mills <= 0:
                apartment_issues.append(f"Διαμέρισμα {apartment.number}: Λάθος χιλιόστιμα ({apartment.participation_mills})")
            
            # Έλεγχος υπολοίπου
            if apartment.current_balance is None:
                apartment_warnings.append(f"Διαμέρισμα {apartment.number}: Χωρίς υπόλοιπο")
            
            apartment_successes += 1
        
        # Έλεγχος συνολικών χιλιοστίμων ανά κτίριο
        buildings = Building.objects.all()
        for building in buildings:
            building_apartments = apartments.filter(building=building)
            total_mills = sum(apt.participation_mills for apt in building_apartments)
            
            if total_mills != 1000:
                apartment_issues.append(f"Κτίριο {building.name}: Συνολικά χιλιόστιμα {total_mills} ≠ 1000")
        
        self.results['details']['apartments'] = {
            'total': apartments.count(),
            'issues': apartment_issues,
            'warnings': apartment_warnings,
            'successes': apartment_successes
        }
        
        self.results['issues_found'] += len(apartment_issues)
        self.results['warnings'] += len(apartment_warnings)
        self.results['successes'] += apartment_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {apartments.count()} διαμερίσματα")
        print(f"   Issues: {len(apartment_issues)}, Warnings: {len(apartment_warnings)}")
    
    def validate_financial_data(self):
        """Έλεγχος οικονομικών δεδομένων"""
        
        print("\n💰 FINANCIAL DATA VALIDATION")
        print("-" * 40)
        
        expenses = Expense.objects.all()
        payments = Payment.objects.all()
        transactions = Transaction.objects.all()
        
        financial_issues = []
        financial_warnings = []
        financial_successes = 0
        
        # Έλεγχος δαπανών
        for expense in expenses:
            if expense.amount <= 0:
                financial_issues.append(f"Δαπάνη {expense.title}: Λάθος ποσό ({expense.amount}€)")
            
            if not expense.date:
                financial_warnings.append(f"Δαπάνη {expense.title}: Χωρίς ημερομηνία")
            
            financial_successes += 1
        
        # Έλεγχος πληρωμών
        for payment in payments:
            if payment.amount <= 0:
                financial_issues.append(f"Πληρωμή {payment.apartment.number}: Λάθος ποσό ({payment.amount}€)")
            
            if not payment.date:
                financial_warnings.append(f"Πληρωμή {payment.apartment.number}: Χωρίς ημερομηνία")
            
            financial_successes += 1
        
        # Έλεγχος συναλλαγών
        for transaction in transactions:
            if transaction.amount == 0:
                financial_warnings.append(f"Συναλλαγή {transaction.id}: Μηδενικό ποσό")
            
            financial_successes += 1
        
        self.results['details']['financial'] = {
            'expenses': expenses.count(),
            'payments': payments.count(),
            'transactions': transactions.count(),
            'issues': financial_issues,
            'warnings': financial_warnings,
            'successes': financial_successes
        }
        
        self.results['issues_found'] += len(financial_issues)
        self.results['warnings'] += len(financial_warnings)
        self.results['successes'] += financial_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {expenses.count()} δαπάνες, {payments.count()} πληρωμές, {transactions.count()} συναλλαγές")
        print(f"   Issues: {len(financial_issues)}, Warnings: {len(financial_warnings)}")
    
    def validate_balance_consistency(self):
        """Έλεγχος συνέπειας υπολοίπων"""
        
        print("\n⚖️ BALANCE CONSISTENCY VALIDATION")
        print("-" * 40)
        
        apartments = Apartment.objects.all()
        balance_issues = []
        balance_warnings = []
        balance_successes = 0
        
        for apartment in apartments:
            # Υπολογισμός αναμενόμενου υπολοίπου από συναλλαγές
            transactions = Transaction.objects.filter(apartment=apartment)
            expected_balance = sum(t.amount for t in transactions)
            
            if apartment.current_balance != expected_balance:
                balance_issues.append(
                    f"Διαμέρισμα {apartment.number}: Υπόλοιπο {apartment.current_balance}€ ≠ αναμενόμενο {expected_balance}€"
                )
            else:
                balance_successes += 1
        
        self.results['details']['balance_consistency'] = {
            'total_apartments': apartments.count(),
            'issues': balance_issues,
            'warnings': balance_warnings,
            'successes': balance_successes
        }
        
        self.results['issues_found'] += len(balance_issues)
        self.results['warnings'] += len(balance_warnings)
        self.results['successes'] += balance_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {apartments.count()} διαμερίσματα για συνέπεια υπολοίπων")
        print(f"   Issues: {len(balance_issues)}, Warnings: {len(balance_warnings)}")
    
    def validate_reserve_funds(self):
        """Έλεγχος αποθεματικών ταμείων"""
        
        print("\n🏦 RESERVE FUND VALIDATION")
        print("-" * 40)
        
        buildings = Building.objects.all()
        reserve_issues = []
        reserve_warnings = []
        reserve_successes = 0
        
        for building in buildings:
            # Έλεγχος αρνητικού αποθεματικού
            if building.current_reserve < 0:
                reserve_issues.append(f"Κτίριο {building.name}: Αρνητικό αποθεματικό ({building.current_reserve}€)")
            
            # Έλεγχος ρυθμίσεων
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                if monthly_target <= 0:
                    reserve_issues.append(f"Κτίριο {building.name}: Λάθος μηνιαία δόση ({monthly_target}€)")
            else:
                reserve_warnings.append(f"Κτίριο {building.name}: Δεν έχουν οριστεί ρυθμίσεις αποθεματικού")
            
            reserve_successes += 1
        
        self.results['details']['reserve_funds'] = {
            'total_buildings': buildings.count(),
            'issues': reserve_issues,
            'warnings': reserve_warnings,
            'successes': reserve_successes
        }
        
        self.results['issues_found'] += len(reserve_issues)
        self.results['warnings'] += len(reserve_warnings)
        self.results['successes'] += reserve_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {buildings.count()} κτίρια για αποθεματικά")
        print(f"   Issues: {len(reserve_issues)}, Warnings: {len(reserve_warnings)}")
    
    def validate_participation_mills(self):
        """Έλεγχος χιλιοστίμων"""
        
        print("\n📊 PARTICIPATION MILLS VALIDATION")
        print("-" * 40)
        
        buildings = Building.objects.all()
        mills_issues = []
        mills_warnings = []
        mills_successes = 0
        
        for building in buildings:
            apartments = Apartment.objects.filter(building=building)
            total_mills = sum(apt.participation_mills for apt in apartments)
            
            if total_mills != 1000:
                mills_issues.append(f"Κτίριο {building.name}: Συνολικά χιλιόστιμα {total_mills} ≠ 1000")
            else:
                mills_successes += 1
            
            # Έλεγχος για αρνητικά χιλιόστιμα
            for apartment in apartments:
                if apartment.participation_mills <= 0:
                    mills_issues.append(f"Διαμέρισμα {apartment.number}: Λάθος χιλιόστιμα ({apartment.participation_mills})")
        
        self.results['details']['participation_mills'] = {
            'total_buildings': buildings.count(),
            'issues': mills_issues,
            'warnings': mills_warnings,
            'successes': mills_successes
        }
        
        self.results['issues_found'] += len(mills_issues)
        self.results['warnings'] += len(mills_warnings)
        self.results['successes'] += mills_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {buildings.count()} κτίρια για χιλιόστιμα")
        print(f"   Issues: {len(mills_issues)}, Warnings: {len(mills_warnings)}")
    
    def validate_transaction_integrity(self):
        """Έλεγχος ακεραιότητας συναλλαγών"""
        
        print("\n🔒 TRANSACTION INTEGRITY VALIDATION")
        print("-" * 40)
        
        transactions = Transaction.objects.all()
        integrity_issues = []
        integrity_warnings = []
        integrity_successes = 0
        
        for transaction in transactions:
            # Έλεγχος για μηδενικά ποσά
            if transaction.amount == 0:
                integrity_warnings.append(f"Συναλλαγή {transaction.id}: Μηδενικό ποσό")
            
            # Έλεγχος για αρνητικά ποσά (εκτός από επιστροφές)
            if transaction.amount < 0 and transaction.type not in ['refund', 'balance_adjustment']:
                integrity_warnings.append(f"Συναλλαγή {transaction.id}: Αρνητικό ποσό για {transaction.type}")
            
            # Έλεγχος για missing references
            if transaction.type in ['common_expense_payment', 'expense_payment'] and not transaction.reference_id:
                integrity_warnings.append(f"Συναλλαγή {transaction.id}: Χωρίς reference ID")
            
            integrity_successes += 1
        
        self.results['details']['transaction_integrity'] = {
            'total_transactions': transactions.count(),
            'issues': integrity_issues,
            'warnings': integrity_warnings,
            'successes': integrity_successes
        }
        
        self.results['issues_found'] += len(integrity_issues)
        self.results['warnings'] += len(integrity_warnings)
        self.results['successes'] += integrity_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {transactions.count()} συναλλαγές για ακεραιότητα")
        print(f"   Issues: {len(integrity_issues)}, Warnings: {len(integrity_warnings)}")
    
    def validate_data_completeness(self):
        """Έλεγχος πληρότητας δεδομένων"""
        
        print("\n📋 DATA COMPLETENESS VALIDATION")
        print("-" * 40)
        
        completeness_issues = []
        completeness_warnings = []
        completeness_successes = 0
        
        # Έλεγχος κτιρίων
        buildings = Building.objects.all()
        for building in buildings:
            if not building.name:
                completeness_issues.append(f"Κτίριο {building.id}: Χωρίς όνομα")
            else:
                completeness_successes += 1
        
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.all()
        for apartment in apartments:
            if not apartment.number:
                completeness_issues.append(f"Διαμέρισμα {apartment.id}: Χωρίς αριθμό")
            else:
                completeness_successes += 1
        
        # Έλεγχος δαπανών
        expenses = Expense.objects.all()
        for expense in expenses:
            if not expense.title:
                completeness_issues.append(f"Δαπάνη {expense.id}: Χωρίς τίτλο")
            else:
                completeness_successes += 1
        
        self.results['details']['data_completeness'] = {
            'total_records': buildings.count() + apartments.count() + expenses.count(),
            'issues': completeness_issues,
            'warnings': completeness_warnings,
            'successes': completeness_successes
        }
        
        self.results['issues_found'] += len(completeness_issues)
        self.results['warnings'] += len(completeness_warnings)
        self.results['successes'] += completeness_successes
        self.results['checks_performed'] += 1
        
        print(f"✅ Ελέγχθηκαν {buildings.count() + apartments.count() + expenses.count()} εγγραφές για πληρότητα")
        print(f"   Issues: {len(completeness_issues)}, Warnings: {len(completeness_warnings)}")
    
    def calculate_overall_health(self):
        """Υπολογισμός συνολικής υγείας"""
        
        total_checks = self.results['checks_performed']
        total_issues = self.results['issues_found']
        total_warnings = self.results['warnings']
        
        if total_issues == 0 and total_warnings == 0:
            self.results['overall_health'] = 'excellent'
            self.results['recommendations'].append("Το σύστημα είναι σε άριστη κατάσταση!")
        elif total_issues == 0 and total_warnings <= 5:
            self.results['overall_health'] = 'good'
            self.results['recommendations'].append("Το σύστημα είναι σε καλή κατάσταση με λίγες προειδοποιήσεις.")
        elif total_issues <= 3:
            self.results['overall_health'] = 'fair'
            self.results['recommendations'].append("Το σύστημα χρειάζεται κάποια διορθώσεις.")
        else:
            self.results['overall_health'] = 'poor'
            self.results['recommendations'].append("Το σύστημα χρειάζεται άμεσες διορθώσεις!")
        
        # Προσθήκη συγκεκριμένων συστάσεων
        if total_issues > 0:
            self.results['recommendations'].append(f"Διόρθωση {total_issues} κρίσιμων προβλημάτων.")
        
        if total_warnings > 0:
            self.results['recommendations'].append(f"Επιθεώρηση {total_warnings} προειδοποιήσεων.")
        
        # Εκτύπωση συνολικής κατάστασης
        health_emoji = {
            'excellent': '🟢',
            'good': '🟡', 
            'fair': '🟠',
            'poor': '🔴'
        }
        
        print(f"\n🏥 ΣΥΝΟΛΙΚΗ ΚΑΤΑΣΤΑΣΗ ΥΓΕΙΑΣ")
        print("=" * 60)
        print(f"{health_emoji[self.results['overall_health']]} Κατάσταση: {self.results['overall_health'].upper()}")
        print(f"📊 Ελέγχοι: {total_checks}")
        print(f"❌ Προβλήματα: {total_issues}")
        print(f"⚠️ Προειδοποιήσεις: {total_warnings}")
        print(f"✅ Επιτυχίες: {self.results['successes']}")
        
        if self.results['recommendations']:
            print(f"\n💡 ΣΥΣΤΑΣΕΙΣ:")
            for rec in self.results['recommendations']:
                print(f"   • {rec}")

def run_system_health_check():
    """Εκτέλεση ελέγχου υγείας συστήματος"""
    
    validator = SystemHealthValidator()
    results = validator.validate_all()
    
    return results

if __name__ == "__main__":
    results = run_system_health_check()
    print(f"\n✅ Ο έλεγχος υγείας ολοκληρώθηκε!")
    print(f"📋 Αποτελέσματα: {results['overall_health']}")


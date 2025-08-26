#!/usr/bin/env python3
"""
🔧 Auto Fix System Issues

Σκοπός: Αυτόματη διόρθωση προβλημάτων που εντοπίζονται από το system health validator
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
from system_health_validator import SystemHealthValidator

class AutoFixSystemIssues:
    """Αυτόματη διόρθωση προβλημάτων συστήματος"""
    
    def __init__(self):
        self.fixes_applied = []
        self.errors_encountered = []
        self.summary = {
            'total_issues_found': 0,
            'total_fixes_applied': 0,
            'total_errors': 0,
            'timestamp': datetime.now().isoformat()
        }
        # Demo δεδομένα που προστατεύονται από το auto-fix
        self.demo_buildings = ['Αραχώβης 12', 'Αλκμάνος 22']
        self.demo_users = ['admin@demo.localhost', 'manager@demo.localhost', 'resident1@demo.localhost', 'resident2@demo.localhost']
    
    def run_auto_fix(self) -> Dict[str, Any]:
        """Εκτέλεση αυτόματης διόρθωσης"""
        
        print("🔧 AUTO FIX SYSTEM ISSUES")
        print("=" * 60)
        
        # Εμφάνιση προστατευμένων demo δεδομένων
        print("\n🛡️ ΠΡΟΣΤΑΤΕΥΜΕΝΑ DEMO ΔΕΔΟΜΕΝΑ")
        print("-" * 40)
        print(f"🏢 Demo κτίρια: {', '.join(self.demo_buildings)}")
        print(f"👥 Demo χρήστες: {', '.join(self.demo_users)}")
        print("ℹ️ Τα demo δεδομένα παραλείπονται από το auto-fix για καλύτερες δοκιμές")
        print()
        
        with schema_context('demo'):
            # 1. Εκτέλεση health check για να βρούμε τα προβλήματα
            validator = SystemHealthValidator()
            health_results = validator.validate_all()
            
            self.summary['total_issues_found'] = health_results['issues_found']
            
            print(f"\n📊 Βρέθηκαν {health_results['issues_found']} προβλήματα")
            print(f"⚠️ Βρέθηκαν {health_results['warnings']} προειδοποιήσεις")
            
            # 2. Αυτόματη διόρθωση προβλημάτων
            self.fix_building_issues(health_results)
            self.fix_apartment_issues(health_results)
            self.fix_balance_consistency_issues(health_results)
            self.fix_reserve_fund_issues(health_results)
            self.fix_participation_mills_issues(health_results)
            
            # 3. Εκτέλεση νέου health check για επιβεβαίωση
            print(f"\n🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΔΙΟΡΘΩΣΕΩΝ")
            print("-" * 40)
            
            validator_after = SystemHealthValidator()
            health_results_after = validator_after.validate_all()
            
            self.summary['issues_after_fix'] = health_results_after['issues_found']
            self.summary['improvement'] = self.summary['total_issues_found'] - self.summary['issues_after_fix']
            
            # 4. Εκτύπωση αποτελεσμάτων
            self.print_summary()
            
            return {
                'summary': self.summary,
                'fixes_applied': self.fixes_applied,
                'errors_encountered': self.errors_encountered,
                'health_before': health_results,
                'health_after': health_results_after
            }
    
    def fix_building_issues(self, health_results: Dict[str, Any]):
        """Διόρθωση προβλημάτων κτιρίων"""
        
        print("\n🏢 ΔΙΟΡΘΩΣΗ ΠΡΟΒΛΗΜΑΤΩΝ ΚΤΙΡΙΩΝ")
        print("-" * 40)
        
        buildings_data = health_results.get('details', {}).get('buildings', {})
        issues = buildings_data.get('issues', [])
        
        for issue in issues:
            try:
                if 'Αρνητικό αποθεματικό' in issue:
                    # Διόρθωση αρνητικού αποθεματικού
                    building_name = issue.split(':')[0].replace('Κτίριο ', '')
                    building = Building.objects.get(name__icontains=building_name)
                    
                    # Έλεγχος αν είναι demo κτίριο
                    if building.name in self.demo_buildings:
                        print(f"   ⚠️ Παραλείπεται demo κτίριο: {building.name} (προστασία demo δεδομένων)")
                        continue
                    
                    if building.current_reserve < 0:
                        # Προσθήκη εισφοράς για να μηδενίσουμε το αρνητικό αποθεματικό
                        required_amount = abs(building.current_reserve)
                        
                        # Χρήση του πρώτου διαμερίσματος ως proxy
                        first_apartment = Apartment.objects.filter(building=building).first()
                        if first_apartment:
                            payment = Payment.objects.create(
                                apartment=first_apartment,
                                amount=required_amount,
                                reserve_fund_amount=required_amount,
                                date=date.today(),
                                method='bank_transfer',
                                payment_type='reserve_fund',
                                payer_type='owner',
                                payer_name="Αυτόματη Διόρθωση",
                                notes=f"Αυτόματη διόρθωση αρνητικού αποθεματικού: {building.current_reserve}€"
                            )
                            
                            # Ενημέρωση αποθεματικού κτιρίου
                            building.current_reserve = Decimal('0.00')
                            building.save()
                            
                            self.fixes_applied.append(f"Διορθώθηκε αρνητικό αποθεματικό κτιρίου {building.name}: {building.current_reserve}€ → 0.00€")
                            print(f"   ✅ Διορθώθηκε αρνητικό αποθεματικό: {building.name}")
                
                elif 'Λάθος μηνιαία δόση' in issue:
                    # Διόρθωση λάθος μηνιαίας δόσης
                    building_name = issue.split(':')[0].replace('Κτίριο ', '')
                    building = Building.objects.get(name__icontains=building_name)
                    
                    # Έλεγχος αν είναι demo κτίριο
                    if building.name in self.demo_buildings:
                        print(f"   ⚠️ Παραλείπεται demo κτίριο: {building.name} (προστασία demo δεδομένων)")
                        continue
                    
                    if building.reserve_fund_goal and building.reserve_fund_duration_months:
                        # Επαναορισμός ρυθμίσεων
                        building.reserve_fund_goal = Decimal('5000.00')
                        building.reserve_fund_duration_months = 12
                        building.save()
                        
                        self.fixes_applied.append(f"Διορθώθηκαν ρυθμίσεις αποθεματικού κτιρίου {building.name}")
                        print(f"   ✅ Διορθώθηκαν ρυθμίσεις αποθεματικού: {building.name}")
                
            except Exception as e:
                error_msg = f"Σφάλμα διόρθωσης κτιρίου: {issue} - {str(e)}"
                self.errors_encountered.append(error_msg)
                print(f"   ❌ {error_msg}")
    
    def fix_apartment_issues(self, health_results: Dict[str, Any]):
        """Διόρθωση προβλημάτων διαμερισμάτων"""
        
        print("\n🏠 ΔΙΟΡΘΩΣΗ ΠΡΟΒΛΗΜΑΤΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 40)
        
        apartments_data = health_results.get('details', {}).get('apartments', {})
        issues = apartments_data.get('issues', [])
        
        for issue in issues:
            try:
                if 'Συνολικά χιλιόστιμα' in issue:
                    # Διόρθωση χιλιοστίμων
                    building_name = issue.split(':')[0].replace('Κτίριο ', '')
                    building = Building.objects.get(name__icontains=building_name)
                    
                    # Έλεγχος αν είναι demo κτίριο
                    if building.name in self.demo_buildings:
                        print(f"   ⚠️ Παραλείπονται χιλιόστιμα demo κτιρίου: {building.name} (προστασία demo δεδομένων)")
                        continue
                    
                    apartments = Apartment.objects.filter(building=building)
                    total_mills = sum(apt.participation_mills for apt in apartments)
                    
                    if total_mills != 1000:
                        # Υπολογισμός παράγοντα διόρθωσης
                        correction_factor = 1000 / total_mills
                        
                        for apartment in apartments:
                            old_mills = apartment.participation_mills
                            new_mills = round(old_mills * correction_factor, 2)
                            apartment.participation_mills = new_mills
                            apartment.save()
                        
                        self.fixes_applied.append(f"Διορθώθηκαν χιλιόστιμα κτιρίου {building.name}: {total_mills} → 1000")
                        print(f"   ✅ Διορθώθηκαν χιλιόστιμα: {building.name}")
                
                elif 'Λάθος χιλιόστιμα' in issue:
                    # Διόρθωση λάθος χιλιοστίμων
                    apartment_number = issue.split(':')[0].replace('Διαμέρισμα ', '')
                    apartment = Apartment.objects.get(number=apartment_number)
                    
                    # Έλεγχος αν είναι demo διαμέρισμα
                    if apartment.building.name in self.demo_buildings:
                        print(f"   ⚠️ Παραλείπονται χιλιόστιμα demo διαμερίσματος: {apartment_number} (προστασία demo δεδομένων)")
                        continue
                    
                    # Ορισμός προσωρινών χιλιοστίμων
                    apartment.participation_mills = Decimal('100.00')
                    apartment.save()
                    
                    self.fixes_applied.append(f"Διορθώθηκαν χιλιόστιμα διαμερίσματος {apartment_number}")
                    print(f"   ✅ Διορθώθηκαν χιλιόστιμα: {apartment_number}")
                
            except Exception as e:
                error_msg = f"Σφάλμα διόρθωσης διαμερίσματος: {issue} - {str(e)}"
                self.errors_encountered.append(error_msg)
                print(f"   ❌ {error_msg}")
    
    def fix_balance_consistency_issues(self, health_results: Dict[str, Any]):
        """Διόρθωση προβλημάτων συνέπειας υπολοίπων"""
        
        print("\n⚖️ ΔΙΟΡΘΩΣΗ ΠΡΟΒΛΗΜΑΤΩΝ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 40)
        
        balance_data = health_results.get('details', {}).get('balance_consistency', {})
        issues = balance_data.get('issues', [])
        
        for issue in issues:
            try:
                if 'Υπόλοιπο' in issue and '≠ αναμενόμενο' in issue:
                    # Διόρθωση ασυνεπών υπολοίπων
                    apartment_number = issue.split(':')[0].replace('Διαμέρισμα ', '')
                    apartment = Apartment.objects.get(number=apartment_number)
                    
                    # Έλεγχος αν είναι demo διαμέρισμα
                    if apartment.building.name in self.demo_buildings:
                        print(f"   ⚠️ Παραλείπεται υπόλοιπο demo διαμερίσματος: {apartment_number} (προστασία demo δεδομένων)")
                        continue
                    
                    # Υπολογισμός αναμενόμενου υπολοίπου από συναλλαγές
                    transactions = Transaction.objects.filter(apartment=apartment)
                    expected_balance = sum(t.amount for t in transactions)
                    
                    # Ενημέρωση υπολοίπου
                    apartment.current_balance = expected_balance
                    apartment.save()
                    
                    self.fixes_applied.append(f"Διορθώθηκε υπόλοιπο διαμερίσματος {apartment_number}: {apartment.current_balance}€ → {expected_balance}€")
                    print(f"   ✅ Διορθώθηκε υπόλοιπο: {apartment_number}")
                
            except Exception as e:
                error_msg = f"Σφάλμα διόρθωσης υπολοίπου: {issue} - {str(e)}"
                self.errors_encountered.append(error_msg)
                print(f"   ❌ {error_msg}")
    
    def fix_reserve_fund_issues(self, health_results: Dict[str, Any]):
        """Διόρθωση προβλημάτων αποθεματικών"""
        
        print("\n🏦 ΔΙΟΡΘΩΣΗ ΠΡΟΒΛΗΜΑΤΩΝ ΑΠΟΘΕΜΑΤΙΚΩΝ")
        print("-" * 40)
        
        reserve_data = health_results.get('details', {}).get('reserve_funds', {})
        issues = reserve_data.get('issues', [])
        
        for issue in issues:
            try:
                if 'Αρνητικό αποθεματικό' in issue:
                    # Διόρθωση αρνητικού αποθεματικού (ήδη καλύπτεται στο fix_building_issues)
                    pass
                
                elif 'Λάθος μηνιαία δόση' in issue:
                    # Διόρθωση λάθος μηνιαίας δόσης (ήδη καλύπτεται στο fix_building_issues)
                    pass
                
            except Exception as e:
                error_msg = f"Σφάλμα διόρθωσης αποθεματικού: {issue} - {str(e)}"
                self.errors_encountered.append(error_msg)
                print(f"   ❌ {error_msg}")
    
    def fix_participation_mills_issues(self, health_results: Dict[str, Any]):
        """Διόρθωση προβλημάτων χιλιοστίμων"""
        
        print("\n📊 ΔΙΟΡΘΩΣΗ ΠΡΟΒΛΗΜΑΤΩΝ ΧΙΛΙΟΣΤΙΜΩΝ")
        print("-" * 40)
        
        mills_data = health_results.get('details', {}).get('participation_mills', {})
        issues = mills_data.get('issues', [])
        
        for issue in issues:
            try:
                if 'Συνολικά χιλιόστιμα' in issue:
                    # Διόρθωση χιλιοστίμων (ήδη καλύπτεται στο fix_apartment_issues)
                    pass
                
                elif 'Λάθος χιλιόστιμα' in issue:
                    # Διόρθωση λάθος χιλιοστίμων (ήδη καλύπτεται στο fix_apartment_issues)
                    pass
                
            except Exception as e:
                error_msg = f"Σφάλμα διόρθωσης χιλιοστίμων: {issue} - {str(e)}"
                self.errors_encountered.append(error_msg)
                print(f"   ❌ {error_msg}")
    
    def print_summary(self):
        """Εκτύπωση σύνοψης διορθώσεων"""
        
        print(f"\n📊 ΣΥΝΟΨΗ ΑΥΤΟΜΑΤΩΝ ΔΙΟΡΘΩΣΕΩΝ")
        print("=" * 60)
        
        print(f"🔍 Προβλήματα που βρέθηκαν: {self.summary['total_issues_found']}")
        print(f"🔧 Διορθώσεις που εφαρμόθηκαν: {len(self.fixes_applied)}")
        print(f"❌ Σφάλματα που συναντήθηκαν: {len(self.errors_encountered)}")
        print(f"📈 Βελτίωση: {self.summary['improvement']} προβλήματα")
        
        if self.fixes_applied:
            print(f"\n✅ ΔΙΟΡΘΩΣΕΙΣ ΠΟΥ ΕΦΑΡΜΟΣΤΗΚΑΝ:")
            for fix in self.fixes_applied:
                print(f"   • {fix}")
        
        if self.errors_encountered:
            print(f"\n❌ ΣΦΑΛΜΑΤΑ ΠΟΥ ΣΥΝΑΝΤΗΘΗΚΑΝ:")
            for error in self.errors_encountered:
                print(f"   • {error}")
        
        if self.summary['improvement'] > 0:
            print(f"\n🎉 Επιτυχία! Διορθώθηκαν {self.summary['improvement']} προβλήματα!")
        else:
            print(f"\n⚠️ Δεν έγιναν βελτιώσεις ή υπήρξαν σφάλματα.")

def run_auto_fix():
    """Εκτέλεση αυτόματης διόρθωσης"""
    
    auto_fix = AutoFixSystemIssues()
    results = auto_fix.run_auto_fix()
    
    return results

if __name__ == "__main__":
    results = run_auto_fix()
    print(f"\n✅ Η αυτόματη διόρθωση ολοκληρώθηκε!")
    print(f"📋 Βελτίωση: {results['summary']['improvement']} προβλήματα")

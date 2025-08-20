#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Πλήρης ανάλυση και διόρθωση φύλλου κοινοχρήστων
για την πολυκατοικία Αλκμάνος 22 (Building ID 4)
"""

import os
import sys
import django
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date
from typing import Dict, List, Any

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, CommonExpensePeriod, ApartmentShare
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator, FinancialDashboardService

class AlkmanosAnalyzer:
    """Αναλυτής για την πολυκατοικία Αλκμάνος 22"""
    
    def __init__(self):
        self.building_id = 4  # Αλκμάνος 22
        self.issues = []
        self.warnings = []
        self.recommendations = []
        
    def run_full_analysis(self):
        """Εκτέλεση πλήρους ανάλυσης"""
        print("🏢 ΠΛΗΡΗΣ ΑΝΑΛΥΣΗ ΦΥΛΛΟΥ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        print("🏠 Πολυκατοικία: Αλκμάνος 22, Αθήνα 115 28")
        print("=" * 60)
        
        with schema_context('demo'):
            try:
                # 1. Ανάλυση βασικών δεδομένων κτιρίου
                self.analyze_building_basics()
                
                # 2. Ανάλυση διαμερισμάτων
                self.analyze_apartments()
                
                # 3. Έλεγχος participation mills
                self.check_participation_mills()
                
                # 4. Ανάλυση δαπανών
                self.analyze_expenses()
                
                # 5. Ανάλυση υπολοίπων και συναλλαγών
                self.analyze_balances_and_transactions()
                
                # 6. Δοκιμή υπολογιστών κοινοχρήστων
                self.test_calculators()
                
                # 7. Ανάλυση αποθεματικού ταμείου
                self.analyze_reserve_fund()
                
                # 8. Έλεγχος ιστορικών κοινοχρήστων
                self.analyze_common_expense_history()
                
                # 9. Συγκεντρωτική αναφορά
                self.generate_summary_report()
                
            except Exception as e:
                print(f"❌ ΣΦΑΛΜΑ ΚΑΤΑ ΤΗΝ ΑΝΑΛΥΣΗ: {e}")
                import traceback
                traceback.print_exc()
    
    def analyze_building_basics(self):
        """Ανάλυση βασικών δεδομένων κτιρίου"""
        print("\n📋 1. ΒΑΣΙΚΑ ΔΕΔΟΜΕΝΑ ΚΤΙΡΙΟΥ")
        print("-" * 40)
        
        try:
            building = Building.objects.get(id=self.building_id)
            
            print(f"🏢 Όνομα: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}, {building.city} {building.postal_code}")
            print(f"🏢 Γραφείο διαχείρισης: {building.management_office_name or 'Δεν έχει οριστεί'}")
            print(f"📞 Τηλέφωνο γραφείου: {building.management_office_phone or 'Δεν έχει οριστεί'}")
            print(f"👤 Εσωτερικός διαχειριστής: {building.internal_manager_name or 'Δεν έχει οριστεί'}")
            print(f"📞 Τηλέφωνο εσωτερικού: {building.internal_manager_phone or 'Δεν έχει οριστεί'}")
            print(f"🏠 Συνολικά διαμερίσματα: {building.apartments_count}")
            print(f"💶 Διαχειριστικά ανά διαμέρισμα: {building.management_fee_per_apartment}€")
            print(f"💰 Εισφορά αποθεματικού ανά διαμέρισμα: {building.reserve_contribution_per_apartment}€")
            print(f"🎯 Στόχος αποθεματικού ταμείου: {building.reserve_fund_goal}€")
            print(f"⏱️ Διάρκεια αποθεματικού (μήνες): {building.reserve_fund_duration_months}")
            print(f"💰 Τρέχον αποθεματικό: {building.current_reserve}€")
            
            # Έλεγχος για προβλήματα
            if not building.management_fee_per_apartment:
                self.warnings.append("Δεν έχει οριστεί διαχειριστικό τέλος")
            
            if not building.reserve_contribution_per_apartment:
                self.warnings.append("Δεν έχει οριστεί εισφορά αποθεματικού")
                
            if not building.reserve_fund_goal or not building.reserve_fund_duration_months:
                self.warnings.append("Δεν έχουν οριστεί παράμετροι αποθεματικού ταμείου")
                
        except Building.DoesNotExist:
            self.issues.append(f"Δεν βρέθηκε κτίριο με ID {self.building_id}")
    
    def analyze_apartments(self):
        """Ανάλυση διαμερισμάτων"""
        print("\n🏠 2. ΑΝΑΛΥΣΗ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 40)
        
        apartments = Apartment.objects.filter(building_id=self.building_id).order_by('number')
        
        print(f"📊 Συνολικά διαμερίσματα: {apartments.count()}")
        print("\n📋 Λεπτομέρειες διαμερισμάτων:")
        
        for apt in apartments:
            print(f"\n  🏠 Διαμέρισμα {apt.number}:")
            print(f"    👤 Ιδιοκτήτης: {apt.owner_name or 'Δεν έχει οριστεί'}")
            print(f"    🏠 Ενοικιαστής: {apt.tenant_name or 'Δεν έχει οριστεί'}")
            print(f"    📊 Χιλιοστά συμμετοχής: {apt.participation_mills or 0}")
            print(f"    🔥 Χιλιοστά θέρμανσης: {apt.heating_mills or 0}")
            print(f"    🛗 Χιλιοστά ανελκυστήρα: {apt.elevator_mills or 0}")
            print(f"    📐 Τετραγωνικά μέτρα: {apt.square_meters or 0}")
            print(f"    💰 Τρέχον υπόλοιπο: {apt.current_balance or 0}€")
            
            # Έλεγχος για προβλήματα
            if not apt.participation_mills:
                self.issues.append(f"Διαμέρισμα {apt.number}: Δεν έχουν οριστεί χιλιοστά συμμετοχής")
            
            if not apt.owner_name:
                self.warnings.append(f"Διαμέρισμα {apt.number}: Δεν έχει οριστεί ιδιοκτήτης")
    
    def check_participation_mills(self):
        """Έλεγχος χιλιοστών συμμετοχής"""
        print("\n📊 3. ΕΛΕΓΧΟΣ ΧΙΛΙΟΣΤΩΝ ΣΥΜΜΕΤΟΧΗΣ")
        print("-" * 40)
        
        apartments = Apartment.objects.filter(building_id=self.building_id)
        
        total_participation_mills = sum(apt.participation_mills or 0 for apt in apartments)
        total_heating_mills = sum(apt.heating_mills or 0 for apt in apartments)
        total_elevator_mills = sum(apt.elevator_mills or 0 for apt in apartments)
        
        print(f"📊 Συνολικά χιλιοστά συμμετοχής: {total_participation_mills}")
        print(f"🔥 Συνολικά χιλιοστά θέρμανσης: {total_heating_mills}")
        print(f"🛗 Συνολικά χιλιοστά ανελκυστήρα: {total_elevator_mills}")
        
        # Έλεγχος ορθότητας
        if total_participation_mills != 1000:
            self.issues.append(f"Τα χιλιοστά συμμετοχής ({total_participation_mills}) δεν είναι 1000")
            print(f"❌ ΠΡΟΒΛΗΜΑ: Τα χιλιοστά συμμετοχής πρέπει να είναι 1000, αλλά είναι {total_participation_mills}")
        else:
            print("✅ Τα χιλιοστά συμμετοχής είναι σωστά (1000)")
            
        if total_heating_mills > 0 and total_heating_mills != 1000:
            self.warnings.append(f"Τα χιλιοστά θέρμανσης ({total_heating_mills}) δεν είναι 1000")
            
        if total_elevator_mills > 0 and total_elevator_mills != 1000:
            self.warnings.append(f"Τα χιλιοστά ανελκυστήρα ({total_elevator_mills}) δεν είναι 1000")
    
    def analyze_expenses(self):
        """Ανάλυση δαπανών"""
        print("\n💰 4. ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ")
        print("-" * 40)
        
        # Συνολικές δαπάνες
        all_expenses = Expense.objects.filter(building_id=self.building_id)
        issued_expenses = all_expenses.filter(is_issued=True)
        pending_expenses = all_expenses.filter(is_issued=False)
        
        print(f"📊 Συνολικές δαπάνες: {all_expenses.count()}")
        print(f"✅ Εκδοθείσες δαπάνες: {issued_expenses.count()}")
        print(f"⏳ Εκκρεμείς δαπάνες: {pending_expenses.count()}")
        
        # Ανάλυση ανά κατηγορία
        print(f"\n📋 Ανάλυση εκκρεμών δαπανών ανά κατηγορία:")
        categories = {}
        distribution_types = {}
        
        for expense in pending_expenses:
            category = expense.get_category_display()
            dist_type = expense.get_distribution_type_display()
            
            if category not in categories:
                categories[category] = {'count': 0, 'total': Decimal('0')}
            categories[category]['count'] += 1
            categories[category]['total'] += expense.amount
            
            if dist_type not in distribution_types:
                distribution_types[dist_type] = {'count': 0, 'total': Decimal('0')}
            distribution_types[dist_type]['count'] += 1
            distribution_types[dist_type]['total'] += expense.amount
        
        for category, data in categories.items():
            print(f"  {category}: {data['count']} δαπάνες, {data['total']}€")
            
        print(f"\n📋 Ανάλυση ανά τρόπο κατανομής:")
        for dist_type, data in distribution_types.items():
            print(f"  {dist_type}: {data['count']} δαπάνες, {data['total']}€")
            
        # Σύνολο εκκρεμών δαπανών
        total_pending = sum(exp.amount for exp in pending_expenses)
        print(f"\n💰 Συνολικό ποσό εκκρεμών δαπανών: {total_pending}€")
    
    def analyze_balances_and_transactions(self):
        """Ανάλυση υπολοίπων και συναλλαγών"""
        print("\n💳 5. ΑΝΑΛΥΣΗ ΥΠΟΛΟΙΠΩΝ ΚΑΙ ΣΥΝΑΛΛΑΓΩΝ")
        print("-" * 40)
        
        apartments = Apartment.objects.filter(building_id=self.building_id).order_by('number')
        transactions = Transaction.objects.filter(building_id=self.building_id).order_by('-date')
        
        total_balance = sum(apt.current_balance or 0 for apt in apartments)
        
        print(f"💰 Συνολικό υπόλοιπο κτιρίου: {total_balance}€")
        print(f"📊 Συνολικές συναλλαγές: {transactions.count()}")
        
        # Ανάλυση υπολοίπων ανά διαμέρισμα
        positive_balances = 0
        negative_balances = 0
        zero_balances = 0
        
        print(f"\n📋 Υπόλοιπα διαμερισμάτων:")
        for apt in apartments:
            balance = apt.current_balance or 0
            status = "💚" if balance > 0 else "🔴" if balance < 0 else "⚪"
            print(f"  {status} Διαμέρισμα {apt.number}: {balance}€")
            
            if balance > 0:
                positive_balances += 1
            elif balance < 0:
                negative_balances += 1
            else:
                zero_balances += 1
        
        print(f"\n📊 Κατανομή υπολοίπων:")
        print(f"  💚 Θετικά υπόλοιπα: {positive_balances} διαμερίσματα")
        print(f"  🔴 Αρνητικά υπόλοιπα: {negative_balances} διαμερίσματα")
        print(f"  ⚪ Μηδενικά υπόλοιπα: {zero_balances} διαμερίσματα")
        
        # Ανάλυση πρόσφατων συναλλαγών
        recent_transactions = transactions[:10]
        print(f"\n📋 Πρόσφατες συναλλαγές (10 τελευταίες):")
        for trans in recent_transactions:
            print(f"  {trans.date}: {trans.get_type_display()} - {trans.amount}€ (Διαμ. {trans.apartment_number})")
    
    def test_calculators(self):
        """Δοκιμή υπολογιστών κοινοχρήστων"""
        print("\n🔧 6. ΔΟΚΙΜΗ ΥΠΟΛΟΓΙΣΤΩΝ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        print("-" * 40)
        
        try:
            # Δοκιμή BasicCalculator
            print("📊 Δοκιμή BasicCalculator...")
            basic_calculator = CommonExpenseCalculator(self.building_id)
            basic_result = basic_calculator.calculate_shares()
            
            print(f"✅ Basic Calculator: {len(basic_result)} διαμερίσματα")
            basic_total = sum(float(share.get('total_amount', 0)) for share in basic_result.values())
            print(f"💰 Συνολικό ποσό (Basic): {basic_total:.2f}€")
            
            # Δοκιμή AdvancedCalculator
            print("\n📊 Δοκιμή AdvancedCalculator...")
            advanced_calculator = AdvancedCommonExpenseCalculator(self.building_id)
            advanced_result = advanced_calculator.calculate_advanced_shares()
            
            shares = advanced_result.get('shares', {})
            print(f"✅ Advanced Calculator: {len(shares)} διαμερίσματα")
            advanced_total = sum(float(share.get('total_amount', 0)) for share in shares.values())
            print(f"💰 Συνολικό ποσό (Advanced): {advanced_total:.2f}€")
            
            # Σύγκριση αποτελεσμάτων
            if abs(basic_total - advanced_total) > 0.01:
                self.warnings.append(f"Διαφορά μεταξύ calculators: {abs(basic_total - advanced_total):.2f}€")
            else:
                print("✅ Οι υπολογιστές δίνουν ίδια αποτελέσματα")
                
        except Exception as e:
            self.issues.append(f"Σφάλμα στους υπολογιστές: {e}")
            print(f"❌ Σφάλμα στη δοκιμή υπολογιστών: {e}")
    
    def analyze_reserve_fund(self):
        """Ανάλυση αποθεματικού ταμείου"""
        print("\n🏦 7. ΑΝΑΛΥΣΗ ΑΠΟΘΕΜΑΤΙΚΟΥ ΤΑΜΕΙΟΥ")
        print("-" * 40)
        
        try:
            building = Building.objects.get(id=self.building_id)
            dashboard_service = FinancialDashboardService(self.building_id)
            summary = dashboard_service.get_summary()
            
            reserve_fund_goal = building.reserve_fund_goal or 0
            reserve_fund_duration = building.reserve_fund_duration_months or 0
            reserve_contribution_per_apt = building.reserve_contribution_per_apartment or 0
            
            print(f"🎯 Στόχος αποθεματικού: {reserve_fund_goal}€")
            print(f"⏱️ Διάρκεια: {reserve_fund_duration} μήνες")
            print(f"💰 Εισφορά ανά διαμέρισμα: {reserve_contribution_per_apt}€")
            
            # Υπολογισμός μηνιαίας εισφοράς
            if reserve_fund_goal > 0 and reserve_fund_duration > 0:
                monthly_total = reserve_fund_goal / reserve_fund_duration
                print(f"📊 Μηνιαία εισφορά συνολικά: {monthly_total:.2f}€")
                
                apartments_count = Apartment.objects.filter(building_id=self.building_id).count()
                monthly_per_apartment = monthly_total / apartments_count if apartments_count > 0 else 0
                print(f"📊 Μηνιαία εισφορά ανά διαμέρισμα (υπολογισμένη): {monthly_per_apartment:.2f}€")
                
                if abs(monthly_per_apartment - float(reserve_contribution_per_apt)) > 0.01:
                    self.issues.append(f"Ασυνέπεια στην εισφορά αποθεματικού: {monthly_per_apartment:.2f}€ vs {reserve_contribution_per_apt}€")
            
            # Τρέχον αποθεματικό ταμείο
            current_reserve = summary.get('reserve_fund_balance', 0)
            print(f"💰 Τρέχον αποθεματικό: {current_reserve}€")
            
            if reserve_fund_goal > 0:
                progress = (current_reserve / reserve_fund_goal) * 100
                print(f"📊 Πρόοδος: {progress:.1f}%")
                
        except Exception as e:
            self.issues.append(f"Σφάλμα στην ανάλυση αποθεματικού: {e}")
    
    def analyze_common_expense_history(self):
        """Ανάλυση ιστορικών κοινοχρήστων"""
        print("\n📚 8. ΑΝΑΛΥΣΗ ΙΣΤΟΡΙΚΩΝ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        print("-" * 40)
        
        periods = CommonExpensePeriod.objects.filter(building_id=self.building_id).order_by('-start_date')
        
        print(f"📊 Συνολικές περίοδοι κοινοχρήστων: {periods.count()}")
        
        if periods.exists():
            print(f"\n📋 Τελευταίες περίοδοι:")
            for period in periods[:5]:
                shares = ApartmentShare.objects.filter(period=period)
                total_amount = sum(share.total_amount for share in shares)
                print(f"  📅 {period.period_name}: {period.start_date} - {period.end_date}")
                print(f"    💰 Συνολικό ποσό: {total_amount}€")
                print(f"    🏠 Διαμερίσματα: {shares.count()}")
                print(f"    ✅ Ενεργή: {'Ναι' if period.is_active else 'Όχι'}")
        else:
            self.warnings.append("Δεν υπάρχουν εκδοθείσες περίοδοι κοινοχρήστων")
    
    def generate_summary_report(self):
        """Δημιουργία συγκεντρωτικής αναφοράς"""
        print("\n📋 9. ΣΥΓΚΕΝΤΡΩΤΙΚΗ ΑΝΑΦΟΡΑ")
        print("=" * 60)
        
        # Προβλήματα
        if self.issues:
            print("\n❌ ΠΡΟΒΛΗΜΑΤΑ ΠΟΥ ΧΡΗΖΟΥΝ ΔΙΟΡΘΩΣΗΣ:")
            for i, issue in enumerate(self.issues, 1):
                print(f"  {i}. {issue}")
        else:
            print("\n✅ ΔΕΝ ΒΡΕΘΗΚΑΝ ΣΟΒΑΡΑ ΠΡΟΒΛΗΜΑΤΑ")
        
        # Προειδοποιήσεις
        if self.warnings:
            print("\n⚠️ ΠΡΟΕΙΔΟΠΟΙΗΣΕΙΣ:")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
        else:
            print("\n✅ ΔΕΝ ΥΠΑΡΧΟΥΝ ΠΡΟΕΙΔΟΠΟΙΗΣΕΙΣ")
        
        # Συστάσεις
        self._generate_recommendations()
        if self.recommendations:
            print("\n💡 ΣΥΣΤΑΣΕΙΣ:")
            for i, rec in enumerate(self.recommendations, 1):
                print(f"  {i}. {rec}")
        
        # Συνολική αξιολόγηση
        print(f"\n📊 ΣΥΝΟΛΙΚΗ ΑΞΙΟΛΟΓΗΣΗ:")
        if not self.issues and len(self.warnings) <= 2:
            print("✅ Το φύλλο κοινοχρήστων είναι σε καλή κατάσταση")
        elif len(self.issues) <= 2:
            print("⚠️ Το φύλλο κοινοχρήστων χρειάζεται μικρές διορθώσεις")
        else:
            print("❌ Το φύλλο κοινοχρήστων χρειάζεται σημαντικές διορθώσεις")
    
    def _generate_recommendations(self):
        """Δημιουργία συστάσεων"""
        
        # Έλεγχος αν χρειάζεται διόρθωση χιλιοστών
        for issue in self.issues:
            if "χιλιοστά συμμετοχής" in issue:
                self.recommendations.append("Διόρθωση χιλιοστών συμμετοχής ώστε να είναι συνολικά 1000")
        
        # Έλεγχος αν λείπουν βασικές πληροφορίες
        for warning in self.warnings:
            if "ιδιοκτήτης" in warning:
                self.recommendations.append("Συμπλήρωση στοιχείων ιδιοκτητών διαμερισμάτων")
            if "διαχειριστικό" in warning:
                self.recommendations.append("Ορισμός διαχειριστικού τέλους")
            if "αποθεματικού" in warning:
                self.recommendations.append("Ορισμός παραμέτρων αποθεματικού ταμείου")
        
        # Γενικές συστάσεις
        self.recommendations.append("Τακτικός έλεγχος και ενημέρωση του φύλλου κοινοχρήστων")
        self.recommendations.append("Δημιουργία backup των δεδομένων πριν από αλλαγές")

def main():
    """Κύρια συνάρτηση"""
    analyzer = AlkmanosAnalyzer()
    analyzer.run_full_analysis()

if __name__ == "__main__":
    main()

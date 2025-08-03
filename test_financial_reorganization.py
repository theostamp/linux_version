#!/usr/bin/env python3
"""
Test Script για την Αναδιοργάνωση του Οικονομικού Συστήματος

Αυτό το script ελέγχει ότι όλα τα νέα components και services λειτουργούν σωστά.
"""

import os
import sys
import django
from pathlib import Path

# Προσθήκη του backend directory στο Python path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, CommonExpensePeriod, ApartmentShare
from financial.services import CommonExpenseCalculator, FinancialReportGenerator
from decimal import Decimal

User = get_user_model()

class FinancialReorganizationTest(TestCase):
    """Test cases για την αναδιοργάνωση του οικονομικού συστήματος"""
    
    def setUp(self):
        """Setup test data"""
        # Δημιουργία test user
        self.user = User.objects.create_user(
            email='test_financial@example.com',
            password='testpass123'
        )
        
        # Δημιουργία test building
        self.building = Building.objects.create(
            name='Test Building',
            address='Test Address 123',
            city='Athens',
            postal_code='12345'
        )
        
        # Δημιουργία test apartments
        self.apartment1 = Apartment.objects.create(
            building=self.building,
            number='1',
            owner_name='John Doe',
            participation_mills=500
        )
        
        self.apartment2 = Apartment.objects.create(
            building=self.building,
            number='2',
            owner_name='Jane Smith',
            participation_mills=500
        )
        
        # Δημιουργία test expenses
        self.expense1 = Expense.objects.create(
            building=self.building,
            title='Καθαρισμός Κοινοχρήστων',
            amount=Decimal('200.00'),
            date='2024-01-15',
            category='cleaning',
            distribution_type='by_participation_mills',
            created_by=self.user
        )
        
        self.expense2 = Expense.objects.create(
            building=self.building,
            title='ΔΕΗ Κοινοχρήστων',
            amount=Decimal('150.00'),
            date='2024-01-20',
            category='electricity_common',
            distribution_type='equal_share',
            created_by=self.user
        )
    
    def test_common_expense_calculator_initialization(self):
        """Test ότι ο CommonExpenseCalculator αρχικοποιείται σωστά"""
        calculator = CommonExpenseCalculator(self.building.id)
        
        self.assertEqual(calculator.building_id, self.building.id)
        self.assertEqual(calculator.building, self.building)
        self.assertEqual(calculator.apartments.count(), 2)
        self.assertEqual(calculator.expenses.count(), 2)
    
    def test_calculate_shares_by_participation_mills(self):
        """Test υπολογισμό μεριδίων ανά χιλιοστά συμμετοχής"""
        calculator = CommonExpenseCalculator(self.building.id)
        shares = calculator.calculate_shares()
        
        # Έλεγχος ότι υπάρχουν μερίδια για όλα τα διαμερίσματα
        self.assertIn(str(self.apartment1.id), shares)
        self.assertIn(str(self.apartment2.id), shares)
        
        # Έλεγχος ότι τα μερίδια είναι σωστά
        share1 = shares[str(self.apartment1.id)]
        share2 = shares[str(self.apartment2.id)]
        
        # Καθαρισμός: 200€ / 1000 mills = 0.2€ ανά mill
        # ΔΕΗ: 150€ / 2 διαμερίσματα = 75€ ανά διαμέρισμα
        expected_total1 = (200 * 500 / 1000) + 75  # 100 + 75 = 175
        expected_total2 = (200 * 500 / 1000) + 75  # 100 + 75 = 175
        
        self.assertEqual(share1['total_amount'], Decimal('175.00'))
        self.assertEqual(share2['total_amount'], Decimal('175.00'))
    
    def test_calculate_shares_breakdown(self):
        """Test ότι η ανάλυση μεριδίων είναι σωστή"""
        calculator = CommonExpenseCalculator(self.building.id)
        shares = calculator.calculate_shares()
        
        share1 = shares[str(self.apartment1.id)]
        
        # Έλεγχος ότι υπάρχει breakdown
        self.assertEqual(len(share1['breakdown']), 2)
        
        # Έλεγχος πρώτης δαπάνης (καθαρισμός)
        breakdown1 = share1['breakdown'][0]
        self.assertEqual(breakdown1['expense_title'], 'Καθαρισμός Κοινοχρήστων')
        self.assertEqual(breakdown1['distribution_type'], 'by_participation_mills')
        
        # Έλεγχος δεύτερης δαπάνης (ΔΕΗ)
        breakdown2 = share1['breakdown'][1]
        self.assertEqual(breakdown2['expense_title'], 'ΔΕΗ Κοινοχρήστων')
        self.assertEqual(breakdown2['distribution_type'], 'equal_share')
    
    def test_create_period(self):
        """Test δημιουργία περιόδου κοινοχρήστων"""
        calculator = CommonExpenseCalculator(self.building.id)
        
        period = calculator.create_period(
            period_name='Ιανουάριος 2024',
            start_date='2024-01-01',
            end_date='2024-01-31'
        )
        
        self.assertEqual(period.building, self.building)
        self.assertEqual(period.period_name, 'Ιανουάριος 2024')
        self.assertEqual(period.is_issued, False)
    
    def test_issue_common_expenses(self):
        """Test έκδοση κοινοχρήστων"""
        calculator = CommonExpenseCalculator(self.building.id)
        
        # Δημιουργία περιόδου
        period = calculator.create_period(
            period_name='Ιανουάριος 2024',
            start_date='2024-01-01',
            end_date='2024-01-31'
        )
        
        # Υπολογισμός μεριδίων
        shares = calculator.calculate_shares()
        
        # Έκδοση κοινοχρήστων
        success = calculator.issue_common_expenses(period.id, shares)
        
        self.assertTrue(success)
        
        # Έλεγχος ότι η περίοδος σημειώθηκε ως εκδοθείσα
        period.refresh_from_db()
        self.assertTrue(period.is_issued)
        
        # Έλεγχος ότι δημιουργήθηκαν μερίδια
        apartment_shares = ApartmentShare.objects.filter(period=period)
        self.assertEqual(apartment_shares.count(), 2)
        
        # Έλεγχος ότι οι δαπάνες σημειώθηκαν ως εκδοθείσες
        expenses = Expense.objects.filter(building=self.building)
        for expense in expenses:
            self.assertTrue(expense.is_issued)
    
    def test_financial_report_generator(self):
        """Test δημιουργία οικονομικών αναφορών"""
        generator = FinancialReportGenerator(self.building.id)
        
        # Δημιουργία μηνιαίας αναφοράς
        report = generator.generate_monthly_report(2024, 1)
        
        self.assertIn('period', report)
        self.assertIn('total_expenses', report)
        self.assertIn('total_payments', report)
        self.assertEqual(report['period'], '2024-01')
    
    def test_expense_categories(self):
        """Test ότι οι κατηγορίες δαπανών είναι σωστές"""
        # Έλεγχος ότι υπάρχουν οι βασικές κατηγορίες
        categories = [choice[0] for choice in Expense.EXPENSE_CATEGORIES]
        
        self.assertIn('cleaning', categories)
        self.assertIn('electricity_common', categories)
        self.assertIn('water_common', categories)
        self.assertIn('heating_fuel', categories)
        self.assertIn('elevator_maintenance', categories)
    
    def test_distribution_types(self):
        """Test ότι οι τύποι κατανομής είναι σωστές"""
        distribution_types = [choice[0] for choice in Expense.DISTRIBUTION_TYPES]
        
        self.assertIn('by_participation_mills', distribution_types)
        self.assertIn('equal_share', distribution_types)
        self.assertIn('specific_apartments', distribution_types)
        self.assertIn('by_meters', distribution_types)
    
    def test_apartment_balance_update(self):
        """Test ενημέρωση υπολοίπου διαμερίσματος"""
        # Αρχικό υπόλοιπο
        initial_balance = self.apartment1.current_balance
        
        # Δημιουργία δαπάνης
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('100.00'),
            date='2024-01-25',
            category='miscellaneous',
            distribution_type='equal_share',
            created_by=self.user
        )
        
        # Υπολογισμός και έκδοση
        calculator = CommonExpenseCalculator(self.building.id)
        period = calculator.create_period(
            period_name='Test Period',
            start_date='2024-01-01',
            end_date='2024-01-31'
        )
        
        shares = calculator.calculate_shares()
        calculator.issue_common_expenses(period.id, shares)
        
        # Έλεγχος ότι το υπόλοιπο ενημερώθηκε
        self.apartment1.refresh_from_db()
        self.assertNotEqual(self.apartment1.current_balance, initial_balance)

def run_tests():
    """Εκτέλεση των tests"""
    print("🧪 Εκκίνηση tests για την αναδιοργάνωση του οικονομικού συστήματος...")
    print("=" * 70)
    
    # Δημιουργία test instance
    test_instance = FinancialReorganizationTest()
    test_instance.setUp()
    
    # Λίστα με όλα τα test methods
    test_methods = [
        'test_common_expense_calculator_initialization',
        'test_calculate_shares_by_participation_mills',
        'test_calculate_shares_breakdown',
        'test_create_period',
        'test_issue_common_expenses',
        'test_financial_report_generator',
        'test_expense_categories',
        'test_distribution_types',
        'test_apartment_balance_update'
    ]
    
    passed = 0
    failed = 0
    
    for method_name in test_methods:
        try:
            method = getattr(test_instance, method_name)
            method()
            print(f"✅ {method_name}")
            passed += 1
        except Exception as e:
            print(f"❌ {method_name}: {str(e)}")
            failed += 1
    
    print("=" * 70)
    print(f"📊 Αποτελέσματα: {passed} επιτυχείς, {failed} αποτυχείς")
    
    if failed == 0:
        print("🎉 Όλα τα tests πέρασαν επιτυχώς!")
        return True
    else:
        print("⚠️  Υπάρχουν αποτυχημένα tests.")
        return False

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1) 
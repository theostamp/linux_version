#!/usr/bin/env python3
"""
Test script για τη λειτουργικότητα των Meter Readings
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Προσθήκη του backend directory στο path
sys.path.append('/home/theo/projects/linux_version/backend')

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import MeterReading, Expense
from apartments.models import Apartment
from buildings.models import Building
from financial.services import CommonExpenseCalculator

def test_meter_reading_creation():
    """Test δημιουργίας μετρήσεων"""
    print("🧪 Testing Meter Reading Creation...")
    
    # Εύρεση κτιρίου και διαμερίσματος
    try:
        tenant = Client.objects.get(schema_name='test_tenant')
        
        with tenant_context(tenant):
            building = Building.objects.first()
            if not building:
                print("❌ Δεν βρέθηκε κτίριο")
                return False
            
            apartment = Apartment.objects.filter(building=building).first()
            if not apartment:
                print("❌ Δεν βρέθηκε διαμέρισμα")
                return False
        
        print(f"✅ Βρέθηκε κτίριο: {building.name}")
        print(f"✅ Βρέθηκε διαμέρισμα: {apartment.number}")
        
        # Δημιουργία μετρήσεων
        reading1 = MeterReading.objects.create(
            apartment=apartment,
            reading_date=datetime.now().date() - timedelta(days=30),
            value=Decimal('100.50'),
            meter_type='heating',
            notes='Πρώτη μετρήση'
        )
        
        reading2 = MeterReading.objects.create(
            apartment=apartment,
            reading_date=datetime.now().date(),
            value=Decimal('150.75'),
            meter_type='heating',
            notes='Δεύτερη μετρήση'
        )
        
        print(f"✅ Δημιουργήθηκε μετρήση 1: {reading1}")
        print(f"✅ Δημιουργήθηκε μετρήση 2: {reading2}")
        
        # Έλεγχος validation
        print(f"📊 Κατανάλωση: {reading2.calculate_consumption()}")
        print(f"📅 Περίοδος: {reading2.get_consumption_period()}")
        
        return True
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        return False

def test_meter_reading_validation():
    """Test validation μετρήσεων"""
    print("\n🧪 Testing Meter Reading Validation...")
    
    try:
        tenant = Client.objects.get(schema_name='test_tenant')
        
        with tenant_context(tenant):
            building = Building.objects.first()
            apartment = Apartment.objects.filter(building=building).first()
        
        # Test για αρνητική τιμή
        try:
            invalid_reading = MeterReading(
                apartment=apartment,
                reading_date=datetime.now().date(),
                value=Decimal('-10.00'),
                meter_type='heating'
            )
            invalid_reading.full_clean()
            print("❌ Δεν έπρεπε να επιτρέψει αρνητική τιμή")
            return False
        except Exception as e:
            print(f"✅ Επιτυχής validation για αρνητική τιμή: {e}")
        
        # Test για μικρότερη τιμή από προηγούμενη
        try:
            invalid_reading = MeterReading(
                apartment=apartment,
                reading_date=datetime.now().date() + timedelta(days=1),
                value=Decimal('50.00'),  # Μικρότερη από την προηγούμενη
                meter_type='heating'
            )
            invalid_reading.full_clean()
            print("❌ Δεν έπρεπε να επιτρέψει μικρότερη τιμή")
            return False
        except Exception as e:
            print(f"✅ Επιτυχής validation για μικρότερη τιμή: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        return False

def test_building_consumption():
    """Test υπολογισμού κατανάλωσης κτιρίου"""
    print("\n🧪 Testing Building Consumption Calculation...")
    
    try:
        tenant = Client.objects.get(schema_name='test_tenant')
        
        with tenant_context(tenant):
            building = Building.objects.first()
            
            # Υπολογισμός κατανάλωσης
            consumption_data = MeterReading.calculate_building_consumption(
                building_id=building.id,
                meter_type='heating',
                date_from=datetime.now().date() - timedelta(days=60),
                date_to=datetime.now().date()
            )
        
        print(f"📊 Συνολική κατανάλωση: {consumption_data['total_consumption']}")
        print(f"🏢 Διαμερίσματα: {len(consumption_data['apartments'])}")
        
        for apt_id, data in consumption_data['apartments'].items():
            print(f"  - Διαμέρισμα {data['apartment_number']}: {data['consumption']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        return False

def test_expense_calculator_with_meters():
    """Test expense calculator με μετρητές"""
    print("\n🧪 Testing Expense Calculator with Meters...")
    
    try:
        tenant = Client.objects.get(schema_name='test_tenant')
        
        with tenant_context(tenant):
            building = Building.objects.first()
            
            # Δημιουργία δαπάνης θέρμανσης
            expense = Expense.objects.create(
                building=building,
                title='Πετρέλαιο Θέρμανσης Ιανουαρίου',
                amount=Decimal('500.00'),
                date=datetime.now().date(),
                category='heating_fuel',
                distribution_type='by_meters',
                notes='Δαπάνη με κατανομή με βάση μετρητές'
            )
        
        print(f"✅ Δημιουργήθηκε δαπάνη: {expense.title}")
        
        # Υπολογισμός μεριδίων
        calculator = CommonExpenseCalculator(building.id)
        shares = calculator.calculate_shares()
        
        print(f"📊 Υπολογίστηκαν μερίδια για {len(shares)} διαμερίσματα")
        
        for apt_id, share_data in shares.items():
            if share_data['total_amount'] > 0:
                print(f"  - Διαμέρισμα {share_data['apartment_number']}: {share_data['total_amount']:.2f}€")
        
        return True
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        return False

def cleanup_test_data():
    """Καθαρισμός test data"""
    print("\n🧹 Cleaning up test data...")
    
    try:
        tenant = Client.objects.get(schema_name='test_tenant')
        
        with tenant_context(tenant):
            # Διαγραφή test μετρήσεων
            MeterReading.objects.filter(notes__contains='test').delete()
            MeterReading.objects.filter(notes__contains='Πρώτη μετρήση').delete()
            MeterReading.objects.filter(notes__contains='Δεύτερη μετρήση').delete()
            
            # Διαγραφή test δαπανών
            Expense.objects.filter(title__contains='test').delete()
            Expense.objects.filter(title__contains='Πετρέλαιο Θέρμανσης Ιανουαρίου').delete()
            
            print("✅ Test data cleaned up")
        
    except Exception as e:
        print(f"❌ Σφάλμα καθαρισμού: {e}")

def main():
    """Main test function"""
    print("🚀 Starting Meter Readings Tests...\n")
    
    tests = [
        test_meter_reading_creation,
        test_meter_reading_validation,
        test_building_consumption,
        test_expense_calculator_with_meters,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
                print("✅ Test passed\n")
            else:
                print("❌ Test failed\n")
        except Exception as e:
            print(f"❌ Test error: {e}\n")
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed")
    
    # Cleanup
    cleanup_test_data()

if __name__ == "__main__":
    main() 
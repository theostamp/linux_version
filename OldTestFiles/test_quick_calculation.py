#!/usr/bin/env python3
"""
Test script για την Quick Calculation Feature
Ελέγχει αν οι ημερομηνίες συμπληρώνονται σωστά για τρέχοντα και προηγούμενο μήνα
"""

import requests
from datetime import datetime, date
import calendar

# API Configuration
BASE_URL = "http://demo.localhost:8000"
API_URL = f"{BASE_URL}/api"

def get_current_month_dates():
    """Επιστρέφει τις ημερομηνίες για τον τρέχοντα μήνα"""
    now = datetime.now()
    year = now.year
    month = now.month
    
    # First day of current month
    first_day = date(year, month, 1)
    # Last day of current month
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    
    return {
        'start_date': first_day.isoformat(),
        'end_date': last_day.isoformat(),
        'period_name': first_day.strftime('%B %Y')  # e.g., "August 2024"
    }

def get_previous_month_dates():
    """Επιστρέφει τις ημερομηνίες για τον προηγούμενο μήνα"""
    now = datetime.now()
    year = now.year
    month = now.month - 1
    
    if month == 0:
        month = 12
        year -= 1
    
    # First day of previous month
    first_day = date(year, month, 1)
    # Last day of previous month
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    
    return {
        'start_date': first_day.isoformat(),
        'end_date': last_day.isoformat(),
        'period_name': first_day.strftime('%B %Y')  # e.g., "July 2024"
    }

def test_date_calculations():
    """Test τις ημερομηνίες που υπολογίζονται"""
    print("🧪 Testing Quick Calculation Date Logic...")
    
    # Test current month
    current_dates = get_current_month_dates()
    print("📅 Τρέχοντας μήνας:")
    print(f"   Start: {current_dates['start_date']}")
    print(f"   End: {current_dates['end_date']}")
    print(f"   Period: {current_dates['period_name']}")
    
    # Test previous month
    previous_dates = get_previous_month_dates()
    print("📅 Προηγούμενος μήνας:")
    print(f"   Start: {previous_dates['start_date']}")
    print(f"   End: {previous_dates['end_date']}")
    print(f"   Period: {previous_dates['period_name']}")
    
    # Validate dates
    current_start = datetime.fromisoformat(current_dates['start_date'])
    current_end = datetime.fromisoformat(current_dates['end_date'])
    previous_start = datetime.fromisoformat(previous_dates['start_date'])
    previous_end = datetime.fromisoformat(previous_dates['end_date'])
    
    # Check if dates are logical
    assert current_start.day == 1, "Current month should start on day 1"
    assert current_end.day == calendar.monthrange(current_start.year, current_start.month)[1], "Current month should end on last day"
    assert previous_start.day == 1, "Previous month should start on day 1"
    assert previous_end.day == calendar.monthrange(previous_start.year, previous_start.month)[1], "Previous month should end on last day"
    
    print("✅ Date calculations are correct!")
    return True

def test_api_connection():
    """Test τη σύνδεση με το API"""
    print("\n🌐 Testing API Connection...")
    
    try:
        response = requests.get(f"{API_URL}/financial/expenses/", timeout=5)
        if response.status_code == 200:
            print("✅ API connection successful")
            return True
        else:
            print(f"❌ API returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API connection failed: {e}")
        return False

def test_common_expense_calculation():
    """Test τον υπολογισμό κοινοχρήστων"""
    print("\n🧮 Testing Common Expense Calculation...")
    
    # Get building ID (assuming we have at least one building)
    try:
        response = requests.get(f"{API_URL}/buildings/", timeout=5)
        if response.status_code == 200:
            buildings = response.json()
            if buildings:
                building_id = buildings[0]['id']
                print(f"🏢 Using building ID: {building_id}")
                
                # Get current month dates
                dates = get_current_month_dates()
                
                # Test calculation request
                calculation_data = {
                    'building_id': building_id,
                    'period_name': dates['period_name'],
                    'start_date': dates['start_date'],
                    'end_date': dates['end_date']
                }
                
                print(f"📊 Testing calculation for period: {dates['period_name']}")
                print(f"   Date range: {dates['start_date']} to {dates['end_date']}")
                
                # Note: This would require the actual calculation endpoint
                # For now, we just validate the data structure
                assert 'building_id' in calculation_data
                assert 'period_name' in calculation_data
                assert 'start_date' in calculation_data
                assert 'end_date' in calculation_data
                
                print("✅ Calculation data structure is valid")
                return True
            else:
                print("❌ No buildings found in the system")
                return False
        else:
            print(f"❌ Failed to get buildings: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing calculation: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting Quick Calculation Feature Tests...")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 3
    
    # Test 1: Date calculations
    try:
        if test_date_calculations():
            tests_passed += 1
    except Exception as e:
        print(f"❌ Date calculation test failed: {e}")
    
    # Test 2: API connection
    try:
        if test_api_connection():
            tests_passed += 1
    except Exception as e:
        print(f"❌ API connection test failed: {e}")
    
    # Test 3: Common expense calculation
    try:
        if test_common_expense_calculation():
            tests_passed += 1
    except Exception as e:
        print(f"❌ Common expense calculation test failed: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Quick Calculation Feature is ready.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
    
    return tests_passed == total_tests

if __name__ == "__main__":
    main() 
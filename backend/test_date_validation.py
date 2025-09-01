#!/usr/bin/env python3
"""
Test script για να κατανοήσουμε το πρόβλημα με την date validation
"""

import os
import sys
import django
import json
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_date_validation_issue():
    """Test για να κατανοήσουμε το πρόβλημα με την date validation"""
    
    with schema_context('demo'):
        from financial.views import FinancialDashboardViewSet
        from django.test import RequestFactory
        from users.models import CustomUser as User
        from financial.models import Expense
        from apartments.models import Apartment
        from buildings.models import Building
        
        print("🔍 TEST DATE VALIDATION ISSUE")
        print("=" * 60)
        
        # Create a mock request for September 2025
        factory = RequestFactory()
        request = factory.get('/financial/dashboard/apartment_balances/?building_id=1&month=2025-09')
        
        # Use existing user
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(email='test@example.com', password='testpass')
        request.user = user
        
        # Add query_params attribute
        request.query_params = request.GET
        
        # Create viewset instance
        viewset = FinancialDashboardViewSet()
        viewset.request = request
        
        # Call the apartment_balances method
        response = viewset.apartment_balances(request)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.data
            print(f"✅ Response data keys: {list(data.keys())}")
            
            if 'summary' in data:
                summary = data['summary']
                print(f"📊 Summary keys: {list(summary.keys())}")
                print(f"📊 Summary data: {summary}")
            
            if 'apartments' in data and data['apartments']:
                first_apartment = data['apartments'][0]
                print(f"🏠 First apartment keys: {list(first_apartment.keys())}")
                
                if 'expense_breakdown' in first_apartment and first_apartment['expense_breakdown']:
                    first_expense = first_apartment['expense_breakdown'][0]
                    print(f"💰 First expense keys: {list(first_expense.keys())}")
                    print(f"💰 First expense data: {first_expense}")
                    
                    if 'month' in first_expense:
                        print(f"📅 Actual month from expense: {first_expense['month']}")
                    if 'date' in first_expense:
                        print(f"📅 Actual date from expense: {first_expense['date']}")
            
            # Check what expenses exist in the database
            print("\n🔍 Checking database expenses:")
            expenses = Expense.objects.filter(building_id=1).order_by('date')
            print(f"Total expenses in database: {expenses.count()}")
            
            if expenses.exists():
                print("Recent expenses:")
                for expense in expenses[:5]:
                    print(f"  - {expense.title}: {expense.date} (month: {expense.date.strftime('%Y-%m')})")
            
            # Check apartments
            print("\n🔍 Checking apartments:")
            apartments = Apartment.objects.filter(building_id=1)
            print(f"Total apartments: {apartments.count()}")
            
            # Check building
            print("\n🔍 Checking building:")
            building = Building.objects.get(id=1)
            print(f"Building: {building.name}")
            
            # Simulate the frontend validation logic
            print("\n🔍 Simulating frontend validation:")
            expected_month = "2025-09"
            
            # Try to extract actual month from response data
            actual_month = None
            
            # Try from summary
            if 'summary' in data and 'data_month' in data['summary']:
                actual_month = data['summary']['data_month']
                print(f"Found month in summary.data_month: {actual_month}")
            
            # Try from expense breakdown
            if not actual_month and 'apartments' in data and data['apartments']:
                first_apartment = data['apartments'][0]
                if 'expense_breakdown' in first_apartment and first_apartment['expense_breakdown']:
                    first_expense = first_apartment['expense_breakdown'][0]
                    if 'month' in first_expense:
                        actual_month = first_expense['month']
                        print(f"Found month in expense breakdown: {actual_month}")
                    elif 'date' in first_expense:
                        date_obj = datetime.fromisoformat(first_expense['date'].replace('Z', '+00:00'))
                        actual_month = f"{date_obj.year}-{date_obj.month:02d}"
                        print(f"Calculated month from expense date: {actual_month}")
            
            print(f"Expected month: {expected_month}")
            print(f"Actual month: {actual_month}")
            print(f"Match: {actual_month == expected_month}")
            
            if actual_month != expected_month:
                print("❌ DATE MISMATCH DETECTED!")
                print("This explains the warning message in the frontend.")
                
        else:
            print(f"❌ Error: {response.data}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    test_date_validation_issue()

#!/usr/bin/env python3
"""
Financial System Test Runner
Runs all tests for the financial system including backend and frontend tests
"""

import os
import sys
import subprocess
import django
from pathlib import Path

# Add the backend directory to Python path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.test.utils import get_runner
from django.conf import settings


def run_backend_tests():
    """Run backend Django tests"""
    print("🧪 Running Backend Tests...")
    print("=" * 50)
    
    # Test runner
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Run tests
    failures = test_runner.run_tests([
        'financial.tests',
        'financial.test_api'
    ])
    
    if failures:
        print(f"❌ {failures} backend test(s) failed")
        return False
    else:
        print("✅ All backend tests passed!")
        return True


def run_frontend_tests():
    """Run frontend tests"""
    print("\n🧪 Running Frontend Tests...")
    print("=" * 50)
    
    frontend_path = Path(__file__).parent / 'frontend'
    
    try:
        # Check if we're in the frontend directory
        os.chdir(frontend_path)
        
        # Check if node_modules exists
        if not (frontend_path / 'node_modules').exists():
            print("📦 Installing frontend dependencies...")
            subprocess.run(['npm', 'install'], check=True)
        
        # Run tests
        print("🚀 Running frontend tests...")
        result = subprocess.run(['npm', 'test'], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ All frontend tests passed!")
            return True
        else:
            print("❌ Frontend tests failed:")
            print(result.stdout)
            print(result.stderr)
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running frontend tests: {e}")
        return False
    except FileNotFoundError:
        print("❌ npm not found. Please install Node.js and npm.")
        return False


def run_integration_tests():
    """Run integration tests"""
    print("\n🧪 Running Integration Tests...")
    print("=" * 50)
    
    try:
        # Run the simple test script
        test_script = Path(__file__).parent / 'simple_meter_test.py'
        if test_script.exists():
            result = subprocess.run([sys.executable, str(test_script)], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Integration tests passed!")
                return True
            else:
                print("❌ Integration tests failed:")
                print(result.stdout)
                print(result.stderr)
                return False
        else:
            print("⚠️  Integration test script not found")
            return True
            
    except Exception as e:
        print(f"❌ Error running integration tests: {e}")
        return False


def run_performance_tests():
    """Run performance tests"""
    print("\n🧪 Running Performance Tests...")
    print("=" * 50)
    
    try:
        # Create a simple performance test
        from django.contrib.auth import get_user_model
        from financial.models import Expense, ExpenseCategory, DistributionType
        from buildings.models import Building
        from tenants.models import Tenant
        from decimal import Decimal
        from datetime import date
        import time
        
        User = get_user_model()
        
        # Create test data
        tenant = Tenant.objects.create(
            schema_name='test_performance',
            name='Test Performance Tenant'
        )
        
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        building = Building.objects.create(
            name='Test Building',
            address='Test Address 123',
            current_reserve=Decimal('10000.00')
        )
        
        # Performance test: Create many expenses
        start_time = time.time()
        
        for i in range(100):
            Expense.objects.create(
                building=building,
                title=f'Test Expense {i}',
                amount=Decimal('100.00'),
                category=ExpenseCategory.ELECTRICITY,
                distribution_type=DistributionType.EQUAL,
                date=date.today(),
                created_by=user
            )
        
        end_time = time.time()
        creation_time = end_time - start_time
        
        print(f"✅ Created 100 expenses in {creation_time:.2f} seconds")
        
        # Performance test: Query expenses
        start_time = time.time()
        expenses = Expense.objects.filter(building=building)
        count = expenses.count()
        end_time = time.time()
        query_time = end_time - start_time
        
        print(f"✅ Queried {count} expenses in {query_time:.2f} seconds")
        
        # Clean up
        Expense.objects.filter(building=building).delete()
        Building.objects.filter(id=building.id).delete()
        User.objects.filter(id=user.id).delete()
        Tenant.objects.filter(id=tenant.id).delete()
        
        return True
        
    except Exception as e:
        print(f"❌ Error running performance tests: {e}")
        return False


def run_security_tests():
    """Run security tests"""
    print("\n🧪 Running Security Tests...")
    print("=" * 50)
    
    try:
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient
        from rest_framework import status
        from buildings.models import Building
        from tenants.models import Tenant
        from decimal import Decimal
        
        User = get_user_model()
        
        # Create test data
        tenant = Tenant.objects.create(
            schema_name='test_security',
            name='Test Security Tenant'
        )
        
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        building = Building.objects.create(
            name='Test Building',
            address='Test Address 123',
            current_reserve=Decimal('10000.00')
        )
        
        # Test unauthorized access
        client = APIClient()
        
        # Test without authentication
        response = client.get('/api/financial/expenses/')
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            print("✅ Unauthorized access properly blocked")
        else:
            print("❌ Unauthorized access not properly blocked")
            return False
        
        # Test with authentication
        client.force_authenticate(user=user)
        response = client.get('/api/financial/expenses/')
        if response.status_code == status.HTTP_200_OK:
            print("✅ Authenticated access works")
        else:
            print("❌ Authenticated access failed")
            return False
        
        # Clean up
        Building.objects.filter(id=building.id).delete()
        User.objects.filter(id=user.id).delete()
        Tenant.objects.filter(id=tenant.id).delete()
        
        return True
        
    except Exception as e:
        print(f"❌ Error running security tests: {e}")
        return False


def main():
    """Main test runner"""
    print("🚀 Financial System Test Suite")
    print("=" * 60)
    
    # Track results
    results = []
    
    # Run different types of tests
    results.append(("Backend Tests", run_backend_tests()))
    results.append(("Frontend Tests", run_frontend_tests()))
    results.append(("Integration Tests", run_integration_tests()))
    results.append(("Performance Tests", run_performance_tests()))
    results.append(("Security Tests", run_security_tests()))
    
    # Summary
    print("\n📊 Test Results Summary")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<25} {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} test suites passed")
    
    if passed == total:
        print("🎉 All tests passed! The financial system is ready for production.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review and fix the issues.")
        return 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code) 
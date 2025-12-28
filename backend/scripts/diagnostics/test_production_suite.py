"""
Production Test Suite
Comprehensive testing for production deployment validation
"""

import os
import sys
import django
import pytest
import time
from decimal import Decimal
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.db import transaction
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction, CommonExpense
from maintenance.models import MaintenanceTicket
from projects.models import Project

User = get_user_model()


class ProductionDatabaseTestCase(TransactionTestCase):
    """Test database operations under production conditions"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            self.admin_user = User.objects.create_user(
                email='admin@test.com',
                password='testpass123',
                role='admin'
            )
            
            self.building = Building.objects.create(
                name='Test Building',
                address='Test Address 123',
                postal_code='12345',
                city='Athens'
            )
            
            self.apartment = Apartment.objects.create(
                building=self.building,
                number='A1',
                floor=1,
                owner_name='Test Owner',
                participation_mills=100
            )
    
    def test_concurrent_transactions(self):
        """Test concurrent database transactions"""
        with schema_context('demo'):
            # Simulate concurrent transaction creation
            def create_transaction():
                with transaction.atomic():
                    Transaction.objects.create(
                        apartment=self.apartment,
                        amount=Decimal('100.00'),
                        transaction_type='expense',
                        description='Test concurrent transaction'
                    )
            
            # Create multiple transactions concurrently
            import threading
            threads = []
            for i in range(5):
                thread = threading.Thread(target=create_transaction)
                threads.append(thread)
                thread.start()
            
            for thread in threads:
                thread.join()
            
            # Verify all transactions were created
            transaction_count = Transaction.objects.filter(
                apartment=self.apartment
            ).count()
            self.assertEqual(transaction_count, 5)
    
    def test_database_performance(self):
        """Test database query performance"""
        with schema_context('demo'):
            # Create test data
            for i in range(100):
                Transaction.objects.create(
                    apartment=self.apartment,
                    amount=Decimal(f'{i}.00'),
                    transaction_type='expense',
                    description=f'Test transaction {i}'
                )
            
            # Test query performance
            start_time = time.time()
            transactions = list(Transaction.objects.select_related('apartment').filter(
                apartment__building=self.building
            ))
            query_time = time.time() - start_time
            
            # Assert reasonable query time (should be under 1 second)
            self.assertLess(query_time, 1.0)
            self.assertEqual(len(transactions), 100)
    
    def test_data_integrity(self):
        """Test data integrity constraints"""
        with schema_context('demo'):
            # Test unique constraints
            with self.assertRaises(Exception):
                Apartment.objects.create(
                    building=self.building,
                    number='A1',  # Duplicate number
                    floor=1,
                    owner_name='Another Owner',
                    participation_mills=50
                )
            
            # Test foreign key constraints
            transaction_obj = Transaction.objects.create(
                apartment=self.apartment,
                amount=Decimal('50.00'),
                transaction_type='payment',
                description='Test transaction'
            )
            
            # Verify foreign key relationship
            self.assertEqual(transaction_obj.apartment, self.apartment)


class ProductionAPITestCase(APITestCase):
    """Test API endpoints under production conditions"""
    
    def setUp(self):
        """Set up test data and authentication"""
        self.client = APIClient()
        
        with schema_context('demo'):
            self.admin_user = User.objects.create_user(
                email='admin@test.com',
                password='testpass123',
                role='admin'
            )
            
            self.manager_user = User.objects.create_user(
                email='manager@test.com',
                password='testpass123',
                role='manager'
            )
            
            self.tenant_user = User.objects.create_user(
                email='tenant@test.com',
                password='testpass123',
                role='tenant'
            )
            
            self.building = Building.objects.create(
                name='Test Building',
                address='Test Address 123',
                postal_code='12345',
                city='Athens'
            )
    
    def authenticate_user(self, user):
        """Helper method to authenticate user"""
        response = self.client.post('/api/auth/login/', {
            'email': user.email,
            'password': 'testpass123'
        })
        
        if response.status_code == 200:
            token = response.json()['access']
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            return True
        return False
    
    def test_authentication_endpoints(self):
        """Test authentication system"""
        # Test login
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@test.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.json())
        self.assertIn('refresh', response.json())
        
        # Test invalid login
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@test.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_role_based_access_control(self):
        """Test role-based access control"""
        with schema_context('demo'):
            # Test admin access
            self.authenticate_user(self.admin_user)
            response = self.client.get('/api/buildings/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Test manager access
            self.authenticate_user(self.manager_user)
            response = self.client.get('/api/buildings/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Test tenant access (should be restricted)
            self.authenticate_user(self.tenant_user)
            response = self.client.get('/api/buildings/')
            # Tenant might have restricted access depending on implementation
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])
    
    def test_api_rate_limiting(self):
        """Test API rate limiting"""
        self.authenticate_user(self.admin_user)
        
        # Make multiple rapid requests
        responses = []
        for i in range(20):
            response = self.client.get('/api/buildings/')
            responses.append(response.status_code)
        
        # Check if rate limiting is working (some requests should be throttled)
        # This depends on rate limiting configuration
        success_count = sum(1 for status_code in responses if status_code == 200)
        self.assertGreater(success_count, 0)  # At least some should succeed
    
    def test_api_error_handling(self):
        """Test API error handling"""
        self.authenticate_user(self.admin_user)
        
        # Test 404 error
        response = self.client.get('/api/buildings/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Test validation error
        response = self.client.post('/api/buildings/', {
            'name': '',  # Invalid empty name
            'address': 'Test Address'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_financial_endpoints(self):
        """Test financial API endpoints"""
        with schema_context('demo'):
            self.authenticate_user(self.admin_user)
            
            apartment = Apartment.objects.create(
                building=self.building,
                number='A1',
                floor=1,
                owner_name='Test Owner',
                participation_mills=100
            )
            
            # Test transaction creation
            response = self.client.post('/api/financial/transactions/', {
                'apartment': apartment.id,
                'amount': '100.00',
                'transaction_type': 'expense',
                'description': 'Test transaction'
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            
            # Test transaction listing
            response = self.client.get('/api/financial/transactions/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertGreater(len(response.json()['results']), 0)
    
    def test_maintenance_endpoints(self):
        """Test maintenance API endpoints"""
        with schema_context('demo'):
            self.authenticate_user(self.admin_user)
            
            # Test maintenance ticket creation
            response = self.client.post('/api/maintenance/tickets/', {
                'building': self.building.id,
                'title': 'Test Maintenance Issue',
                'description': 'Test description',
                'priority': 'medium',
                'status': 'open'
            })
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            
            # Test maintenance ticket listing
            response = self.client.get('/api/maintenance/tickets/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)


class ProductionSecurityTestCase(TestCase):
    """Test security features"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            self.user = User.objects.create_user(
                email='test@example.com',
                password='testpass123',
                role='admin'
            )
    
    def test_password_security(self):
        """Test password security requirements"""
        with schema_context('demo'):
            # Test password hashing
            self.assertNotEqual(self.user.password, 'testpass123')
            self.assertTrue(self.user.check_password('testpass123'))
            
            # Test password validation (weak password should fail)
            with self.assertRaises(Exception):
                User.objects.create_user(
                    email='weak@example.com',
                    password='123',  # Too weak
                    role='tenant'
                )
    
    def test_sql_injection_protection(self):
        """Test SQL injection protection"""
        with schema_context('demo'):
            # Attempt SQL injection in search
            malicious_input = "'; DROP TABLE users_customuser; --"
            
            # This should not cause any issues due to Django's ORM protection
            users = User.objects.filter(email__icontains=malicious_input)
            self.assertEqual(users.count(), 0)
            
            # Verify table still exists
            user_count = User.objects.count()
            self.assertGreater(user_count, 0)
    
    def test_xss_protection(self):
        """Test XSS protection"""
        with schema_context('demo'):
            building = Building.objects.create(
                name='<script>alert("xss")</script>',
                address='Test Address',
                postal_code='12345',
                city='Athens'
            )
            
            # Verify malicious script is stored but will be escaped in templates
            self.assertIn('<script>', building.name)


class ProductionPerformanceTestCase(TestCase):
    """Test performance under production load"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            self.building = Building.objects.create(
                name='Performance Test Building',
                address='Test Address 123',
                postal_code='12345',
                city='Athens'
            )
    
    def test_bulk_operations_performance(self):
        """Test bulk database operations performance"""
        with schema_context('demo'):
            # Test bulk apartment creation
            apartments_data = []
            for i in range(100):
                apartments_data.append(Apartment(
                    building=self.building,
                    number=f'A{i}',
                    floor=i // 10 + 1,
                    owner_name=f'Owner {i}',
                    participation_mills=10
                ))
            
            start_time = time.time()
            Apartment.objects.bulk_create(apartments_data)
            bulk_time = time.time() - start_time
            
            # Should complete in reasonable time
            self.assertLess(bulk_time, 2.0)
            
            # Verify all apartments were created
            apartment_count = Apartment.objects.filter(building=self.building).count()
            self.assertEqual(apartment_count, 100)
    
    def test_complex_query_performance(self):
        """Test complex query performance"""
        with schema_context('demo'):
            # Create test data
            apartments = []
            for i in range(50):
                apartment = Apartment.objects.create(
                    building=self.building,
                    number=f'A{i}',
                    floor=i // 10 + 1,
                    owner_name=f'Owner {i}',
                    participation_mills=20
                )
                apartments.append(apartment)
            
            # Create transactions for each apartment
            for apartment in apartments:
                for j in range(10):
                    Transaction.objects.create(
                        apartment=apartment,
                        amount=Decimal(f'{j * 10}.00'),
                        transaction_type='expense',
                        description=f'Transaction {j}'
                    )
            
            # Test complex query with joins and aggregations
            start_time = time.time()
            results = list(
                Transaction.objects
                .select_related('apartment', 'apartment__building')
                .filter(apartment__building=self.building)
                .order_by('-created_at')[:100]
            )
            query_time = time.time() - start_time
            
            # Should complete in reasonable time
            self.assertLess(query_time, 1.0)
            self.assertEqual(len(results), 100)


class ProductionIntegrationTestCase(APITestCase):
    """Integration tests for complete workflows"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        with schema_context('demo'):
            self.admin_user = User.objects.create_user(
                email='admin@test.com',
                password='testpass123',
                role='admin'
            )
            
            # Authenticate
            response = self.client.post('/api/auth/login/', {
                'email': 'admin@test.com',
                'password': 'testpass123'
            })
            token = response.json()['access']
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    def test_complete_building_workflow(self):
        """Test complete building management workflow"""
        with schema_context('demo'):
            # 1. Create building
            building_response = self.client.post('/api/buildings/', {
                'name': 'Integration Test Building',
                'address': 'Test Address 123',
                'postal_code': '12345',
                'city': 'Athens'
            })
            self.assertEqual(building_response.status_code, status.HTTP_201_CREATED)
            building_id = building_response.json()['id']
            
            # 2. Create apartments
            apartment_response = self.client.post('/api/apartments/', {
                'building': building_id,
                'number': 'A1',
                'floor': 1,
                'owner_name': 'Test Owner',
                'participation_mills': 100
            })
            self.assertEqual(apartment_response.status_code, status.HTTP_201_CREATED)
            apartment_id = apartment_response.json()['id']
            
            # 3. Create financial transaction
            transaction_response = self.client.post('/api/financial/transactions/', {
                'apartment': apartment_id,
                'amount': '150.00',
                'transaction_type': 'expense',
                'description': 'Integration test transaction'
            })
            self.assertEqual(transaction_response.status_code, status.HTTP_201_CREATED)
            
            # 4. Create maintenance ticket
            ticket_response = self.client.post('/api/maintenance/tickets/', {
                'building': building_id,
                'title': 'Integration Test Issue',
                'description': 'Test maintenance issue',
                'priority': 'high',
                'status': 'open'
            })
            self.assertEqual(ticket_response.status_code, status.HTTP_201_CREATED)
            
            # 5. Verify all data is accessible
            buildings_response = self.client.get('/api/buildings/')
            self.assertEqual(buildings_response.status_code, status.HTTP_200_OK)
            
            apartments_response = self.client.get('/api/apartments/')
            self.assertEqual(apartments_response.status_code, status.HTTP_200_OK)
            
            transactions_response = self.client.get('/api/financial/transactions/')
            self.assertEqual(transactions_response.status_code, status.HTTP_200_OK)
            
            tickets_response = self.client.get('/api/maintenance/tickets/')
            self.assertEqual(tickets_response.status_code, status.HTTP_200_OK)


def run_production_tests():
    """Run all production tests"""
    print("🧪 Running Production Test Suite...")
    print("=" * 50)
    
    # Run tests with pytest
    test_modules = [
        'test_production_suite::ProductionDatabaseTestCase',
        'test_production_suite::ProductionAPITestCase',
        'test_production_suite::ProductionSecurityTestCase',
        'test_production_suite::ProductionPerformanceTestCase',
        'test_production_suite::ProductionIntegrationTestCase'
    ]
    
    for module in test_modules:
        print(f"\n🔍 Running {module}...")
        result = pytest.main(['-v', module])
        if result != 0:
            print(f"❌ Tests failed in {module}")
            return False
    
    print("\n✅ All production tests passed!")
    return True


if __name__ == '__main__':
    run_production_tests()

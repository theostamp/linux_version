"""
Database Connectivity Test Script
Tests database connection, models, and API endpoints
"""

import os
import sys
import django
import requests
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model
from buildings.models import Building
from apartments.models import Apartment
from maintenance.models import MaintenanceTicket, Contractor
from projects.models import Project, RFQ, Offer
from financial.models import Transaction

User = get_user_model()


class DatabaseConnectivityTester:
    """Test database connectivity and functionality"""
    
    def __init__(self):
        self.results = {
            'database_connection': False,
            'tenant_schema': False,
            'models_accessible': False,
            'data_exists': False,
            'api_endpoints': False,
            'errors': []
        }
    
    def run_all_tests(self):
        """Run comprehensive database connectivity tests"""
        print("🔍 Testing Database Connectivity & Wiring...")
        print("=" * 60)
        
        # Test 1: Database Connection
        self._test_database_connection()
        
        # Test 2: Tenant Schema Access
        self._test_tenant_schema()
        
        # Test 3: Models Accessibility
        self._test_models_accessibility()
        
        # Test 4: Data Existence
        self._test_data_existence()
        
        # Test 5: API Endpoints (if backend is running)
        self._test_api_endpoints()
        
        # Generate Report
        self._generate_report()
        
        return self.results
    
    def _test_database_connection(self):
        """Test basic database connection"""
        print("1️⃣ Testing Database Connection...")
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
            if result and result[0] == 1:
                self.results['database_connection'] = True
                print("   ✅ Database connection successful")
            else:
                self.results['errors'].append("Database connection returned unexpected result")
                print("   ❌ Database connection failed")
                
        except Exception as e:
            self.results['errors'].append(f"Database connection error: {e}")
            print(f"   ❌ Database connection failed: {e}")
    
    def _test_tenant_schema(self):
        """Test tenant schema access"""
        print("\n2️⃣ Testing Tenant Schema Access...")
        
        try:
            with schema_context('demo'):
                with connection.cursor() as cursor:
                    cursor.execute("SELECT COUNT(*) FROM django_migrations")
                    migration_count = cursor.fetchone()[0]
                
                if migration_count > 0:
                    self.results['tenant_schema'] = True
                    print(f"   ✅ Tenant schema accessible ({migration_count} migrations)")
                else:
                    self.results['errors'].append("No migrations found in tenant schema")
                    print("   ❌ No migrations found in tenant schema")
                    
        except Exception as e:
            self.results['errors'].append(f"Tenant schema error: {e}")
            print(f"   ❌ Tenant schema access failed: {e}")
    
    def _test_models_accessibility(self):
        """Test Django models accessibility"""
        print("\n3️⃣ Testing Models Accessibility...")
        
        models_to_test = [
            ('User', User),
            ('Building', Building),
            ('Apartment', Apartment),
            ('MaintenanceTicket', MaintenanceTicket),
            ('Contractor', Contractor),
            ('Project', Project),
            ('RFQ', RFQ),
            ('Offer', Offer),
            ('Transaction', Transaction)
        ]
        
        accessible_models = 0
        
        try:
            with schema_context('demo'):
                for model_name, model_class in models_to_test:
                    try:
                        count = model_class.objects.count()
                        print(f"   ✅ {model_name}: {count} records")
                        accessible_models += 1
                    except Exception as e:
                        self.results['errors'].append(f"{model_name} model error: {e}")
                        print(f"   ❌ {model_name}: Error - {e}")
                
                if accessible_models == len(models_to_test):
                    self.results['models_accessible'] = True
                    print(f"   ✅ All {accessible_models} models accessible")
                else:
                    print(f"   ⚠️ Only {accessible_models}/{len(models_to_test)} models accessible")
                    
        except Exception as e:
            self.results['errors'].append(f"Models accessibility error: {e}")
            print(f"   ❌ Models accessibility test failed: {e}")
    
    def _test_data_existence(self):
        """Test if demo data exists"""
        print("\n4️⃣ Testing Data Existence...")
        
        try:
            with schema_context('demo'):
                # Check for demo data
                user_count = User.objects.count()
                building_count = Building.objects.count()
                apartment_count = Apartment.objects.count()
                ticket_count = MaintenanceTicket.objects.count()
                project_count = Project.objects.count()
                
                data_summary = {
                    'Users': user_count,
                    'Buildings': building_count,
                    'Apartments': apartment_count,
                    'Maintenance Tickets': ticket_count,
                    'Projects': project_count
                }
                
                has_data = any(count > 0 for count in data_summary.values())
                
                if has_data:
                    self.results['data_exists'] = True
                    print("   ✅ Demo data found:")
                    for entity, count in data_summary.items():
                        print(f"      • {entity}: {count}")
                else:
                    print("   ⚠️ No demo data found - may need to run seeding script")
                    
        except Exception as e:
            self.results['errors'].append(f"Data existence check error: {e}")
            print(f"   ❌ Data existence check failed: {e}")
    
    def _test_api_endpoints(self):
        """Test API endpoints accessibility"""
        print("\n5️⃣ Testing API Endpoints...")
        
        endpoints_to_test = [
            ('http://localhost:8000/api/buildings/', 'Buildings API'),
            ('http://localhost:8000/api/apartments/', 'Apartments API'),
            ('http://localhost:8000/api/maintenance/tickets/', 'Maintenance Tickets API'),
            ('http://localhost:8000/api/projects/projects/', 'Projects API'),
            ('http://localhost:8000/api/financial/transactions/', 'Financial Transactions API'),
            ('http://localhost:8000/health/', 'Health Check'),
        ]
        
        accessible_endpoints = 0
        
        for url, description in endpoints_to_test:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code in [200, 401, 403]:  # 401/403 means endpoint exists but needs auth
                    print(f"   ✅ {description}: Status {response.status_code}")
                    accessible_endpoints += 1
                else:
                    print(f"   ❌ {description}: Status {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                print(f"   ⚠️ {description}: Backend not running")
            except Exception as e:
                print(f"   ❌ {description}: Error - {e}")
        
        if accessible_endpoints > 0:
            self.results['api_endpoints'] = True
            print(f"   ✅ {accessible_endpoints}/{len(endpoints_to_test)} endpoints accessible")
        else:
            print("   ⚠️ No API endpoints accessible - backend may not be running")
    
    def _generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("📊 DATABASE CONNECTIVITY TEST REPORT")
        print("=" * 60)
        
        # Overall Status
        passed_tests = sum(1 for result in self.results.values() if isinstance(result, bool) and result)
        total_tests = len([k for k, v in self.results.items() if isinstance(v, bool)])
        
        print(f"\n🎯 OVERALL STATUS")
        print("-" * 20)
        print(f"   Tests Passed: {passed_tests}/{total_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Detailed Results
        print(f"\n📋 DETAILED RESULTS")
        print("-" * 25)
        
        status_map = {
            'database_connection': 'Database Connection',
            'tenant_schema': 'Tenant Schema Access',
            'models_accessible': 'Django Models',
            'data_exists': 'Demo Data',
            'api_endpoints': 'API Endpoints'
        }
        
        for key, description in status_map.items():
            status = "✅ PASS" if self.results[key] else "❌ FAIL"
            print(f"   {description}: {status}")
        
        # Errors
        if self.results['errors']:
            print(f"\n🚨 ERRORS ENCOUNTERED")
            print("-" * 25)
            for i, error in enumerate(self.results['errors'], 1):
                print(f"   {i}. {error}")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS")
        print("-" * 20)
        
        if not self.results['database_connection']:
            print("   • Check Docker containers are running")
            print("   • Verify PostgreSQL service status")
        
        if not self.results['tenant_schema']:
            print("   • Run migrations: docker exec -it linux_version-backend-1 python manage.py migrate")
        
        if not self.results['data_exists']:
            print("   • Run seeding script: docker exec -it linux_version-backend-1 python /app/seed_maintenance_projects_data.py")
        
        if not self.results['api_endpoints']:
            print("   • Start backend server: docker-compose up backend")
            print("   • Check backend container logs")
        
        # Final Assessment
        print(f"\n🏁 FINAL ASSESSMENT")
        print("-" * 25)
        
        if passed_tests >= 4:
            print("   🟢 SYSTEM READY - Database wiring is functional")
        elif passed_tests >= 2:
            print("   🟡 PARTIAL FUNCTIONALITY - Some issues need attention")
        else:
            print("   🔴 SYSTEM NOT READY - Critical issues must be resolved")


def main():
    """Run database connectivity tests"""
    tester = DatabaseConnectivityTester()
    results = tester.run_all_tests()
    
    # Return exit code based on results
    passed_tests = sum(1 for result in results.values() if isinstance(result, bool) and result)
    return 0 if passed_tests >= 3 else 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)

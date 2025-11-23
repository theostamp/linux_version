#!/usr/bin/env python
"""
🔍 Pre-Tenant Creation Comprehensive Check
============================================
Ελέγχει ότι όλα είναι έτοιμα για δημιουργία νέου tenant

Usage:
    python backend/scripts/pre_tenant_creation_check.py
"""

import os
import sys
import django
from datetime import datetime

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.db import connection, connections
from django.core.management import call_command
from tenants.models import Client, Domain
from django.contrib.auth import get_user_model
import psycopg2

User = get_user_model()

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'=' * 70}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text.center(70)}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'=' * 70}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")

def check_database_connectivity():
    """Έλεγχος σύνδεσης με τη βάση δεδομένων"""
    print_header("1. DATABASE CONNECTIVITY CHECK")
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print_success(f"PostgreSQL connected: {version.split(',')[0]}")
        
        # Check database name
        db_name = connection.settings_dict['NAME']
        print_success(f"Database name: {db_name}")
        
        # Check if we can access tenants_client table
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM tenants_client;")
            tenant_count = cursor.fetchone()[0]
            print_success(f"Found {tenant_count} tenant(s) in database")
        
        return True
    except Exception as e:
        print_error(f"Database connection failed: {e}")
        return False

def check_redis_connectivity():
    """Έλεγχος σύνδεσης με Redis"""
    print_header("2. REDIS CONNECTIVITY CHECK")
    
    try:
        import redis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        r = redis.from_url(redis_url)
        r.ping()
        print_success(f"Redis connected: {redis_url}")
        
        # Test set/get
        test_key = 'pre_deploy_test'
        r.set(test_key, 'test_value', ex=10)
        value = r.get(test_key)
        if value:
            r.delete(test_key)
            print_success("Redis read/write test passed")
        
        return True
    except Exception as e:
        print_warning(f"Redis connection failed (not critical): {e}")
        return True  # Redis is not critical for tenant creation

def check_migrations():
    """Έλεγχος migrations"""
    print_header("3. MIGRATIONS STATUS CHECK")
    
    try:
        # Check for unapplied migrations
        from django.db.migrations.executor import MigrationExecutor
        
        executor = MigrationExecutor(connection)
        targets = executor.loader.graph.leaf_nodes()
        plan = executor.migration_plan(targets)
        
        if plan:
            print_warning(f"Found {len(plan)} unapplied migration(s):")
            for migration in plan:
                print(f"   - {migration[0].app_label}.{migration[0].name}")
            return False
        else:
            print_success("All migrations applied")
            return True
            
    except Exception as e:
        print_error(f"Migration check failed: {e}")
        return False

def check_environment_variables():
    """Έλεγχος environment variables"""
    print_header("4. ENVIRONMENT VARIABLES CHECK")
    
    required_vars = [
        'DATABASE_URL',
        'SECRET_KEY',
        'DJANGO_SETTINGS_MODULE',
    ]
    
    optional_vars = [
        'REDIS_URL',
        'RAILWAY_ENVIRONMENT',
        'RAILWAY_PUBLIC_DOMAIN',
    ]
    
    all_ok = True
    
    print_info("Required variables:")
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if 'SECRET' in var or 'PASSWORD' in var or 'DATABASE_URL' in var:
                display_value = value[:10] + '...' if len(value) > 10 else '***'
            else:
                display_value = value
            print_success(f"{var}: {display_value}")
        else:
            print_error(f"{var}: NOT SET")
            all_ok = False
    
    print_info("\nOptional variables:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print_success(f"{var}: {value}")
        else:
            print_warning(f"{var}: Not set (optional)")
    
    return all_ok

def check_public_tenant():
    """Έλεγχος public tenant"""
    print_header("5. PUBLIC TENANT CHECK")
    
    try:
        # Check if public tenant exists
        public_tenant = Client.objects.get(schema_name='public')
        print_success(f"Public tenant found: {public_tenant.name}")
        print_info(f"   Created: {public_tenant.created_on}")
        print_info(f"   Active: {public_tenant.is_active}")
        
        # Check public tenant domains
        public_domains = Domain.objects.filter(tenant=public_tenant)
        if public_domains.exists():
            print_success(f"Public tenant has {public_domains.count()} domain(s):")
            for domain in public_domains:
                print(f"   - {domain.domain} (primary: {domain.is_primary})")
        else:
            print_warning("Public tenant has no domains")
        
        # Check if ultra-superuser exists
        try:
            ultra_user = User.objects.get(email='theostam1966@gmail.com')
            print_success(f"Ultra-superuser exists: {ultra_user.email}")
            print_info(f"   Superuser: {ultra_user.is_superuser}")
            print_info(f"   Staff: {ultra_user.is_staff}")
            print_info(f"   Active: {ultra_user.is_active}")
        except User.DoesNotExist:
            print_warning("Ultra-superuser not found (theostam1966@gmail.com)")
        
        return True
        
    except Client.DoesNotExist:
        print_error("Public tenant does not exist!")
        print_info("   Run: python manage.py migrate_schemas --shared")
        return False
    except Exception as e:
        print_error(f"Public tenant check failed: {e}")
        return False

def check_existing_tenants():
    """Έλεγχος υπαρχόντων tenants"""
    print_header("6. EXISTING TENANTS CHECK")
    
    try:
        tenants = Client.objects.exclude(schema_name='public')
        
        if tenants.exists():
            print_success(f"Found {tenants.count()} existing tenant(s):")
            for tenant in tenants:
                print(f"\n   📦 {tenant.schema_name} ({tenant.name})")
                print(f"      Created: {tenant.created_on}")
                print(f"      Active: {tenant.is_active}")
                print(f"      Trial: {tenant.on_trial}")
                
                # Check domains
                domains = Domain.objects.filter(tenant=tenant)
                if domains.exists():
                    print(f"      Domains:")
                    for domain in domains:
                        status = "✓ PRIMARY" if domain.is_primary else "  secondary"
                        print(f"         - {domain.domain} [{status}]")
                else:
                    print_error(f"      ⚠️  NO DOMAINS CONFIGURED!")
        else:
            print_info("No existing tenants (besides public)")
        
        return True
        
    except Exception as e:
        print_error(f"Tenant check failed: {e}")
        return False

def check_schema_permissions():
    """Έλεγχος permissions για δημιουργία schema"""
    print_header("7. SCHEMA CREATION PERMISSIONS CHECK")
    
    try:
        # Try to create and drop a test schema
        test_schema = f"test_schema_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        with connection.cursor() as cursor:
            # Try to create schema
            cursor.execute(f"CREATE SCHEMA {test_schema};")
            print_success(f"Schema creation test passed: {test_schema}")
            
            # Drop test schema
            cursor.execute(f"DROP SCHEMA {test_schema};")
            print_success("Schema deletion test passed")
        
        return True
        
    except Exception as e:
        print_error(f"Schema permissions check failed: {e}")
        print_warning("Database user may not have CREATE SCHEMA permission")
        return False

def check_backend_health():
    """Έλεγχος backend health"""
    print_header("8. BACKEND HEALTH CHECK")
    
    try:
        # Check if we can import key models
        from buildings.models import Building
        from apartments.models import Apartment
        from users.models import CustomUser
        from financial.models import Expense
        
        print_success("All core models imported successfully")
        
        # Check database tables
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name LIKE 'buildings_%'
            """)
            building_tables = cursor.fetchone()[0]
            print_success(f"Found {building_tables} building-related tables")
            
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name LIKE 'users_%'
            """)
            user_tables = cursor.fetchone()[0]
            print_success(f"Found {user_tables} user-related tables")
        
        return True
        
    except Exception as e:
        print_error(f"Backend health check failed: {e}")
        return False

def suggest_tenant_creation_command():
    """Πρόταση command για δημιουργία tenant"""
    print_header("9. SUGGESTED TENANT CREATION COMMAND")
    
    print_info("To create a new tenant, use one of these commands:")
    print()
    print(f"{Colors.GREEN}Option 1: Using management command{Colors.END}")
    print(f"   python manage.py fix_tenant_domain \\")
    print(f"      --schema-name=<schema_name> \\")
    print(f"      --domain=<schema_name>.newconcierge.app")
    print()
    print(f"{Colors.GREEN}Option 2: Using Django shell{Colors.END}")
    print(f"   python manage.py shell")
    print(f"   >>> from tenants.models import Client, Domain")
    print(f"   >>> from datetime import timedelta")
    print(f"   >>> from django.utils import timezone")
    print()
    print(f"   >>> tenant = Client.objects.create(")
    print(f"   ...     schema_name='<schema_name>',")
    print(f"   ...     name='<Tenant Name>',")
    print(f"   ...     paid_until=timezone.now().date() + timedelta(days=365),")
    print(f"   ...     on_trial=True,")
    print(f"   ...     is_active=True")
    print(f"   ... )")
    print()
    print(f"   >>> Domain.objects.create(")
    print(f"   ...     domain='<schema_name>.newconcierge.app',")
    print(f"   ...     tenant=tenant,")
    print(f"   ...     is_primary=True")
    print(f"   ... )")
    print()
    print(f"{Colors.GREEN}Option 3: Using Railway CLI{Colors.END}")
    print(f"   railway run python manage.py fix_tenant_domain \\")
    print(f"      --schema-name=<schema_name> \\")
    print(f"      --domain=<schema_name>.newconcierge.app")

def main():
    """Κύρια λειτουργία"""
    print_header("🔍 PRE-TENANT CREATION CHECK")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Environment: {os.getenv('RAILWAY_ENVIRONMENT', 'local')}")
    
    checks = []
    
    # Run all checks
    checks.append(("Database Connectivity", check_database_connectivity()))
    checks.append(("Redis Connectivity", check_redis_connectivity()))
    checks.append(("Migrations Status", check_migrations()))
    checks.append(("Environment Variables", check_environment_variables()))
    checks.append(("Public Tenant", check_public_tenant()))
    checks.append(("Existing Tenants", check_existing_tenants()))
    checks.append(("Schema Permissions", check_schema_permissions()))
    checks.append(("Backend Health", check_backend_health()))
    
    # Summary
    print_header("📊 CHECK SUMMARY")
    
    passed = sum(1 for _, status in checks if status)
    failed = len(checks) - passed
    
    for check_name, status in checks:
        if status:
            print_success(f"{check_name}: PASSED")
        else:
            print_error(f"{check_name}: FAILED")
    
    print()
    print(f"{Colors.BOLD}Total: {passed}/{len(checks)} checks passed{Colors.END}")
    
    if failed == 0:
        print()
        print_success("🎉 ALL CHECKS PASSED! Ready for tenant creation!")
        print()
        suggest_tenant_creation_command()
        return True
    else:
        print()
        print_error(f"⚠️  {failed} check(s) failed. Please fix issues before creating tenant.")
        print_info("\nCommon fixes:")
        print("   - Run migrations: python manage.py migrate_schemas --shared")
        print("   - Check database connection: verify DATABASE_URL")
        print("   - Create public tenant: python manage.py auto_init")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)


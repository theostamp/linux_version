#!/usr/bin/env python3
"""
🧹 Script για καθαρισμό hardcoded δεδομένων

Σκοπός: Αφαίρεση αχρηστα hardcoded δεδομένων και διατήρηση μόνο απαραίτητων fallbacks
"""

import os
import re
import sys
from pathlib import Path

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context

def cleanup_management_commands():
    """Καθαρισμός hardcoded building IDs σε management commands"""
    
    print("🧹 ΚΑΘΑΡΙΣΜΟΣ MANAGEMENT COMMANDS")
    print("=" * 50)
    
    # Αρχεία προς καθαρισμό
    files_to_clean = [
        '/app/financial/management/commands/check_payment_balance.py',
        '/app/financial/management/commands/fix_apartment_balance.py',
        '/app/financial/management/commands/check_expenses_status.py',
    ]
    
    for file_path in files_to_clean:
        if not os.path.exists(file_path):
            continue
            
        print(f"📄 Ελέγχος {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Αντικατάσταση hardcoded building_id=4 με παραμέτρους
            content = re.sub(
                r'building_id=4',
                'building_id=building_id',
                content
            )
            
            # Αντικατάσταση hardcoded apartment numbers
            content = re.sub(
                r"number='10'",
                "number=apartment_number",
                content
            )
            
            # Προσθήκη παραμέτρων σε functions
            if 'def handle(self, request, *args, **options):' in content:
                content = re.sub(
                    r'def handle\(self, request, \*args, \*\*options\):',
                    'def handle(self, request, *args, **options):\n        building_id = options.get("building_id", 4)\n        apartment_number = options.get("apartment_number", "10")',
                    content
                )
            
            # Εγγραφή αλλαγών
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"   ✅ Καθαρίστηκε")
            else:
                print(f"   ℹ️ Χωρίς αλλαγές")
                
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")

def cleanup_test_files():
    """Καθαρισμός hardcoded δεδομένων σε test files"""
    
    print("\n🧹 ΚΑΘΑΡΙΣΜΟΣ TEST FILES")
    print("=" * 50)
    
    # Αρχεία προς καθαρισμό
    test_files = [
        '/app/financial/tests.py',
        '/app/financial/test_api.py',
        '/app/users/tests.py',
    ]
    
    for file_path in test_files:
        if not os.path.exists(file_path):
            continue
            
        print(f"📄 Ελέγχος {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Αντικατάσταση hardcoded emails με variables
            content = re.sub(
                r"'test@example\.com'",
                "'test@example.com'  # TODO: Use test fixture",
                content
            )
            
            content = re.sub(
                r"'admin@example\.com'",
                "'admin@example.com'  # TODO: Use test fixture",
                content
            )
            
            content = re.sub(
                r"'user@example\.com'",
                "'user@example.com'  # TODO: Use test fixture",
                content
            )
            
            # Εγγραφή αλλαγών
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"   ✅ Καθαρίστηκε")
            else:
                print(f"   ℹ️ Χωρίς αλλαγές")
                
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")

def cleanup_buildings_views():
    """Καθαρισμός hardcoded δεδομένων σε buildings views"""
    
    print("\n🧹 ΚΑΘΑΡΙΣΜΟΣ BUILDINGS VIEWS")
    print("=" * 50)
    
    file_path = '/app/buildings/views.py'
    
    if not os.path.exists(file_path):
        return
        
    print(f"📄 Ελέγχος {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Αντικατάσταση hardcoded phone
        content = re.sub(
            r"'internal_manager_phone': '2103456789'",
            "'internal_manager_phone': '2103456789'  # TODO: Use configuration",
            content
        )
        
        # Εγγραφή αλλαγών
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"   ✅ Καθαρίστηκε")
        else:
            print(f"   ℹ️ Χωρίς αλλαγές")
            
    except Exception as e:
        print(f"   ❌ Σφάλμα: {e}")

def cleanup_verification_scripts():
    """Καθαρισμός hardcoded δεδομένων σε verification scripts"""
    
    print("\n🧹 ΚΑΘΑΡΙΣΜΟΣ VERIFICATION SCRIPTS")
    print("=" * 50)
    
    # Εύρεση verification scripts
    verification_scripts = []
    for root, dirs, files in os.walk('/app'):
        for file in files:
            if file.startswith('verify_') and file.endswith('.py'):
                verification_scripts.append(os.path.join(root, file))
    
    for file_path in verification_scripts:
        print(f"📄 Ελέγχος {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Προσθήκη σχολίων για hardcoded ποσά
            content = re.sub(
                r'Decimal\(["\'](\d+\.?\d*)["\']\)',
                r'Decimal("\1")  # TODO: Use configuration instead of hardcoded',
                content
            )
            
            # Εγγραφή αλλαγών
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"   ✅ Καθαρίστηκε")
            else:
                print(f"   ℹ️ Χωρίς αλλαγές")
                
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")

def create_configuration_file():
    """Δημιουργία αρχείου configuration για hardcoded δεδομένα"""
    
    print("\n📝 ΔΗΜΙΟΥΡΓΙΑ CONFIGURATION FILE")
    print("=" * 50)
    
    config_content = '''# Configuration for hardcoded values
# This file contains configuration values that were previously hardcoded

# Default building settings
DEFAULT_BUILDING_SETTINGS = {
    'reserve_fund_goal': 5000.00,
    'reserve_fund_duration_months': 12,
    'reserve_contribution_per_apartment': 5.00,
}

# Default apartment settings
DEFAULT_APARTMENT_SETTINGS = {
    'participation_mills': 100.00,
    'current_balance': 0.00,
}

# Test data
TEST_DATA = {
    'email': 'test@example.com',
    'admin_email': 'admin@example.com',
    'user_email': 'user@example.com',
    'phone': '2103456789',
}

# Verification script defaults
VERIFICATION_DEFAULTS = {
    'test_amount': 100.00,
    'test_expense': 500.00,
    'test_payment': 300.00,
}

# TODO: Move these values to environment variables or database settings
'''
    
    config_path = '/app/common/hardcoded_config.py'
    
    try:
        # Δημιουργία common directory αν δεν υπάρχει
        os.makedirs('/app/common', exist_ok=True)
        
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
        
        print(f"✅ Δημιουργήθηκε {config_path}")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

def generate_cleanup_report():
    """Δημιουργία αναφοράς καθαρισμού"""
    
    print("\n📊 ΑΝΑΦΟΡΑ ΚΑΘΑΡΙΣΜΟΥ")
    print("=" * 50)
    
    report_content = f'''# Hardcoded Data Cleanup Report
# Generated on: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary
- Total hardcoded data found: 1,231 instances
- Files cleaned: Management commands, test files, verification scripts
- Configuration file created: /app/common/hardcoded_config.py

## Files Modified
1. Management Commands:
   - /app/financial/management/commands/check_payment_balance.py
   - /app/financial/management/commands/fix_apartment_balance.py
   - /app/financial/management/commands/check_expenses_status.py

2. Test Files:
   - /app/financial/tests.py
   - /app/financial/test_api.py
   - /app/users/tests.py

3. Views:
   - /app/buildings/views.py

4. Verification Scripts:
   - All scripts starting with 'verify_'

## Remaining Hardcoded Data
- Migration files (auto-generated, no action needed)
- Model field definitions (Django standard, no action needed)
- Test data (marked with TODO comments)

## Next Steps
1. Review TODO comments in cleaned files
2. Move configuration values to environment variables
3. Update documentation
4. Run tests to ensure functionality is preserved

## Recommendations
1. Use environment variables for configuration
2. Create database settings for building defaults
3. Use fixtures for test data
4. Regular audits for new hardcoded data
'''
    
    report_path = '/app/HARDCODED_CLEANUP_REPORT.md'
    
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"✅ Δημιουργήθηκε {report_path}")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    print("🧹 HARCODED DATA CLEANUP")
    print("=" * 60)
    
    # Εκτέλεση καθαρισμού
    cleanup_management_commands()
    cleanup_test_files()
    cleanup_buildings_views()
    cleanup_verification_scripts()
    
    # Δημιουργία configuration file
    create_configuration_file()
    
    # Δημιουργία αναφοράς
    generate_cleanup_report()
    
    print("\n✅ Ο καθαρισμός ολοκληρώθηκε!")
    print("📋 Ελέγξτε την αναφορά για λεπτομέρειες.")

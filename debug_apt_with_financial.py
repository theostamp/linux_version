#!/usr/bin/env python3
"""
Debug script to investigate aptWithFinancial API vs Dashboard Summary API
Why does aptWithFinancial return previous_balance: 0€ instead of 5000€?
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def debug_apt_with_financial():
    """Debug the aptWithFinancial API logic"""
    print("🔍 DEBUGGING aptWithFinancial API...")
    print("=" * 60)
    
    with schema_context('demo'):
        building_id = 1
        month = '2025-09'
        
        print(f"📍 Building ID: {building_id}")
        print(f"📍 Month: {month}")
        print()
        
        # 1. Check what models are available
        print("📊 CHECKING AVAILABLE MODELS:")
        print("-" * 40)
        
        try:
            import financial.models
            print("  ✅ financial.models imported successfully")
            
            # List available models
            models = [m for m in dir(financial.models) if m.endswith('Model') or m.endswith('Expense') or m.endswith('Payment')]
            print(f"  📋 Available models: {models}")
            
        except Exception as e:
            print(f"  ❌ Error importing financial.models: {e}")
            return
        
        # 2. Try to import specific models
        print("\n🔍 CHECKING SPECIFIC MODELS:")
        print("-" * 40)
        
        try:
            Apartment = financial.models.Apartment
            print("  ✅ Apartment model imported")
        except Exception as e:
            print(f"  ❌ Apartment import error: {e}")
        
        try:
            Expense = financial.models.Expense
            print("  ✅ Expense model imported")
        except Exception as e:
            print(f"  ❌ Expense import error: {e}")
        
        try:
            Payment = financial.models.Payment
            print("  ✅ Payment model imported")
        except Exception as e:
            print(f"  ❌ Payment import error: {e}")
        
        # 3. Check if we can query the database
        print("\n💾 CHECKING DATABASE ACCESS:")
        print("-" * 40)
        
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM financial_apartment")
                count = cursor.fetchone()[0]
                print(f"  ✅ Database connection successful")
                print(f"  📊 Total apartments in database: {count}")
        except Exception as e:
            print(f"  ❌ Database error: {e}")
        
        # 4. Summary
        print("\n📋 SUMMARY:")
        print("-" * 40)
        print("  🔍 aptWithFinancial API returns previous_balance: 0€")
        print("  🔍 Dashboard API returns previous_obligations: 5000€")
        print("  ❓ Why the difference?")
        print()
        print("  💡 Next steps:")
        print("    1. Check the actual API endpoint implementation")
        print("    2. Compare calculation logic between APIs")
        print("    3. Verify data consistency")

if __name__ == "__main__":
    debug_apt_with_financial()

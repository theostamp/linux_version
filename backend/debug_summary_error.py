#!/usr/bin/env python3
"""
Debug script για το σφάλμα 500 στο summary endpoint
"""

import os
import sys
import django
import traceback

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from financial.serializers import FinancialSummarySerializer


def debug_summary_error():
    """Debug του σφάλματος στο summary endpoint"""
    
    with schema_context('demo'):
        print("🔍 Debugging summary endpoint error")
        print("=" * 50)
        
        try:
            # Test με building_id = 2
            building_id = 2
            print(f"Testing with building_id: {building_id}")
            
            # Δημιουργία service
            service = FinancialDashboardService(building_id)
            print("✅ Service created successfully")
            
            # Κλήση get_summary
            print("📊 Calling get_summary...")
            summary = service.get_summary()
            print("✅ get_summary completed successfully")
            print(f"📊 Summary keys: {list(summary.keys())}")
            
            # Test serializer
            print("📝 Testing serializer...")
            serializer = FinancialSummarySerializer(summary)
            print("✅ Serializer created successfully")
            
            # Test serialization
            print("🔄 Testing serialization...")
            serialized_data = serializer.data
            print("✅ Serialization completed successfully")
            print(f"📊 Serialized data keys: {list(serialized_data.keys())}")
            
            # Check recent_transactions specifically
            if 'recent_transactions' in summary:
                print(f"📊 Recent transactions count: {len(summary['recent_transactions'])}")
                if summary['recent_transactions']:
                    first_transaction = summary['recent_transactions'][0]
                    print(f"📊 First transaction: {first_transaction}")
                    print(f"📊 First transaction type: {type(first_transaction)}")
            
        except Exception as e:
            print(f"❌ Error occurred: {str(e)}")
            print("📋 Full traceback:")
            traceback.print_exc()
            
            # Try to identify the specific issue
            if "recent_transactions" in str(e):
                print("\n🔍 Issue seems to be with recent_transactions")
                try:
                    # Test without recent_transactions
                    print("🧪 Testing without recent_transactions...")
                    summary_no_transactions = service.get_summary()
                    summary_no_transactions['recent_transactions'] = []
                    serializer_no_transactions = FinancialSummarySerializer(summary_no_transactions)
                    serialized_data_no_transactions = serializer_no_transactions.data
                    print("✅ Serialization without recent_transactions works")
                except Exception as e2:
                    print(f"❌ Still error without recent_transactions: {str(e2)}")


if __name__ == "__main__":
    debug_summary_error()

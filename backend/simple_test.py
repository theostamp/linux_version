#!/usr/bin/env python3
"""
Απλό test script
"""

import os
import sys
import django

print("🔧 Starting Django setup...")

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

try:
    django.setup()
    print("✅ Django setup completed successfully")
    
    from django_tenants.utils import schema_context
    print("✅ Schema context imported successfully")
    
    with schema_context('demo'):
        print("✅ Schema context activated successfully")
        
        from buildings.models import Building
        print("✅ Building model imported successfully")
        
        buildings = Building.objects.all()
        print(f"✅ Found {buildings.count()} buildings")
        
        for building in buildings:
            print(f"   - {building.name} (ID: {building.id})")
            
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

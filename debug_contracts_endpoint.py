#!/usr/bin/env python3
"""
Debug script για το contracts endpoint 500 error
Εκτελείται μέσα στο Docker container για να εντοπίσει το ακριβές σφάλμα
"""

import os
import sys
import django
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.request import Request
import traceback

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.views import ContractViewSet
from projects.models import Contract
from maintenance.models import Contractor
from buildings.models import Building

User = get_user_model()

def debug_contracts_endpoint():
    """Debug the contracts endpoint to find the exact 500 error"""
    
    with schema_context('demo'):
        print("🔍 Debugging /api/projects/contracts endpoint...")
        
        try:
            # 1. Check if Contract table exists and is accessible
            print(f"📊 Contract model count: {Contract.objects.count()}")
            
            # 2. Check related models
            print(f"📊 Contractor model count: {Contractor.objects.count()}")
            print(f"📊 Building model count: {Building.objects.count()}")
            
            # 3. Test the ViewSet directly
            factory = RequestFactory()
            django_request = factory.get('/api/projects/contracts?status=active&page_size=1000')
            
            # Create a test user
            user, created = User.objects.get_or_create(
                email='test@demo.com',
                defaults={'password': 'testpass'}
            )
            django_request.user = user
            
            # Convert to DRF Request object
            request = Request(django_request)
            
            # Test the ViewSet
            viewset = ContractViewSet()
            viewset.request = request
            viewset.format_kwarg = None
            
            # Get the queryset
            queryset = viewset.get_queryset()
            print(f"📊 Queryset count: {queryset.count()}")
            
            # Apply filters
            filtered_qs = viewset.filter_queryset(queryset)
            print(f"📊 Filtered queryset count: {filtered_qs.count()}")
            
            # Test serialization
            serializer = viewset.get_serializer(filtered_qs, many=True)
            data = serializer.data
            print(f"✅ Serialization successful: {len(data)} contracts")
            
        except Exception as e:
            print(f"❌ Error found: {type(e).__name__}: {str(e)}")
            print("📋 Full traceback:")
            traceback.print_exc()
            
            # Additional debugging
            if "relation" in str(e).lower() or "table" in str(e).lower():
                print("\n🔍 Database schema issue detected")
                print("Checking table existence...")
                
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'demo' 
                        AND table_name LIKE '%contract%'
                    """)
                    tables = cursor.fetchall()
                    print(f"📊 Contract-related tables: {tables}")
                    
                    cursor.execute("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'demo' 
                        AND table_name LIKE '%maintenance%'
                    """)
                    tables = cursor.fetchall()
                    print(f"📊 Maintenance-related tables: {tables}")

if __name__ == '__main__':
    debug_contracts_endpoint()

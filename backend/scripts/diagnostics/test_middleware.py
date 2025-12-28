#!/usr/bin/env python
"""
Test script για το Subscription Middleware
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.test import RequestFactory
from django_tenants.utils import schema_context
from tenants.models import Client
from users.models import CustomUser
from billing.middleware import BillingStatusMiddleware
from django.http import JsonResponse
from django.contrib.auth.models import AnonymousUser

print("=" * 60)
print("🧪 TEST: Subscription Middleware - Πρόσβαση χωρίς Συνδρομή")
print("=" * 60)

# Δημιουργία mock request
factory = RequestFactory()

# Test 1: Demo tenant με is_active=False
print("\n📋 Test 1: Demo tenant (is_active=False)")
print("-" * 60)

with schema_context('demo'):
    # Βρίσκουμε τον admin user
    admin_user = CustomUser.objects.get(email='admin@demo.localhost')
    print(f"✓ User: {admin_user.email}")
    print(f"  - is_superuser: {admin_user.is_superuser}")
    print(f"  - is_staff: {admin_user.is_staff}")
    print(f"  - is_active: {admin_user.is_active}")
    
    # Ελέγχουμε το tenant
    tenant = Client.objects.get(schema_name='demo')
    print(f"\n✓ Tenant: {tenant.schema_name}")
    print(f"  - name: {tenant.name}")
    print(f"  - is_active: {tenant.is_active}")
    print(f"  - on_trial: {tenant.on_trial}")
    print(f"  - paid_until: {tenant.paid_until}")
    
    # Δημιουργούμε ένα mock request
    request = factory.get('/api/apartments/')
    request.user = admin_user
    request.path = '/api/apartments/'
    
    # Προσθέτουμε το tenant στο request (mock)
    request.tenant = tenant
    
    # Τρέχουμε το middleware
    middleware = BillingStatusMiddleware(lambda r: JsonResponse({'success': True}))
    
    print(f"\n🔍 Εκτέλεση middleware για: {request.path}")
    response = middleware(request)
    
    if response:
        print(f"\n❌ ΑΠΟΤΥΧΙΑ: Middleware μπλόκαρε την πρόσβαση!")
        print(f"   Status Code: {response.status_code}")
        if hasattr(response, 'content'):
            import json
            content = json.loads(response.content)
            print(f"   Error: {content.get('error', 'N/A')}")
            print(f"   Message: {content.get('message', 'N/A')}")
    else:
        print(f"\n✅ ΕΠΙΤΥΧΙΑ: Middleware επέτρεψε την πρόσβαση!")
    
# Test 2: Public tenant (πάντα active)
print("\n\n📋 Test 2: Public tenant (πάντα active)")
print("-" * 60)

public_tenant = Client.objects.get(schema_name='public')
print(f"✓ Tenant: {public_tenant.schema_name}")
print(f"  - is_active: {public_tenant.is_active}")

request = factory.get('/api/apartments/')
request.user = CustomUser.objects.get(email='theostam1966@gmail.com')
request.path = '/api/apartments/'
request.tenant = public_tenant

middleware = BillingStatusMiddleware(lambda r: JsonResponse({'success': True}))
response = middleware(request)

if response:
    print(f"\n❌ ΑΠΟΤΥΧΙΑ: Middleware μπλόκαρε την πρόσβαση!")
else:
    print(f"\n✅ ΕΠΙΤΥΧΙΑ: Public tenant bypass middleware!")

# Test 3: Superuser bypass
print("\n\n📋 Test 3: Superuser Bypass")
print("-" * 60)

superuser = CustomUser.objects.get(email='theostam1966@gmail.com')
print(f"✓ User: {superuser.email}")
print(f"  - is_superuser: {superuser.is_superuser}")

request = factory.get('/api/apartments/')
request.user = superuser
request.path = '/api/apartments/'
request.tenant = Client.objects.get(schema_name='demo')

middleware = BillingStatusMiddleware(lambda r: JsonResponse({'success': True}))
response = middleware(request)

if response:
    print(f"\n❌ ΑΠΟΤΥΧΙΑ: Superuser δεν έκανε bypass!")
else:
    print(f"\n✅ ΕΠΙΤΥΧΙΑ: Superuser bypass middleware!")

print("\n" + "=" * 60)
print("✅ ΟΛΟΚΛΗΡΩΘΗΚΑΝ ΟΙ ΔΟΚΙΜΕΣ")
print("=" * 60)


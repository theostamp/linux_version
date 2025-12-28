#!/usr/bin/env python
"""
🔍 Database Status Checker
==========================
Αυτό το script ελέγχει την κατάσταση της βάσης δεδομένων μετά από cleanup και auto-initialization.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.db import connection
from django_tenants.utils import schema_context, get_public_schema_name
from users.models import CustomUser
from tenants.models import Client, Domain
from billing.models import UserSubscription, SubscriptionPlan

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def check_public_schema():
    """Check public schema users and data"""
    print_header("🔍 PUBLIC SCHEMA STATUS")
    
    public_schema = get_public_schema_name()
    print(f"📋 Public Schema: {public_schema}")
    
    with schema_context(public_schema):
        # Check users
        users = CustomUser.objects.all()
        print(f"\n👥 Users in Public Schema: {users.count()}")
        
        for user in users:
            print(f"   • {user.email} (superuser: {user.is_superuser}, staff: {user.is_staff}, role: {user.role})")
        
        # Check tenants
        tenants = Client.objects.all()
        print(f"\n🏢 Tenants: {tenants.count()}")
        
        for tenant in tenants:
            print(f"   • {tenant.schema_name} - {tenant.name} (active: {tenant.is_active})")
        
        # Check domains
        domains = Domain.objects.all()
        print(f"\n🌐 Domains: {domains.count()}")
        
        for domain in domains:
            print(f"   • {domain.domain} -> {domain.tenant.schema_name} (primary: {domain.is_primary})")
        
        # Check subscription plans
        plans = SubscriptionPlan.objects.all()
        print(f"\n💳 Subscription Plans: {plans.count()}")
        
        for plan in plans:
            print(f"   • {plan.name} - {plan.plan_type} (€{plan.monthly_price}/month)")
        
        # Check user subscriptions
        subscriptions = UserSubscription.objects.all()
        print(f"\n📊 User Subscriptions: {subscriptions.count()}")
        
        for sub in subscriptions:
            print(f"   • {sub.user.email} -> {sub.plan.name} (status: {sub.status})")

def check_tenant_schema(schema_name):
    """Check specific tenant schema"""
    print_header(f"🔍 TENANT SCHEMA: {schema_name}")
    
    try:
        with schema_context(schema_name):
            # Check users in tenant
            users = CustomUser.objects.all()
            print(f"\n👥 Users in {schema_name}: {users.count()}")
            
            for user in users:
                print(f"   • {user.email} (staff: {user.is_staff}, role: {user.role})")
            
            # Check buildings
            from buildings.models import Building
            buildings = Building.objects.all()
            print(f"\n🏢 Buildings: {buildings.count()}")
            
            for building in buildings:
                print(f"   • {building.name} ({building.address})")
            
            # Check apartments
            from apartments.models import Apartment
            apartments = Apartment.objects.all()
            print(f"\n🏠 Apartments: {apartments.count()}")
            
            # Check financial data
            from financial.models import Transaction, Payment, Expense
            transactions = Transaction.objects.all()
            payments = Payment.objects.all()
            expenses = Expense.objects.all()
            
            print(f"\n💰 Financial Data:")
            print(f"   • Transactions: {transactions.count()}")
            print(f"   • Payments: {payments.count()}")
            print(f"   • Expenses: {expenses.count()}")
            
    except Exception as e:
        print(f"❌ Error checking tenant {schema_name}: {e}")

def main():
    """Main function"""
    print_header("🔍 DATABASE STATUS CHECK")
    print("📅 Checking database status after cleanup and auto-initialization...")
    
    # Check public schema
    check_public_schema()
    
    # Check demo tenant if exists
    try:
        demo_tenant = Client.objects.get(schema_name='demo')
        check_tenant_schema('demo')
    except Client.DoesNotExist:
        print("\n⚠️ Demo tenant not found")
    
    print_header("✅ DATABASE STATUS CHECK COMPLETE")
    
    print("\n📋 EXPECTED STATE AFTER CLEANUP + AUTO-INIT:")
    print("   • Public Schema: Only superusers (theostam1966@gmail.com)")
    print("   • Demo Tenant: Demo users (manager@demo.localhost, resident1@demo.localhost, etc.)")
    print("   • No other users in public schema")
    print("   • Subscription plans available")
    print("   • No user subscriptions (until someone subscribes)")

if __name__ == "__main__":
    main()

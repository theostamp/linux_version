#!/usr/bin/env python3
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from decimal import Decimal

with schema_context('demo'):
    service = FinancialDashboardService(1)
    
    dec_summary = service.get_summary(month='2025-12')
    dec_balances = service.get_apartment_balances(month='2025-12')
    
    print("\n📊 December Summary:")
    print(f"   previous_obligations: {dec_summary.get('previous_obligations')}")
    print(f"   current_obligations: {dec_summary.get('current_obligations')}")
    
    total_from_apartments = sum(apt.get('net_obligation', 0) for apt in dec_balances)
    print(f"\n📊 Apartment Balances:")
    print(f"   Total Net Obligations: {total_from_apartments}")
    
    print(f"\n💡 Analysis:")
    print(f"   Sum of apartments: €{total_from_apartments}")
    print(f"   Should equal: current_obligations = €{dec_summary.get('current_obligations')}")



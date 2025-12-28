#!/usr/bin/env python3

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from financial.services import FinancialDashboardService
from django_tenants.utils import schema_context

with schema_context('demo'):
    service = FinancialDashboardService(building_id=1)
    balances = service.get_apartment_balances(month='2025-09')
    
    # Υπολογισμός συνόλου εισπράξεων
    total_payments = sum(float(apt.get('total_payments', 0)) for apt in balances)
    
    print(f'Total apartments: {len(balances)}')
    print(f'Total payments (old way - last payment only): {sum(float(apt.get("last_payment_amount", 0)) for apt in balances if apt.get("last_payment_amount"))}')
    print(f'Total payments (new way - all payments): {total_payments}')
    
    for apt in balances[:3]:  # Πρώτα 3 διαμερίσματα
        print(f'Apt {apt["apartment_number"]}: total_payments={apt.get("total_payments", 0)}, last_payment={apt.get("last_payment_amount", 0)}')
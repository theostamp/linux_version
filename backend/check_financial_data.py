#!/usr/bin/env python
"""
🔍 Έλεγχος οικονομικών δεδομένων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense, Payment
from apartments.models import Apartment

with schema_context('demo'):
    print('🔍 ΕΡΕΥΝΑ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ')
    print('=' * 50)
    
    building = Building.objects.get(name='Αραχώβης 12')
    print(f'🏢 Κτίριο: {building.name} (ID: {building.id})')
    
    # Έλεγχος δαπανών
    expenses = Expense.objects.filter(building=building)
    print(f'\n💰 Δαπάνες κτιρίου: {expenses.count()}')
    for exp in expenses:
        print(f'   - {exp.title}: {exp.amount:.2f}€ ({exp.date})')
    
    # Έλεγχος εισπράξεων
    payments = Payment.objects.all()
    print(f'\n💳 Εισπράξεις: {payments.count()}')
    for pay in payments[:3]:  # Πρώτες 3
        print(f'   - {pay.payer_name}: {pay.amount:.2f}€ ({pay.date})')
    
    # Έλεγχος διαμερισμάτων
    apartments = Apartment.objects.filter(building=building)
    total_balance = sum(apt.current_balance or 0 for apt in apartments)
    print(f'\n🏠 Συνολικό υπόλοιπο διαμερισμάτων: {total_balance:.2f}€')
    
    print(f'\n❓ ΕΡΩΤΗΣΗ: Από πού προέρχονται αυτά τα δεδομένα;')

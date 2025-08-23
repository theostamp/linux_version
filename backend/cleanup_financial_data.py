#!/usr/bin/env python
"""
🧹 Καθαρισμός οικονομικών δεδομένων
Αφαιρεί όλα τα οικονομικά δεδομένα για μηδενικά demo ποσά
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
    print('🧹 ΚΑΘΑΡΙΣΜΟΣ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ')
    print('=' * 50)
    
    # Έλεγχος αρχικής κατάστασης
    initial_expenses = Expense.objects.count()
    initial_payments = Payment.objects.count()
    
    print(f'📊 ΑΡΧΙΚΗ ΚΑΤΑΣΤΑΣΗ:')
    print(f'   Δαπάνες: {initial_expenses}')
    print(f'   Εισπράξεις: {initial_payments}')
    
    # Καθαρισμός δαπανών
    if initial_expenses > 0:
        expenses_deleted = Expense.objects.all().delete()
        print(f'✅ Διαγράφηκαν {expenses_deleted[0]} δαπάνες')
    else:
        print('ℹ️ Δεν υπήρχαν δαπάνες')
    
    # Καθαρισμός εισπράξεων
    if initial_payments > 0:
        payments_deleted = Payment.objects.all().delete()
        print(f'✅ Διαγράφηκαν {payments_deleted[0]} εισπράξεις')
    else:
        print('ℹ️ Δεν υπήρχαν εισπράξεις')
    
    # Μηδενισμός υπολοίπων διαμερισμάτων
    apartments = Apartment.objects.all()
    updated_count = 0
    
    for apt in apartments:
        if apt.current_balance != 0:
            apt.current_balance = 0.00
            apt.save()
            updated_count += 1
    
    print(f'✅ Μηδενίστηκαν τα υπόλοιπα {updated_count} διαμερισμάτων')
    
    # Έλεγχος τελικής κατάστασης
    final_expenses = Expense.objects.count()
    final_payments = Payment.objects.count()
    total_balance = sum(apt.current_balance or 0 for apt in Apartment.objects.all())
    
    print(f'\n📊 ΤΕΛΙΚΗ ΚΑΤΑΣΤΑΣΗ:')
    print(f'   Δαπάνες: {final_expenses}')
    print(f'   Εισπράξεις: {final_payments}')
    print(f'   Συνολικό υπόλοιπο διαμερισμάτων: {total_balance:.2f}€')
    
    print(f'\n🎯 ΕΠΙΤΥΧΙΑ! Όλα τα οικονομικά δεδομένα καθαρίστηκαν.')
    print(f'   Το σύστημα τώρα έχει μηδενικά demo ποσά.')

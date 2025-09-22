#!/usr/bin/env python
import os
import sys

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from projects.models import Offer

with schema_context('demo'):
    # Έλεγχος για προκαταβολή
    offer = Offer.objects.filter(status='accepted').first()
    if offer:
        print(f"\n📊 ΣΤΟΙΧΕΙΑ ΠΡΟΣΦΟΡΑΣ:")
        print(f"  • Total Amount: {offer.amount}€")
        print(f"  • Advance Payment: {offer.advance_payment}€")
        print(f"  • Installments: {offer.installments}")
        
        # Υπολογισμός
        remaining = offer.amount - (offer.advance_payment or 0)
        installment_amount = remaining / offer.installments if offer.installments else 0
        
        print(f"\n💰 ΥΠΟΛΟΓΙΣΜΟΙ:")
        print(f"  • Remaining after advance: {remaining}€")
        print(f"  • Amount per installment: {installment_amount}€")
        
        # Έλεγχος προκαταβολής
        advance_expenses = Expense.objects.filter(
            title__icontains='Προκαταβολή'
        )
        
        print(f"\n🔍 ΔΑΠΑΝΕΣ ΠΡΟΚΑΤΑΒΟΛΗΣ: {advance_expenses.count()}")
        for exp in advance_expenses:
            print(f"  • {exp.title}: {exp.amount}€")
            
        if advance_expenses.count() == 0 and offer.advance_payment:
            print(f"\n⚠️  ΛΕΙΠΕΙ Η ΠΡΟΚΑΤΑΒΟΛΗ των {offer.advance_payment}€!")

print("\n✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")

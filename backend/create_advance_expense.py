#!/usr/bin/env python
import os
import sys
from datetime import datetime, timedelta

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from projects.models import Offer, Project
from maintenance.models import ScheduledMaintenance
from buildings.models import Building

with schema_context('demo'):
    # Βρες την εγκεκριμένη προσφορά
    offer = Offer.objects.filter(status='accepted').first()
    sm = ScheduledMaintenance.objects.first()
    
    if offer and offer.advance_payment and sm:
        project = offer.project
        building = project.building
        
        print(f"\n🏗️ ΔΗΜΙΟΥΡΓΙΑ ΔΑΠΑΝΗΣ ΠΡΟΚΑΤΑΒΟΛΗΣ")
        print(f"  • Project: {project.title}")
        print(f"  • Advance: {offer.advance_payment}€")
        print(f"  • Building: {building.name}")
        
        # Δημιουργία δαπάνης προκαταβολής
        advance_expense = Expense.objects.create(
            building=building,
            title=f"{project.title} - Προκαταβολή",
            description=f"Προκαταβολή για έργο: {project.title}",
            amount=offer.advance_payment,
            expense_type='construction',
            category='renovation',
            date=datetime.now().date(),
            notes=f"Προγραμματισμένο έργο #{sm.id}. Προκαταβολή για έργο. Ανάδοχος: {offer.contractor_name}",
            created_by=project.created_by,
            distribution_method='by_participation_mills'
        )
        
        print(f"\n✅ Δημιουργήθηκε δαπάνη προκαταβολής:")
        print(f"  • ID: {advance_expense.id}")
        print(f"  • Title: {advance_expense.title}")
        print(f"  • Amount: {advance_expense.amount}€")
        
        # Επαλήθευση συνόλου
        all_project_expenses = Expense.objects.filter(
            title__icontains=project.title
        )
        
        total = sum(exp.amount for exp in all_project_expenses)
        print(f"\n📊 ΣΥΝΟΛΙΚΗ ΕΠΑΛΗΘΕΥΣΗ:")
        print(f"  • Αριθμός δαπανών: {all_project_expenses.count()}")
        print(f"  • Σύνολο δαπανών: {total}€")
        print(f"  • Σύνολο προσφοράς: {offer.amount}€")
        print(f"  • {'✅ ΤΑΙΡΙΑΖΕΙ' if total == offer.amount else '❌ ΔΕΝ ΤΑΙΡΙΑΖΕΙ'}")
    else:
        print("❌ Δεν βρέθηκαν τα απαραίτητα δεδομένα")

print("\n✅ ΟΛΟΚΛΗΡΩΘΗΚΕ")

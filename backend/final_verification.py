#!/usr/bin/env python
import os
import sys

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance
from financial.models import Expense

print("\n" + "="*70)
print("🎯 ΤΕΛΙΚΗ ΕΠΑΛΗΘΕΥΣΗ ΡΟΗΣ: OFFER → PROJECT → SCHEDULED → EXPENSES")
print("="*70)

with schema_context('demo'):
    # 1. Έλεγχος Project
    project = Project.objects.first()
    print(f"\n1️⃣ PROJECT:")
    print(f"   • ID: {project.id}")
    print(f"   • Title: {project.title}")
    print(f"   • Status: {project.status}")
    print(f"   • Final Cost: {project.final_cost}€")
    print(f"   • Contractor: {project.selected_contractor}")
    
    # 2. Έλεγχος Offer
    offer = Offer.objects.filter(project=project, status='accepted').first()
    if offer:
        print(f"\n2️⃣ ACCEPTED OFFER:")
        print(f"   • ID: {offer.id}")
        print(f"   • Contractor: {offer.contractor_name}")
        print(f"   • Amount: {offer.amount}€")
        print(f"   • Advance: {offer.advance_payment}€")
        print(f"   • Installments: {offer.installments}")
        print(f"   ✅ Status: {offer.status}")
    else:
        print(f"\n2️⃣ ❌ NO ACCEPTED OFFER FOUND")
    
    # 3. Έλεγχος ScheduledMaintenance
    sm = ScheduledMaintenance.objects.filter(linked_project=project).first()
    if sm:
        print(f"\n3️⃣ SCHEDULED MAINTENANCE:")
        print(f"   • ID: {sm.id}")
        print(f"   • Title: {sm.title}")
        print(f"   • Total Cost: {sm.total_cost}€")
        print(f"   • Contractor: {sm.contractor_name}")
        print(f"   • Payment Method: {sm.payment_method}")
        print(f"   ✅ Linked to Project #{project.id}")
    else:
        print(f"\n3️⃣ ❌ NO SCHEDULED MAINTENANCE FOUND")
    
    # 4. Έλεγχος Expenses
    expenses = Expense.objects.filter(
        notes__icontains=f'προγραμματισμένο έργο #{sm.id}' if sm else 'xxxxx'
    ).order_by('date')
    
    if expenses.count() > 0:
        print(f"\n4️⃣ EXPENSES (Total: {expenses.count()}):")
        total = 0
        for i, exp in enumerate(expenses, 1):
            print(f"   {i}. {exp.title}: {exp.amount}€")
            total += exp.amount
        
        print(f"\n   📊 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ: {total}€")
        if offer:
            if total == offer.amount:
                print(f"   ✅ Ταιριάζει με προσφορά ({offer.amount}€)")
            else:
                print(f"   ❌ ΔΕΝ ταιριάζει με προσφορά ({offer.amount}€)")
    else:
        print(f"\n4️⃣ ❌ NO EXPENSES FOUND")
    
    # ΣΥΝΟΨΗ
    print(f"\n" + "="*70)
    print("📈 ΣΥΝΟΨΗ ΕΠΑΛΗΘΕΥΣΗΣ:")
    print("="*70)
    
    checks = []
    checks.append(("Project exists and approved", project and project.status == 'approved'))
    checks.append(("Offer accepted", offer and offer.status == 'accepted'))
    checks.append(("ScheduledMaintenance created", sm is not None))
    checks.append(("Expenses created", expenses.count() > 0))
    if offer and expenses.count() > 0:
        checks.append(("Total matches offer", sum(e.amount for e in expenses) == offer.amount))
    
    all_pass = True
    for check_name, result in checks:
        status = "✅" if result else "❌"
        print(f"   {status} {check_name}")
        if not result:
            all_pass = False
    
    print(f"\n{'🎉 ΟΛΕΣ ΟΙ ΕΠΑΛΗΘΕΥΣΕΙΣ ΠΕΡΑΣΑΝ!' if all_pass else '⚠️  ΚΑΠΟΙΕΣ ΕΠΑΛΗΘΕΥΣΕΙΣ ΑΠΕΤΥΧΑΝ'}")
    
    # Protection Status
    print(f"\n🛡️ ΠΡΟΣΤΑΣΙΑ ΚΩΔΙΚΑ:")
    print(f"   • Git pre-commit hook: .githooks/pre-commit-offer-flow")
    print(f"   • Unit tests: backend/projects/tests/test_offer_approval_flow.py")
    print(f"   • Warning comments in critical functions")
    print(f"   • ExpenseList.tsx deletion protection")

print("\n" + "="*70)
print("✅ ΕΠΑΛΗΘΕΥΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ")
print("="*70)

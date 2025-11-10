#!/usr/bin/env python
"""
Check project status and payment details
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance
from financial.models import Expense

def check_projects():
    with schema_context('demo'):
        print("\n📁 ΟΛΕΣ ΟΙ ΚΑΤΑΣΤΑΣΕΙΣ ΕΡΓΩΝ")
        print("=" * 60)

        projects = Project.objects.all().order_by('-created_at')

        for project in projects:
            print(f"\n📋 {project.title}")
            print(f"   ID: {project.id}")
            print(f"   Status: {project.status}")
            print(f"   Contractor: {project.selected_contractor}")
            print(f"   Final Cost: €{project.final_cost}")
            print(f"   Payment Method: {project.payment_method}")
            print(f"   Installments: {project.installments}")
            print(f"   Advance Payment: €{project.advance_payment}")

            # Check offers
            offers = Offer.objects.filter(project=project)
            print(f"   Offers: {offers.count()}")
            for offer in offers:
                print(f"      - {offer.contractor_name}: €{offer.amount} (status: {offer.status})")
                if offer.status == 'accepted':
                    print(f"        Payment Method: {offer.payment_method}")
                    print(f"        Installments: {offer.installments}")
                    print(f"        Advance: €{offer.advance_payment}")

            # Check ScheduledMaintenance
            scheduled = ScheduledMaintenance.objects.filter(
                title=project.title,
                building=project.building
            ).first()

            if scheduled:
                print(f"   ✅ ScheduledMaintenance exists (ID: {scheduled.id})")
            else:
                print(f"   ❌ No ScheduledMaintenance")

            # Check expenses
            expenses = Expense.objects.filter(
                building=project.building,
                title__icontains=project.title
            )

            if expenses.exists():
                print(f"   💰 Expenses: {expenses.count()}")
                for expense in expenses:
                    print(f"      - {expense.title}: €{expense.amount} ({expense.date})")
            else:
                print(f"   ❌ No expenses")

if __name__ == '__main__':
    check_projects()
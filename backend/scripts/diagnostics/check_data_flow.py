#!/usr/bin/env python
"""
Έλεγχος της ροής δεδομένων από accepted offers στο scheduled maintenance
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

def check_data_flow():
    with schema_context('demo'):
        print("\n🔍 ΕΛΕΓΧΟΣ ΡΟΗΣ ΔΕΔΟΜΕΝΩΝ: ACCEPTED OFFERS → SCHEDULED MAINTENANCE")
        print("=" * 70)

        # 1. Έλεγχος accepted offers
        accepted_offers = Offer.objects.filter(status='accepted')
        print(f"\n📋 ACCEPTED OFFERS: {accepted_offers.count()}")

        for offer in accepted_offers:
            print(f"\n{'='*70}")
            print(f"OFFER ID: {offer.id}")
            print(f"Project: {offer.project.title}")
            print(f"Contractor: {offer.contractor_name}")
            print(f"Amount: €{offer.amount}")
            print(f"Payment Method: {offer.payment_method}")
            print(f"Installments: {offer.installments}")
            print(f"Advance Payment: €{offer.advance_payment}")
            print(f"Payment Terms: {offer.payment_terms}")

            # 2. Έλεγχος του συνδεδεμένου Project
            project = offer.project
            print(f"\n📁 LINKED PROJECT:")
            print(f"  ID: {project.id}")
            print(f"  Status: {project.status}")
            print(f"  Selected Contractor: {project.selected_contractor}")
            print(f"  Final Cost: €{project.final_cost}")
            print(f"  Payment Method: {project.payment_method}")
            print(f"  Installments: {project.installments}")
            print(f"  Advance Payment: €{project.advance_payment}")
            print(f"  Payment Terms: {project.payment_terms}")

            # 3. Έλεγχος του ScheduledMaintenance
            scheduled = ScheduledMaintenance.objects.filter(linked_project=project).first()
            if scheduled:
                print(f"\n✅ SCHEDULED MAINTENANCE FOUND:")
                print(f"  ID: {scheduled.id}")
                print(f"  Title: {scheduled.title}")
                print(f"  Total Cost: €{scheduled.total_cost}")
                print(f"  Payment Method: {scheduled.payment_method}")
                print(f"  Installments: {scheduled.installments}")
                print(f"  Advance Payment: €{scheduled.advance_payment}")
                print(f"  Payment Terms: {scheduled.payment_terms}")
                print(f"  Contractor Name: {scheduled.contractor_name}")
                print(f"  Contractor Contact: {scheduled.contractor_contact}")
                print(f"  Contractor Phone: {scheduled.contractor_phone}")
                print(f"  Contractor Email: {scheduled.contractor_email}")

                # Check data consistency
                print(f"\n🔍 DATA CONSISTENCY CHECK:")
                issues = []

                if scheduled.total_cost != offer.amount:
                    issues.append(f"❌ Total cost mismatch: SM={scheduled.total_cost} vs Offer={offer.amount}")
                else:
                    print(f"✅ Total cost matches: €{scheduled.total_cost}")

                if scheduled.payment_method != offer.payment_method:
                    issues.append(f"❌ Payment method mismatch: SM={scheduled.payment_method} vs Offer={offer.payment_method}")
                else:
                    print(f"✅ Payment method matches: {scheduled.payment_method}")

                if scheduled.installments != offer.installments:
                    issues.append(f"❌ Installments mismatch: SM={scheduled.installments} vs Offer={offer.installments}")
                else:
                    print(f"✅ Installments match: {scheduled.installments}")

                if scheduled.advance_payment != offer.advance_payment:
                    issues.append(f"❌ Advance payment mismatch: SM={scheduled.advance_payment} vs Offer={offer.advance_payment}")
                else:
                    print(f"✅ Advance payment matches: €{scheduled.advance_payment}")

                if scheduled.payment_terms != offer.payment_terms:
                    issues.append(f"❌ Payment terms mismatch: SM={scheduled.payment_terms} vs Offer={offer.payment_terms}")
                else:
                    print(f"✅ Payment terms match: {scheduled.payment_terms}")

                if issues:
                    print("\n⚠️ ISSUES FOUND:")
                    for issue in issues:
                        print(f"  {issue}")

            else:
                print(f"\n❌ NO SCHEDULED MAINTENANCE FOUND for project {project.id}")

            # 4. Έλεγχος expenses
            expenses = Expense.objects.filter(
                building=project.building,
                title__icontains=project.title
            )
            print(f"\n💰 RELATED EXPENSES: {expenses.count()}")
            for expense in expenses:
                print(f"  - {expense.title}: €{expense.amount} ({expense.date})")

if __name__ == '__main__':
    check_data_flow()
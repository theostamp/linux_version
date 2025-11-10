#!/usr/bin/env python
"""
Script για έλεγχο της πραγματικής σύνδεσης μεταξύ Προσφορών, Έργων και Προγραμματισμένης Συντήρησης
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance
from financial.models import Expense
from django.db.models import Q

def check_connections():
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΣΥΝΔΕΣΗΣ ΠΡΟΣΦΟΡΩΝ - ΕΡΓΩΝ - ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗΣ ΣΥΝΤΗΡΗΣΗΣ")
        print("="*80)

        # 1. Έλεγχος Projects
        print("\n1. PROJECTS (ΕΡΓΑ)")
        print("-" * 40)
        projects = Project.objects.all()
        print(f"Συνολικά Projects: {projects.count()}")

        for project in projects[:3]:  # Πρώτα 3 για δείγμα
            print(f"\nProject: {project.title}")
            print(f"  ID: {project.id}")
            print(f"  Status: {project.status}")
            print(f"  Estimated Cost: {project.estimated_cost}")
            print(f"  Payment Method: {project.payment_method}")
            print(f"  Installments: {project.installments}")
            print(f"  Linked Expense: {project.linked_expense}")

            # Έλεγχος αν έχει offers
            offers = project.offers.all()
            print(f"  Offers Count: {offers.count()}")

        # 2. Έλεγχος Offers
        print("\n2. OFFERS (ΠΡΟΣΦΟΡΕΣ)")
        print("-" * 40)
        offers = Offer.objects.all()
        print(f"Συνολικά Offers: {offers.count()}")

        # Εγκεκριμένες προσφορές
        accepted_offers = offers.filter(status='accepted')
        print(f"Εγκεκριμένες Προσφορές: {accepted_offers.count()}")

        for offer in accepted_offers[:3]:  # Πρώτες 3 εγκεκριμένες
            print(f"\nAccepted Offer: {offer.contractor_name}")
            print(f"  ID: {offer.id}")
            print(f"  Project: {offer.project.title if offer.project else 'None'}")
            print(f"  Amount: {offer.amount}")
            print(f"  Payment Method: {offer.payment_method}")
            print(f"  Installments: {offer.installments}")
            print(f"  Advance Payment: {offer.advance_payment}")

        # 3. Έλεγχος ScheduledMaintenance
        print("\n3. SCHEDULED MAINTENANCE (ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗ ΣΥΝΤΗΡΗΣΗ)")
        print("-" * 40)
        scheduled = ScheduledMaintenance.objects.all()
        print(f"Συνολικά Scheduled Maintenance: {scheduled.count()}")

        # Έλεγχος για linked_project
        with_project = scheduled.filter(linked_project__isnull=False)
        print(f"Με linked_project: {with_project.count()}")

        for sm in scheduled[:5]:  # Πρώτα 5
            print(f"\nScheduled: {sm.title}")
            print(f"  ID: {sm.id}")
            print(f"  Total Cost: {sm.total_cost}")
            print(f"  Estimated Cost: {sm.estimated_cost}")
            print(f"  Linked Project: {sm.linked_project}")
            print(f"  Linked Expense: {sm.linked_expense}")
            print(f"  Payment Method: {sm.payment_method}")
            print(f"  Installments: {sm.installments}")
            print(f"  Contractor Name: {sm.contractor_name}")

        # 4. Έλεγχος για συνδέσεις
        print("\n4. ΕΛΕΓΧΟΣ ΣΥΝΔΕΣΕΩΝ")
        print("-" * 40)

        # Έργα με εγκεκριμένες προσφορές
        projects_with_accepted = Project.objects.filter(
            offers__status='accepted'
        ).distinct()
        print(f"Projects με εγκεκριμένες προσφορές: {projects_with_accepted.count()}")

        # Scheduled Maintenance που προέρχονται από Projects
        scheduled_from_projects = ScheduledMaintenance.objects.filter(
            linked_project__isnull=False
        )
        print(f"Scheduled Maintenance από Projects: {scheduled_from_projects.count()}")

        if scheduled_from_projects.exists():
            print("\nΠαραδείγματα σύνδεσης:")
            for sm in scheduled_from_projects[:3]:
                print(f"\n  SM: {sm.title}")
                print(f"    -> Project: {sm.linked_project.title if sm.linked_project else 'None'}")

                # Βρες την εγκεκριμένη προσφορά
                if sm.linked_project:
                    accepted_offer = sm.linked_project.offers.filter(status='accepted').first()
                    if accepted_offer:
                        print(f"    -> Accepted Offer: {accepted_offer.contractor_name}")
                        print(f"       Amount: {accepted_offer.amount}")

        # 5. Έλεγχος αν τα πεδία πληρωμής συγχρονίζονται
        print("\n5. ΕΛΕΓΧΟΣ ΣΥΓΧΡΟΝΙΣΜΟΥ ΠΕΔΙΩΝ")
        print("-" * 40)

        for project in projects_with_accepted[:2]:
            print(f"\nProject: {project.title}")
            accepted_offer = project.offers.filter(status='accepted').first()
            if accepted_offer:
                print(f"  Accepted Offer:")
                print(f"    - Amount: {accepted_offer.amount}")
                print(f"    - Payment Method: {accepted_offer.payment_method}")
                print(f"    - Installments: {accepted_offer.installments}")

                # Έλεγχος αν υπάρχει αντίστοιχο ScheduledMaintenance
                sm = ScheduledMaintenance.objects.filter(
                    linked_project=project
                ).first()

                if sm:
                    print(f"  Linked ScheduledMaintenance:")
                    print(f"    - Title: {sm.title}")
                    print(f"    - Total Cost: {sm.total_cost}")
                    print(f"    - Payment Method: {sm.payment_method}")
                    print(f"    - Installments: {sm.installments}")
                    print(f"    - Contractor Name: {sm.contractor_name}")

                    # Σύγκριση τιμών
                    if sm.total_cost == accepted_offer.amount:
                        print("    ✅ Costs match!")
                    else:
                        print(f"    ❌ Cost mismatch: {sm.total_cost} vs {accepted_offer.amount}")

                    if sm.payment_method == accepted_offer.payment_method:
                        print("    ✅ Payment methods match!")
                    else:
                        print(f"    ❌ Payment method mismatch: {sm.payment_method} vs {accepted_offer.payment_method}")
                else:
                    print("  ❌ No linked ScheduledMaintenance found!")

        # 6. Έλεγχος Expenses
        print("\n6. ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ")
        print("-" * 40)

        # ScheduledMaintenance με linked expenses
        sm_with_expenses = ScheduledMaintenance.objects.filter(
            linked_expense__isnull=False
        )
        print(f"Scheduled Maintenance με linked expenses: {sm_with_expenses.count()}")

        for sm in sm_with_expenses[:3]:
            print(f"\n  SM: {sm.title}")
            print(f"    Expense ID: {sm.linked_expense.id}")
            print(f"    Expense Title: {sm.linked_expense.title}")
            print(f"    Expense Amount: {sm.linked_expense.amount}")

        print("\n" + "="*80)
        print("ΤΕΛΟΣ ΕΛΕΓΧΟΥ")
        print("="*80)

if __name__ == "__main__":
    check_connections()
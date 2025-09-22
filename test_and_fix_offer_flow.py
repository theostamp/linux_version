#!/usr/bin/env python
"""
Script για έλεγχο και διόρθωση της ροής Προσφορά → Προγραμματισμένο Έργο
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
from projects.views import update_project_schedule
from maintenance.models import ScheduledMaintenance
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

def test_and_fix_flow():
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ & ΔΙΟΡΘΩΣΗ ΡΟΗΣ: ΠΡΟΣΦΟΡΑ → ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΟ ΕΡΓΟ")
        print("="*80)

        # 1. Βρες την εγκεκριμένη προσφορά
        print("\n1. ΕΥΡΕΣΗ ΕΓΚΕΚΡΙΜΕΝΗΣ ΠΡΟΣΦΟΡΑΣ")
        print("-" * 40)

        accepted_offers = Offer.objects.filter(status='accepted')

        if not accepted_offers.exists():
            print("❌ Δεν βρέθηκαν εγκεκριμένες προσφορές!")
            return

        offer = accepted_offers.first()
        print(f"✅ Βρέθηκε εγκεκριμένη προσφορά:")
        print(f"   ID: {offer.id}")
        print(f"   Contractor: {offer.contractor_name}")
        print(f"   Amount: €{offer.amount}")
        print(f"   Payment Method: {offer.payment_method}")
        print(f"   Installments: {offer.installments}")
        print(f"   Advance Payment: €{offer.advance_payment}")

        # 2. Έλεγχος του Project
        print("\n2. ΕΛΕΓΧΟΣ PROJECT")
        print("-" * 40)

        project = offer.project
        if not project:
            print("❌ Η προσφορά δεν συνδέεται με έργο!")
            return

        print(f"✅ Project: {project.title}")
        print(f"   ID: {project.id}")
        print(f"   Status: {project.status}")
        print(f"   Selected Contractor: {project.selected_contractor}")
        print(f"   Final Cost: {project.final_cost}")
        print(f"   Payment Method: {project.payment_method}")
        print(f"   Installments: {project.installments}")

        # 3. Έλεγχος αν υπάρχει ScheduledMaintenance
        print("\n3. ΕΛΕΓΧΟΣ SCHEDULED MAINTENANCE")
        print("-" * 40)

        sm = ScheduledMaintenance.objects.filter(linked_project=project).first()

        if sm:
            print(f"✅ Υπάρχει ScheduledMaintenance:")
            print(f"   ID: {sm.id}")
            print(f"   Title: {sm.title}")
            print(f"   Total Cost: €{sm.total_cost}")
            print(f"   Contractor Name: {sm.contractor_name}")
            print(f"   Payment Method: {sm.payment_method}")
        else:
            print("❌ ΔΕΝ υπάρχει ScheduledMaintenance για αυτό το έργο!")

            # 4. Ενημέρωση του Project με τα στοιχεία της προσφοράς
            print("\n4. ΕΝΗΜΕΡΩΣΗ PROJECT ΜΕ ΣΤΟΙΧΕΙΑ ΠΡΟΣΦΟΡΑΣ")
            print("-" * 40)

            # Ενημέρωση project fields
            project.selected_contractor = offer.contractor_name
            project.final_cost = offer.amount
            project.payment_method = offer.payment_method or 'installments'
            project.installments = offer.installments or 6
            project.advance_payment = offer.advance_payment or Decimal('2000.00')
            project.payment_terms = offer.payment_terms or 'Πληρωμή σε δόσεις'
            project.status = 'approved'
            project.save()

            print("✅ Ενημερώθηκε το Project:")
            print(f"   Selected Contractor: {project.selected_contractor}")
            print(f"   Final Cost: €{project.final_cost}")
            print(f"   Payment Method: {project.payment_method}")
            print(f"   Installments: {project.installments}")
            print(f"   Status: {project.status}")

            # 5. Κλήση της update_project_schedule
            print("\n5. ΔΗΜΙΟΥΡΓΙΑ SCHEDULED MAINTENANCE")
            print("-" * 40)

            print("Καλώ την update_project_schedule()...")

            try:
                # Βρες ένα χρήστη για το created_by field
                admin_user = User.objects.filter(is_superuser=True).first()
                if admin_user and not project.created_by:
                    project.created_by = admin_user
                    project.save()

                # Κλήση της συνάρτησης
                update_project_schedule(project, offer)
                print("✅ Η update_project_schedule εκτελέστηκε επιτυχώς!")
            except Exception as e:
                print(f"❌ Σφάλμα στην update_project_schedule: {e}")
                import traceback
                traceback.print_exc()

            # 6. Επανέλεγχος
            print("\n6. ΕΠΑΝΕΛΕΓΧΟΣ")
            print("-" * 40)

            sm = ScheduledMaintenance.objects.filter(linked_project=project).first()

            if sm:
                print(f"✅ ΕΠΙΤΥΧΙΑ! Δημιουργήθηκε ScheduledMaintenance:")
                print(f"   ID: {sm.id}")
                print(f"   Title: {sm.title}")
                print(f"   Total Cost: €{sm.total_cost}")
                print(f"   Contractor Name: {sm.contractor_name}")
                print(f"   Contractor Phone: {sm.contractor_phone}")
                print(f"   Contractor Email: {sm.contractor_email}")
                print(f"   Payment Method: {sm.payment_method}")
                print(f"   Installments: {sm.installments}")
                print(f"   Advance Payment: €{sm.advance_payment}")
                print(f"   Linked Project ID: {sm.linked_project.id if sm.linked_project else 'None'}")

                # Έλεγχος αν τα πεδία ταιριάζουν
                print("\n   ΣΥΓΚΡΙΣΗ ΤΙΜΩΝ:")
                if sm.total_cost == offer.amount:
                    print("   ✅ Total Cost ταιριάζει με Offer Amount")
                else:
                    print(f"   ❌ Total Cost mismatch: {sm.total_cost} vs {offer.amount}")

                if sm.contractor_name == offer.contractor_name:
                    print("   ✅ Contractor Name ταιριάζει")
                else:
                    print(f"   ❌ Contractor Name mismatch: {sm.contractor_name} vs {offer.contractor_name}")

                if sm.payment_method == offer.payment_method:
                    print("   ✅ Payment Method ταιριάζει")
                else:
                    print(f"   ❌ Payment Method mismatch: {sm.payment_method} vs {offer.payment_method}")

            else:
                print("❌ ΑΠΟΤΥΧΙΑ! Δεν δημιουργήθηκε ScheduledMaintenance")

        print("\n" + "="*80)
        print("ΤΕΛΟΣ ΕΛΕΓΧΟΥ")
        print("="*80)

if __name__ == "__main__":
    test_and_fix_flow()
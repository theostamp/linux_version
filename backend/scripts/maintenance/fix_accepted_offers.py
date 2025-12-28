#!/usr/bin/env python
"""
Διόρθωση accepted offers που δεν έχουν ενημερώσει σωστά τα projects και scheduled maintenance
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
from projects.views import update_project_schedule

def fix_accepted_offers():
    with schema_context('demo'):
        print("\n🔧 ΔΙΟΡΘΩΣΗ ACCEPTED OFFERS")
        print("=" * 70)

        # Βρες όλες τις accepted offers
        accepted_offers = Offer.objects.filter(status='accepted')
        print(f"\nΒρέθηκαν {accepted_offers.count()} accepted offers")

        for offer in accepted_offers:
            print(f"\n{'='*70}")
            print(f"📋 Επεξεργασία Offer ID: {offer.id}")
            print(f"   Project: {offer.project.title}")
            print(f"   Contractor: {offer.contractor_name}")
            print(f"   Amount: €{offer.amount}")
            print(f"   Payment Method: {offer.payment_method}")
            print(f"   Installments: {offer.installments}")
            print(f"   Advance Payment: €{offer.advance_payment}")

            project = offer.project

            # Ενημέρωση του project με τα δεδομένα της offer
            print(f"\n🔄 Ενημέρωση Project...")
            updated_fields = []

            if project.selected_contractor != offer.contractor_name:
                project.selected_contractor = offer.contractor_name
                updated_fields.append('selected_contractor')

            if project.final_cost != offer.amount:
                project.final_cost = offer.amount
                updated_fields.append('final_cost')

            if project.payment_method != offer.payment_method:
                project.payment_method = offer.payment_method
                updated_fields.append('payment_method')

            if project.installments != (offer.installments or 1):
                project.installments = offer.installments or 1
                updated_fields.append('installments')

            if project.advance_payment != offer.advance_payment:
                project.advance_payment = offer.advance_payment
                updated_fields.append('advance_payment')

            if project.payment_terms != offer.payment_terms:
                project.payment_terms = offer.payment_terms
                updated_fields.append('payment_terms')

            if project.status != 'approved':
                project.status = 'approved'
                updated_fields.append('status')

            if updated_fields:
                project.save()
                print(f"   ✅ Ενημερώθηκαν πεδία: {', '.join(updated_fields)}")
            else:
                print(f"   ℹ️ Το project ήταν ήδη ενημερωμένο")

            # Δημιουργία/ενημέρωση ScheduledMaintenance και δαπανών
            print(f"\n📅 Δημιουργία/ενημέρωση ScheduledMaintenance...")
            try:
                update_project_schedule(project, offer)
                print(f"   ✅ ScheduledMaintenance δημιουργήθηκε/ενημερώθηκε")
            except Exception as e:
                print(f"   ❌ Σφάλμα: {e}")

        print(f"\n✅ ΟΛΟΚΛΗΡΩΣΗ ΔΙΟΡΘΩΣΗΣ")

if __name__ == '__main__':
    fix_accepted_offers()
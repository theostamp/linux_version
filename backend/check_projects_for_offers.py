#!/usr/bin/env python
"""
Check which projects are visible for offers
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
from datetime import datetime

def check_projects_for_offers():
    with schema_context('demo'):
        print("\n📋 ΕΡΓΑ ΔΙΑΘΕΣΙΜΑ ΓΙΑ ΠΡΟΣΦΟΡΕΣ")
        print("=" * 60)

        # Get all projects
        all_projects = Project.objects.all().order_by('-created_at')

        print(f"\nΣύνολο έργων: {all_projects.count()}")
        print("\n" + "-" * 60)

        for i, project in enumerate(all_projects, 1):
            print(f"\n{i}. {project.title}")
            print(f"   ID: {project.id}")
            print(f"   Status: {project.status}")
            print(f"   Created: {project.created_at}")
            print(f"   Building: {project.building}")
            print(f"   Priority: {project.priority}")
            print(f"   Tender Deadline: {project.tender_deadline}")
            print(f"   Selected Contractor: {project.selected_contractor}")

            # Check eligibility for offers
            eligible = []
            not_eligible = []

            # Status check
            if project.status in ['planning', 'bidding', 'awarded']:
                eligible.append(f"✅ Status '{project.status}' επιτρέπει προσφορές")
            else:
                not_eligible.append(f"❌ Status '{project.status}' ΔΕΝ επιτρέπει νέες προσφορές")

            # Tender deadline check
            if project.tender_deadline:
                if project.tender_deadline >= datetime.now().date():
                    eligible.append(f"✅ Tender deadline {project.tender_deadline} δεν έχει περάσει")
                else:
                    not_eligible.append(f"❌ Tender deadline {project.tender_deadline} έχει περάσει")
            else:
                eligible.append("✅ Δεν υπάρχει tender deadline")

            # Selected contractor check
            if not project.selected_contractor:
                eligible.append("✅ Δεν έχει επιλεγεί ανάδοχος")
            else:
                not_eligible.append(f"❌ Έχει ήδη επιλεγεί ανάδοχος: {project.selected_contractor}")

            # Print eligibility
            if eligible:
                print("\n   Επιλέξιμο για προσφορές:")
                for e in eligible:
                    print(f"      {e}")

            if not_eligible:
                print("\n   ΔΕΝ επιλέξιμο για προσφορές:")
                for ne in not_eligible:
                    print(f"      {ne}")

            # Check existing offers
            offers = Offer.objects.filter(project=project)
            if offers.exists():
                print(f"\n   Υπάρχουσες προσφορές: {offers.count()}")
                for offer in offers:
                    print(f"      - {offer.contractor_name}: €{offer.amount} (status: {offer.status})")
            else:
                print("\n   Δεν υπάρχουν προσφορές")

            # Final verdict
            can_accept_offers = (
                project.status in ['planning', 'bidding', 'awarded'] and
                (not project.tender_deadline or project.tender_deadline >= datetime.now().date()) and
                not project.selected_contractor
            )

            if can_accept_offers:
                print(f"\n   🟢 ΜΠΟΡΕΙ ΝΑ ΔΕΧΤΕΙ ΠΡΟΣΦΟΡΕΣ")
            else:
                print(f"\n   🔴 ΔΕΝ ΜΠΟΡΕΙ ΝΑ ΔΕΧΤΕΙ ΠΡΟΣΦΟΡΕΣ")

        # Check API filtering
        print("\n" + "=" * 60)
        print("\n🔍 ΦΙΛΤΡΑΡΙΣΜΑ ΓΙΑ ΦΟΡΜΑ ΠΡΟΣΦΟΡΩΝ")

        # Simulate API filtering for offer form
        eligible_projects = Project.objects.filter(
            status__in=['planning', 'bidding', 'awarded']
        ).exclude(
            selected_contractor__isnull=False
        )

        print(f"\nΕπιλέξιμα έργα για νέες προσφορές: {eligible_projects.count()}")
        for project in eligible_projects:
            print(f"   - {project.title} (status: {project.status})")

if __name__ == '__main__':
    check_projects_for_offers()
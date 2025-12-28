#!/usr/bin/env python
"""
Διόρθωση εγκεκριμένων έργων που δεν έχουν scheduled maintenance.
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

def fix_approved_projects():
    """Fix approved projects without scheduled maintenance"""

    with schema_context('demo'):
        print("\n🔧 ΔΙΟΡΘΩΣΗ: Εγκεκριμένα έργα χωρίς Scheduled Maintenance")
        print("=" * 60)

        # Find approved projects
        approved_projects = Project.objects.filter(
            status='approved',
            selected_contractor__isnull=False
        )

        print(f"\nΒρέθηκαν {approved_projects.count()} εγκεκριμένα έργα")

        for project in approved_projects:
            print(f"\n📁 Επεξεργασία: {project.title}")
            print(f"   - ID: {project.id}")
            print(f"   - Ανάδοχος: {project.selected_contractor}")

            # Find accepted offer
            accepted_offer = Offer.objects.filter(
                project=project,
                status='accepted'
            ).first()

            if accepted_offer:
                print(f"   - Προσφορά: {accepted_offer.contractor_name} (€{accepted_offer.amount})")
                print(f"   - Payment Method: {accepted_offer.payment_method}")
                print(f"   - Installments: {accepted_offer.installments}")
                print(f"   - Advance Payment: €{accepted_offer.advance_payment}")

                # Update project with offer details
                project.payment_method = accepted_offer.payment_method
                project.installments = accepted_offer.installments or 1
                project.advance_payment = accepted_offer.advance_payment
                project.payment_terms = accepted_offer.payment_terms
                project.save()

                print(f"   ✅ Ενημερώθηκε το project με τα στοιχεία της προσφοράς")
            else:
                print("   ⚠️ Δεν βρέθηκε accepted offer")

            try:
                # Call update_project_schedule
                update_project_schedule(project, accepted_offer)
                print(f"   ✅ Δημιουργήθηκε/ενημερώθηκε το Scheduled Maintenance")
            except Exception as e:
                print(f"   ❌ Σφάλμα: {e}")

        print("\n✅ Ολοκληρώθηκε η διόρθωση!")

if __name__ == '__main__':
    fix_approved_projects()
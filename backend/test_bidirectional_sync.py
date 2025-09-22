#!/usr/bin/env python
"""
Test για bidirectional sync μεταξύ ScheduledMaintenance και Projects
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance
from buildings.models import Building
from users.models import CustomUser

def test_bidirectional_sync():
    """Test bidirectional sync between ScheduledMaintenance and Projects"""

    with schema_context('demo'):
        print("\n🧪 TEST: Bidirectional Sync ScheduledMaintenance ↔ Projects")
        print("=" * 60)

        # Get building and user
        building = Building.objects.first()
        user = CustomUser.objects.first()

        if not building or not user:
            print("❌ No building or user found")
            return

        # 1. Create a test project with payment details
        print("\n1️⃣ Creating test project with payment details...")
        project = Project.objects.create(
            title="Test Sync Project",
            description="Project for testing bidirectional sync",
            building=building,
            status='planning',
            priority='high',
            estimated_cost=Decimal('10000.00'),
            created_by=user
        )
        print(f"   ✅ Created project: {project.title} (ID: {project.id})")

        # 2. Create an offer and accept it
        print("\n2️⃣ Creating and accepting offer...")
        offer = Offer.objects.create(
            project=project,
            contractor_name="Test Contractor",
            contractor_contact="John Doe",
            contractor_phone="2101234567",
            contractor_email="contractor@test.com",
            amount=Decimal('9500.00'),
            payment_method='installments',
            installments=4,
            advance_payment=Decimal('2000.00'),
            payment_terms="30% προκαταβολή, υπόλοιπο σε 4 μηνιαίες δόσεις",
            warranty_period="2 χρόνια",
            completion_time="45 ημέρες",
            status='submitted'
        )

        # Accept the offer (this updates the project)
        offer.status = 'accepted'
        offer.save()

        project.selected_contractor = offer.contractor_name
        project.final_cost = offer.amount
        project.payment_method = offer.payment_method
        project.installments = offer.installments
        project.advance_payment = offer.advance_payment
        project.payment_terms = offer.payment_terms
        project.status = 'approved'
        project.save()

        print(f"   ✅ Accepted offer from {offer.contractor_name}")
        print(f"      - Amount: €{offer.amount}")
        print(f"      - Installments: {offer.installments}")
        print(f"      - Advance: €{offer.advance_payment}")

        # 3. Call update_project_schedule to create ScheduledMaintenance
        print("\n3️⃣ Creating ScheduledMaintenance via update_project_schedule...")
        from projects.views import update_project_schedule
        try:
            update_project_schedule(project, offer)
            print("   ✅ ScheduledMaintenance created")
        except Exception as e:
            print(f"   ❌ Error: {e}")

        # 4. Check if ScheduledMaintenance was created with correct data
        print("\n4️⃣ Checking ScheduledMaintenance data...")
        scheduled = ScheduledMaintenance.objects.filter(linked_project=project).first()

        if scheduled:
            print(f"   ✅ Found ScheduledMaintenance (ID: {scheduled.id})")
            print(f"      - Title: {scheduled.title}")
            print(f"      - Total Cost: €{scheduled.total_cost}")
            print(f"      - Payment Method: {scheduled.payment_method}")
            print(f"      - Installments: {scheduled.installments}")
            print(f"      - Advance: €{scheduled.advance_payment}")
            print(f"      - Payment Terms: {scheduled.payment_terms}")
            print(f"      - Linked Project: {scheduled.linked_project_id}")

            # 5. Test updating ScheduledMaintenance and checking sync to Project
            print("\n5️⃣ Testing sync: ScheduledMaintenance → Project")
            print("   Updating ScheduledMaintenance payment fields...")

            scheduled.installments = 6
            scheduled.advance_payment = Decimal('3000.00')
            scheduled.payment_terms = "UPDATED: 30% προκαταβολή, υπόλοιπο σε 6 δόσεις"
            scheduled.save()

            # Reload project to check if it was updated
            project.refresh_from_db()

            print("\n   Checking if Project was updated:")
            if project.installments == 6:
                print(f"   ✅ Installments synced: {project.installments}")
            else:
                print(f"   ❌ Installments NOT synced: {project.installments} (expected 6)")

            if project.advance_payment == Decimal('3000.00'):
                print(f"   ✅ Advance payment synced: €{project.advance_payment}")
            else:
                print(f"   ❌ Advance payment NOT synced: €{project.advance_payment} (expected €3000)")

            if "UPDATED" in (project.payment_terms or ''):
                print(f"   ✅ Payment terms synced: {project.payment_terms}")
            else:
                print(f"   ❌ Payment terms NOT synced: {project.payment_terms}")

            # 6. Test updating Project and checking sync to ScheduledMaintenance
            print("\n6️⃣ Testing sync: Project → ScheduledMaintenance")
            print("   Updating Project payment fields...")

            project.installments = 8
            project.advance_payment = Decimal('4000.00')
            project.payment_terms = "REVERSE UPDATE: 40% προκαταβολή, υπόλοιπο σε 8 δόσεις"
            project.save()

            # Reload scheduled to check if it was updated
            scheduled.refresh_from_db()

            print("\n   Checking if ScheduledMaintenance was updated:")
            if scheduled.installments == 8:
                print(f"   ✅ Installments synced: {scheduled.installments}")
            else:
                print(f"   ❌ Installments NOT synced: {scheduled.installments} (expected 8)")

            if scheduled.advance_payment == Decimal('4000.00'):
                print(f"   ✅ Advance payment synced: €{scheduled.advance_payment}")
            else:
                print(f"   ❌ Advance payment NOT synced: €{scheduled.advance_payment} (expected €4000)")

            if "REVERSE UPDATE" in (scheduled.payment_terms or ''):
                print(f"   ✅ Payment terms synced: {scheduled.payment_terms}")
            else:
                print(f"   ❌ Payment terms NOT synced: {scheduled.payment_terms}")

            print("\n✅ BIDIRECTIONAL SYNC TEST COMPLETED!")

            # Cleanup
            print("\n7️⃣ Cleaning up test data...")
            scheduled.delete()
            project.delete()
            print("   ✅ Test data cleaned up")

        else:
            print("   ❌ ScheduledMaintenance was not created")

if __name__ == '__main__':
    test_bidirectional_sync()
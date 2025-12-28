#!/usr/bin/env python
import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timezone

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from users.models import CustomUser
from buildings.models import Building

def test_offers_crud():
    """Test CRUD operations for offers"""
    with schema_context('demo'):
        print("Testing Offers CRUD Operations")
        print("=" * 50)

        # Get test data
        building = Building.objects.first()
        if not building:
            print("❌ No building found in database")
            return

        user = CustomUser.objects.filter(is_superuser=True).first()
        if not user:
            user = CustomUser.objects.first()

        if not user:
            print("❌ No user found in database")
            return

        # Get or create a test project
        project = Project.objects.filter(building=building).first()
        if not project:
            project = Project.objects.create(
                building=building,
                title="Test Project για Offers",
                description="Test project for CRUD testing",
                estimated_cost=Decimal('10000'),
                status='draft',
                priority='medium',
                created_by=user
            )
            print(f"✅ Created test project: {project.title}")
        else:
            print(f"✅ Using existing project: {project.title}")

        # CREATE - Δημιουργία νέας προσφοράς
        print("\n1. CREATE - Δημιουργία προσφοράς")
        offer = Offer.objects.create(
            project=project,
            contractor_name="Test Συνεργείο ΑΕ",
            contractor_contact="Γιάννης Τεστάκης",
            contractor_phone="+30 210 1234567",
            contractor_email="test@synergeio.gr",
            contractor_address="Τεστ 123, Αθήνα",
            amount=Decimal('8500.50'),
            description="Δοκιμαστική προσφορά για testing",
            payment_terms="50% προκαταβολή, 50% με την παράδοση",
            warranty_period="2 έτη",
            completion_time="30 ημέρες",
            status='submitted'
        )
        print(f"✅ Created offer ID: {offer.id}, Amount: €{offer.amount}")

        # READ - Ανάγνωση προσφοράς
        print("\n2. READ - Ανάγνωση προσφοράς")
        retrieved_offer = Offer.objects.get(id=offer.id)
        print(f"✅ Retrieved: {retrieved_offer.contractor_name} - €{retrieved_offer.amount}")
        print(f"   Status: {retrieved_offer.status}")
        print(f"   Payment Terms: {retrieved_offer.payment_terms}")

        # UPDATE - Ενημέρωση προσφοράς
        print("\n3. UPDATE - Ενημέρωση προσφοράς")
        old_amount = retrieved_offer.amount
        retrieved_offer.amount = Decimal('7800.00')
        retrieved_offer.completion_time = "25 ημέρες"
        retrieved_offer.warranty_period = "3 έτη"
        retrieved_offer.save()
        print(f"✅ Updated amount: €{old_amount} → €{retrieved_offer.amount}")
        print(f"   Updated completion time: 30 ημέρες → {retrieved_offer.completion_time}")
        print(f"   Updated warranty: 2 έτη → {retrieved_offer.warranty_period}")

        # LIST - Λίστα προσφορών για το project
        print("\n4. LIST - Λίστα προσφορών")
        all_offers = Offer.objects.filter(project=project)
        print(f"✅ Found {all_offers.count()} offer(s) for project '{project.title}':")
        for o in all_offers[:5]:  # Show max 5
            print(f"   - {o.contractor_name}: €{o.amount} ({o.status})")

        # STATUS UPDATE - Αλλαγή κατάστασης
        print("\n5. STATUS UPDATE - Αλλαγή κατάστασης")
        retrieved_offer.status = 'under_review'
        retrieved_offer.save()
        print(f"✅ Status updated: submitted → {retrieved_offer.status}")

        # APPROVAL TEST - Έγκριση προσφοράς
        print("\n6. APPROVAL - Έγκριση προσφοράς")
        retrieved_offer.status = 'accepted'
        retrieved_offer.reviewed_at = datetime.now(timezone.utc)
        retrieved_offer.reviewed_by = user
        retrieved_offer.save()
        print(f"✅ Offer approved by {user.email}")

        # Update project with accepted offer
        project.selected_contractor = retrieved_offer.contractor_name
        project.final_cost = retrieved_offer.amount
        project.save()
        print(f"✅ Project updated with contractor: {project.selected_contractor}")

        # DELETE - Διαγραφή προσφοράς
        print("\n7. DELETE - Διαγραφή προσφοράς")
        offer_id = retrieved_offer.id
        retrieved_offer.delete()
        print(f"✅ Deleted offer ID: {offer_id}")

        # Verify deletion
        deleted_count = Offer.objects.filter(id=offer_id).count()
        if deleted_count == 0:
            print(f"✅ Verified: Offer {offer_id} successfully deleted")
        else:
            print(f"❌ Error: Offer {offer_id} still exists!")

        # STATISTICS
        print("\n" + "=" * 50)
        print("STATISTICS:")
        total_offers = Offer.objects.filter(project__building=building).count()
        submitted_offers = Offer.objects.filter(project__building=building, status='submitted').count()
        accepted_offers = Offer.objects.filter(project__building=building, status='accepted').count()

        print(f"Total offers in building: {total_offers}")
        print(f"Submitted offers: {submitted_offers}")
        print(f"Accepted offers: {accepted_offers}")

        print("\n✅ All CRUD operations completed successfully!")

if __name__ == '__main__':
    test_offers_crud()
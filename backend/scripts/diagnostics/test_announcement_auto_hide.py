#!/usr/bin/env python
"""
Test script to verify automatic hiding of announcements:
1. Offer announcements when an offer is accepted
2. General assembly announcements when the date has passed
"""
import os
import sys
import django
from datetime import date, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from announcements.models import Announcement
from buildings.models import Building
from users.models import CustomUser

print("=" * 80)
print("TEST: Automatic Announcement Hiding")
print("=" * 80)

with schema_context('demo'):
    # Get the demo building
    building = Building.objects.first()
    user = CustomUser.objects.filter(is_staff=True).first()

    if not building or not user:
        print("❌ Demo building or admin user not found")
        sys.exit(1)

    print(f"\n✅ Using building: {building.name}")
    print(f"✅ Using user: {user.email}")

    # TEST 1: Create a project with offers
    print("\n" + "=" * 80)
    print("TEST 1: Offer Announcements Auto-Hide")
    print("=" * 80)

    project = Project.objects.create(
        title="Test Project - Offer Auto-Hide",
        description="Testing automatic hiding of offer announcements",
        building=building,
        created_by=user,
        status='tendering',
        priority='medium',
        estimated_cost=10000.00,
        tender_deadline=date.today() + timedelta(days=30)
    )
    print(f"\n✅ Created project: {project.title}")

    # Create multiple offers
    offers = []
    for i in range(3):
        offer = Offer.objects.create(
            project=project,
            contractor_name=f"Test Contractor {i+1}",
            amount=10000.00 + (i * 500),
            status='submitted',
            description=f"Test offer {i+1}"
        )
        offers.append(offer)
        print(f"✅ Created offer: {offer.contractor_name} - €{offer.amount}")

    # Check announcements created
    offer_announcements = Announcement.objects.filter(
        building=building,
        title__icontains=f"Νέα Προσφορά για: {project.title}"
    )
    print(f"\n📢 Total offer announcements created: {offer_announcements.count()}")
    print(f"📢 Active offer announcements: {offer_announcements.filter(is_active=True).count()}")

    # Accept one offer
    print("\n🎯 Accepting first offer...")
    offers[0].status = 'accepted'
    offers[0].save()

    # Check announcements after acceptance
    active_count = offer_announcements.filter(is_active=True).count()
    inactive_count = offer_announcements.filter(is_active=False).count()

    print(f"\n📢 After acceptance:")
    print(f"   Active announcements: {active_count}")
    print(f"   Inactive announcements: {inactive_count}")

    if inactive_count == 3:
        print("✅ TEST 1 PASSED: All offer announcements were deactivated")
    else:
        print("❌ TEST 1 FAILED: Expected 3 inactive announcements")

    # Cleanup
    project.delete()

    # TEST 2: General Assembly Date Past
    print("\n" + "=" * 80)
    print("TEST 2: General Assembly Announcements Auto-Hide")
    print("=" * 80)

    # Create a project with a past general assembly date
    past_date = date.today() - timedelta(days=7)
    project2 = Project.objects.create(
        title="Test Project - Assembly Auto-Hide",
        description="Testing automatic hiding of assembly announcements",
        building=building,
        created_by=user,
        status='planning',
        priority='high',
        estimated_cost=15000.00,
        general_assembly_date=past_date,
        assembly_time="20:00"
    )
    print(f"\n✅ Created project: {project2.title}")
    print(f"📅 Assembly date: {past_date} (past date)")

    # Check if announcement was created
    assembly_announcements = Announcement.objects.filter(
        building=building,
        title__icontains="Σύγκληση Γενικής Συνέλευσης",
        end_date=past_date
    )

    print(f"\n📢 Assembly announcements found: {assembly_announcements.count()}")

    if assembly_announcements.exists():
        ann = assembly_announcements.first()
        print(f"   Title: {ann.title}")
        print(f"   Active: {ann.is_active}")
        print(f"   End date: {ann.end_date}")

    # Trigger the signal by updating the project
    print("\n🔄 Triggering signal by updating project...")
    project2.description = "Updated description to trigger signal"
    project2.save()

    # Re-check announcement status
    assembly_announcements = Announcement.objects.filter(
        building=building,
        title__icontains="Σύγκληση Γενικής Συνέλευσης",
        end_date=past_date
    )

    if assembly_announcements.exists():
        ann = assembly_announcements.first()
        print(f"\n📢 After signal trigger:")
        print(f"   Active: {ann.is_active}")

        if not ann.is_active:
            print("✅ TEST 2 PASSED: Assembly announcement was deactivated")
        else:
            print("❌ TEST 2 FAILED: Assembly announcement is still active")
    else:
        print("⚠️  No assembly announcement found")

    # Cleanup
    project2.delete()

    # TEST 3: Run management command
    print("\n" + "=" * 80)
    print("TEST 3: Management Command")
    print("=" * 80)

    # Create a project with past assembly date
    old_date = date.today() - timedelta(days=30)
    project3 = Project.objects.create(
        title="Old Assembly Project",
        description="Project with old assembly date",
        building=building,
        created_by=user,
        status='planning',
        general_assembly_date=old_date
    )

    # Create announcement manually with past date
    ann = Announcement.objects.create(
        building=building,
        author=user,
        title=f"Σύγκληση Γενικής Συνέλευσης - {old_date.strftime('%d/%m/%Y')}",
        description="Old assembly",
        published=True,
        is_active=True,
        start_date=old_date - timedelta(days=14),
        end_date=old_date
    )
    print(f"\n✅ Created test announcement with past date: {old_date}")
    print(f"   Active: {ann.is_active}")

    # Run the management command
    from django.core.management import call_command
    print("\n🔄 Running cleanup_expired_announcements command...")
    call_command('cleanup_expired_announcements')

    # Re-check
    ann.refresh_from_db()
    print(f"\n📢 After cleanup command:")
    print(f"   Active: {ann.is_active}")

    if not ann.is_active:
        print("✅ TEST 3 PASSED: Management command deactivated past announcement")
    else:
        print("❌ TEST 3 FAILED: Announcement is still active")

    # Cleanup
    project3.delete()

print("\n" + "=" * 80)
print("ALL TESTS COMPLETED")
print("=" * 80)

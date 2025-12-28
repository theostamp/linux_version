#!/usr/bin/env python
"""
Test script για ομαδοποιημένες ανακοινώσεις γενικής συνέλευσης
"""
import os
import sys
import django
from datetime import date, timedelta

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project
from buildings.models import Building
from users.models import CustomUser
from announcements.models import Announcement

with schema_context('demo'):
    print("🧪 Testing Grouped Assembly Announcements\n")

    # Βρίσκουμε το κτίριο και user
    building = Building.objects.get(id=1)
    user = CustomUser.objects.filter(is_staff=True).first()
    print(f"✅ Building: {building.name}")
    print(f"✅ User: {user.email}\n")

    # Κοινή ημερομηνία συνέλευσης
    assembly_date = date.today() + timedelta(days=20)
    print(f"📅 Common Assembly Date: {assembly_date.strftime('%d/%m/%Y')}\n")

    # Καταμέτρηση ανακοινώσεων πριν
    announcements_before = Announcement.objects.filter(
        building=building,
        title__icontains="Σύγκληση Γενικής Συνέλευσης"
    ).count()
    print(f"📊 Assembly announcements before: {announcements_before}\n")

    # Δημιουργία 3 έργων με την ΙΔΙΑ ημερομηνία συνέλευσης
    projects = []

    print("🏗️  Creating 3 projects with SAME assembly date...\n")

    project1 = Project.objects.create(
        building=building,
        created_by=user,
        title="Ανακαίνιση Εισόδου",
        description="Πλήρης ανακαίνιση της εισόδου του κτιρίου",
        estimated_cost=15000.00,
        priority='high',
        deadline=assembly_date + timedelta(days=90),
        general_assembly_date=assembly_date,
    )
    projects.append(project1)
    print(f"✅ Project 1: {project1.title}")

    project2 = Project.objects.create(
        building=building,
        created_by=user,
        title="Επισκευή Ανελκυστήρα",
        description="Αντικατάσταση μηχανισμού ανελκυστήρα",
        estimated_cost=8500.00,
        priority='urgent',
        deadline=assembly_date + timedelta(days=60),
        general_assembly_date=assembly_date,  # ΙΔΙΑ ημερομηνία
    )
    projects.append(project2)
    print(f"✅ Project 2: {project2.title}")

    project3 = Project.objects.create(
        building=building,
        created_by=user,
        title="Βάψιμο Κλιμακοστασίου",
        description="Ανανέωση βαφής κοινόχρηστων χώρων",
        estimated_cost=3200.00,
        priority='medium',
        deadline=assembly_date + timedelta(days=45),
        general_assembly_date=assembly_date,  # ΙΔΙΑ ημερομηνία
    )
    projects.append(project3)
    print(f"✅ Project 3: {project3.title}")

    # Καταμέτρηση ανακοινώσεων μετά
    announcements_after = Announcement.objects.filter(
        building=building,
        title__icontains="Σύγκληση Γενικής Συνέλευσης"
    ).count()

    print(f"\n📊 Assembly announcements after: {announcements_after}")
    print(f"📊 New announcements: {announcements_after - announcements_before}")

    # Ανάκτηση της ανακοίνωσης
    assembly_announcement = Announcement.objects.filter(
        building=building,
        title__icontains="Σύγκληση Γενικής Συνέλευσης",
        end_date=assembly_date
    ).first()

    if assembly_announcement:
        print(f"\n✅ UNIFIED Assembly Announcement Found!")
        print(f"   ID: {assembly_announcement.id}")
        print(f"   Title: {assembly_announcement.title}")
        print(f"   Date: {assembly_announcement.end_date}")
        print(f"\n📝 Description:")
        print("=" * 80)
        print(assembly_announcement.description)
        print("=" * 80)

        # Έλεγχος ότι περιέχει και τα 3 θέματα
        contains_all = all(proj.title in assembly_announcement.description for proj in projects)

        if contains_all:
            print(f"\n✅ SUCCESS! All 3 topics are in the announcement:")
            for proj in projects:
                print(f"   ✓ {proj.title}")
        else:
            print(f"\n⚠️  WARNING: Not all topics found in announcement")
            for proj in projects:
                found = "✓" if proj.title in assembly_announcement.description else "✗"
                print(f"   {found} {proj.title}")

        # Έλεγχος ότι δημιουργήθηκε ΜΟΝΟ 1 ανακοίνωση
        if announcements_after - announcements_before == 1:
            print(f"\n🎉 PERFECT! Only ONE announcement created for 3 projects!")
        else:
            print(f"\n⚠️  Expected 1 new announcement, got {announcements_after - announcements_before}")
    else:
        print(f"\n❌ No assembly announcement found for date: {assembly_date}")

    print(f"\n" + "=" * 80)
    print(f"✅ Test completed!")
    print(f"\nView at: http://demo.localhost:3000/announcements")

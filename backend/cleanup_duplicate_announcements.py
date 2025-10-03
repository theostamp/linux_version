#!/usr/bin/env python3
"""
🧹 Script για καθαρισμό διπλότυπων ανακοινώσεων
"""

import os
import sys
from datetime import datetime
from collections import defaultdict

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from announcements.models import Announcement

def cleanup_duplicate_announcements():
    """Καθαρισμός διπλότυπων ανακοινώσεων"""
    
    print("🧹 ΚΑΘΑΡΙΣΜΟΣ ΔΙΠΛΟΤΥΠΩΝ ΑΝΑΚΟΙΝΩΣΕΩΝ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Λήψη όλων των ανακοινώσεων
        announcements = Announcement.objects.filter(building=building).order_by('-created_at')
        
        print(f"📢 Σύνολο ανακοινώσεων: {announcements.count()}")
        print()
        
        # Ομαδοποίηση ανά τίτλο
        title_groups = defaultdict(list)
        
        for announcement in announcements:
            title_groups[announcement.title].append(announcement)
        
        # Έλεγχος για διπλότυπα
        duplicates_to_clean = []
        
        for title, announcements_list in title_groups.items():
            if len(announcements_list) > 1:
                print(f"🔄 ΔΙΠΛΟΤΥΠΟ: '{title}' ({len(announcements_list)} ανακοινώσεις)")
                
                # Κατάταξη ανά ημερομηνία δημιουργίας (πιο πρόσφατες πρώτα)
                announcements_list.sort(key=lambda x: x.created_at, reverse=True)
                
                # Κρατάμε την πιο πρόσφατη (πρώτη στη λίστα)
                keep_announcement = announcements_list[0]
                print(f"   ✅ Κρατάμε: ID {keep_announcement.id} ({keep_announcement.created_at.strftime('%d/%m/%Y, %H:%M')})")
                
                # Προσθέτουμε τις υπόλοιπες για διαγραφή
                for announcement in announcements_list[1:]:
                    print(f"   🗑️ Διαγράφουμε: ID {announcement.id} ({announcement.created_at.strftime('%d/%m/%Y, %H:%M')})")
                    duplicates_to_clean.append(announcement)
                
                print()
        
        if not duplicates_to_clean:
            print("✅ Δεν βρέθηκαν διπλότυπα ανακοινώσεις για καθαρισμό")
            return
        
        print(f"🗑️ ΣΥΝΟΛΟ ΓΙΑ ΔΙΑΓΡΑΦΗ: {len(duplicates_to_clean)} ανακοινώσεις")
        print()
        
        # Επιβεβαίωση
        print("⚠️ ΕΠΙΒΕΒΑΙΩΣΗ ΔΙΑΓΡΑΦΗΣ:")
        print("-" * 50)
        
        for announcement in duplicates_to_clean:
            print(f"   🗑️ ID {announcement.id}: '{announcement.title}'")
            print(f"      📅 Δημιουργία: {announcement.created_at.strftime('%d/%m/%Y, %H:%M')}")
            print(f"      📝 Περιεχόμενο: {announcement.description[:100]}...")
            print()
        
        # Διαγραφή
        print("🧹 ΕΚΤΕΛΕΣΗ ΔΙΑΓΡΑΦΗΣ...")
        print("-" * 50)
        
        deleted_count = 0
        for announcement in duplicates_to_clean:
            try:
                announcement.delete()
                deleted_count += 1
                print(f"   ✅ Διαγράφηκε: ID {announcement.id}")
            except Exception as e:
                print(f"   ❌ Σφάλμα διαγραφής ID {announcement.id}: {e}")
        
        print()
        print(f"✅ ΔΙΑΓΡΑΦΗΚΑΝ {deleted_count} ΑΝΑΚΟΙΝΩΣΕΙΣ")
        
        # Επιβεβαίωση αποτελέσματος
        print("\n🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΑΠΟΤΕΛΕΣΜΑΤΟΣ:")
        print("-" * 50)
        
        remaining_announcements = Announcement.objects.filter(building=building).order_by('-created_at')
        print(f"📢 Εναπομείναν ανακοινώσεις: {remaining_announcements.count()}")
        
        # Έλεγχος για επιπλέον διπλότυπα
        remaining_title_groups = defaultdict(list)
        for announcement in remaining_announcements:
            remaining_title_groups[announcement.title].append(announcement)
        
        remaining_duplicates = 0
        for title, announcements_list in remaining_title_groups.items():
            if len(announcements_list) > 1:
                remaining_duplicates += len(announcements_list) - 1
        
        if remaining_duplicates == 0:
            print("✅ Δεν υπάρχουν πια διπλότυπα ανακοινώσεις!")
        else:
            print(f"⚠️ Υπάρχουν ακόμα {remaining_duplicates} διπλότυπα")
        
        print("\n" + "=" * 70)
        print("✅ Ο καθαρισμός ολοκληρώθηκε!")

if __name__ == "__main__":
    cleanup_duplicate_announcements()

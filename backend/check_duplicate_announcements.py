#!/usr/bin/env python3
"""
🔍 Script για έλεγχο διπλότυπων ανακοινώσεων
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

def check_duplicate_announcements():
    """Έλεγχος διπλότυπων ανακοινώσεων"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΟΤΥΠΩΝ ΑΝΑΚΟΙΝΩΣΕΩΝ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Λήψη όλων των ανακοινώσεων
        announcements = Announcement.objects.filter(building=building).order_by('-created_at')
        
        print(f"📢 Σύνολο ανακοινώσεων: {announcements.count()}")
        print()
        
        # Ανάλυση διπλότυπων
        print("📋 ΑΝΑΛΥΣΗ ΑΝΑΚΟΙΝΩΣΕΩΝ:")
        print("-" * 50)
        
        # Ομαδοποίηση ανά τίτλο
        title_groups = defaultdict(list)
        
        for announcement in announcements:
            title_groups[announcement.title].append(announcement)
        
        # Έλεγχος για διπλότυπα
        duplicates_found = False
        
        for title, announcements_list in title_groups.items():
            if len(announcements_list) > 1:
                duplicates_found = True
                print(f"🔄 ΔΙΠΛΟΤΥΠΟ: '{title}' ({len(announcements_list)} ανακοινώσεις)")
                
                for i, announcement in enumerate(announcements_list, 1):
                    print(f"   {i}. ID: {announcement.id}")
                    print(f"      📅 Δημιουργία: {announcement.created_at.strftime('%d/%m/%Y, %H:%M')}")
                    print(f"      📅 Ενεργό από: {announcement.start_date}")
                    print(f"      📅 Ενεργό έως: {announcement.end_date or '—'}")
                    print(f"      🏷️ Επείγουσα: {'Ναι' if announcement.is_urgent else 'Όχι'}")
                    print(f"      📝 Περιεχόμενο: {announcement.description[:100]}...")
                    print()
        
        if not duplicates_found:
            print("✅ Δεν βρέθηκαν διπλότυπα ανακοινώσεις")
        else:
            print("❌ Βρέθηκαν διπλότυπα ανακοινώσεις!")
        
        print()
        
        # Ανάλυση ανά κατάσταση
        print("📊 ΑΝΑΛΥΣΗ ΑΝΑ ΚΑΤΑΣΤΑΣΗ:")
        print("-" * 50)
        
        urgent_announcements = announcements.filter(is_urgent=True)
        published_announcements = announcements.filter(published=True)
        active_announcements = announcements.filter(is_active=True)
        
        print(f"🚨 Επείγουσες: {urgent_announcements.count()}")
        print(f"📢 Δημοσιευμένες: {published_announcements.count()}")
        print(f"✅ Ενεργές: {active_announcements.count()}")
        
        print()
        
        # Έλεγχος προσφορών (ανακοινώσεις με "προσφορά" στον τίτλο)
        print("💰 ΑΝΑΛΥΣΗ ΠΡΟΣΦΟΡΩΝ:")
        print("-" * 50)
        
        offers = announcements.filter(title__icontains='προσφορά')
        print(f"📢 Σύνολο προσφορών: {offers.count()}")
        
        offer_groups = defaultdict(list)
        for offer in offers:
            offer_groups[offer.title].append(offer)
        
        for title, offers_list in offer_groups.items():
            print(f"\n💰 '{title}': {len(offers_list)} προσφορές")
            
            for i, offer in enumerate(offers_list, 1):
                print(f"   {i}. ID: {offer.id}")
                print(f"      📅 Δημιουργία: {offer.created_at.strftime('%d/%m/%Y, %H:%M')}")
                print(f"      📝 Περιεχόμενο: {offer.description[:200]}...")
                print()
        
        print("=" * 70)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    check_duplicate_announcements()

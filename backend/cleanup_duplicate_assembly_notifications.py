#!/usr/bin/env python3
"""
Καθαρισμός διπλών ανακοινώσεων συνελεύσεων που αναφέρουν 
το ίδιο project πολλές φορές.
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from notifications.models import NotificationEvent
from collections import defaultdict

def cleanup_duplicate_assembly_notifications():
    """Καθαρίζει διπλές ανακοινώσεις συνελεύσεων"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΚΑΘΑΡΙΣΜΟΣ ΔΙΠΛΩΝ ΑΝΑΚΟΙΝΩΣΕΩΝ ΣΥΝΕΛΕΥΣΕΩΝ")
        print("="*80 + "\n")
        
        # Βρίσκουμε όλες τις ανακοινώσεις συνελεύσεων
        assembly_notifications = NotificationEvent.objects.filter(
            event_type='general_assembly'
        ).order_by('building', 'event_date', 'created_at')
        
        print(f"📊 Σύνολο ανακοινώσεων συνελεύσεων: {assembly_notifications.count()}\n")
        
        # Ομαδοποίηση ανά building + date
        by_building_date = defaultdict(list)
        for notif in assembly_notifications:
            key = (notif.building_id, notif.event_date)
            by_building_date[key].append(notif)
        
        # Έλεγχος για duplicates
        print("ΕΛΕΓΧΟΣ ΓΙΑ DUPLICATES:")
        print("-" * 80)
        
        duplicates_found = False
        total_deleted = 0
        
        for (building_id, event_date), notifications in by_building_date.items():
            if len(notifications) > 1:
                duplicates_found = True
                print(f"\n🔍 Building {building_id}, Date {event_date}:")
                print(f"   Βρέθηκαν {len(notifications)} duplicates\n")
                
                # Κρατάμε το παλαιότερο (πρώτο που δημιουργήθηκε)
                keep = notifications[0]
                to_delete = notifications[1:]
                
                print(f"   ✅ ΚΡΑΤΩ: ID:{keep.id} | {keep.title} | Created: {keep.created_at}")
                print(f"   ❌ ΔΙΑΓΡΑΦΗ:")
                
                for notif in to_delete:
                    print(f"      • ID:{notif.id} | {notif.title} | Created: {notif.created_at}")
                    notif.delete()
                    total_deleted += 1
        
        if not duplicates_found:
            print("   ✅ Δεν βρέθηκαν duplicates")
        else:
            print(f"\n✅ Διαγράφηκαν {total_deleted} duplicate ανακοινώσεις")
        
        print("\n" + "="*80)
        print("✅ CLEANUP ΟΛΟΚΛΗΡΩΘΗΚΕ!")
        print("="*80 + "\n")

if __name__ == '__main__':
    cleanup_duplicate_assembly_notifications()


#!/usr/bin/env python3
"""
Βρίσκει όλες τις ανακοινώσεις που αναφέρονται σε συνελεύσεις ή "Στεγανοποίηση Ταράτσας"
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

def find_assembly_notifications():
    """Βρίσκει όλες τις ανακοινώσεις για συνελεύσεις"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΑΝΑΖΗΤΗΣΗ ΑΝΑΚΟΙΝΩΣΕΩΝ ΣΥΝΕΛΕΥΣΕΩΝ")
        print("="*80 + "\n")
        
        # Όλες οι ανακοινώσεις
        all_notifications = NotificationEvent.objects.all().order_by('-created_at')
        print(f"📊 Σύνολο ανακοινώσεων: {all_notifications.count()}\n")
        
        # Ψάχνουμε για Συνέλευση
        assembly_notifs = NotificationEvent.objects.filter(
            title__icontains='Συνέλευσ'
        )
        print(f"🔍 Ανακοινώσεις με 'Συνέλευσ': {assembly_notifs.count()}\n")
        
        if assembly_notifs.count() > 0:
            for notif in assembly_notifs:
                print(f"• ID:{notif.id} | Type:{notif.event_type}")
                print(f"  Title: {notif.title}")
                print(f"  Created: {notif.created_at}")
                if notif.description:
                    desc_preview = notif.description[:200] if len(notif.description) > 200 else notif.description
                    print(f"  Description: {desc_preview}")
                print()
        
        # Ψάχνουμε για "Στεγανοποίηση"
        print("\n" + "-" * 80)
        project_notifs = NotificationEvent.objects.filter(
            title__icontains='Στεγανοποίηση'
        ) | NotificationEvent.objects.filter(
            description__icontains='Στεγανοποίηση'
        )
        print(f"🔍 Ανακοινώσεις με 'Στεγανοποίηση': {project_notifs.count()}\n")
        
        if project_notifs.count() > 0:
            for notif in project_notifs.distinct():
                print(f"• ID:{notif.id} | Type:{notif.event_type}")
                print(f"  Title: {notif.title}")
                print(f"  Created: {notif.created_at}")
                print()
        
        # Group by similar titles
        print("\n" + "=" * 80)
        print("ΟΜΑΔΟΠΟΙΗΣΗ ΑΝΑ TITLE:")
        print("=" * 80 + "\n")
        
        from collections import defaultdict
        by_title = defaultdict(list)
        for notif in all_notifications:
            by_title[notif.title].append(notif)
        
        duplicates = {title: notifs for title, notifs in by_title.items() if len(notifs) > 1}
        
        if duplicates:
            print(f"Βρέθηκαν {len(duplicates)} titles με duplicates:\n")
            for title, notifs in list(duplicates.items())[:10]:
                print(f"📋 {title}")
                print(f"   Count: {len(notifs)}")
                for notif in notifs:
                    print(f"   • ID:{notif.id} | Created: {notif.created_at}")
                print()
        else:
            print("✅ Δεν βρέθηκαν duplicate titles")
        
        print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    find_assembly_notifications()



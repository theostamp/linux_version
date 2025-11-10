#!/usr/bin/env python3
"""
Διαγραφή duplicate ανακοινώσεων (κρατώντας την παλαιότερη).
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

def delete_duplicate_notifications():
    """Διαγράφει duplicate ανακοινώσεις"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΔΙΑΓΡΑΦΗ DUPLICATE ΑΝΑΚΟΙΝΩΣΕΩΝ")
        print("="*80 + "\n")
        
        # Όλες οι ανακοινώσεις
        all_notifications = NotificationEvent.objects.all().order_by('created_at')
        
        # Ομαδοποίηση ανά title
        by_title = defaultdict(list)
        for notif in all_notifications:
            by_title[notif.title].append(notif)
        
        # Βρίσκουμε duplicates
        duplicates = {title: notifs for title, notifs in by_title.items() if len(notifs) > 1}
        
        if not duplicates:
            print("✅ Δεν βρέθηκαν duplicates\n")
            return
        
        print(f"📊 Βρέθηκαν {len(duplicates)} titles με duplicates:\n")
        
        total_deleted = 0
        
        for title, notifs in duplicates.items():
            print(f"📋 {title}")
            print(f"   Total: {len(notifs)} duplicates\n")
            
            # Κρατάμε το παλαιότερο (πρώτο)
            keep = notifs[0]
            to_delete = notifs[1:]
            
            print(f"   ✅ ΚΡΑΤΩ: ID:{keep.id} | Created: {keep.created_at}")
            print(f"   ❌ ΔΙΑΓΡΑΦΗ:")
            
            for notif in to_delete:
                print(f"      • ID:{notif.id} | Created: {notif.created_at}")
                notif.delete()
                total_deleted += 1
            
            print()
        
        print("="*80)
        print(f"✅ Διαγράφηκαν {total_deleted} duplicate ανακοινώσεις!")
        print("="*80 + "\n")

if __name__ == '__main__':
    delete_duplicate_notifications()



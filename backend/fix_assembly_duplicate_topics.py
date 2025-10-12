#!/usr/bin/env python3
"""
Διόρθωση duplicate topics στην ανακοίνωση συνέλευσης.
Αφαιρεί διπλότυπα θέματα από το description.
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
import re

def fix_assembly_duplicate_topics():
    """Διορθώνει duplicate topics στις ανακοινώσεις συνελεύσεων"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΔΙΟΡΘΩΣΗ DUPLICATE TOPICS ΣΕ ΑΝΑΚΟΙΝΩΣΕΙΣ ΣΥΝΕΛΕΥΣΕΩΝ")
        print("="*80 + "\n")
        
        # Βρίσκουμε ανακοινώσεις συνελεύσεων
        assembly_notifs = NotificationEvent.objects.filter(
            title__icontains='Συνέλευσ'
        )
        
        for notif in assembly_notifs:
            print(f"📋 Ανακοίνωση: {notif.title}")
            print(f"   ID: {notif.id}")
            print(f"   Description length: {len(notif.description or '')}")
            
            if not notif.description:
                print("   (Δεν έχει description)\n")
                continue
            
            print(f"\n   Original Description:")
            print(f"   {'-' * 70}")
            print(f"   {notif.description[:500]}")
            print(f"   {'-' * 70}\n")
            
            # Βρίσκουμε θέματα (γραμμές που ξεκινούν με αριθμό και τελεία)
            lines = notif.description.split('\n')
            topics = []
            
            for line in lines:
                # Ψάχνουμε για pattern: "### Θέμα: [TITLE]" ή "### [NUMBER]. [TITLE]"
                if line.strip().startswith('### Θέμα:'):
                    topic = line.strip().replace('### Θέμα:', '').strip()
                    topics.append(topic)
                elif re.match(r'^###\s+\d+\.\s+', line):
                    topic = re.sub(r'^###\s+\d+\.\s+', '', line).strip()
                    topics.append(topic)
            
            if not topics:
                print(f"   ℹ️ Δεν βρέθηκαν θέματα με το pattern '### Θέμα:' ή '### [N]. '\n")
                continue
            
            print(f"   Βρέθηκαν {len(topics)} θέματα:")
            for i, topic in enumerate(topics, 1):
                print(f"      {i}. {topic}")
            
            # Έλεγχος για duplicates
            unique_topics = list(dict.fromkeys(topics))  # Διατήρηση σειράς
            
            if len(unique_topics) < len(topics):
                duplicates_removed = len(topics) - len(unique_topics)
                print(f"\n   ⚠️ Βρέθηκαν {duplicates_removed} duplicates!")
                print(f"   Unique topics:")
                for i, topic in enumerate(unique_topics, 1):
                    print(f"      {i}. {topic}")
                
                # Ανακατασκευή description με unique topics
                new_description = notif.description
                
                # Βρίσκουμε και αφαιρούμε duplicates
                # Κρατάμε μόνο το πρώτο occurrence κάθε topic
                seen_topics = set()
                new_lines = []
                
                for line in lines:
                    # Εξάγουμε το topic από τη γραμμή
                    topic = None
                    if line.strip().startswith('### Θέμα:'):
                        topic = line.strip().replace('### Θέμα:', '').strip()
                    elif re.match(r'^###\s+\d+\.\s+', line):
                        topic = re.sub(r'^###\s+\d+\.\s+', '', line).strip()
                    
                    if topic:
                        if topic not in seen_topics:
                            seen_topics.add(topic)
                            new_lines.append(line)
                        else:
                            # Skip duplicate topic
                            continue
                    else:
                        new_lines.append(line)
                
                new_description = '\n'.join(new_lines)
                
                # Ενημέρωση
                notif.description = new_description
                notif.save()
                
                print(f"\n   ✅ Ενημερώθηκε η ανακοίνωση (αφαιρέθηκαν {duplicates_removed} duplicates)")
            else:
                print(f"\n   ✅ Δεν υπάρχουν duplicates")
            
            print()
        
        print("="*80)
        print("✅ ΔΙΟΡΘΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ!")
        print("="*80 + "\n")

if __name__ == '__main__':
    fix_assembly_duplicate_topics()


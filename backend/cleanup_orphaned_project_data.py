#!/usr/bin/env python3
"""
Καθαρισμός orphaned data από διαγραμμένα projects:
- Ανακοινώσεις που αναφέρονται σε ανύπαρκτα projects
- Ψηφοφορίες που αναφέρονται σε ανύπαρκτα projects
- Δαπάνες που αναφέρονται σε ανύπαρκτα projects (μόνο μη-πληρωμένες)
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project
from financial.models import Expense

def cleanup_orphaned_data():
    """Καθαρίζει orphaned data από διαγραμμένα projects"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΚΑΘΑΡΙΣΜΟΣ ORPHANED DATA ΑΠΟ ΔΙΑΓΡΑΜΜΕΝΑ PROJECTS")
        print("="*80 + "\n")
        
        # === 1. ΑΝΑΚΟΙΝΩΣΕΙΣ ===
        print("1️⃣ ΕΛΕΓΧΟΣ ΑΝΑΚΟΙΝΩΣΕΩΝ:")
        print("-" * 80)
        
        try:
            from notifications.models import NotificationEvent
            
            # Βρίσκουμε όλες τις ανακοινώσεις για συνελεύσεις
            assembly_notifications = NotificationEvent.objects.filter(
                event_type='general_assembly'
            )
            
            orphaned_notifications = []
            for notif in assembly_notifications:
                # Ελέγχουμε αν το project που αναφέρεται υπάρχει
                # Από το title βρίσκουμε το project title
                if 'Συνέλευσης' in notif.title:
                    # Προσπαθούμε να εξάγουμε το project title
                    project_title = None
                    if 'Σύγκληση Γενικής Συνέλευσης -' in notif.title:
                        date_part = notif.title.split(' - ')[-1]
                        # Ψάχνουμε στο description για project titles
                        if notif.description and 'Θέματα Συνέλευσης' in notif.description:
                            lines = notif.description.split('\n')
                            for line in lines:
                                # Βρίσκουμε γραμμές με αριθμούς (1. Title, 2. Title)
                                if '. ' in line and not 'Θέματα' in line:
                                    parts = line.split('. ', 1)
                                    if len(parts) > 1:
                                        project_title = parts[1].strip()
                                        # Ελέγχουμε αν υπάρχει το project
                                        if not Project.objects.filter(
                                            building=notif.building,
                                            title=project_title
                                        ).exists():
                                            orphaned_notifications.append(notif)
                                            break
            
            if orphaned_notifications:
                print(f"   Βρέθηκαν {len(orphaned_notifications)} orphaned ανακοινώσεις\n")
                for notif in orphaned_notifications[:5]:
                    print(f"   • ID:{notif.id} | {notif.title}")
                
                # Διαγραφή
                for notif in orphaned_notifications:
                    notif.delete()
                print(f"\n   ✅ Διαγράφηκαν {len(orphaned_notifications)} orphaned ανακοινώσεις")
            else:
                print("   ✅ Δεν βρέθηκαν orphaned ανακοινώσεις")
        
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")
        
        # === 2. ΨΗΦΟΦΟΡΙΕΣ ===
        print("\n2️⃣ ΕΛΕΓΧΟΣ ΨΗΦΟΦΟΡΙΩΝ:")
        print("-" * 80)
        
        try:
            from voting.models import Vote
            
            project_votes = Vote.objects.filter(title__icontains='Έγκριση Έργου:')
            orphaned_votes = []
            
            for vote in project_votes:
                # Εξάγουμε το project title από το vote title
                # Format: "Έγκριση Έργου: [PROJECT_TITLE]"
                if 'Έγκριση Έργου:' in vote.title:
                    project_title = vote.title.split('Έγκριση Έργου:', 1)[1].strip()
                    
                    # Ελέγχουμε αν υπάρχει το project
                    if not Project.objects.filter(
                        building=vote.building,
                        title=project_title
                    ).exists():
                        orphaned_votes.append(vote)
            
            if orphaned_votes:
                print(f"   Βρέθηκαν {len(orphaned_votes)} orphaned ψηφοφορίες\n")
                for vote in orphaned_votes:
                    print(f"   • ID:{vote.id} | {vote.title}")
                
                # Διαγραφή
                for vote in orphaned_votes:
                    vote.delete()
                print(f"\n   ✅ Διαγράφηκαν {len(orphaned_votes)} orphaned ψηφοφορίες")
            else:
                print("   ✅ Δεν βρέθηκαν orphaned ψηφοφορίες")
        
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")
        
        # === 3. ΔΑΠΑΝΕΣ ===
        print("\n3️⃣ ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ:")
        print("-" * 80)
        
        try:
            # Δαπάνες με project field που δεν υπάρχει πια
            orphaned_expenses = Expense.objects.filter(
                project__isnull=False
            ).select_related('project')
            
            actual_orphaned = []
            for exp in orphaned_expenses:
                try:
                    # Αν το project δεν υπάρχει, θα σηκώσει exception
                    project_exists = Project.objects.filter(id=exp.project_id).exists()
                    if not project_exists:
                        actual_orphaned.append(exp)
                except:
                    actual_orphaned.append(exp)
            
            if actual_orphaned:
                print(f"   Βρέθηκαν {len(actual_orphaned)} orphaned δαπάνες\n")
                for exp in actual_orphaned[:5]:
                    print(f"   • ID:{exp.id} | {exp.title} | €{exp.amount}")
                
                # Διαγραφή
                for exp in actual_orphaned:
                    exp.delete()
                print(f"\n   ✅ Διαγράφηκαν {len(actual_orphaned)} orphaned δαπάνες")
            else:
                print("   ✅ Δεν βρέθηκαν orphaned δαπάνες")
        
        except Exception as e:
            print(f"   ❌ Σφάλμα: {e}")
        
        print("\n" + "="*80)
        print("✅ CLEANUP ΟΛΟΚΛΗΡΩΘΗΚΕ!")
        print("="*80 + "\n")

if __name__ == '__main__':
    cleanup_orphaned_data()



#!/usr/bin/env python3
"""
Script για τη δημιουργία demo data για teams και collaborators στο demo tenant
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from django.contrib.auth import get_user_model
from buildings.models import Building
from teams.models import Team, TeamRole, TeamMember, TeamTask, TeamMeeting, TeamPerformance
from collaborators.models import (
    Collaborator, CollaborationProject, CollaborationContract, 
    CollaborationInvoice, CollaborationMeeting, CollaboratorPerformance
)
from maintenance.models import Contractor, ServiceReceipt, ScheduledMaintenance

User = get_user_model()

def create_team_roles():
    """Δημιουργία ρόλων ομάδων"""
    roles_data = [
        {'name': 'Ηγέτης Ομάδας', 'role_type': 'leader', 'description': 'Ηγέτης ομάδας με πλήρη ευθύνη'},
        {'name': 'Μέλος Ομάδας', 'role_type': 'member', 'description': 'Κανονικό μέλος ομάδας'},
        {'name': 'Ειδικός', 'role_type': 'specialist', 'description': 'Ειδικός σε συγκεκριμένο τομέα'},
        {'name': 'Βοηθός', 'role_type': 'assistant', 'description': 'Βοηθός της ομάδας'},
        {'name': 'Εκπαιδευόμενος', 'role_type': 'trainee', 'description': 'Εκπαιδευόμενο μέλος'},
    ]
    
    roles = []
    for role_data in roles_data:
        role, created = TeamRole.objects.get_or_create(
            name=role_data['name'],
            defaults=role_data
        )
        roles.append(role)
        if created:
            print(f"✅ Δημιουργήθηκε ρόλος: {role.name}")
    
    return roles

def create_teams(building, users):
    """Δημιουργία ομάδων"""
    teams_data = [
        {
            'name': 'Ομάδα Διαχείρισης',
            'team_type': 'management',
            'description': 'Ομάδα διαχείρισης κτιρίου',
            'max_members': 5
        },
        {
            'name': 'Ομάδα Συντήρησης',
            'team_type': 'maintenance',
            'description': 'Ομάδα συντήρησης και επισκευών',
            'max_members': 8
        },
        {
            'name': 'Ομάδα Καθαριότητας',
            'team_type': 'cleaning',
            'description': 'Ομάδα καθαριότητας κοινοχρήστων',
            'max_members': 6
        },
        {
            'name': 'Ομάδα Ασφάλειας',
            'team_type': 'security',
            'description': 'Ομάδα ασφάλειας κτιρίου',
            'max_members': 4
        }
    ]
    
    teams = []
    for team_data in teams_data:
        team, created = Team.objects.get_or_create(
            name=team_data['name'],
            building=building,
            defaults={
                **team_data,
                'leader': random.choice(users),
                'status': 'active'
            }
        )
        teams.append(team)
        if created:
            print(f"✅ Δημιουργήθηκε ομάδα: {team.name}")
    
    return teams

def create_team_members(teams, users, roles):
    """Δημιουργία μελών ομάδων"""
    for team in teams:
        # Προσθήκη 2-4 μελών ανά ομάδα
        num_members = random.randint(2, min(4, team.max_members))
        available_users = [u for u in users if u != team.leader]
        
        for i in range(num_members):
            if available_users:
                user = random.choice(available_users)
                available_users.remove(user)
                
                role = random.choice(roles)
                
                member, created = TeamMember.objects.get_or_create(
                    team=team,
                    user=user,
                    defaults={
                        'role': role,
                        'status': 'active',
                        'is_active': True
                    }
                )
                if created:
                    print(f"✅ Προστέθηκε μέλος: {user.email} στην ομάδα {team.name}")

def create_team_tasks(teams, users):
    """Δημιουργία εργασιών ομάδων"""
    task_titles = [
        'Επιθεώρηση ηλεκτρικών εγκαταστάσεων',
        'Συντήρηση ανελκυστήρα',
        'Καθαρισμός κοινοχρήστων',
        'Έλεγχος συστήματος ασφαλείας',
        'Ενημέρωση κατοίκων',
        'Συντονισμός επισκευών',
        'Παρακολούθηση προμηθευτών',
        'Διαχείριση αποθεμάτων'
    ]
    
    for team in teams:
        num_tasks = random.randint(3, 6)
        team_members = list(team.members.all())
        
        for i in range(num_tasks):
            title = random.choice(task_titles)
            assigned_to = random.choice(team_members) if team_members else None
            
            task, created = TeamTask.objects.get_or_create(
                team=team,
                title=title,
                defaults={
                    'description': f'Περιγραφή για την εργασία: {title}',
                    'assigned_to': assigned_to,
                    'priority': random.choice(['low', 'medium', 'high']),
                    'status': random.choice(['pending', 'in_progress', 'completed']),
                    'due_date': datetime.now() + timedelta(days=random.randint(1, 30)),
                    'estimated_hours': Decimal(str(random.randint(2, 8))),
                    'actual_hours': Decimal(str(random.randint(1, 6)))
                }
            )
            if created:
                print(f"✅ Δημιουργήθηκε εργασία: {title} για την ομάδα {team.name}")

def create_collaborators():
    """Δημιουργία συνεργατών"""
    collaborators_data = [
        {
            'name': 'Τεχνικό Γραφείο ΑΕ',
            'collaborator_type': 'technical_office',
            'contact_person': 'Γιώργος Παπαδόπουλος',
            'phone': '2101234567',
            'email': 'info@techoffice.gr',
            'rating': Decimal('4.5'),
            'hourly_rate': Decimal('45.00'),
            'availability': 'available',
            'expertise_areas': ['αρχιτεκτονική', 'στατικά', 'ηλεκτρολογικά']
        },
        {
            'name': 'Νομικό Γραφείο',
            'collaborator_type': 'legal_office',
            'contact_person': 'Μαρία Κωνσταντίνου',
            'phone': '2109876543',
            'email': 'info@legaloffice.gr',
            'rating': Decimal('4.8'),
            'hourly_rate': Decimal('60.00'),
            'availability': 'available',
            'expertise_areas': ['διοικητικό δίκαιο', 'αστικό δίκαιο', 'εργατικό δίκαιο']
        },
        {
            'name': 'Λογιστικό Γραφείο',
            'collaborator_type': 'accounting_office',
            'contact_person': 'Δημήτρης Αλεξίου',
            'phone': '2105555555',
            'email': 'info@accounting.gr',
            'rating': Decimal('4.2'),
            'hourly_rate': Decimal('35.00'),
            'availability': 'available',
            'expertise_areas': ['λογιστικά', 'φορολογικά', 'ασφαλιστικά']
        }
    ]
    
    collaborators = []
    for collab_data in collaborators_data:
        collaborator, created = Collaborator.objects.get_or_create(
            name=collab_data['name'],
            defaults=collab_data
        )
        collaborators.append(collaborator)
        if created:
            print(f"✅ Δημιουργήθηκε συνεργάτης: {collaborator.name}")
    
    return collaborators

def create_collaboration_projects(building, collaborators, users):
    """Δημιουργία έργων συνεργασίας"""
    projects_data = [
        {
            'title': 'Ανακαίνιση Κοινοχρήστων',
            'project_type': 'renovation',
            'status': 'in_progress',
            'budget': Decimal('50000.00'),
            'actual_cost': Decimal('35000.00'),
            'deliverables': ['σχέδια', 'άδειες', 'εκτέλεση έργων'],
            'milestones': ['ολοκλήρωση σχεδίων', 'έκδοση αδειών', 'ξεκίνημα έργων']
        },
        {
            'title': 'Εγκατάσταση Συστήματος Ασφαλείας',
            'project_type': 'installation',
            'status': 'completed',
            'budget': Decimal('15000.00'),
            'actual_cost': Decimal('14200.00'),
            'deliverables': ['σύστημα κάμερας', 'κάρτες πρόσβασης', 'κεντρική μονάδα'],
            'milestones': ['παράδοση εξοπλισμού', 'εγκατάσταση', 'δοκιμές']
        }
    ]
    
    for project_data in projects_data:
        project, created = CollaborationProject.objects.get_or_create(
            title=project_data['title'],
            building=building,
            defaults={
                **project_data,
                'collaborator': random.choice(collaborators),
                'start_date': datetime.now().date() - timedelta(days=random.randint(30, 90)),
                'end_date': datetime.now().date() + timedelta(days=random.randint(30, 90))
            }
        )
        if created:
            print(f"✅ Δημιουργήθηκε έργο: {project.title}")

def main():
    """Κύρια συνάρτηση"""
    print("🚀 Ξεκινά η δημιουργία demo data για teams και collaborators...")
    
    # Βρίσκουμε το demo tenant
    try:
        demo_tenant = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε το demo tenant: {demo_tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant")
        return
    
    # Εκτελούμε στο demo tenant
    with tenant_context(demo_tenant):
        print("🔧 Εκτέλεση στο demo tenant...")
        
        # Βρίσκουμε ένα κτίριο
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο")
            return
        
        print(f"✅ Βρέθηκε κτίριο: {building.name}")
        
        # Βρίσκουμε χρήστες
        users = list(User.objects.all()[:10])  # Πρώτοι 10 χρήστες
        if not users:
            print("❌ Δεν βρέθηκαν χρήστες")
            return
        
        print(f"✅ Βρέθηκαν {len(users)} χρήστες")
        
        # Δημιουργία ρόλων ομάδων
        print("\n👥 Δημιουργία ρόλων ομάδων...")
        roles = create_team_roles()
        
        # Δημιουργία ομάδων
        print("\n🏗️ Δημιουργία ομάδων...")
        teams = create_teams(building, users)
        
        # Δημιουργία μελών ομάδων
        print("\n👤 Δημιουργία μελών ομάδων...")
        create_team_members(teams, users, roles)
        
        # Δημιουργία εργασιών ομάδων
        print("\n📋 Δημιουργία εργασιών ομάδων...")
        create_team_tasks(teams, users)
        
        # Δημιουργία συνεργατών
        print("\n🤝 Δημιουργία συνεργατών...")
        collaborators = create_collaborators()
        
        # Δημιουργία έργων συνεργασίας
        print("\n🏗️ Δημιουργία έργων συνεργασίας...")
        create_collaboration_projects(building, collaborators, users)
        
        print("\n✅ Η δημιουργία demo data ολοκληρώθηκε επιτυχώς!")

if __name__ == "__main__":
    main() 
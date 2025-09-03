#!/usr/bin/env python3
"""
Script για τη δημιουργία demo data για teams και collaborators
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

from django.contrib.auth import get_user_model
from buildings.models import Building
from teams.models import Team, TeamRole, TeamMember, TeamTask
from collaborators.models import (
    Collaborator, CollaborationProject, CollaborationContract
)
from maintenance.models import Contractor

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
        num_members = random.randint(2, 4)
        selected_users = random.sample(users, min(num_members, len(users)))
        
        for i, user in enumerate(selected_users):
            member, created = TeamMember.objects.get_or_create(
                team=team,
                user=user,
                defaults={
                    'role': roles[i % len(roles)],
                    'status': 'active',
                    'is_active': True
                }
            )
            if created:
                print(f"✅ Προστέθηκε μέλος: {user.get_full_name()} στην ομάδα {team.name}")

def create_team_tasks(teams, users):
    """Δημιουργία εργασιών ομάδων"""
    task_titles = [
        'Επιθεώρηση ηλεκτρικών εγκαταστάσεων',
        'Καθαρισμός κοινοχρήστων χώρων',
        'Έλεγχος συστήματος ασφάλειας',
        'Συντήρηση ανελκυστήρα',
        'Ενημέρωση ιδιοκτητών',
        'Προετοιμασία για έλεγχο',
        'Αναβάθμιση φωτισμού',
        'Επισκευή βλάβης'
    ]
    
    for team in teams:
        # Δημιουργία 3-6 εργασιών ανά ομάδα
        num_tasks = random.randint(3, 6)
        for _ in range(num_tasks):
            task = TeamTask.objects.create(
                team=team,
                title=random.choice(task_titles),
                description=f'Εργασία για την ομάδα {team.name}',
                priority=random.choice(['low', 'medium', 'high', 'urgent']),
                status=random.choice(['pending', 'in_progress', 'completed']),
                due_date=datetime.now() + timedelta(days=random.randint(1, 30)),
                estimated_hours=Decimal(str(random.randint(1, 8))),
                created_by=random.choice(users)
            )
            print(f"✅ Δημιουργήθηκε εργασία: {task.title}")

def create_collaborators():
    """Δημιουργία συνεργατών"""
    collaborators_data = [
        {
            'name': 'Τεχνικό Γραφείο ΑΕ',
            'collaborator_type': 'contractor',
            'contact_person': 'Γιώργος Παπαδόπουλος',
            'phone': '2101234567',
            'email': 'info@techniko.gr',
            'rating': Decimal('4.5'),
            'hourly_rate': Decimal('45.00'),
            'availability': 'available'
        },
        {
            'name': 'Σύμβουλοι Διαχείρισης',
            'collaborator_type': 'consultant',
            'contact_person': 'Μαρία Κωνσταντίνου',
            'phone': '2102345678',
            'email': 'maria@dioikisi.gr',
            'rating': Decimal('4.8'),
            'hourly_rate': Decimal('60.00'),
            'availability': 'available'
        },
        {
            'name': 'Νομικό Γραφείο',
            'collaborator_type': 'advisor',
            'contact_person': 'Δημήτρης Αλεξίου',
            'phone': '2103456789',
            'email': 'dimitris@nomiko.gr',
            'rating': Decimal('4.7'),
            'hourly_rate': Decimal('80.00'),
            'availability': 'available'
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

def create_contractors():
    """Δημιουργία συνεργείων"""
    contractors_data = [
        {
            'name': 'Συνεργείο Ηλεκτρολογικών',
            'service_type': 'electrical',
            'contact_person': 'Νίκος Δημητρίου',
            'phone': '2104567890',
            'email': 'nikos@ilektro.gr',
            'rating': Decimal('4.6'),
            'hourly_rate': Decimal('35.00'),
            'availability': 'available'
        },
        {
            'name': 'Συνεργείο Υδραυλικών',
            'service_type': 'plumbing',
            'contact_person': 'Παύλος Γεωργίου',
            'phone': '2105678901',
            'email': 'pavlos@ydro.gr',
            'rating': Decimal('4.4'),
            'hourly_rate': Decimal('30.00'),
            'availability': 'available'
        },
        {
            'name': 'Συνεργείο Καθαρισμού',
            'service_type': 'cleaning',
            'contact_person': 'Ελένη Παπαδοπούλου',
            'phone': '2106789012',
            'email': 'eleni@katharismos.gr',
            'rating': Decimal('4.3'),
            'hourly_rate': Decimal('25.00'),
            'availability': 'available'
        }
    ]
    
    contractors = []
    for contractor_data in contractors_data:
        contractor, created = Contractor.objects.get_or_create(
            name=contractor_data['name'],
            defaults=contractor_data
        )
        contractors.append(contractor)
        if created:
            print(f"✅ Δημιουργήθηκε συνεργείο: {contractor.name}")
    
    return contractors

def create_collaboration_projects(building, collaborators, users):
    """Δημιουργία έργων συνεργασίας"""
    projects_data = [
        {
            'title': 'Αναβάθμιση συστήματος ασφάλειας',
            'project_type': 'implementation',
            'status': 'active',
            'budget': Decimal('15000.00')
        },
        {
            'title': 'Συμβουλευτική διαχείρισης',
            'project_type': 'consulting',
            'status': 'active',
            'budget': Decimal('5000.00')
        },
        {
            'title': 'Νομική υποστήριξη',
            'project_type': 'consulting',
            'status': 'planning',
            'budget': Decimal('3000.00')
        }
    ]
    
    for i, project_data in enumerate(projects_data):
        project = CollaborationProject.objects.create(
            **project_data,
            building=building,
            collaborator=collaborators[i % len(collaborators)],
            start_date=datetime.now().date(),
            end_date=datetime.now().date() + timedelta(days=90),
            project_manager=random.choice(users)
        )
        print(f"✅ Δημιουργήθηκε έργο: {project.title}")

def create_collaboration_contracts(building, collaborators):
    """Δημιουργία συμβολαίων συνεργασίας"""
    contracts_data = [
        {
            'contract_number': 'CON-2024-001',
            'title': 'Συμβόλαιο Τεχνικής Υποστήριξης',
            'contract_type': 'service',
            'total_value': Decimal('12000.00'),
            'payment_terms': 'Πληρωμή σε 3 δόσεις'
        },
        {
            'contract_number': 'CON-2024-002',
            'title': 'Συμβόλαιο Συμβουλευτικής',
            'contract_type': 'consulting',
            'total_value': Decimal('8000.00'),
            'payment_terms': 'Πληρωμή μηνιαία'
        }
    ]
    
    for i, contract_data in enumerate(contracts_data):
        contract = CollaborationContract.objects.create(
            **contract_data,
            collaborator=collaborators[i % len(collaborators)],
            building=building,
            start_date=datetime.now().date(),
            end_date=datetime.now().date() + timedelta(days=365),
            status='active',
            scope_of_work='Παροχή υπηρεσιών σύμφωνα με τις προδιαγραφές',
            deliverables='Τεχνικές αναφορές και προτάσεις',
            terms_conditions='Γενικοί όροι συνεργασίας'
        )
        print(f"✅ Δημιουργήθηκε συμβόλαιο: {contract.contract_number}")

def main():
    """Κύρια συνάρτηση"""
    print("🚀 Ξεκινά η δημιουργία demo data για teams και collaborators...")
    
    # Εύρεση building και users
    try:
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε building. Δημιουργήστε πρώτα ένα building.")
            return
        
        users = list(User.objects.filter(is_active=True)[:10])
        if not users:
            print("❌ Δεν βρέθηκαν ενεργοί χρήστες. Δημιουργήστε πρώτα χρήστες.")
            return
        
        print(f"📋 Χρησιμοποιείται building: {building.name}")
        print(f"👥 Βρέθηκαν {len(users)} χρήστες")
        
        # Δημιουργία demo data
        roles = create_team_roles()
        teams = create_teams(building, users)
        create_team_members(teams, users, roles)
        create_team_tasks(teams, users)
        
        collaborators = create_collaborators()
        contractors = create_contractors()
        create_collaboration_projects(building, collaborators, users)
        create_collaboration_contracts(building, collaborators)
        
        print("\n✅ Η δημιουργία demo data ολοκληρώθηκε επιτυχώς!")
        print("📊 Στατιστικά:")
        print(f"   - Ομάδες: {Team.objects.count()}")
        print(f"   - Μέλη ομάδων: {TeamMember.objects.count()}")
        print(f"   - Εργασίες: {TeamTask.objects.count()}")
        print(f"   - Συνεργάτες: {Collaborator.objects.count()}")
        print(f"   - Συνεργεία: {Contractor.objects.count()}")
        print(f"   - Έργα συνεργασίας: {CollaborationProject.objects.count()}")
        print(f"   - Συμβόλαια: {CollaborationContract.objects.count()}")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main() 
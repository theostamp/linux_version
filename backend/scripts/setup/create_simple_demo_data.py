#!/usr/bin/env python3
"""
Script για τη δημιουργία απλών demo data για teams και collaborators
"""

import os
import sys
import django
from decimal import Decimal
import random

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from buildings.models import Building
from teams.models import Team, TeamRole
from collaborators.models import Collaborator
from maintenance.models import Contractor

User = get_user_model()

def create_simple_demo_data():
    """Δημιουργία απλών demo data"""
    print("🚀 Ξεκινά η δημιουργία απλών demo data...")
    
    # Δημιουργία building
    building, created = Building.objects.get_or_create(
        name='Demo Building',
        defaults={
            'address': 'Λεωφ. Συγγρού 123, Αθήνα',
            'total_apartments': 24,
            'year_built': 1990,
            'floors': 8,
            'current_reserve': 50000.00,
            'latitude': 37.9838,
            'longitude': 23.7275
        }
    )
    if created:
        print(f"✅ Δημιουργήθηκε building: {building.name}")
    
    # Δημιουργία χρηστών
    users_data = [
        {
            'email': 'admin@demo.com',
            'first_name': 'Διαχειριστής',
            'last_name': 'Συστήματος',
            'is_staff': True,
            'is_superuser': True
        },
        {
            'email': 'manager@demo.com',
            'first_name': 'Μάνατζερ',
            'last_name': 'Κτιρίου',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'user1@demo.com',
            'first_name': 'Χρήστης',
            'last_name': 'Ένας',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'user2@demo.com',
            'first_name': 'Χρήστης',
            'last_name': 'Δύο',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'user3@demo.com',
            'first_name': 'Χρήστης',
            'last_name': 'Τρεις',
            'is_staff': False,
            'is_superuser': False
        }
    ]
    
    users = []
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                **user_data,
                'is_active': True
            }
        )
        if created:
            user.set_password('demo123')
            user.save()
            print(f"✅ Δημιουργήθηκε χρήστης: {user.get_full_name()} ({user.email})")
        users.append(user)
    
    # Δημιουργία ρόλων ομάδων
    roles_data = [
        {'name': 'Ηγέτης Ομάδας', 'role_type': 'leader', 'description': 'Ηγέτης ομάδας με πλήρη ευθύνη'},
        {'name': 'Μέλος Ομάδας', 'role_type': 'member', 'description': 'Κανονικό μέλος ομάδας'},
        {'name': 'Ειδικός', 'role_type': 'specialist', 'description': 'Ειδικός σε συγκεκριμένο τομέα'},
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
    
    # Δημιουργία ομάδων
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
    
    # Δημιουργία συνεργατών
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
    
    # Δημιουργία συνεργείων
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
    
    print("\n✅ Η δημιουργία demo data ολοκληρώθηκε!")
    print("📊 Στατιστικά:")
    print(f"   - Buildings: {Building.objects.count()}")
    print(f"   - Users: {User.objects.count()}")
    print(f"   - Teams: {Team.objects.count()}")
    print(f"   - Team Roles: {TeamRole.objects.count()}")
    print(f"   - Collaborators: {Collaborator.objects.count()}")
    print(f"   - Contractors: {Contractor.objects.count()}")
    
    return building, users, teams, collaborators, contractors

if __name__ == '__main__':
    create_simple_demo_data() 
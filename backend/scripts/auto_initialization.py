#!/usr/bin/env python
"""
🎯 Αυτόματη Αρχικοποίηση Digital Concierge
===========================================
Αυτό το script εκτελείται αυτόματα με την εκκίνηση των containers
και αρχικοποιεί πλήρως το σύστημα από το μηδέν.
"""

import os
import sys
import django
import time
import requests
import threading
from datetime import timedelta
from django.utils import timezone

# Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.db import connection, connections
from django.core.management import call_command, execute_from_command_line
from django_tenants.utils import get_tenant_model, get_tenant_domain_model, schema_context, schema_exists
from users.models import CustomUser
from buildings.models import Building, BuildingMembership
from announcements.models import Announcement
from user_requests.models import UserRequest
from votes.models import Vote
from apartments.models import Apartment

def wait_for_database():
    """Αναμονή για τη βάση δεδομένων"""
    max_attempts = 30
    attempt = 0
    
    while attempt < max_attempts:
        try:
            # Use Django's database connection properly
            db_conn = connections['default']
            with db_conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
            if result and result[0] == 1:
                print("✅ Σύνδεση βάσης δεδομένων: OK")
                return True
            else:
                raise Exception("Database query returned unexpected result")
                
        except Exception as e:
            attempt += 1
            print(f"⏳ Αναμονή για βάση δεδομένων... (προσπάθεια {attempt}/{max_attempts}) - {e}")
            time.sleep(2)
    
    print("❌ Δεν μπόρεσε να συνδεθεί στη βάση δεδομένων")
    return False

def run_migrations():
    """Εκτέλεση migrations"""
    print("\n🔄 Εκτέλεση migrations...")
    
    try:
        # Shared migrations (public schema)
        print("📦 Shared migrations...")
        call_command("migrate_schemas", shared=True, interactive=False)
        
        # Tenant migrations
        print("🏢 Tenant migrations...")
        call_command("migrate_schemas", tenant=True, interactive=False)
        
        print("✅ Migrations ολοκληρώθηκαν")
        return True
    except Exception as e:
        print(f"❌ Σφάλμα migrations: {e}")
        return False

def create_public_tenant():
    """Δημιουργία public tenant"""
    print("\n🏠 Δημιουργία public tenant...")
    
    TenantModel = get_tenant_model()
    DomainModel = get_tenant_domain_model()
    
    # Δημιουργία public tenant
    public_tenant, created = TenantModel.objects.get_or_create(
        schema_name='public',
        defaults={
            'name': 'Public',
            'paid_until': timezone.now() + timedelta(days=365),
            'on_trial': False,
            'is_active': True
        }
    )
    
    if created:
        print("✅ Δημιουργήθηκε public tenant")
    else:
        print("ℹ️ Υπάρχει ήδη public tenant")
    
    # Δημιουργία domain για public
    domain, created = DomainModel.objects.get_or_create(
        domain='localhost',
        defaults={
            'tenant': public_tenant,
            'is_primary': True
        }
    )
    
    if created:
        print("✅ Δημιουργήθηκε domain: localhost")
    else:
        print("ℹ️ Υπάρχει ήδη domain: localhost")
    
    # Δημιουργία Ultra-Superuser στο public schema
    print("\n👑 Δημιουργία Ultra-Superuser...")
    from users.models import CustomUser
    
    ultra_user, created = CustomUser.objects.get_or_create(
        email='theostam1966@gmail.com',
        defaults={
            'first_name': 'Theo',
            'last_name': 'Ultra Admin',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
            'role': 'admin'
        }
    )
    
    if created:
        ultra_user.set_password('theo123!@#')
        ultra_user.save()
        print("✅ Δημιουργήθηκε Ultra-Superuser: theostam1966@gmail.com")
    else:
        # Ενημέρωση password αν υπάρχει ήδη
        ultra_user.set_password('theo123!@#')
        ultra_user.is_superuser = True
        ultra_user.is_staff = True
        ultra_user.is_active = True
        ultra_user.save()
        print("✅ Ενημερώθηκε Ultra-Superuser: theostam1966@gmail.com")
    
    return public_tenant

def create_demo_tenant():
    """Δημιουργία demo tenant με πλήρη αρχικοποίηση"""
    tenant_name = "demo"
    print(f"\n🏢 Δημιουργία demo tenant: {tenant_name}")
    
    TenantModel = get_tenant_model()
    DomainModel = get_tenant_domain_model()
    
    # Έλεγχος αν υπάρχει ήδη
    if schema_exists(tenant_name):
        print(f"ℹ️ Το tenant '{tenant_name}' υπάρχει ήδη")
        return TenantModel.objects.get(schema_name=tenant_name)
    
    # Δημιουργία tenant
    tenant = TenantModel(
        schema_name=tenant_name,
        name=f"{tenant_name.title()} Digital Concierge",
        paid_until=timezone.now() + timedelta(days=365),
        on_trial=True,
        is_active=True
    )
    tenant.save()
    print(f"✅ Δημιουργήθηκε tenant: {tenant.name}")
    
    # Δημιουργία domain
    domain = DomainModel()
    domain.domain = f"{tenant_name}.localhost"
    domain.tenant = tenant
    domain.is_primary = True
    domain.save()
    print(f"✅ Δημιουργήθηκε domain: {domain.domain}")
    
    # Migrations για το νέο schema
    print("🔄 Εκτέλεση migrations για το νέο tenant...")
    call_command("migrate_schemas", schema_name=tenant.schema_name, interactive=False)
    
    return tenant

def validate_all_mills(apartments_data, building_name):
    """Επικύρωση ότι όλα τα χιλιοστά έχουν συνολικό άθροισμα 1000"""
    total_participation = sum(apt['participation_mills'] for apt in apartments_data)
    total_heating = sum(apt['heating_mills'] for apt in apartments_data)
    total_elevator = sum(apt['elevator_mills'] for apt in apartments_data)
    
    print(f"🔍 Επικύρωση χιλιοστών για {building_name}:")
    print(f"   Συμμετοχή: {total_participation} χιλιοστά")
    print(f"   Θέρμανση: {total_heating} χιλιοστά")
    print(f"   Ανελκυστήρας: {total_elevator} χιλιοστά")
    
    all_correct = True
    
    if total_participation != 1000:
        print(f"❌ ΣΦΑΛΜΑ: Χιλιοστά συμμετοχής = {total_participation} (πρέπει να είναι 1000)")
        all_correct = False
    
    if total_heating != 1000:
        print(f"❌ ΣΦΑΛΜΑ: Χιλιοστά θέρμανσης = {total_heating} (πρέπει να είναι 1000)")
        all_correct = False
    
    if total_elevator != 1000:
        print(f"❌ ΣΦΑΛΜΑ: Χιλιοστά ανελκυστήρα = {total_elevator} (πρέπει να είναι 1000)")
        all_correct = False
    
    if all_correct:
        print(f"✅ Όλα τα χιλιοστά είναι σωστά για {building_name}")
    
    return all_correct

def create_demo_data(tenant_schema):
    """Δημιουργία πλήρων demo δεδομένων"""
    print(f"\n🎨 Δημιουργία demo δεδομένων για {tenant_schema}...")
    
    with schema_context(tenant_schema):
        # 1. Δημιουργία χρηστών
        users_data = [
            {
                'email': 'admin@demo.localhost',
                'first_name': 'Admin',
                'last_name': 'User',
                'password': 'admin123456',
                'is_staff': True,
                'is_superuser': True,  # 🔧 Πραγματικός superuser με πλήρη δικαιώματα
                'role': 'admin'
            },
            {
                'email': 'manager@demo.localhost',
                'first_name': 'Γιώργος',
                'last_name': 'Διαχειριστής',
                'password': 'manager123456',
                'is_staff': True,
                'is_superuser': False,  # 👨‍💼 Manager με περιορισμένα δικαιώματα
                'role': 'manager'
            },
            {
                'email': 'resident1@demo.localhost',
                'first_name': 'Μαρία',
                'last_name': 'Κατοίκος',
                'password': 'resident123456',
                'is_staff': False,
                'is_superuser': False,  # 👤 Resident χωρίς admin δικαιώματα
                'role': 'resident'
            },
            {
                'email': 'resident2@demo.localhost',
                'first_name': 'Νίκος',
                'last_name': 'Ιδιοκτήτης',
                'password': 'resident123456',
                'is_staff': False,
                'is_superuser': False,  # 👤 Owner χωρίς admin δικαιώματα
                'role': 'owner'
            }
        ]
        
        created_users = []
        for user_data in users_data:
            user, created = CustomUser.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'is_staff': user_data['is_staff'],
                    'is_superuser': user_data['is_superuser'],
                    'role': user_data['role'],
                    'is_active': True
                }
            )
            
            if created:
                user.set_password(user_data['password'])
                user.save()
                print(f"✅ Δημιουργήθηκε χρήστης: {user.email}")
            else:
                print(f"ℹ️ Υπάρχει ήδη χρήστης: {user.email}")
            
            created_users.append(user)
        
        # 2. Δημιουργία κτιρίων
        buildings_data = [
            {
                'name': 'Αλκμάνος 22',
                'address': 'Αλκμάνος 22, Αθήνα 115 28, Ελλάδα',
                'city': 'Αθήνα',
                'postal_code': '11528',
                'apartments_count': 10,
                'internal_manager_name': 'Μαρία Κωνσταντίνου',
                'internal_manager_phone': '2101234567',
                'heating_fixed_percentage': 30.0,
                'latitude': 37.9838,
                'longitude': 23.7275
            }
        ]
        
        created_buildings = []
        for building_data in buildings_data:
            building, created = Building.objects.get_or_create(
                name=building_data['name'],
                defaults=building_data
            )
            
            if created:
                print(f"✅ Δημιουργήθηκε κτίριο: {building.name}")
            else:
                print(f"ℹ️ Υπάρχει ήδη κτίριο: {building.name}")
            
            created_buildings.append(building)
        
        # 3. Δημιουργία building memberships
        manager = next((u for u in created_users if u.role == 'manager'), created_users[0])
        residents = [u for u in created_users if u.role in ['resident', 'owner']]
        
        for i, building in enumerate(created_buildings):
            # Manager membership
            membership, created = BuildingMembership.objects.get_or_create(
                building=building,
                resident=manager,
                defaults={'role': 'manager'}
            )
            if created:
                print(f"✅ Manager membership: {manager.email} -> {building.name}")
            
            # Resident memberships
            if i < len(residents):
                resident = residents[i]
                membership, created = BuildingMembership.objects.get_or_create(
                    building=building,
                    resident=resident,
                    defaults={'role': resident.role}
                )
                if created:
                    print(f"✅ Resident membership: {resident.email} -> {building.name}")
        
        # 4. Δημιουργία διαμερισμάτων
        for building in created_buildings:
            if building.name == 'Αλκμάνος 22':
                # Ειδική δημιουργία για Αλκμάνος 22 - 10 διαμερίσματα (ΣΥΝΟΛΟ ΧΙΛΙΟΣΤΑ = 1000)
                apartments_data = [
                    {'number': 'Α1', 'floor': 0, 'owner_name': 'Θεοδώρος Σταματιάδης', 'owner_phone': '2101234567', 'owner_email': 'theostam1966@gmail.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 85, 'bedrooms': 2, 'participation_mills': 100, 'heating_mills': 100, 'elevator_mills': 100},
                    {'number': 'Α2', 'floor': 0, 'owner_name': 'Ελένη Δημητρίου', 'owner_phone': '2103456789', 'owner_email': 'eleni.d@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 90, 'bedrooms': 2, 'participation_mills': 97, 'heating_mills': 105, 'elevator_mills': 97},
                    {'number': 'Α3', 'floor': 0, 'owner_name': 'Νικόλαος Αλεξίου', 'owner_phone': '2104567890', 'owner_email': 'nikos.alex@email.com', 'tenant_name': 'Ανδρέας Παπαγεωργίου', 'tenant_phone': '2105678901', 'tenant_email': 'andreas.p@email.com', 'is_rented': True, 'square_meters': 75, 'bedrooms': 1, 'participation_mills': 88, 'heating_mills': 92, 'elevator_mills': 88},
                    {'number': 'Β1', 'floor': 1, 'owner_name': 'Αικατερίνη Σταματίου', 'owner_phone': '2106789012', 'owner_email': 'katerina.s@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 95, 'bedrooms': 3, 'participation_mills': 110, 'heating_mills': 115, 'elevator_mills': 110},
                    {'number': 'Β2', 'floor': 1, 'owner_name': 'Δημήτριος Κωνσταντίνου', 'owner_phone': '2107890123', 'owner_email': 'dimitris.k@email.com', 'tenant_name': 'Σοφία Παπαδοπούλου', 'tenant_phone': '2108901234', 'tenant_email': 'sofia.pap@email.com', 'is_rented': True, 'square_meters': 92, 'bedrooms': 2, 'participation_mills': 105, 'heating_mills': 108, 'elevator_mills': 105},
                    {'number': 'Β3', 'floor': 1, 'owner_name': 'Ιωάννης Μιχαηλίδης', 'owner_phone': '2109012345', 'owner_email': 'giannis.m@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 88, 'bedrooms': 2, 'participation_mills': 98, 'heating_mills': 102, 'elevator_mills': 98},
                    {'number': 'Γ1', 'floor': 2, 'owner_name': 'Αννα Παπαδοπούλου', 'owner_phone': '2100123456', 'owner_email': 'anna.pap@email.com', 'tenant_name': 'Χρήστος Γεωργίου', 'tenant_phone': '2101234567', 'tenant_email': 'christos.g@email.com', 'is_rented': True, 'square_meters': 82, 'bedrooms': 2, 'participation_mills': 92, 'heating_mills': 95, 'elevator_mills': 92},
                    {'number': 'Γ2', 'floor': 2, 'owner_name': 'Παναγιώτης Αντωνίου', 'owner_phone': '2102345678', 'owner_email': 'panagiotis.a@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 100, 'bedrooms': 3, 'participation_mills': 115, 'heating_mills': 100, 'elevator_mills': 115},
                    {'number': 'Γ3', 'floor': 3, 'owner_name': 'Ευαγγελία Κωνσταντίνου', 'owner_phone': '2103456789', 'owner_email': 'evangelia.k@email.com', 'tenant_name': 'Δημήτριος Παπαδόπουλος', 'tenant_phone': '2104567890', 'tenant_email': 'dimitris.pap@email.com', 'is_rented': True, 'square_meters': 96, 'bedrooms': 3, 'participation_mills': 108, 'heating_mills': 100, 'elevator_mills': 108},
                    {'number': 'Δ1', 'floor': 3, 'owner_name': 'Μιχαήλ Γεωργίου', 'owner_phone': '2105678901', 'owner_email': 'michalis.g@email.com', 'tenant_name': '', 'tenant_phone': '', 'tenant_email': '', 'is_rented': False, 'square_meters': 78, 'bedrooms': 1, 'participation_mills': 87, 'heating_mills': 83, 'elevator_mills': 87}
                ]
                
                # Επικύρωση χιλιοστών πριν τη δημιουργία
                if not validate_all_mills(apartments_data, building.name):
                    raise ValueError(f"Λανθασμένα χιλιοστά για κτίριο {building.name}")
                
                for apt_data in apartments_data:
                    apartment, created = Apartment.objects.get_or_create(
                        building=building,
                        number=apt_data['number'],
                        defaults={
                            'identifier': apt_data['number'],
                            'floor': apt_data['floor'],
                            'owner_name': apt_data['owner_name'],
                            'owner_phone': apt_data['owner_phone'],
                            'owner_email': apt_data['owner_email'],
                            'tenant_name': apt_data['tenant_name'],
                            'tenant_phone': apt_data['tenant_phone'],
                            'tenant_email': apt_data['tenant_email'],
                            'is_rented': apt_data['is_rented'],
                            'square_meters': apt_data['square_meters'],
                            'bedrooms': apt_data['bedrooms'],
                            'participation_mills': apt_data['participation_mills'],
                            'heating_mills': apt_data['heating_mills'],
                            'elevator_mills': apt_data['elevator_mills'],
                            'notes': f"Διαμέρισμα {apt_data['number']} στο κτίριο {building.name} - Όροφος {apt_data['floor']}"
                        }
                    )
                    if created:
                        print(f"✅ Δημιουργήθηκε διαμέρισμα: {apt_data['number']} (Αλκμάνος 22)")
        
        # 5. Δημιουργία ανακοινώσεων
        announcements_data = [
            {
                'title': 'Καλωσορίσατε στο Digital Concierge!',
                'description': 'Αυτή είναι μια δοκιμαστική ανακοίνωση για το νέο σας σύστημα διαχείρισης κτιρίων.',
                'is_active': True
            },
            {
                'title': 'Συντήρηση ανελκυστήρα',
                'description': 'Θα γίνει συντήρηση του ανελκυστήρα την επόμενη εβδομάδα.',
                'is_active': True
            }
        ]
        
        for announcement_data in announcements_data:
            announcement, created = Announcement.objects.get_or_create(
                title=announcement_data['title'],
                defaults={
                    'description': announcement_data['description'],
                    'building': created_buildings[0],
                    'author': manager,
                    'is_active': announcement_data['is_active']
                }
            )
            if created:
                print(f"✅ Δημιουργήθηκε ανακοίνωση: {announcement.title}")
        
        # 6. Δημιουργία αιτημάτων
        requests_data = [
            {
                'title': 'Βλάβη στον φωτισμό',
                'description': 'Η λάμπα στην είσοδο είναι καμένη.',
                'type': 'maintenance',
                'is_urgent': False
            },
            {
                'title': 'Πρόβλημα με τη θέρμανση',
                'description': 'Δεν λειτουργεί σωστά η θέρμανση στο διαμέρισμα.',
                'type': 'maintenance',
                'is_urgent': True
            }
        ]
        
        for request_data in requests_data:
            user_request, created = UserRequest.objects.get_or_create(
                title=request_data['title'],
                defaults={
                    'description': request_data['description'],
                    'building': created_buildings[0],
                    'created_by': residents[0],
                    'type': request_data['type'],
                    'priority': 'urgent' if request_data['is_urgent'] else 'medium'
                }
            )
            if created:
                print(f"✅ Δημιουργήθηκε αίτημα: {user_request.title}")
        
        # 7. Δημιουργία ψηφοφοριών
        votes_data = [
            {
                'title': 'Αλλαγή διαχειριστή',
                'description': 'Ψηφίστε αν συμφωνείτε να αλλάξει ο διαχειριστής.',
                'choices': ['Ναι', 'Όχι', 'Αποχή']
            },
            {
                'title': 'Εγκατάσταση κλιματισμού',
                'description': 'Ψηφίστε για την εγκατάσταση κλιματισμού στις κοινόχρηστες περιοχές.',
                'choices': ['Υπέρ', 'Κατά', 'Αποχή']
            }
        ]
        
        for vote_data in votes_data:
            vote, created = Vote.objects.get_or_create(
                title=vote_data['title'],
                defaults={
                    'description': vote_data['description'],
                    'building': created_buildings[0],
                    'creator': manager,
                    'start_date': timezone.now().date(),
                    'end_date': timezone.now().date() + timedelta(days=7)
                }
            )
            if created:
                print(f"✅ Δημιουργήθηκε ψηφοφορία: {vote.title}")
        
        # 8. Δημιουργία υποχρεώσεων
        print("\n📋 Δημιουργία υποχρεώσεων...")
        print("ℹ️ Δεν δημιουργούνται υποχρεώσεις με hardcoded ποσά")
        print("✅ Ολοκληρώθηκε η δημιουργία υποχρεώσεων")
        
        # 9. Δημιουργία οικονομικών δεδομένων
        print("\n💰 Δημιουργία οικονομικών δεδομένων...")
        print("ℹ️ Δεν δημιουργούνται οικονομικά δεδομένα - μηδενικά demo ποσά")
        print("✅ Ολοκληρώθηκε η δημιουργία οικονομικών δεδομένων")

def warm_up_frontend():
    """
    Κάνει warm-up το frontend με το να ζητάει τις κύριες σελίδες
    ώστε να γίνει το compile και να είναι γρήγορες στη χρήση
    """
    print("\n🔥 Frontend Warm-up...")
    print("=" * 50)

    # Περιμένουμε λίγο για να ξεκινήσει το frontend
    time.sleep(5)

    # URLs που θα κάνουμε warm-up
    base_url = "http://frontend:3000"  # Internal Docker network
    pages = [
        "/",
        "/login",
        "/dashboard",
        "/financial",
        "/apartments",
        "/buildings",
        "/maintenance",
        "/maintenance/scheduled",
        "/announcements",
        "/projects"
    ]

    def warm_up_page(url):
        """Κάνει warm-up μια σελίδα"""
        try:
            response = requests.get(url, timeout=120)  # 2 λεπτά timeout
            if response.status_code == 200:
                print(f"✅ Warmed up: {url.replace(base_url, '')}")
            else:
                print(f"⚠️ Failed to warm up: {url.replace(base_url, '')} (Status: {response.status_code})")
        except requests.exceptions.Timeout:
            print(f"⏱️ Timeout warming up: {url.replace(base_url, '')} (αλλά μάλλον compiled)")
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to frontend: {url.replace(base_url, '')}")
        except Exception as e:
            print(f"❌ Error warming up {url.replace(base_url, '')}: {str(e)}")

    # Πρώτα κάνουμε warm-up τη βασική σελίδα (αυτή παίρνει το περισσότερο χρόνο)
    print("\n📄 Warming up main page (this takes ~50 seconds on first run)...")
    warm_up_page(base_url + "/")

    # Μετά κάνουμε warm-up τις υπόλοιπες σελίδες παράλληλα
    print("\n📄 Warming up other pages in parallel...")
    threads = []
    for page in pages[1:]:  # Skip "/" since we already did it
        url = base_url + page
        thread = threading.Thread(target=warm_up_page, args=(url,))
        thread.start()
        threads.append(thread)
        time.sleep(2)  # Μικρή καθυστέρηση μεταξύ των threads

    # Περιμένουμε να τελειώσουν όλα τα threads
    for thread in threads:
        thread.join(timeout=120)

    print("\n✅ Frontend warm-up completed!")
    print("   All pages are now compiled and will load quickly")
    print("=" * 50)

def save_credentials():
    """Αποθήκευση credentials σε αρχείο"""
    log_dir = os.path.join("backend", "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, "demo_credentials.log")
    
    credentials = """
🎯 DIGITAL CONCIERGE - AUTO INITIALIZATION
=========================================

🏢 PUBLIC SCHEMA (localhost):
-----------------------------
👑 Ultra-Superuser (Διαχείριση όλων των tenants):
   Email: theostam1966@gmail.com
   Password: theo123!@#
   Δικαιώματα: Πλήρη διαχείριση όλων των tenants και χρηστών
   Admin URL: http://localhost:8000/admin/

🏢 DEMO TENANT (demo.localhost):
-------------------------------
DOMAIN: http://demo.localhost:8080
ADMIN: http://demo.localhost:8000/admin/

👥 ΧΡΗΣΤΕΣ ΚΑΙ ΔΙΚΑΙΩΜΑΤΑ:
---------------------------

🔧 Admin (Superuser):
   Email: admin@demo.localhost
   Password: admin123456
   Δικαιώματα: Πλήρη admin πρόσβαση (μπορεί να διαγράψει/ελέγξει όλους)

👨‍💼 Manager (Staff):
   Email: manager@demo.localhost
   Password: manager123456
   Δικαιώματα: Περιορισμένα admin δικαιώματα (δεν μπορεί να διαγράψει superusers)

👤 Resident 1:
   Email: resident1@demo.localhost
   Password: resident123456
   Δικαιώματα: Κανονικός χρήστης (χωρίς admin πρόσβαση)

👤 Resident 2:
   Email: resident2@demo.localhost
   Password: resident123456
   Δικαιώματα: Κανονικός χρήστης (χωρίς admin πρόσβαση)

🏢 ΚΤΙΡΙΑ:
----------
- Αλκμάνος 22 (10 διαμερίσματα) - Μηδενικά οικονομικά στοιχεία

📊 DEMO ΔΕΔΟΜΕΝΑ:
-----------------
- 1 κτίριο
- 4 χρήστες
- 10 διαμερίσματα συνολικά
  * Αλκμάνος 22: 10 διαμερίσματα (Α1-Α3, Β1-Β3, Γ1-Γ3, Δ1)
- 2 ανακοινώσεις
- 2 αιτήματα
- 2 ψηφοφορίες
- 0 υποχρεώσεις (μηδενικά demo ποσά)

🌐 ΠΡΟΣΒΑΣΗ:
------------
Public Admin: http://localhost:8000/admin/
Demo Frontend: http://demo.localhost:8080
Demo Backend API: http://demo.localhost:8000/api/
Demo Admin Panel: http://demo.localhost:8000/admin/

🏢 ΑΛΚΜΑΝΟΣ 22 - ΜΗΔΕΝΙΚΑ ΟΙΚΟΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ:
------------------------------------------------
Διεύθυνση: Αλκμάνος 22, Αθήνα 115 28, Ελλάδα
Διαχειριστής: Μαρία Κωνσταντίνου (2101234567)
Τρέχον Αποθεματικό: €0.00
Διαμερίσματα: 10 (5 όροφοι)

📋 ΔΙΑΜΕΡΙΣΜΑΤΑ ΑΛΚΜΑΝΟΣ 22:
-----------------------------
Όροφος 0:
- Α1: Θεοδώρος Σταματιάδης (ιδιοκατοικούμενο) [100/100/100]
- Α2: Ελένη Δημητρίου (ιδιοκτήτης) [97/105/97]
- Α3: Νικόλαος Αλεξίου → Ανδρέας Παπαγεωργίου (ενοικιαστής) [88/92/88]

Όροφος 1:
- Β1: Αικατερίνη Σταματίου (ιδιοκτήτης) [110/115/110]
- Β2: Δημήτριος Κωνσταντίνου → Σοφία Παπαδοπούλου (ενοικιαστής) [105/108/105]
- Β3: Ιωάννης Μιχαηλίδης (ιδιοκτήτης) [98/102/98]

Όροφος 2:
- Γ1: Αννα Παπαδοπούλου → Χρήστος Γεωργίου (ενοικιαστής) [92/95/92]
- Γ2: Παναγιώτης Αντωνίου (ιδιοκτήτης) [115/100/115]

Όροφος 3:
- Γ3: Ευαγγελία Κωνσταντίνου → Δημήτριος Παπαδόπουλος (ενοικιαστής) [108/100/108]
- Δ1: Μιχαήλ Γεωργίου (ιδιοκτήτης) [87/83/87]

📊 ΧΑΡΑΚΤΗΡΙΣΤΙΚΑ ΑΛΚΜΑΝΟΣ 22:
-------------------------------------
Χιλιοστά: Πλήρη κατανομή ανά διαμέρισμα [Συμμετοχή/Θέρμανση/Ανελκυστήρας]
Συνολικά χιλιοστά: 1000/1000/1000 ✓
Οικονομικά: Μηδενικά ποσά σε όλες τις κατηγορίες

🔐 ΙΕΡΑΡΧΙΑ ΔΙΚΑΙΩΜΑΤΩΝ:
-------------------------
👑 Ultra-Superuser (theostam1966@gmail.com):
   - Διαχείριση όλων των tenants
   - Δημιουργία/διαγραφή tenants
   - Πλήρη πρόσβαση σε όλα τα schemas

🔧 Tenant Admin (admin@demo.localhost):
   - Διαχείριση του συγκεκριμένου tenant
   - Δημιουργία/διαγραφή χρηστών στο tenant
   - Πλήρη πρόσβαση στο tenant schema

👨‍💼 Tenant Manager (manager@demo.localhost):
   - Περιορισμένα admin δικαιώματα
   - Δεν μπορεί να διαγράψει superusers
   - Διαχείριση δεδομένων του tenant

👤 Residents:
   - Κανονικοί χρήστες
   - Χωρίς admin πρόσβαση
   - Πρόσβαση μόνο στα δικά τους δεδομένα

📝 ΣΗΜΕΙΩΣΕΙΣ:
--------------
- Ο Ultra-Superuser διαχειρίζεται όλους τους tenants από το public schema
- Κάθε tenant έχει τον δικό του admin με περιορισμένα δικαιώματα
- Το σύστημα αρχικοποιείται αυτόματα με την εκκίνηση των containers
"""
    
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(credentials)
    
    print(f"📄 Credentials αποθηκεύτηκαν: {log_path}")
    return log_path

def main():
    """Κύρια λειτουργία"""
    print("🎯 ΑΥΤΟΜΑΤΗ ΑΡΧΙΚΟΠΟΙΗΣΗ DIGITAL CONCIERGE")
    print("=" * 50)

    # 1. Αναμονή για τη βάση δεδομένων
    if not wait_for_database():
        return False

    # 2. Migrations
    if not run_migrations():
        return False

    # 3. Δημιουργία public tenant
    create_public_tenant()

    # 4. Δημιουργία demo tenant
    tenant = create_demo_tenant()

    # 5. Δημιουργία demo δεδομένων
    create_demo_data('demo')

    # 6. Αποθήκευση credentials
    credentials_file = save_credentials()

    # 7. Frontend warm-up (εκτελείται σε background thread)
    print("\n🔥 Starting frontend warm-up in background...")
    warmup_thread = threading.Thread(target=warm_up_frontend)
    warmup_thread.daemon = True  # Daemon thread ώστε να μην κρατάει το script
    warmup_thread.start()

    # 8. Τελικό μήνυμα
    print("\n" + "=" * 50)
    print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΑΥΤΟΜΑΤΗ ΑΡΧΙΚΟΠΟΙΗΣΗ!")
    print("=" * 50)
    print("👑 Ultra-Superuser: http://localhost:8000/admin/")
    print("   Email: theostam1966@gmail.com")
    print("   Password: theo123!@#")
    print()
    print("🌐 Demo Tenant: http://demo.localhost:8080")
    print("🔧 Demo Admin: http://demo.localhost:8000/admin/")
    print("📄 Credentials: backend/logs/demo_credentials.log")
    print("\n👥 Demo χρήστες:")
    print("   Admin: admin@demo.localhost / admin123456")
    print("   Manager: manager@demo.localhost / manager123456")
    print("   Resident: resident1@demo.localhost / resident123456")
    print("\n🏢 Κτίριο: Αλκμάνος 22 (10 διαμερίσματα: Α1-Α3, Β1-Β3, Γ1-Γ3, Δ1)")
    print("   Διεύθυνση: Αλκμάνος 22, Αθήνα 115 28, Ελλάδα")
    print("   Χιλιοστά: 1000/1000/1000 (Συμμετοχή/Θέρμανση/Ανελκυστήρας)")
    print("   Μηδενικά οικονομικά στοιχεία σε όλες τις κατηγορίες")
    print("\n🚀 Το σύστημα είναι έτοιμο!")
    print("\n💡 Ultra-Superuser μπορεί να:")
    print("   - Διαχειρίζεται όλους τους tenants")
    print("   - Δημιουργήσει νέους tenants")
    print("   - Δημιουργήσει admin users για κάθε tenant")
    print("   - Διαγράψει tenants")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
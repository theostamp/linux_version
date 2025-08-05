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
from datetime import timedelta
from django.utils import timezone

# Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.db import connection
from django.core.management import call_command
from django_tenants.utils import get_tenant_model, get_tenant_domain_model, schema_context, schema_exists
from users.models import CustomUser
from buildings.models import Building, BuildingMembership
from announcements.models import Announcement
from user_requests.models import UserRequest
from votes.models import Vote
from obligations.models import Obligation
from apartments.models import Apartment

def wait_for_database():
    """Αναμονή για τη βάση δεδομένων"""
    max_attempts = 30
    attempt = 0
    
    while attempt < max_attempts:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            print("✅ Σύνδεση βάσης δεδομένων: OK")
            return True
        except Exception as e:
            attempt += 1
            print(f"⏳ Αναμονή για βάση δεδομένων... (προσπάθεια {attempt}/{max_attempts})")
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
                'name': 'Αθηνών 12',
                'address': 'Αθηνών 12',
                'city': 'Αθήνα',
                'postal_code': '10431',
                'apartments_count': 24,
                'internal_manager_name': 'Γιώργος Παπαδόπουλος',
                'internal_manager_phone': '2101234567'
            },
            {
                'name': 'Πατησίων 45',
                'address': 'Πατησίων 45',
                'city': 'Αθήνα',
                'postal_code': '10432',
                'apartments_count': 16,
                'internal_manager_name': 'Μαρία Κωνσταντίνου',
                'internal_manager_phone': '2102345678'
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
            for floor in range(1, 3):  # 2 όροφοι
                for apartment_num in range(1, 4):  # 3 διαμερίσματα ανά όροφο
                    apartment_number = f"{floor}{apartment_num:02d}"
                    apartment, created = Apartment.objects.get_or_create(
                        building=building,
                        number=apartment_number,
                        defaults={
                            'identifier': f"{building.name}-{apartment_number}",
                            'floor': floor,
                            'owner_name': f"Ιδιοκτήτης {apartment_number}",
                            'owner_phone': f"210{apartment_number}000",
                            'owner_email': f"owner{apartment_number}@demo.localhost",
                            'tenant_name': f"Ενοικιαστής {apartment_number}",
                            'tenant_phone': f"210{apartment_number}001",
                            'tenant_email': f"tenant{apartment_number}@demo.localhost",
                            'is_rented': apartment_num % 2 == 0,  # Ζυγά διαμερίσματα ενοικιάζονται
                            'square_meters': 80 + (apartment_num * 5),
                            'bedrooms': 2 + (apartment_num % 3),
                            'notes': f"Διαμέρισμα {apartment_number} στο κτίριο {building.name}"
                        }
                    )
                    if created:
                        print(f"✅ Δημιουργήθηκε διαμέρισμα: {apartment_number}")
        
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
        obligations_data = [
            {
                'title': 'Ανταλλακτικά θυροτηλεφώνου',
                'description': 'Αγορά ανταλλακτικών για τον θυροτηλέφωνο',
                'amount': 150.0
            },
            {
                'title': 'Καθαρισμός κοινοχρήστων',
                'description': 'Μηνιαίος καθαρισμός κοινοχρήστων χώρων',
                'amount': 300.0
            }
        ]
        
        for obligation_data in obligations_data:
            obligation, created = Obligation.objects.get_or_create(
                title=obligation_data['title'],
                defaults={
                    'building': created_buildings[0],
                    'amount': obligation_data['amount'],
                    'due_date': timezone.now() + timedelta(days=30)
                }
            )
            if created:
                print(f"✅ Δημιουργήθηκε υποχρέωση: {obligation.title}")
        
        # 9. Δημιουργία οικονομικών δεδομένων
        print("\n💰 Δημιουργία οικονομικών δεδομένων...")
        try:
            from financial.models import Expense, Transaction, Payment
            from datetime import datetime
            from decimal import Decimal
            import random
            
            # Δημιουργία εικονικών δαπανών
            expenses_data = [
                {
                    'title': 'Καθαρισμός Κοινοχρήστων - Ιανουάριος 2024',
                    'amount': 450.00,
                    'category': 'cleaning',
                    'distribution_type': 'by_participation_mills',
                    'date': datetime(2024, 1, 15).date(),
                },
                {
                    'title': 'ΔΕΗ Κοινοχρήστων - Ιανουάριος 2024',
                    'amount': 320.00,
                    'category': 'electricity_common',
                    'distribution_type': 'by_participation_mills',
                    'date': datetime(2024, 1, 20).date(),
                },
                {
                    'title': 'Συντήρηση Ανελκυστήρα - Ιανουάριος 2024',
                    'amount': 280.00,
                    'category': 'elevator_maintenance',
                    'distribution_type': 'by_participation_mills',
                    'date': datetime(2024, 1, 25).date(),
                }
            ]
            
            for expense_data in expenses_data:
                for building in created_buildings:
                    expense, created = Expense.objects.get_or_create(
                        building=building,
                        title=expense_data['title'],
                        defaults={
                            'amount': expense_data['amount'],
                            'category': expense_data['category'],
                            'distribution_type': expense_data['distribution_type'],
                            'date': expense_data['date'],
                            'is_issued': True
                        }
                    )
                    if created:
                        print(f"✅ Δημιουργήθηκε δαπάνη: {expense.title}")
            
            # Δημιουργία εικονικών εισπράξεων
            payment_methods = ['bank_transfer', 'cash']
            payment_dates = [
                datetime(2024, 1, 5).date(),
                datetime(2024, 1, 15).date(),
                datetime(2024, 2, 5).date(),
            ]
            
            for apartment in Apartment.objects.filter(building__in=created_buildings):
                # Δημιουργούμε 1-2 εισπράξεις ανά διαμέρισμα
                num_payments = random.randint(1, 2)
                for i in range(num_payments):
                    payment_date = random.choice(payment_dates)
                    payment_amount = Decimal(random.randint(50, 150))
                    payment_method = random.choice(payment_methods)
                    
                    payment, created = Payment.objects.get_or_create(
                        apartment=apartment,
                        amount=payment_amount,
                        date=payment_date,
                        method=payment_method,
                        defaults={
                            'notes': f'Είσπραξη κοινοχρήστων - {payment_date.strftime("%B %Y")}'
                        }
                    )
                    if created:
                        print(f"✅ Δημιουργήθηκε είσπραξη: {apartment.number} - {payment_amount}€")
            
            print("✅ Ολοκληρώθηκε η δημιουργία οικονομικών δεδομένων")
            
        except Exception as e:
            print(f"⚠️ Προειδοποίηση: Δεν ήταν δυνατή η δημιουργία οικονομικών δεδομένων: {e}")

def save_credentials():
    """Αποθήκευση credentials σε αρχείο"""
    log_dir = os.path.join("backend", "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, "demo_credentials.log")
    
    credentials = f"""
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
- Αθηνών 12 (24 διαμερίσματα)
- Πατησίων 45 (16 διαμερίσματα)

📊 DEMO ΔΕΔΟΜΕΝΑ:
-----------------
- 2 κτίρια
- 4 χρήστες
- 12 διαμερίσματα (2 κτίρια × 2 όροφοι × 3 διαμερίσματα)
- 2 ανακοινώσεις
- 2 αιτήματα
- 2 ψηφοφορίες
- 2 υποχρεώσεις
- 6 δαπάνες κτιρίου (καθαρισμός, ΔΕΗ, συντήρηση ανελκυστήρα)
        - 12-24 εισπράξεις ιδιοκτητών (μετρητά, τραπεζική μεταφορά)

🌐 ΠΡΟΣΒΑΣΗ:
------------
Public Admin: http://localhost:8000/admin/
Demo Frontend: http://demo.localhost:8080
Demo Backend API: http://demo.localhost:8000/api/
Demo Admin Panel: http://demo.localhost:8000/admin/

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
    
    # 7. Τελικό μήνυμα
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
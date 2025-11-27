"""
Management command για να βρούμε και να αλλάξουμε το email ενός ενοίκου
από theostam1966@gmail.com σε thodoris_st@hotmail.com

ΠΡΟΣΟΧΗ: Δεν θα αλλάξουμε τον ultra admin που είναι στο public schema
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Client
from users.models import CustomUser

# Protected admin email - δεν θα το αλλάξουμε ποτέ
PROTECTED_ADMIN_EMAIL = 'theostam1966@gmail.com'
NEW_TENANT_EMAIL = 'thodoris_st@hotmail.com'


class Command(BaseCommand):
    help = 'Βρίσκει και αλλάζει email ενοίκου από theostam1966@gmail.com σε thodoris_st@hotmail.com'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση μόνο (χωρίς αλλαγή)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Να γίνει αλλαγή χωρίς επιβεβαίωση',
        )

    def find_user_in_schema(self, schema_name, email):
        """Βρίσκει user με συγκεκριμένο email σε ένα schema"""
        try:
            with schema_context(schema_name):
                user = CustomUser.objects.filter(email=email).first()
                if user:
                    return user
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  ⚠️ Σφάλμα κατά την αναζήτηση στο {schema_name}: {e}"))
        return None

    def get_user_info(self, user, schema_name):
        """Επιστρέφει πληροφορίες για τον user"""
        info = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'is_active': user.is_active,
        }
        
        # Έλεγχος αν είναι ενοίκος (resident/tenant)
        try:
            with schema_context(schema_name):
                from apartments.models import Apartment
                apartments = Apartment.objects.filter(tenant=user)
                if apartments.exists():
                    info['is_resident'] = True
                    info['apartments'] = [apt.name for apt in apartments]
                else:
                    info['is_resident'] = False
                    info['apartments'] = []
        except Exception as e:
            info['is_resident'] = None
            info['apartments'] = []
            info['apartment_check_error'] = str(e)
        
        return info

    def change_user_email(self, user, new_email, schema_name, dry_run=False):
        """Αλλάζει το email ενός user"""
        try:
            with schema_context(schema_name):
                # Έλεγχος αν υπάρχει ήδη user με το νέο email
                existing_user = CustomUser.objects.filter(email=new_email).first()
                if existing_user:
                    self.stdout.write(self.style.ERROR(f"  ❌ Υπάρχει ήδη user με email {new_email} (ID: {existing_user.id})"))
                    return False
                
                if dry_run:
                    self.stdout.write(self.style.SUCCESS(f"  [DRY RUN] Θα άλλαζε email από {user.email} σε {new_email}"))
                    return True
                
                # Αλλαγή email
                old_email = user.email
                user.email = new_email
                user.username = new_email  # Το username συνήθως είναι το ίδιο με το email
                user.save()
                
                self.stdout.write(self.style.SUCCESS(f"  ✅ Email άλλαξε από {old_email} σε {new_email}"))
                return True
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  ❌ Σφάλμα κατά την αλλαγή email: {e}"))
            return False

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('🔍 ΑΝΑΖΗΤΗΣΗ USER ΜΕ EMAIL: theostam1966@gmail.com'))
        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 [DRY RUN MODE - Δεν θα γίνουν αλλαγές]'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        
        # 1. Έλεγχος στο public schema (ultra admin - δεν θα τον αλλάξουμε)
        self.stdout.write('1️⃣ Έλεγχος στο PUBLIC schema (ultra admin)...')
        public_schema = get_public_schema_name()
        public_user = self.find_user_in_schema(public_schema, PROTECTED_ADMIN_EMAIL)
        
        if public_user:
            self.stdout.write(self.style.SUCCESS(f"  ✅ Βρέθηκε ultra admin στο public schema:"))
            self.stdout.write(f"     ID: {public_user.id}")
            self.stdout.write(f"     Email: {public_user.email}")
            self.stdout.write(f"     Is Superuser: {public_user.is_superuser}")
            self.stdout.write(f"     Is Staff: {public_user.is_staff}")
            self.stdout.write(self.style.WARNING('  🛡️ ΑΥΤΟΣ Ο ΧΡΗΣΤΗΣ ΔΕΝ ΘΑ ΑΛΛΑΧΤΕΙ (προστατευμένος)'))
        else:
            self.stdout.write(self.style.WARNING(f"  ⚠️ Δεν βρέθηκε user με email {PROTECTED_ADMIN_EMAIL} στο public schema"))
        
        self.stdout.write('')
        
        # 2. Έλεγχος σε όλα τα tenant schemas
        self.stdout.write('2️⃣ Έλεγχος σε όλα τα TENANT schemas...')
        self.stdout.write('')
        
        tenants = Client.objects.all()
        found_users = []
        
        for tenant in tenants:
            schema_name = tenant.schema_name
            self.stdout.write(f"📋 Tenant: {tenant.name} (schema: {schema_name})")
            
            user = self.find_user_in_schema(schema_name, PROTECTED_ADMIN_EMAIL)
            
            if user:
                user_info = self.get_user_info(user, schema_name)
                found_users.append({
                    'tenant': tenant,
                    'schema_name': schema_name,
                    'user': user,
                    'user_info': user_info
                })
                
                self.stdout.write(self.style.SUCCESS(f"  ✅ Βρέθηκε user:"))
                self.stdout.write(f"     ID: {user_info['id']}")
                self.stdout.write(f"     Email: {user_info['email']}")
                self.stdout.write(f"     Name: {user_info['first_name']} {user_info['last_name']}")
                self.stdout.write(f"     Is Staff: {user_info['is_staff']}")
                self.stdout.write(f"     Is Superuser: {user_info['is_superuser']}")
                self.stdout.write(f"     Is Resident: {user_info['is_resident']}")
                if user_info['apartments']:
                    self.stdout.write(f"     Apartments: {', '.join(user_info['apartments'])}")
            else:
                self.stdout.write(f"  ➖ Δεν βρέθηκε user με αυτό το email")
            
            self.stdout.write('')
        
        # 3. Ανάλυση των αποτελεσμάτων
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('📊 ΑΝΑΛΥΣΗ ΑΠΟΤΕΛΕΣΜΑΤΩΝ'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        
        if not found_users:
            self.stdout.write(self.style.ERROR('❌ Δεν βρέθηκε κανένας user με email theostam1966@gmail.com σε tenant schemas'))
            return
        
        self.stdout.write(f"Βρέθηκαν {len(found_users)} user(s) με το email:")
        self.stdout.write('')
        
        for idx, item in enumerate(found_users, 1):
            tenant = item['tenant']
            schema_name = item['schema_name']
            user = item['user']
            info = item['user_info']
            
            self.stdout.write(f"{idx}. Tenant: {tenant.name} (schema: {schema_name})")
            self.stdout.write(f"   User ID: {info['id']}")
            self.stdout.write(f"   Email: {info['email']}")
            self.stdout.write(f"   Name: {info['first_name']} {info['last_name']}")
            self.stdout.write(f"   Is Staff: {info['is_staff']}")
            self.stdout.write(f"   Is Superuser: {info['is_superuser']}")
            self.stdout.write(f"   Is Resident: {info['is_resident']}")
            if info['apartments']:
                self.stdout.write(f"   Apartments: {', '.join(info['apartments'])}")
            self.stdout.write('')
        
        # 4. Επιλογή user για αλλαγή
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('🔄 ΕΠΙΛΟΓΗ ΓΙΑ ΑΛΛΑΓΗ EMAIL'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        
        # Αναζήτηση ενοίκων (non-staff, non-superuser)
        residents = [item for item in found_users 
                     if not item['user_info']['is_staff'] 
                     and not item['user_info']['is_superuser']]
        
        if not residents:
            self.stdout.write(self.style.WARNING('⚠️ Δεν βρέθηκε κανένας ενοίκος (non-staff, non-superuser) με αυτό το email'))
            self.stdout.write('   Ίσως όλοι οι users είναι staff/superuser και δεν πρέπει να αλλάξουν')
            return
        
        self.stdout.write(f"Βρέθηκαν {len(residents)} ενοίκος/οι (non-staff, non-superuser):")
        self.stdout.write('')
        
        for idx, item in enumerate(residents, 1):
            tenant = item['tenant']
            schema_name = item['schema_name']
            user = item['user']
            info = item['user_info']
            
            self.stdout.write(f"{idx}. Tenant: {tenant.name} (schema: {schema_name})")
            self.stdout.write(f"   User ID: {info['id']}")
            self.stdout.write(f"   Email: {info['email']}")
            self.stdout.write(f"   Name: {info['first_name']} {info['last_name']}")
            if info['apartments']:
                self.stdout.write(f"   Apartments: {', '.join(info['apartments'])}")
            self.stdout.write('')
        
        # 5. Επιβεβαίωση και αλλαγή
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.WARNING('⚠️ ΕΠΙΒΕΒΑΙΩΣΗ ΑΛΛΑΓΗΣ'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        self.stdout.write(f"Θα αλλάξουμε το email από '{PROTECTED_ADMIN_EMAIL}' σε '{NEW_TENANT_EMAIL}'")
        self.stdout.write(f"για {len(residents)} ενοίκους:")
        self.stdout.write('')
        
        for item in residents:
            tenant = item['tenant']
            schema_name = item['schema_name']
            user = item['user']
            info = item['user_info']
            self.stdout.write(f"  - {tenant.name} ({schema_name}): {info['first_name']} {info['last_name']} (ID: {info['id']})")
        
        self.stdout.write('')
        
        if not force and not dry_run:
            response = input("Συνεχίζουμε με την αλλαγή; (yes/no): ").strip().lower()
            if response != 'yes':
                self.stdout.write(self.style.ERROR('❌ Ακυρώθηκε η αλλαγή'))
                return
        
        # 6. Εκτέλεση αλλαγής
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('🔄 ΕΚΤΕΛΕΣΗ ΑΛΛΑΓΗΣ'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        
        success_count = 0
        failed_count = 0
        
        for item in residents:
            tenant = item['tenant']
            schema_name = item['schema_name']
            user = item['user']
            info = item['user_info']
            
            self.stdout.write(f"📋 Αλλαγή για: {tenant.name} ({schema_name})")
            self.stdout.write(f"   User: {info['first_name']} {info['last_name']} (ID: {info['id']})")
            
            if self.change_user_email(user, NEW_TENANT_EMAIL, schema_name, dry_run=dry_run):
                success_count += 1
            else:
                failed_count += 1
            
            self.stdout.write('')
        
        # 7. Αποτελέσματα
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('✅ ΑΠΟΤΕΛΕΣΜΑΤΑ'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        self.stdout.write(f"Επιτυχείς αλλαγές: {success_count}")
        self.stdout.write(f"Αποτυχίες: {failed_count}")
        self.stdout.write('')
        
        if success_count > 0:
            if dry_run:
                self.stdout.write(self.style.WARNING('✅ [DRY RUN] Η προσομοίωση αλλαγής email ολοκληρώθηκε!'))
            else:
                self.stdout.write(self.style.SUCCESS('✅ Η αλλαγή email ολοκληρώθηκε επιτυχώς!'))
                self.stdout.write(f"   Νέο email: {NEW_TENANT_EMAIL}")
        else:
            self.stdout.write(self.style.ERROR('❌ Δεν πραγματοποιήθηκε καμία αλλαγή'))


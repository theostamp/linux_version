"""
Management command για έλεγχο και διόρθωση admin user.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()


class Command(BaseCommand):
    help = 'Ελέγχει και διορθώνει τον admin user για πρόσβαση στο Django Admin'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='theostam1966@gmail.com',
            help='Email του admin user'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='theo123!@#',
            help='Password για τον admin user'
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Διόρθωση αυτόματα αν βρεθούν προβλήματα'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        fix = options['fix']

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('🔍 ΕΛΕΓΧΟΣ ADMIN USER'))
        self.stdout.write(self.style.SUCCESS('=' * 60 + '\n'))

        # Έλεγχος αν υπάρχει ο χρήστης
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"✅ Ο χρήστης υπάρχει στη βάση")
            self.stdout.write(f"   Email: {user.email}")
            self.stdout.write(f"   First Name: {user.first_name}")
            self.stdout.write(f"   Last Name: {user.last_name}")
            self.stdout.write(f"   is_active: {user.is_active}")
            self.stdout.write(f"   is_staff: {user.is_staff}")
            self.stdout.write(f"   is_superuser: {user.is_superuser}")
            self.stdout.write(f"   email_verified: {getattr(user, 'email_verified', 'N/A')}")
            self.stdout.write(f"   role: {getattr(user, 'role', 'N/A')}\n")

            # Έλεγχος authentication
            self.stdout.write("🔐 Έλεγχος Authentication:")
            test_passwords = ['theo123!@#', 'admin123', 'theo123', password]
            authenticated = False
            working_password = None

            for pwd in test_passwords:
                auth_user = authenticate(username=email, password=pwd)
                if auth_user:
                    authenticated = True
                    working_password = pwd
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Password '{pwd}' λειτουργεί!"))
                    break
                else:
                    self.stdout.write(self.style.WARNING(f"   ❌ Password '{pwd}' δεν λειτουργεί"))

            if not authenticated:
                self.stdout.write(self.style.ERROR("   ⚠️ Κανένα password δεν λειτουργεί!\n"))

            # Έλεγχος flags για admin access
            self.stdout.write("🔑 Έλεγχος Admin Access Flags:")
            issues = []

            if not user.is_active:
                issues.append("❌ is_active = False (ο χρήστης είναι ανενεργός)")

            if not user.is_staff:
                issues.append("❌ is_staff = False (ο χρήστης δεν έχει πρόσβαση στο admin)")

            if not user.is_superuser:
                issues.append("❌ is_superuser = False (ο χρήστης δεν είναι superuser)")

            if hasattr(user, 'email_verified') and not user.email_verified:
                issues.append("⚠️ email_verified = False (μπορεί να προκαλέσει προβλήματα)")

            if issues:
                self.stdout.write(self.style.WARNING("   Προβλήματα που βρέθηκαν:"))
                for issue in issues:
                    self.stdout.write(self.style.WARNING(f"   {issue}"))
            else:
                self.stdout.write(self.style.SUCCESS("   ✅ Όλα τα flags είναι σωστά!"))

            # Αν υπάρχουν προβλήματα και ζητήθηκε fix
            if (issues or not authenticated) and fix:
                self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
                self.stdout.write(self.style.SUCCESS('🔧 ΔΙΟΡΘΩΣΗ ADMIN USER'))
                self.stdout.write(self.style.SUCCESS('=' * 60 + '\n'))

                # Ενημέρωση flags
                user.is_active = True
                user.is_staff = True
                user.is_superuser = True

                if hasattr(user, 'email_verified'):
                    user.email_verified = True

                # Ενημέρωση password
                user.set_password(password)
                user.save()

                self.stdout.write(self.style.SUCCESS(f"✅ Ενημερώθηκε ο χρήστης:"))
                self.stdout.write(f"   is_active: {user.is_active}")
                self.stdout.write(f"   is_staff: {user.is_staff}")
                self.stdout.write(f"   is_superuser: {user.is_superuser}")
                self.stdout.write(f"   Password: {password}\n")

                # Επαλήθευση authentication
                auth_user = authenticate(username=email, password=password)
                if auth_user:
                    self.stdout.write(self.style.SUCCESS("✅ Authentication επιτυχής με το νέο password!"))
                else:
                    self.stdout.write(self.style.ERROR("❌ Authentication απέτυχε με το νέο password!"))

            elif issues or not authenticated:
                self.stdout.write(self.style.WARNING('\n⚠️ Βρέθηκαν προβλήματα!'))
                self.stdout.write(self.style.WARNING('Χρησιμοποίησε --fix για αυτόματη διόρθωση:'))
                self.stdout.write(self.style.WARNING(f'python manage.py check_admin_user --email {email} --password {password} --fix'))

        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Ο χρήστης {email} ΔΕΝ υπάρχει στη βάση!"))

            if fix:
                self.stdout.write(self.style.SUCCESS('\n🔧 Δημιουργία νέου superuser...'))
                user = User.objects.create_superuser(
                    email=email,
                    password=password,
                    first_name='Theo',
                    last_name='Stam'
                )

                if hasattr(user, 'email_verified'):
                    user.email_verified = True
                    user.save()

                self.stdout.write(self.style.SUCCESS(f"✅ Δημιουργήθηκε νέος superuser: {email}"))
            else:
                self.stdout.write(self.style.WARNING('Χρησιμοποίησε --fix για δημιουργία:'))
                self.stdout.write(self.style.WARNING(f'python manage.py check_admin_user --email {email} --password {password} --fix'))

        # Σύνοψη
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('📋 ΣΥΝΟΨΗ'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f"Email: {email}")
        self.stdout.write(f"Admin URL: https://linuxversion-production.up.railway.app/admin/")
        if 'working_password' in locals() and working_password:
            self.stdout.write(f"Password: {working_password}")
        else:
            self.stdout.write(f"Password: {password}")
        self.stdout.write(self.style.SUCCESS('=' * 60 + '\n'))


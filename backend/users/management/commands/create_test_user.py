# backend/users/management/commands/create_test_user.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import CustomUser

User = get_user_model()


class Command(BaseCommand):
    help = 'Δημιουργεί έναν test user για δοκιμή του αυτόματου tenant system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='top@gmail.com',
            help='Email του test user'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='testpass123',
            help='Password του test user'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            default='Test',
            help='Όνομα του test user'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            default='User',
            help='Επώνυμο του test user'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']

        # Έλεγχος αν υπάρχει ήδη ο user
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'Ο user με email {email} υπάρχει ήδη!')
            )
            return

        try:
            # Δημιουργία του user (το signal θα δημιουργήσει αυτόματα το tenant)
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_staff=False,
                is_superuser=False
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Δημιουργήθηκε επιτυχώς ο user: {user.email}\n'
                    f'   Όνομα: {user.get_full_name()}\n'
                    f'   Το tenant θα δημιουργηθεί αυτόματα μέσω του signal.'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Σφάλμα στη δημιουργία του user: {e}')
            ) 
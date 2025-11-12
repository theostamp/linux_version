"""
Management command to set password for a user
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context, get_public_schema_name

User = get_user_model()


class Command(BaseCommand):
    help = 'Set password for a user by email'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email of the user'
        )
        parser.add_argument(
            '--password',
            type=str,
            required=True,
            help='New password for the user'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        
        public_schema = get_public_schema_name()
        
        with schema_context(public_schema):
            try:
                user = User.objects.get(email=email)
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully set password for user {email}')
                )
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User with email {email} not found')
                )


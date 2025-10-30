"""
Django management command to fix roles for paid subscription users
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django_tenants.utils import schema_context, get_public_schema_name
from billing.models import UserSubscription

User = get_user_model()


class Command(BaseCommand):
    help = 'Fix roles for users with paid subscriptions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Specific user email to fix',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Fix all users with active subscriptions',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n🔧 Fixing User Roles for Paid Subscriptions'))
        self.stdout.write('=' * 60)

        with schema_context(get_public_schema_name()):
            if options['email']:
                # Fix specific user
                self.fix_user(options['email'])
            elif options['all']:
                # Fix all users with active subscriptions
                self.fix_all_paid_users()
            else:
                self.stdout.write(self.style.ERROR('\n❌ Please specify --email or --all'))
                return

    def fix_user(self, email):
        """Fix role for a specific user"""
        try:
            user = User.objects.get(email=email)
            
            self.stdout.write(f'\n📊 Current Status for {email}:')
            self.stdout.write(f'   Role: {user.role}')
            self.stdout.write(f'   is_staff: {user.is_staff}')
            self.stdout.write(f'   Groups: {", ".join([g.name for g in user.groups.all()])}')
            
            # Check subscription
            subscriptions = UserSubscription.objects.filter(user=user, status='active')
            if subscriptions.exists():
                sub = subscriptions.first()
                self.stdout.write(f'   Subscription: {sub.plan.name} ({sub.status})')
                
                # Fix the role
                self.stdout.write(f'\n🔧 Updating user role to manager...')
                user.role = 'manager'
                user.is_staff = True
                user.save(update_fields=['role', 'is_staff'])
                
                # Ensure Manager group
                manager_group, _ = Group.objects.get_or_create(name='Manager')
                if not user.groups.filter(name='Manager').exists():
                    user.groups.add(manager_group)
                    self.stdout.write(self.style.SUCCESS('   ✅ Added to Manager group'))
                
                # Remove Resident group
                if user.groups.filter(name='Resident').exists():
                    resident_group = Group.objects.get(name='Resident')
                    user.groups.remove(resident_group)
                    self.stdout.write(self.style.SUCCESS('   ✅ Removed from Resident group'))
                
                self.stdout.write(self.style.SUCCESS(f'\n✅ User {email} role fixed!'))
                self.stdout.write(f'   New Role: {user.role}')
                self.stdout.write(f'   New Groups: {", ".join([g.name for g in user.groups.all()])}')
            else:
                self.stdout.write(self.style.WARNING(f'\n⚠️  No active subscription found for {email}'))
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'\n❌ User not found: {email}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error: {e}'))
            import traceback
            traceback.print_exc()

    def fix_all_paid_users(self):
        """Fix roles for all users with active subscriptions"""
        self.stdout.write('\n🔍 Finding users with active subscriptions...')
        
        active_subs = UserSubscription.objects.filter(status='active').select_related('user', 'plan')
        self.stdout.write(f'   Found {active_subs.count()} active subscriptions')
        
        fixed_count = 0
        for sub in active_subs:
            user = sub.user
            
            # Check if user needs fixing
            if user.role != 'manager' or not user.is_staff or not user.groups.filter(name='Manager').exists():
                self.stdout.write(f'\n🔧 Fixing {user.email}...')
                
                user.role = 'manager'
                user.is_staff = True
                user.save(update_fields=['role', 'is_staff'])
                
                manager_group, _ = Group.objects.get_or_create(name='Manager')
                if not user.groups.filter(name='Manager').exists():
                    user.groups.add(manager_group)
                
                if user.groups.filter(name='Resident').exists():
                    resident_group = Group.objects.get(name='Resident')
                    user.groups.remove(resident_group)
                
                fixed_count += 1
                self.stdout.write(self.style.SUCCESS(f'   ✅ Fixed {user.email}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Fixed {fixed_count} users'))



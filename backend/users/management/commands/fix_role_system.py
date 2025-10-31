# backend/users/management/commands/fix_role_system.py

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from users.models import CustomUser
from users.role_management import RoleManager, ensure_ultra_user
from core.unified_permissions import get_user_effective_role, get_user_permissions_summary
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix and standardize the role system across the platform'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )
        parser.add_argument(
            '--fix-ultra-user',
            action='store_true',
            help='Fix ultra user (theostam1966@gmail.com) permissions',
        )
        parser.add_argument(
            '--fix-all-users',
            action='store_true',
            help='Fix all users in the system',
        )
        parser.add_argument(
            '--create-groups',
            action='store_true',
            help='Create missing Django groups',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        fix_ultra_user = options['fix_ultra_user']
        fix_all_users = options['fix_all_users']
        create_groups = options['create_groups']
        
        self.stdout.write(
            self.style.SUCCESS('🔧 Starting Role System Fix...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('🔍 DRY RUN MODE - No changes will be made')
            )
        
        # 1. Create missing groups
        if create_groups:
            self.create_groups(dry_run)
        
        # 2. Fix ultra user
        if fix_ultra_user:
            self.fix_ultra_user(dry_run)
        
        # 3. Fix all users
        if fix_all_users:
            self.fix_all_users(dry_run)
        
        # 4. Show current status
        self.show_system_status()
        
        self.stdout.write(
            self.style.SUCCESS('✅ Role System Fix Complete!')
        )
    
    def create_groups(self, dry_run):
        """Create missing Django groups."""
        self.stdout.write('\n📋 Creating Django Groups...')
        
        required_groups = ['Manager', 'Resident']
        
        for group_name in required_groups:
            group, created = Group.objects.get_or_create(name=group_name)
            if created:
                self.stdout.write(f'  ✅ Created group: {group_name}')
            else:
                self.stdout.write(f'  ℹ️  Group already exists: {group_name}')
    
    def fix_ultra_user(self, dry_run):
        """Fix ultra user permissions."""
        self.stdout.write('\n👑 Fixing Ultra User...')
        
        try:
            ultra_user = CustomUser.objects.get(email='theostam1966@gmail.com')
            
            self.stdout.write(f'  Found ultra user: {ultra_user.email}')
            self.stdout.write(f'  Current role: {ultra_user.role}')
            self.stdout.write(f'  is_superuser: {ultra_user.is_superuser}')
            self.stdout.write(f'  is_staff: {ultra_user.is_staff}')
            
            if not dry_run:
                # Ensure ultra user has correct permissions
                RoleManager.assign_role(ultra_user, 'superuser')
                self.stdout.write('  ✅ Updated ultra user permissions')
            else:
                self.stdout.write('  🔍 Would update ultra user to superuser role')
                
        except CustomUser.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('  ❌ Ultra user not found: theostam1966@gmail.com')
            )
    
    def fix_all_users(self, dry_run):
        """Fix all users in the system."""
        self.stdout.write('\n👥 Fixing All Users...')
        
        users = CustomUser.objects.all()
        self.stdout.write(f'  Found {users.count()} users')
        
        for user in users:
            self.fix_user_role(user, dry_run)
    
    def fix_user_role(self, user, dry_run):
        """Fix a specific user's role."""
        current_role = get_user_effective_role(user)
        current_permissions = get_user_permissions_summary(user)
        
        # Determine correct role based on user attributes
        if user.email == 'theostam1966@gmail.com':
            correct_role = 'superuser'
        elif user.is_superuser and user.is_staff:
            correct_role = 'admin'
        elif user.is_staff or user.role == 'manager':
            correct_role = 'manager'
        elif user.role == 'resident' or not user.role:
            correct_role = 'resident'
        else:
            correct_role = 'resident'  # Default fallback
        
        if current_role != correct_role:
            self.stdout.write(f'  🔄 {user.email}: {current_role} → {correct_role}')
            
            if not dry_run:
                RoleManager.assign_role(user, correct_role)
                self.stdout.write(f'    ✅ Updated {user.email} to {correct_role}')
        else:
            self.stdout.write(f'  ✅ {user.email}: {current_role} (correct)')
    
    def show_system_status(self):
        """Show current system status."""
        self.stdout.write('\n📊 System Status:')
        
        # Count users by role
        role_counts = {}
        for user in CustomUser.objects.all():
            role = get_user_effective_role(user)
            role_counts[role] = role_counts.get(role, 0) + 1
        
        for role, count in sorted(role_counts.items()):
            self.stdout.write(f'  {role}: {count} users')
        
        # Show groups
        self.stdout.write('\n📋 Django Groups:')
        for group in Group.objects.all():
            user_count = group.user_set.count()
            self.stdout.write(f'  {group.name}: {user_count} users')
        
        # Show ultra user status
        try:
            ultra_user = CustomUser.objects.get(email='theostam1966@gmail.com')
            ultra_permissions = get_user_permissions_summary(ultra_user)
            self.stdout.write(f'\n👑 Ultra User Status:')
            self.stdout.write(f'  Role: {ultra_permissions["role"]}')
            self.stdout.write(f'  is_superuser: {ultra_permissions["is_superuser"]}')
            self.stdout.write(f'  is_staff: {ultra_permissions["is_staff"]}')
            self.stdout.write(f'  Groups: {ultra_permissions["groups"]}')
        except CustomUser.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('\n❌ Ultra user not found!')
            )






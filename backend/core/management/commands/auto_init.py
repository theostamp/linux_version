"""
Management command to run auto-initialization (creates tenants, users, demo data).
This replaces the auto-initialization that was previously run in entrypoint.sh.

Usage:
    python manage.py auto_init
"""
from django.core.management.base import BaseCommand
import subprocess
import sys
import os


class Command(BaseCommand):
    help = 'Run auto-initialization (creates tenants, users, demo data)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force initialization even if data already exists',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🎯 Running auto-initialization...'))
        
        # Get the scripts directory path
        scripts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'scripts')
        auto_init_script = os.path.join(scripts_dir, 'auto_initialization.py')
        
        if not os.path.exists(auto_init_script):
            self.stdout.write(self.style.ERROR(f'❌ Script not found: {auto_init_script}'))
            return
        
        # Run the script
        try:
            result = subprocess.run(
                [sys.executable, auto_init_script],
                cwd=os.path.dirname(scripts_dir),
                check=True,
                capture_output=False
            )
            self.stdout.write(self.style.SUCCESS('✅ Auto-initialization completed successfully'))
        except subprocess.CalledProcessError as e:
            self.stdout.write(self.style.ERROR(f'❌ Auto-initialization failed: {e}'))
            sys.exit(1)




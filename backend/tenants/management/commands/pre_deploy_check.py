"""
Management command για pre-deployment check
"""
from django.core.management.base import BaseCommand
import subprocess
import sys
import os


class Command(BaseCommand):
    help = 'Run pre-deployment checks before creating a new tenant'

    def handle(self, *args, **options):
        # Get the script path
        scripts_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            'scripts'
        )
        check_script = os.path.join(scripts_dir, 'pre_tenant_creation_check.py')
        
        if not os.path.exists(check_script):
            self.stdout.write(self.style.ERROR(f'❌ Script not found: {check_script}'))
            return
        
        # Run the script
        try:
            result = subprocess.run(
                [sys.executable, check_script],
                cwd=os.path.dirname(scripts_dir),
                check=False
            )
            sys.exit(result.returncode)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Check failed: {e}'))
            sys.exit(1)


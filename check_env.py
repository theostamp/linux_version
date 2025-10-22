#!/usr/bin/env python3
"""
Environment Configuration Checker
Validates .env configuration for production readiness
"""

import os
import re
from pathlib import Path

# Color codes for terminal output
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def check_icon(is_valid):
    return f"{GREEN}✅{RESET}" if is_valid else f"{RED}❌{RESET}"

def warning_icon():
    return f"{YELLOW}⚠️{RESET}"

def load_env(env_path):
    """Load .env file and return dict of key-value pairs"""
    env_vars = {}
    if not env_path.exists():
        return env_vars

    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    return env_vars

def is_placeholder(value):
    """Check if value is a placeholder"""
    placeholders = [
        'your-', 'change-', 'replace-', 'example',
        'placeholder', 'xxxx', 'XXXX', 'test-key',
        'your_', 'changeme', 'default'
    ]
    value_lower = value.lower()
    return any(p in value_lower for p in placeholders) or len(value) < 10

def check_required_var(env_vars, key, label, is_secret=False, allow_empty=False):
    """Check if required environment variable is set"""
    value = env_vars.get(key, '')

    if not value:
        if allow_empty:
            print(f"{warning_icon()} {label:40} Not set (optional)")
            return 'warning'
        else:
            print(f"{check_icon(False)} {label:40} {RED}MISSING{RESET}")
            return 'error'

    if is_placeholder(value):
        print(f"{check_icon(False)} {label:40} {RED}Placeholder value{RESET}")
        return 'error'

    if is_secret:
        masked = value[:4] + '...' + value[-4:] if len(value) > 8 else '***'
        print(f"{check_icon(True)} {label:40} {GREEN}Set ({masked}){RESET}")
    else:
        print(f"{check_icon(True)} {label:40} {GREEN}{value}{RESET}")

    return 'ok'

def main():
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}  Environment Configuration Check{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")

    # Find backend .env
    backend_env = Path(__file__).parent / 'backend' / '.env'

    if not backend_env.exists():
        print(f"{RED}❌ Backend .env file not found: {backend_env}{RESET}")
        print(f"{YELLOW}   Create it from .env.example{RESET}\n")
        return

    env_vars = load_env(backend_env)

    errors = 0
    warnings = 0

    # Core Django Settings
    print(f"\n{BLUE}🔧 CORE DJANGO SETTINGS{RESET}")
    print(f"{'-'*70}")
    result = check_required_var(env_vars, 'DJANGO_SECRET_KEY', 'Django Secret Key', is_secret=True)
    if result == 'error': errors += 1

    debug_value = env_vars.get('DJANGO_DEBUG', 'False')
    if debug_value == 'True':
        print(f"{warning_icon()} {'DEBUG Mode':40} {YELLOW}True (should be False for production){RESET}")
        warnings += 1
    else:
        print(f"{check_icon(True)} {'DEBUG Mode':40} {GREEN}False{RESET}")

    result = check_required_var(env_vars, 'DJANGO_ALLOWED_HOSTS', 'Allowed Hosts')
    if result == 'error': errors += 1

    # Database
    print(f"\n{BLUE}🗄️  DATABASE CONFIGURATION{RESET}")
    print(f"{'-'*70}")
    result = check_required_var(env_vars, 'DB_NAME', 'Database Name', allow_empty=True)
    if result == 'warning': warnings += 1

    result = check_required_var(env_vars, 'DB_USER', 'Database User', allow_empty=True)
    if result == 'warning': warnings += 1

    result = check_required_var(env_vars, 'DB_PASSWORD', 'Database Password', is_secret=True, allow_empty=True)
    if result == 'warning': warnings += 1
    elif result == 'error': errors += 1

    # Stripe
    print(f"\n{BLUE}💳 STRIPE CONFIGURATION{RESET}")
    print(f"{'-'*70}")
    result = check_required_var(env_vars, 'STRIPE_PUBLISHABLE_KEY', 'Stripe Publishable Key', is_secret=True)
    if result == 'error': errors += 1

    result = check_required_var(env_vars, 'STRIPE_SECRET_KEY', 'Stripe Secret Key', is_secret=True)
    if result == 'error': errors += 1

    result = check_required_var(env_vars, 'STRIPE_WEBHOOK_SECRET', 'Stripe Webhook Secret', is_secret=True)
    if result == 'error': errors += 1

    mock_mode = env_vars.get('STRIPE_MOCK_MODE', 'True')
    if mock_mode == 'True':
        print(f"{warning_icon()} {'Stripe Mock Mode':40} {YELLOW}Enabled (using mock data){RESET}")
        warnings += 1
    else:
        print(f"{check_icon(True)} {'Stripe Mock Mode':40} {GREEN}Disabled (using real Stripe){RESET}")

    # Email
    print(f"\n{BLUE}📧 EMAIL CONFIGURATION{RESET}")
    print(f"{'-'*70}")
    result = check_required_var(env_vars, 'EMAIL_HOST_USER', 'Email Host User')
    if result == 'error': errors += 1

    result = check_required_var(env_vars, 'EMAIL_HOST_PASSWORD', 'Email Host Password', is_secret=True)
    if result == 'error': errors += 1

    result = check_required_var(env_vars, 'DEFAULT_FROM_EMAIL', 'From Email Address')
    if result == 'error': errors += 1

    # Frontend
    print(f"\n{BLUE}🌐 FRONTEND CONFIGURATION{RESET}")
    print(f"{'-'*70}")
    result = check_required_var(env_vars, 'FRONTEND_URL', 'Frontend URL', allow_empty=True)
    if result == 'warning': warnings += 1

    # Security
    print(f"\n{BLUE}🔐 SECURITY SETTINGS{RESET}")
    print(f"{'-'*70}")
    result = check_required_var(env_vars, 'INTERNAL_API_SECRET_KEY', 'Internal API Secret', is_secret=True, allow_empty=True)
    if result == 'warning': warnings += 1
    elif result == 'error': errors += 1

    # Summary
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}  SUMMARY{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")

    if errors == 0 and warnings == 0:
        print(f"{GREEN}✅ All checks passed! Configuration looks good.{RESET}\n")
    else:
        if errors > 0:
            print(f"{RED}❌ {errors} critical issue(s) found{RESET}")
        if warnings > 0:
            print(f"{YELLOW}⚠️  {warnings} warning(s) found{RESET}")

        print(f"\n{YELLOW}📋 Next steps:{RESET}")
        if errors > 0:
            print(f"   1. Fix critical issues (marked with {RED}❌{RESET})")
            print(f"   2. See PRODUCTION_CHECKLIST.md for detailed instructions")
            print(f"   3. Restart backend: docker compose restart backend")
        if warnings > 0:
            print(f"   • Review warnings (marked with {YELLOW}⚠️{RESET})")
            print(f"   • Consider fixing before production deployment")
        print()

    # Quick commands
    print(f"{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}  QUICK COMMANDS{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")
    print(f"Generate Django secret key:")
    print(f"  python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\"\n")
    print(f"Generate API secret key:")
    print(f"  openssl rand -base64 32\n")
    print(f"Restart backend:")
    print(f"  docker compose restart backend\n")
    print(f"Test email sending:")
    print(f"  docker compose exec backend python manage.py shell")
    print(f"  >>> from users.services import EmailService")
    print(f"  >>> from users.models import CustomUser")
    print(f"  >>> user = CustomUser.objects.first()")
    print(f"  >>> EmailService.send_workspace_welcome_email(user, 'demo.localhost')\n")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Script για διόρθωση billing migrations
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

def fix_billing_migrations():
    """Εφαρμόζει τα billing migrations"""
    print("🔧 Διόρθωση Billing Migrations...")
    
    try:
        # Εφαρμόζουμε migrations για το billing app
        print("📦 Εφαρμογή billing migrations...")
        call_command('migrate', 'billing', verbosity=2)
        
        # Ελέγχουμε αν το table υπάρχει τώρα
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'billing_subscriptionplan'
                );
            """)
            exists = cursor.fetchone()[0]
            
        if exists:
            print("✅ billing_subscriptionplan table δημιουργήθηκε επιτυχώς")
            return True
        else:
            print("❌ billing_subscriptionplan table δεν δημιουργήθηκε")
            return False
            
    except Exception as e:
        print(f"❌ Σφάλμα στη διόρθωση billing migrations: {e}")
        return False

if __name__ == '__main__':
    fix_billing_migrations()

#!/usr/bin/env python
"""
Script to setup automated payment installment processing.
This could be run as a cron job or scheduled task.
"""
import os
import sys
import django
from datetime import datetime

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management import call_command
from django_tenants.utils import schema_context

def run_payment_sync():
    """Run the payment synchronization"""
    print(f"🕐 {datetime.now()}: Running payment installment sync...")
    
    try:
        with schema_context('demo'):
            # Run the sync command
            call_command('sync_payment_expenses')
            print("✅ Payment sync completed successfully")
            
    except Exception as e:
        print(f"❌ Error during payment sync: {e}")
        raise

if __name__ == '__main__':
    run_payment_sync()
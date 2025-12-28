#!/usr/bin/env python
"""
🧪 Test Cleanup and Auto-Initialization
=======================================
Αυτό το script τρέχει το cleanup και auto-initialization locally για testing.
"""

import os
import sys
import django
import subprocess

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def run_cleanup():
    """Run cleanup script"""
    print_header("🧹 RUNNING CLEANUP")
    
    try:
        result = subprocess.run([
            sys.executable, 'manage.py', 'cleanup_all_data', '--force'
        ], capture_output=True, text=True, cwd=os.path.dirname(__file__))
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("✅ Cleanup completed successfully")
        else:
            print(f"❌ Cleanup failed with return code: {result.returncode}")
            
    except Exception as e:
        print(f"❌ Error running cleanup: {e}")

def run_auto_init():
    """Run auto-initialization script"""
    print_header("🎯 RUNNING AUTO-INITIALIZATION")
    
    try:
        result = subprocess.run([
            sys.executable, 'scripts/auto_initialization.py'
        ], capture_output=True, text=True, cwd=os.path.dirname(__file__))
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("✅ Auto-initialization completed successfully")
        else:
            print(f"❌ Auto-initialization failed with return code: {result.returncode}")
            
    except Exception as e:
        print(f"❌ Error running auto-initialization: {e}")

def check_database_status():
    """Check database status after cleanup and init"""
    print_header("🔍 CHECKING DATABASE STATUS")
    
    try:
        result = subprocess.run([
            sys.executable, 'check_database_status.py'
        ], capture_output=True, text=True, cwd=os.path.dirname(__file__))
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("✅ Database status check completed successfully")
        else:
            print(f"❌ Database status check failed with return code: {result.returncode}")
            
    except Exception as e:
        print(f"❌ Error checking database status: {e}")

def main():
    """Main function"""
    print_header("🧪 TESTING CLEANUP AND AUTO-INITIALIZATION")
    
    print("This script will:")
    print("1. Run cleanup_all_data --force")
    print("2. Run auto_initialization.py")
    print("3. Check database status")
    print()
    
    response = input("❓ Continue? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("❌ Cancelled")
        return
    
    # Step 1: Cleanup
    run_cleanup()
    
    # Step 2: Auto-initialization
    run_auto_init()
    
    # Step 3: Check status
    check_database_status()
    
    print_header("✅ TESTING COMPLETE")
    
    print("\n📋 EXPECTED RESULT:")
    print("   • Public Schema: Only superusers (theostam1966@gmail.com)")
    print("   • Demo Tenant: Demo users (manager@demo.localhost, resident1@demo.localhost, etc.)")
    print("   • No other users in public schema")
    print("   • Subscription plans available")
    print("   • No user subscriptions (until someone subscribes)")

if __name__ == "__main__":
    main()

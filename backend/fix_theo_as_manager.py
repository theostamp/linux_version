#!/usr/bin/env python
"""
Fix theo etherm2021@gmail.com as MANAGER (not superuser)
theostam1966@gmail.com should remain as the Ultra Admin/Superuser
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from django.contrib.auth.models import Group

def fix_user_roles():
    """Fix both users to their correct roles"""
    
    print(f"\n{'='*70}")
    print("🔧 FIXING USER ROLES")
    print(f"{'='*70}\n")
    
    # ==========================================
    # 1. theostam1966@gmail.com = Ultra Admin (Superuser)
    # ==========================================
    ultra_admin_email = 'theostam1966@gmail.com'
    
    try:
        ultra_admin = CustomUser.objects.get(email=ultra_admin_email)
        
        print(f"👑 ULTRA ADMIN: {ultra_admin_email}")
        print(f"   Current state:")
        print(f"     - role: {ultra_admin.role}")
        print(f"     - is_superuser: {ultra_admin.is_superuser}")
        print(f"     - is_staff: {ultra_admin.is_staff}")
        print(f"     - groups: {[g.name for g in ultra_admin.groups.all()]}")
        
        # Ensure Ultra Admin has superuser privileges
        ultra_admin.role = 'manager'  # or 'admin' if you prefer
        ultra_admin.is_superuser = True  # ← THIS is what makes them Ultra Admin
        ultra_admin.is_staff = True
        ultra_admin.save(update_fields=['role', 'is_superuser', 'is_staff'])
        
        # Add to Manager group
        manager_group, _ = Group.objects.get_or_create(name='Manager')
        if not ultra_admin.groups.filter(name='Manager').exists():
            ultra_admin.groups.add(manager_group)
        
        # Remove from Resident group
        if ultra_admin.groups.filter(name='Resident').exists():
            resident_group = Group.objects.get(name='Resident')
            ultra_admin.groups.remove(resident_group)
        
        ultra_admin.refresh_from_db()
        print(f"   ✅ Fixed to:")
        print(f"     - role: {ultra_admin.role}")
        print(f"     - is_superuser: {ultra_admin.is_superuser} ← Ultra Admin")
        print(f"     - is_staff: {ultra_admin.is_staff}")
        print(f"     - groups: {[g.name for g in ultra_admin.groups.all()]}")
        print()
        
    except CustomUser.DoesNotExist:
        print(f"   ⚠️  User {ultra_admin_email} not found!")
        print()
    
    # ==========================================
    # 2. theo etherm2021@gmail.com = Regular Manager (NOT superuser)
    # ==========================================
    manager_email = 'etherm2021@gmail.com'
    
    try:
        manager = CustomUser.objects.get(email=manager_email)
        
        print(f"👤 MANAGER: theo {manager_email}")
        print(f"   Current state:")
        print(f"     - role: {manager.role}")
        print(f"     - is_superuser: {manager.is_superuser}")
        print(f"     - is_staff: {manager.is_staff}")
        print(f"     - groups: {[g.name for g in manager.groups.all()]}")
        
        # Set as regular manager (NOT superuser)
        manager.role = 'manager'
        manager.is_superuser = False  # ← Regular Manager, NOT Ultra Admin
        manager.is_staff = True       # ← Still staff to access admin features
        manager.save(update_fields=['role', 'is_superuser', 'is_staff'])
        
        # Add to Manager group
        manager_group, _ = Group.objects.get_or_create(name='Manager')
        if not manager.groups.filter(name='Manager').exists():
            manager.groups.add(manager_group)
        
        # Remove from Resident group
        if manager.groups.filter(name='Resident').exists():
            resident_group = Group.objects.get(name='Resident')
            manager.groups.remove(resident_group)
        
        manager.refresh_from_db()
        print(f"   ✅ Fixed to:")
        print(f"     - role: {manager.role}")
        print(f"     - is_superuser: {manager.is_superuser} ← Regular Manager")
        print(f"     - is_staff: {manager.is_staff}")
        print(f"     - groups: {[g.name for g in manager.groups.all()]}")
        print()
        
    except CustomUser.DoesNotExist:
        print(f"   ⚠️  User {manager_email} not found!")
        print()
    
    # ==========================================
    # Summary
    # ==========================================
    print(f"{'='*70}")
    print("✅ USER ROLES FIXED")
    print(f"{'='*70}\n")
    
    print("📊 HIERARCHY:")
    print("   1. theostam1966@gmail.com    → Ultra Admin (is_superuser=True)")
    print("   2. theo etherm2021@gmail.com → Manager (is_superuser=False)")
    print()
    
    print("🔒 PERMISSIONS:")
    print("   Ultra Admin:")
    print("     - Full system access")
    print("     - Can manage all tenants")
    print("     - Can access Django admin")
    print()
    print("   Manager:")
    print("     - Financial management ✅")
    print("     - Building management ✅")
    print("     - Resident management ✅")
    print("     - Cannot access other tenants ❌")
    print()
    
    print("📝 NEXT STEPS:")
    print("   1. theo must LOGOUT and LOGIN again")
    print("   2. After login, header should show 'Διαχειριστής' (not 'Χρήστης')")
    print("   3. theo will have access to Financial Management")
    print("   4. theo will NOT have ultra admin privileges (correct)")
    print()

if __name__ == '__main__':
    fix_user_roles()




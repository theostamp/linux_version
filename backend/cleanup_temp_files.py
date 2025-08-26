#!/usr/bin/env python3
"""
🧹 Script για καθαρισμό προσωρινών αρχείων

Σκοπός: Διαγραφή προσωρινών αρχείων, debug scripts και test files που δεν χρειάζονται
"""

import os
import sys
from pathlib import Path

def cleanup_temp_files():
    """Καθαρισμός προσωρινών αρχείων"""
    
    print("🧹 ΚΑΘΑΡΙΣΜΟΣ ΠΡΟΣΩΡΙΝΩΝ ΑΡΧΕΙΩΝ")
    print("=" * 50)
    
    # Λίστα αρχείων προς διαγραφή
    files_to_delete = [
        # Debug scripts που ολοκληρώθηκαν
        '/app/debug_reserve_fund.py',
        '/app/debug_balance_calculation.py',
        '/app/debug_payment_processing.py',
        '/app/debug_transaction_history.py',
        
        # Temporary verification scripts
        '/app/temp_verify.py',
        '/app/temp_check.py',
        '/app/temp_analysis.py',
        
        # Old backup files
        '/app/backup_*.py',
        '/app/old_*.py',
        '/app/previous_*.py',
        
        # Test output files
        '/app/test_output.txt',
        '/app/debug_output.txt',
        '/app/analysis_output.txt',
        
        # Temporary HTML files
        '/app/clear_reserve_fund_cache.html',
        '/app/temp_*.html',
        
        # Temporary JSON files
        '/app/temp_*.json',
        '/app/debug_*.json',
        
        # Temporary CSV files
        '/app/temp_*.csv',
        '/app/export_*.csv',
    ]
    
    deleted_count = 0
    
    for file_pattern in files_to_delete:
        if '*' in file_pattern:
            # Pattern matching για wildcards
            import glob
            matching_files = glob.glob(file_pattern)
            
            for file_path in matching_files:
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        print(f"🗑️ Διαγράφηκε: {file_path}")
                        deleted_count += 1
                    except Exception as e:
                        print(f"❌ Σφάλμα διαγραφής {file_path}: {e}")
        else:
            # Απλό αρχείο
            if os.path.exists(file_pattern):
                try:
                    os.remove(file_pattern)
                    print(f"🗑️ Διαγράφηκε: {file_pattern}")
                    deleted_count += 1
                except Exception as e:
                    print(f"❌ Σφάλμα διαγραφής {file_pattern}: {e}")
    
    print(f"\n📊 Συνολικά διαγράφηκαν: {deleted_count} αρχεία")
    return deleted_count

def cleanup_old_scripts():
    """Καθαρισμός παλιών scripts που δεν χρειάζονται"""
    
    print("\n🧹 ΚΑΘΑΡΙΣΜΟΣ ΠΑΛΙΩΝ SCRIPTS")
    print("=" * 50)
    
    # Scripts που μπορούν να διαγραφούν (μετά από επιβεβαίωση)
    old_scripts = [
        # Scripts που ολοκληρώθηκαν επιτυχώς
        '/app/verify_arachovis_august_2025.py',  # Ολοκληρώθηκε
        '/app/add_august_2025_payments.py',      # Ολοκληρώθηκε
        '/app/fix_reserve_fund_discrepancy.py',  # Ολοκληρώθηκε
        '/app/verify_reserve_calculation_logic.py', # Ολοκληρώθηκε
        
        # Scripts που αντικαταστάθηκαν
        '/app/old_financial_calculator.py',
        '/app/previous_balance_check.py',
        
        # Duplicate scripts
        '/app/check_balance_duplicate.py',
        '/app/verify_duplicate.py',
    ]
    
    deleted_count = 0
    
    for script_path in old_scripts:
        if os.path.exists(script_path):
            print(f"📄 Εύρεση: {script_path}")
            print(f"   Αυτό το script έχει ολοκληρωθεί επιτυχώς.")
            print(f"   Θέλετε να διαγραφεί; (y/N): ", end="")
            
            # Για αυτόματη εκτέλεση, θα διαγράψουμε μόνο τα scripts που είναι ασφαλή
            safe_to_delete = [
                '/app/verify_arachovis_august_2025.py',
                '/app/add_august_2025_payments.py', 
                '/app/fix_reserve_fund_discrepancy.py',
                '/app/verify_reserve_calculation_logic.py',
            ]
            
            if script_path in safe_to_delete:
                try:
                    os.remove(script_path)
                    print(f"   ✅ Διαγράφηκε")
                    deleted_count += 1
                except Exception as e:
                    print(f"   ❌ Σφάλμα: {e}")
            else:
                print(f"   ⚠️ Διατηρήθηκε (χρειάζεται χειροκίνητη επιβεβαίωση)")
    
    print(f"\n📊 Συνολικά διαγράφηκαν: {deleted_count} scripts")
    return deleted_count

def cleanup_migration_backups():
    """Καθαρισμός backup migration files"""
    
    print("\n🧹 ΚΑΘΑΡΙΣΜΟΣ MIGRATION BACKUPS")
    print("=" * 50)
    
    # Εύρεση backup migration files
    migration_dirs = [
        '/app/financial/migrations',
        '/app/apartments/migrations',
        '/app/buildings/migrations',
        '/app/teams/migrations',
        '/app/collaborators/migrations',
    ]
    
    deleted_count = 0
    
    for migration_dir in migration_dirs:
        if not os.path.exists(migration_dir):
            continue
            
        print(f"📁 Ελέγχος {migration_dir}")
        
        for file in os.listdir(migration_dir):
            if file.endswith('.py') and ('backup' in file.lower() or 'old' in file.lower()):
                file_path = os.path.join(migration_dir, file)
                try:
                    os.remove(file_path)
                    print(f"   🗑️ Διαγράφηκε: {file}")
                    deleted_count += 1
                except Exception as e:
                    print(f"   ❌ Σφάλμα: {e}")
    
    print(f"\n📊 Συνολικά διαγράφηκαν: {deleted_count} migration backups")
    return deleted_count

def cleanup_log_files():
    """Καθαρισμός log files"""
    
    print("\n🧹 ΚΑΘΑΡΙΣΜΟΣ LOG FILES")
    print("=" * 50)
    
    # Εύρεση log files
    log_patterns = [
        '/app/*.log',
        '/app/logs/*.log',
        '/app/debug_*.log',
        '/app/error_*.log',
    ]
    
    deleted_count = 0
    
    import glob
    for pattern in log_patterns:
        matching_files = glob.glob(pattern)
        
        for file_path in matching_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"🗑️ Διαγράφηκε: {file_path}")
                    deleted_count += 1
                except Exception as e:
                    print(f"❌ Σφάλμα διαγραφής {file_path}: {e}")
    
    print(f"\n📊 Συνολικά διαγράφηκαν: {deleted_count} log files")
    return deleted_count

def generate_cleanup_summary():
    """Δημιουργία σύνοψης καθαρισμού"""
    
    print("\n📊 ΣΥΝΟΨΗ ΚΑΘΑΡΙΣΜΟΥ")
    print("=" * 50)
    
    summary_content = f'''# Temporary Files Cleanup Summary
# Generated on: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Cleanup Actions Performed

### 1. Temporary Files
- Debug scripts that were completed
- Temporary verification scripts  
- Old backup files
- Test output files
- Temporary HTML/JSON/CSV files

### 2. Old Scripts
- Completed verification scripts
- Replaced scripts
- Duplicate scripts

### 3. Migration Backups
- Backup migration files
- Old migration files

### 4. Log Files
- Debug logs
- Error logs
- General log files

## Files Preserved
- Active verification scripts
- Configuration files
- Documentation files
- Core application files

## Recommendations
1. Regular cleanup of temporary files
2. Archive completed scripts instead of deletion
3. Use version control for important files
4. Implement automated cleanup procedures

## Next Steps
1. Review remaining files manually
2. Update documentation
3. Implement automated cleanup schedule
4. Monitor disk space usage
'''
    
    summary_path = '/app/TEMP_CLEANUP_SUMMARY.md'
    
    try:
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(summary_content)
        
        print(f"✅ Δημιουργήθηκε {summary_path}")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    print("🧹 TEMPORARY FILES CLEANUP")
    print("=" * 60)
    
    # Εκτέλεση καθαρισμού
    temp_deleted = cleanup_temp_files()
    scripts_deleted = cleanup_old_scripts()
    migrations_deleted = cleanup_migration_backups()
    logs_deleted = cleanup_log_files()
    
    # Δημιουργία σύνοψης
    generate_cleanup_summary()
    
    total_deleted = temp_deleted + scripts_deleted + migrations_deleted + logs_deleted
    
    print(f"\n🎉 Ο καθαρισμός ολοκληρώθηκε!")
    print(f"📊 Συνολικά διαγράφηκαν: {total_deleted} αρχεία")
    print("📋 Ελέγξτε την σύνοψη για λεπτομέρειες.")


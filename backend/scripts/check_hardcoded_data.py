#!/usr/bin/env python3
"""
🔍 Hard-coded Data Checker
Ελέγχει για hard-coded emails, passwords, και sensitive data στον κώδικα
"""

import os
import re
import sys
from pathlib import Path

# Patterns για hard-coded δεδομένα
HARDCODED_PATTERNS = [
    # Email patterns
    (r'email\s*=\s*["\']([^"\']+@[^"\']+\.com)["\']', 'Hard-coded email'),
    (r'["\']([^"\']+@[^"\']+\.localhost)["\']', 'Hard-coded demo email'),
    (r'["\']([^"\']+@[^"\']+\.com)["\']', 'Hard-coded email (any)'),
    
    # Password patterns
    (r'password\s*=\s*["\']([^"\']+)["\']', 'Hard-coded password'),
    (r'set_password\(["\']([^"\']+)["\']', 'Hard-coded password (set_password)'),
    (r'["\'](admin123|manager123|resident123|theo123|demo123)["\']', 'Common hard-coded password'),
    
    # Specific emails (γνωστά production emails)
    (r'theostam1966@gmail\.com', 'Hard-coded production email'),
    (r'etherm2021@gmail\.com', 'Hard-coded production email'),
    
    # Demo data
    (r'admin@demo\.localhost', 'Hard-coded demo email'),
    (r'manager@demo\.localhost', 'Hard-coded demo email'),
    (r'resident.*@demo\.localhost', 'Hard-coded demo email'),
]

# Files/Directories να παρακάμψουμε
EXCLUDE_PATTERNS = [
    '**/node_modules/**',
    '**/__pycache__/**',
    '**/.git/**',
    '**/venv/**',
    '**/.venv/**',
    '**/dist/**',
    '**/build/**',
    '**/*.pyc',
    '**/migrations/**',  # Migrations μπορεί να έχουν hard-coded data
    '**/test_*.py',  # Test files
    '**/*test*.py',  # Test files
    '**/check_*.py',  # Check scripts
    '**/debug_*.py',  # Debug scripts
    '**/fix_*.py',  # Fix scripts (για manual use)
    '**/quick_fix_*.py',  # Quick fix scripts
]

# Files που ΠΡΕΠΕΙ να ελέγξουμε (production-critical)
CRITICAL_FILES = [
    'backend/scripts/auto_initialization.py',
    'backend/entrypoint.sh',
    'backend/new_concierge_backend/settings.py',
]

def should_check_file(file_path):
    """Check if file should be checked"""
    file_str = str(file_path)
    
    # Always check critical files
    for critical in CRITICAL_FILES:
        if critical in file_str:
            return True
    
    # Skip excluded patterns
    for pattern in EXCLUDE_PATTERNS:
        if pattern.replace('**/', '').replace('**', '') in file_str:
            return False
    
    # Only check Python and shell scripts
    if file_path.suffix in ['.py', '.sh']:
        return True
    
    return False

def check_file(file_path):
    """Check a single file for hard-coded data"""
    issues = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        for line_num, line in enumerate(lines, 1):
            for pattern, description in HARDCODED_PATTERNS:
                matches = re.finditer(pattern, line, re.IGNORECASE)
                for match in matches:
                    # Skip if it's a comment or docstring
                    stripped = line.strip()
                    if stripped.startswith('#') or stripped.startswith('"""') or stripped.startswith("'''"):
                        continue
                    
                    # Skip if it's in a variable assignment from env (os.getenv, etc.)
                    if 'os.getenv' in line or 'os.environ.get' in line:
                        continue
                    
                    issues.append({
                        'file': str(file_path),
                        'line': line_num,
                        'description': description,
                        'content': line.strip(),
                        'match': match.group(0)
                    })
    except Exception as e:
        print(f"⚠️  Error reading {file_path}: {e}")
    
    return issues

def main():
    """Main function"""
    print("🔍 Hard-coded Data Checker")
    print("=" * 70)
    print()
    
    # Get project root
    project_root = Path(__file__).parent.parent
    backend_root = project_root / 'backend'
    
    if not backend_root.exists():
        print(f"❌ Backend directory not found: {backend_root}")
        return 1
    
    all_issues = []
    
    # Check critical files first
    print("📋 Checking critical files...")
    for critical_file in CRITICAL_FILES:
        file_path = project_root / critical_file
        if file_path.exists():
            issues = check_file(file_path)
            all_issues.extend(issues)
            if issues:
                print(f"   ⚠️  {critical_file}: {len(issues)} issues found")
            else:
                print(f"   ✅ {critical_file}: No issues")
    
    print()
    print("📋 Checking all Python/Shell files...")
    
    # Check all Python files
    python_files = list(backend_root.rglob('*.py'))
    shell_files = list(backend_root.rglob('*.sh'))
    
    total_files = len(python_files) + len(shell_files)
    checked = 0
    
    for file_path in python_files + shell_files:
        if should_check_file(file_path):
            issues = check_file(file_path)
            all_issues.extend(issues)
            checked += 1
            
            if checked % 50 == 0:
                print(f"   Checked {checked}/{total_files} files...")
    
    print(f"   ✅ Checked {checked} files")
    print()
    
    # Report results
    print("=" * 70)
    print(f"📊 Results: Found {len(all_issues)} potential hard-coded data issues")
    print("=" * 70)
    print()
    
    if all_issues:
        # Group by file
        by_file = {}
        for issue in all_issues:
            file = issue['file']
            if file not in by_file:
                by_file[file] = []
            by_file[file].append(issue)
        
        # Sort by file name
        for file_path in sorted(by_file.keys()):
            issues = by_file[file_path]
            print(f"\n📄 {file_path} ({len(issues)} issues)")
            print("-" * 70)
            
            for issue in issues:
                print(f"   Line {issue['line']}: {issue['description']}")
                print(f"   → {issue['match']}")
                print(f"   {issue['content'][:80]}...")
                print()
        
        print("\n" + "=" * 70)
        print("⚠️  RECOMMENDATIONS:")
        print("=" * 70)
        print("1. Move hard-coded emails to environment variables")
        print("2. Move hard-coded passwords to environment variables")
        print("3. Use os.getenv() for all sensitive data")
        print("4. Add flags to enable/disable demo data creation")
        print("5. Document required environment variables")
        print()
        
        return 1
    else:
        print("✅ No hard-coded data issues found!")
        return 0

if __name__ == '__main__':
    sys.exit(main())



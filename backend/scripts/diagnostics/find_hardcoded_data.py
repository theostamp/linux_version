#!/usr/bin/env python3
"""
🔍 Script για έλεγχο hardcoded δεδομένων στο backend

Σκοπός: Εύρεση και καταγραφή hardcoded δεδομένων που πρέπει να καθαριστούν
"""

import os
import re
import sys
from pathlib import Path

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()


def find_hardcoded_data():
    """Εύρεση hardcoded δεδομένων στο backend"""
    
    print("🔍 Ξεκινάει ο έλεγχος hardcoded δεδομένων...")
    print("=" * 60)
    
    # Patterns για hardcoded δεδομένα
    patterns = {
        'hardcoded_amounts': [
            r'\b\d+\.?\d*\s*€\b',  # Ποσά σε ευρώ
            r'\b\d+\.?\d*\s*\$',   # Ποσά σε δολάρια
            r'\b\d+\.?\d*\s*EUR',  # Ποσά σε EUR
            r'\b\d+\.?\d*\s*USD',  # Ποσά σε USD
        ],
        'hardcoded_dates': [
            r'\b202[4-5]-\d{2}-\d{2}\b',  # Ημερομηνίες 2024-2025
            r'\b\d{2}/\d{2}/202[4-5]\b',  # Ημερομηνίες με /
            r'\b\d{2}-\d{2}-202[4-5]\b',  # Ημερομηνίες με -
        ],
        'hardcoded_building_ids': [
            r'building_id\s*=\s*\d+',
            r'buildingId\s*:\s*\d+',
            r'building.*id.*\d+',
        ],
        'hardcoded_apartment_numbers': [
            r'apartment.*number.*\d+',
            r'apartment_id\s*=\s*\d+',
            r'apartmentId\s*:\s*\d+',
        ],
        'hardcoded_names': [
            r'name\s*=\s*["\'][^"\']*["\']',
            r'title\s*=\s*["\'][^"\']*["\']',
            r'address\s*=\s*["\'][^"\']*["\']',
        ],
        'hardcoded_emails': [
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        ],
        'hardcoded_phones': [
            r'\b\d{10}\b',  # 10ψήφιοι αριθμοί
            r'\+\d{1,3}\s*\d{10}',  # Διεθνείς αριθμοί
        ]
    }
    
    # Αρχεία προς έλεγχο
    backend_dirs = [
        'financial',
        'apartments', 
        'buildings',
        'teams',
        'collaborators',
        'maintenance',
        'projects',
        'announcements',
        'votes',
        'requests',
        'chat'
    ]
    
    found_hardcoded = {}
    
    for app_dir in backend_dirs:
        app_path = Path(f'/app/{app_dir}')
        if not app_path.exists():
            continue
            
        print(f"\n📁 Ελέγχος {app_dir}/")
        print("-" * 40)
        
        # Εύρεση Python αρχείων
        python_files = list(app_path.rglob('*.py'))
        
        for file_path in python_files:
            if 'migrations' in str(file_path):
                continue  # Παράλειψη migration αρχείων
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                file_findings = {}
                
                for pattern_name, pattern_list in patterns.items():
                    for pattern in pattern_list:
                        matches = re.finditer(pattern, content, re.IGNORECASE)
                        
                        for match in matches:
                            line_num = content[:match.start()].count('\n') + 1
                            line_content = lines[line_num - 1].strip()
                            
                            if pattern_name not in file_findings:
                                file_findings[pattern_name] = []
                                
                            file_findings[pattern_name].append({
                                'line': line_num,
                                'content': line_content,
                                'match': match.group()
                            })
                
                if file_findings:
                    relative_path = file_path.relative_to(Path('/app'))
                    print(f"  📄 {relative_path}")
                    
                    for pattern_name, findings in file_findings.items():
                        print(f"    🔍 {pattern_name}: {len(findings)} findings")
                        
                        for finding in findings[:3]:  # Πρώτα 3 findings
                            print(f"      Γραμμή {finding['line']}: {finding['content'][:80]}...")
                        
                        if len(findings) > 3:
                            print(f"      ... και {len(findings) - 3} ακόμα")
                    
                    found_hardcoded[str(relative_path)] = file_findings
                    
            except Exception as e:
                print(f"  ❌ Σφάλμα στο {file_path}: {e}")
    
    # Σύνοψη
    print("\n" + "=" * 60)
    print("📊 ΣΥΝΟΠΤΙΚΗ ΑΝΑΦΟΡΑ")
    print("=" * 60)
    
    total_files = len(found_hardcoded)
    total_findings = sum(len(findings) for findings in found_hardcoded.values())
    
    print(f"📁 Αρχεία με hardcoded δεδομένα: {total_files}")
    print(f"🔍 Συνολικά findings: {total_findings}")
    
    if found_hardcoded:
        print("\n📋 ΛΙΣΤΑ ΑΡΧΕΙΩΝ ΜΕ HARCODED ΔΕΔΟΜΕΝΑ:")
        for file_path, findings in found_hardcoded.items():
            total_file_findings = sum(len(f) for f in findings.values())
            print(f"  📄 {file_path}: {total_file_findings} findings")
    
    # Προτάσεις καθαρισμού
    print("\n🧹 ΠΡΟΤΑΣΕΙΣ ΚΑΘΑΡΙΣΜΟΥ:")
    print("1. Επιθεώρηση όλων των hardcoded ποσών")
    print("2. Αφαίρεση hardcoded ημερομηνιών")
    print("3. Αντικατάσταση hardcoded IDs με variables")
    print("4. Διατήρηση μόνο απαραίτητων fallback values")
    print("5. Ενημέρωση documentation")
    
    return found_hardcoded

def check_specific_files():
    """Ελέγχος συγκεκριμένων αρχείων που γνωρίζουμε ότι έχουν hardcoded δεδομένα"""
    
    print("\n🎯 ΕΛΕΓΧΟΣ ΣΥΓΚΕΚΡΙΜΕΝΩΝ ΑΡΧΕΙΩΝ")
    print("=" * 60)
    
    specific_files = [
        'backend/verify_arachovis_august_2025.py',
        'backend/financial_data_validator.py',
        'backend/final_verification_arachovis.py',
        'backend/investigate_amount_discrepancies.py',
        'backend/verify_reserve_calculation_logic.py'
    ]
    
    for file_path in specific_files:
        if os.path.exists(file_path):
            print(f"\n📄 Ελέγχος {file_path}")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Εύρεση hardcoded ποσών
                amount_pattern = r'\b\d+\.?\d*\s*€\b'
                amounts = re.findall(amount_pattern, content)
                
                if amounts:
                    print(f"  💰 Hardcoded ποσά: {amounts}")
                
                # Εύρεση hardcoded ημερομηνιών
                date_pattern = r'\b202[4-5]-\d{2}-\d{2}\b'
                dates = re.findall(date_pattern, content)
                
                if dates:
                    print(f"  📅 Hardcoded ημερομηνίες: {dates}")
                
                # Εύρεση hardcoded building IDs
                building_pattern = r'building.*id.*\d+'
                buildings = re.findall(building_pattern, content, re.IGNORECASE)
                
                if buildings:
                    print(f"  🏢 Hardcoded building references: {buildings[:3]}...")
                    
            except Exception as e:
                print(f"  ❌ Σφάλμα: {e}")

if __name__ == "__main__":
    print("🔍 HARCODED DATA CHECKER")
    print("=" * 60)
    
    # Γενικός έλεγχος
    found_data = find_hardcoded_data()
    
    # Ελέγχος συγκεκριμένων αρχείων
    check_specific_files()
    
    print("\n✅ Ο έλεγχος ολοκληρώθηκε!")
    print("📋 Ελέγξτε την αναφορά παραπάνω για hardcoded δεδομένα που πρέπει να καθαριστούν.")

#!/usr/bin/env python
import os
import sys
import subprocess

def run_script(script_name, tenant_schema):
    """Τρέχει ένα Python script"""
    print(f"\n🚀 Εκτέλεση: {script_name}")
    print("=" * 50)
    
    try:
        result = subprocess.run([
            sys.executable, script_name, tenant_schema
        ], capture_output=True, text=True, cwd=os.path.dirname(__file__))
        
        if result.returncode == 0:
            print("✅ Επιτυχία!")
            if result.stdout:
                print(result.stdout)
        else:
            print("❌ Σφάλμα!")
            if result.stderr:
                print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Σφάλμα εκτέλεσης: {e}")
        return False
    
    return True

def create_all_sample_data(tenant_schema):
    """Δημιουργεί όλα τα sample data με τη σωστή σειρά"""
    
    print(f"🎯 Δημιουργία όλων των sample data για tenant: {tenant_schema}")
    print("=" * 60)
    
    # Λίστα scripts με τη σειρά εκτέλεσης
    scripts = [
        'create_sample_data.py',      # 1. Κτίρια, χρήστες, memberships
        'create_sample_suppliers.py', # 2. Προμηθευτές
        'create_sample_expenses.py',  # 3. Δαπάνες
        'create_sample_transactions.py'  # 4. Εισπράξεις και κινήσεις
    ]
    
    success_count = 0
    
    for script in scripts:
        if run_script(script, tenant_schema):
            success_count += 1
        else:
            print(f"\n⚠️ Σφάλμα στο {script}. Σταματάω την εκτέλεση.")
            break
    
    print("\n" + "=" * 60)
    print(f"📊 Σύνοψη: {success_count}/{len(scripts)} scripts εκτελέστηκαν επιτυχώς")
    
    if success_count == len(scripts):
        print("🎉 Όλα τα sample data δημιουργήθηκαν επιτυχώς!")
        print("\n📋 Τι δημιουργήθηκε:")
        print("   🏢 Κτίρια και διαμερίσματα")
        print("   👥 Χρήστες και building memberships")
        print("   💰 Δαπάνες (καθαρισμός, ΔΕΗ, θέρμανση, κλπ.)")
        print("   💳 Εισπράξεις από ιδιοκτήτες")
        print("   📊 Κινήσεις ταμείου")
        print("\n🔗 Μπορείς τώρα να δοκιμάσεις την εφαρμογή στο:")
        print(f"   http://{tenant_schema}.localhost:8080")
    else:
        print("❌ Υπήρξαν σφάλματα στη δημιουργία των sample data.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Χρήση: python create_all_sample_data.py <tenant_schema>")
        print("Παράδειγμα: python create_all_sample_data.py athinon12")
        print("\n📝 Αυτό το script θα δημιουργήσει:")
        print("   1. Κτίρια και διαμερίσματα")
        print("   2. Χρήστες και building memberships")
        print("   3. Προμηθευτές (ΔΕΗ, ΕΥΔΑΠ, καθαρισμός, κλπ.)")
        print("   4. Δαπάνες (συνδεδεμένες με προμηθευτές)")
        print("   5. Εισπράξεις από ιδιοκτήτες")
        print("   6. Κινήσεις ταμείου")
        sys.exit(1)
    
    tenant_schema = sys.argv[1]
    create_all_sample_data(tenant_schema) 
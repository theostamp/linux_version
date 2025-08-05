#!/usr/bin/env python
"""
Script για την εκτέλεση της δημιουργίας οικονομικών demo δεδομένων
"""

import os
import sys

# Προσθήκη του backend directory στο path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

try:
    from add_financial_demo_data import add_financial_demo_data
    
    print("🎯 ΕΚΤΕΛΕΣΗ ΔΗΜΙΟΥΡΓΙΑΣ ΟΙΚΟΝΟΜΙΚΩΝ DEMO ΔΕΔΟΜΕΝΩΝ")
    print("=" * 60)
    
    success = add_financial_demo_data()
    
    if success:
        print("\n✅ ΕΠΙΤΥΧΙΑ! Τα οικονομικά demo δεδομένα δημιουργήθηκαν επιτυχώς.")
        print("🌐 Μπορείτε να τα δείτε στο: http://demo.localhost:8080/financial")
    else:
        print("\n❌ ΑΠΕΤΥΧΕ! Δεν ήταν δυνατή η δημιουργία των οικονομικών δεδομένων.")
        print("💡 Βεβαιωθείτε ότι:")
        print("   - Το σύστημα τρέχει (docker compose up)")
        print("   - Έχει εκτελεστεί το auto_initialization.py")
        print("   - Υπάρχουν κτίρια και διαμερίσματα στο demo tenant")
        
except ImportError as e:
    print(f"❌ Σφάλμα import: {e}")
    print("💡 Βεβαιωθείτε ότι βρίσκεστε στο backend directory")
    
except Exception as e:
    print(f"❌ Απρόσμενο σφάλμα: {e}")
    print("💡 Ελέγξτε τα logs για περισσότερες λεπτομέρειες")

print("\n" + "=" * 60) 
#!/usr/bin/env python3
"""
Script για τη διόρθωση του προβλήματος με το πεδίο previous_obligations_amount
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db import connection

def fix_previous_obligations_field():
    """
    Διόρθωση του πεδίου previous_obligations_amount στη βάση
    """
    print("🔧 Ξεκινάει η διόρθωση του πεδίου previous_obligations_amount...")
    
    with schema_context('demo'):
        # Έλεγχος αν το πεδίο υπάρχει
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, column_default, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'financial_payment' 
                AND column_name = 'previous_obligations_amount';
            """)
            result = cursor.fetchone()
            
            if result:
                column_name, column_default, is_nullable = result
                print(f"📊 Πεδίο: {column_name}")
                print(f"📊 Default: {column_default}")
                print(f"📊 Nullable: {is_nullable}")
                
                # Έλεγχος αν χρειάζεται default value
                if column_default is None:
                    print("🔧 Προσθήκη default value...")
                    cursor.execute("""
                        ALTER TABLE financial_payment 
                        ALTER COLUMN previous_obligations_amount SET DEFAULT 0.00;
                    """)
                    print("✅ Default value προστέθηκε επιτυχώς!")
                else:
                    print("✅ Το πεδίο έχει ήδη default value")
                
                # Έλεγχος αν χρειάζεται να ενημερωθούν υπάρχοντες εγγραφές
                cursor.execute("""
                    SELECT COUNT(*) FROM financial_payment 
                    WHERE previous_obligations_amount IS NULL;
                """)
                null_count = cursor.fetchone()[0]
                
                if null_count > 0:
                    print(f"🔧 Ενημέρωση {null_count} εγγραφών με NULL τιμές...")
                    cursor.execute("""
                        UPDATE financial_payment 
                        SET previous_obligations_amount = 0.00 
                        WHERE previous_obligations_amount IS NULL;
                    """)
                    print("✅ Εγγραφές ενημερώθηκαν επιτυχώς!")
                else:
                    print("✅ Δεν υπάρχουν NULL τιμές")
            else:
                print("❌ Το πεδίο previous_obligations_amount δεν βρέθηκε!")

if __name__ == "__main__":
    try:
        fix_previous_obligations_field()
        print("\n🎉 Η διόρθωση ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά τη διόρθωση: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

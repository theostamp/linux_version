#!/usr/bin/env python3
"""
Simple script για την προσθήκη demo δεδομένων χιλιοστών
"""

import psycopg2
import os

def add_demo_mills():
    """Προσθήκη demo δεδομένων χιλιοστών"""
    
    # Database connection parameters
    db_params = {
        'host': 'db',
        'database': 'new_concierge_demo',
        'user': 'postgres',
        'password': 'postgres'
    }
    
    try:
        # Connect to database
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        print("🏢 Σύνδεση στη βάση δεδομένων...")
        
        # Check if apartments exist
        cursor.execute("SELECT COUNT(*) FROM apartments_apartment WHERE building_id = 3")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("❌ Δεν βρέθηκαν διαμερίσματα στο κτίριο 3")
            return
        
        print(f"📊 Βρέθηκαν {count} διαμερίσματα")
        
        # Demo δεδομένα χιλιοστών
        mills_data = [
            (8.5, 85, 85),   # Διαμέρισμα 1
            (7.5, 75, 75),   # Διαμέρισμα 2
            (9.0, 90, 90),   # Διαμέρισμα 3
            (8.0, 80, 80),   # Διαμέρισμα 4
            (9.5, 95, 95),   # Διαμέρισμα 5
            (7.0, 70, 70),   # Διαμέρισμα 6
            (8.5, 85, 85),   # Διαμέρισμα 7
            (10.0, 100, 100), # Διαμέρισμα 8
            (7.5, 75, 75),   # Διαμέρισμα 9
            (9.0, 90, 90),   # Διαμέρισμα 10
            (8.0, 80, 80),   # Διαμέρισμα 11
            (9.5, 95, 95),   # Διαμέρισμα 12
        ]
        
        # Update apartments
        for i, (ownership_pct, heating, elevator) in enumerate(mills_data):
            cursor.execute("""
                UPDATE apartments_apartment 
                SET ownership_percentage = %s, heating_mills = %s, elevator_mills = %s
                WHERE building_id = 3 AND number = %s
            """, (ownership_pct, heating, elevator, i + 1))
            
            print(f"🏠 Διαμέρισμα {i + 1}: Ιδιοκτησίας={ownership_pct}%, Θέρμανσης={heating}χλ., Ανελκυστήρα={elevator}χλ.")
        
        # Commit changes
        conn.commit()
        print("\n✅ Επιτυχής προσθήκη demo δεδομένων χιλιοστών!")
        
        # Verify data
        print("\n📊 Επιβεβαίωση δεδομένων:")
        cursor.execute("""
            SELECT number, ownership_percentage, heating_mills, elevator_mills 
            FROM apartments_apartment 
            WHERE building_id = 3 
            ORDER BY number
        """)
        
        for row in cursor.fetchall():
            number, ownership, heating, elevator = row
            print(f"🏠 Διαμέρισμα {number}: Ιδιοκτησίας={ownership}%, Θέρμανσης={heating}χλ., Ανελκυστήρα={elevator}χλ.")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    add_demo_mills()


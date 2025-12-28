#!/usr/bin/env python3
"""
Script για έλεγχο του API endpoint apartments-summary
"""

import os
import sys
import django
import requests

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def test_api_endpoint():
    """Ελέγχει το API endpoint apartments-summary"""
    
    print("🌐 ΕΛΕΓΧΟΣ API ENDPOINT")
    print("=" * 50)
    
    # Test the API endpoint
    try:
        response = requests.get("http://localhost:8000/api/financial/building/3/apartments-summary/")
        
        print(f"📡 Status Code: {response.status_code}")
        print(f"📄 Content-Type: {response.headers.get('content-type', 'N/A')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Επιτυχία! Λήφθηκαν {len(data)} διαμερίσματα")
            
            if data:
                # Show first apartment data
                first_apt = data[0]
                print("\n📋 Πρώτο διαμέρισμα:")
                print(f"   ID: {first_apt.get('id')}")
                print(f"   Number: {first_apt.get('number')}")
                print(f"   Owner: {first_apt.get('owner_name')}")
                print(f"   Participation Mills: {first_apt.get('participation_mills')}")
                print(f"   Heating Mills: {first_apt.get('heating_mills')}")
                print(f"   Elevator Mills: {first_apt.get('elevator_mills')}")
                
                # Check if heating_mills are present
                heating_mills_present = any(apt.get('heating_mills') is not None for apt in data)
                elevator_mills_present = any(apt.get('elevator_mills') is not None for apt in data)
                
                print("\n🔍 Έλεγχος πεδίων:")
                print(f"   Heating Mills: {'✅' if heating_mills_present else '❌'}")
                print(f"   Elevator Mills: {'✅' if elevator_mills_present else '❌'}")
                
                if heating_mills_present:
                    total_heating = sum(apt.get('heating_mills', 0) or 0 for apt in data)
                    print(f"   Συνολικά Heating Mills: {total_heating}")
                
            else:
                print("⚠️ Δεν βρέθηκαν διαμερίσματα")
        else:
            print(f"❌ Σφάλμα: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Δεν μπορεί να συνδεθεί στο API")
        print("   Βεβαιωθείτε ότι το backend τρέχει")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    test_api_endpoint()

#!/usr/bin/env python3
"""
Script για έλεγχος των δεδομένων που στέλνει το API στο frontend
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance
# from financial.serializers import MonthlyBalanceSerializer

def check_api_data():
    """Έλεγχος των δεδομένων που στέλνει το API"""
    
    with schema_context('demo'):
        print("🔍 Έλεγχος API δεδομένων για MonthlyBalance")
        print("=" * 60)
        
        # Βρίσκουμε τους μήνες 07/2025, 08/2025, 09/2025
        months = [
            (2025, 7),
            (2025, 8), 
            (2025, 9)
        ]
        
        for year, month in months:
            balance = MonthlyBalance.objects.filter(
                building_id=1,
                year=year,
                month=month
            ).first()
            
            if balance:
                print(f"\n📊 {month:02d}/{year}:")
                print(f"   • Raw carry_forward: {balance.carry_forward}")
                print(f"   • Raw net_result: {balance.net_result}")
                print(f"   • Raw previous_obligations: {balance.previous_obligations}")
                
                # Προσομοίωση του API response (όπως στο ViewSet)
                api_data = {
                    'carry_forward': float(balance.carry_forward),
                    'net_result': float(balance.net_result),
                    'previous_obligations': float(balance.previous_obligations),
                }
                
                print(f"   • API carry_forward: {api_data.get('carry_forward', 'N/A')}")
                print(f"   • API net_result: {api_data.get('net_result', 'N/A')}")
                print(f"   • API previous_obligations: {api_data.get('previous_obligations', 'N/A')}")
                
                # Έλεγχος αν το carry_forward είναι 0 στο API
                api_carry_forward = api_data.get('carry_forward', 0)
                if api_carry_forward == 0:
                    print(f"   ❌ ΠΡΟΒΛΗΜΑ: carry_forward είναι 0 στο API!")
                else:
                    print(f"   ✅ carry_forward είναι σωστό στο API")
            else:
                print(f"\n❌ Δεν βρέθηκε MonthlyBalance για {month:02d}/{year}")

if __name__ == "__main__":
    check_api_data()

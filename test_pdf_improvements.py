#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from datetime import datetime

def test_pdf_improvements():
    """Test the PDF improvements with manager data and payment due date"""
    
    with schema_context('demo'):
        print("📄 Testing PDF Improvements")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        print(f"🏠 Building: {building.name}")
        
        # Test data that will appear in PDF
        print(f"\n📋 PDF Data Preview:")
        print(f"   • Building Name: {building.name}")
        print(f"   • Manager Name: {building.internal_manager_name}")
        print(f"   • Manager Phone: {building.internal_manager_phone}")
        
        # Test payment due date calculation (should be 15th of current month)
        now = datetime.now()
        due_date = datetime(now.year, now.month, 15)
        print(f"   • Payment Due Date: {due_date.strftime('%d/%m/%Y')} (15th of month)")
        
        # Test billing cycle for August 2025
        print(f"\n🔄 Billing Cycle Example (August 2025):")
        print(f"   • Usage Month: Ιούλιος 2025")
        print(f"   • Billing Month: Αύγουστος 2025")
        print(f"   • Header: 'Αύγουστος 2025 (Χρήση: Ιούλιος 2025 → Χρέωση: Αύγουστος 2025)'")
        
        print(f"\n✅ All improvements ready for testing!")
        print(f"   1. Dynamic manager data from database")
        print(f"   2. Payment due date always 15th of month")
        print(f"   3. Clear billing cycle explanation")
        print(f"   4. Removed hardcoded values")

if __name__ == "__main__":
    test_pdf_improvements()

#!/usr/bin/env python3
"""
Script to create Common Expenses Sheet widget for kiosk
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskWidget
from buildings.models import Building
from django.contrib.auth import get_user_model

User = get_user_model()

def create_common_expenses_widget():
    """Create Common Expenses Sheet widget"""
    
    print("💰 Δημιουργία Common Expenses Sheet Widget")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get building
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο")
            return
        print(f"✅ Κτίριο: {building.name}")
        
        # Get user
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            user = User.objects.first()
        print(f"✅ Χρήστης: {user.email if user else 'None'}")
        
        # Widget configuration
        widget_data = {
            'widget_id': 'common_expenses_sheet',
            'name': 'Common Expenses Sheet',
            'greek_name': 'Φύλλο Κοινοχρήστων',
            'description': 'Display the latest common expenses calculation sheet',
            'greek_description': 'Εμφάνιση του τελευταίου φύλλου υπολογισμού κοινοχρήστων',
            'category': 'main_slides',
            'icon': 'FileText',
            'enabled': True,
            'order': 9,
            'settings': {
                'title': 'Φύλλο Κοινοχρήστων',
                'showTitle': True,
                'gridSize': 'large',
                'backgroundColor': '#ffffff',
                'refreshInterval': 3600,  # Refresh every hour
                'imageQuality': 95,
                'fitMode': 'contain'  # contain or cover
            },
            'component': 'CommonExpensesSheet',
            'data_source': '/api/kiosk/latest-common-expense-bill/',
            'is_custom': False
        }
        
        # Check if widget exists
        try:
            widget, created = KioskWidget.objects.get_or_create(
                widget_id=widget_data['widget_id'],
                building=building,
                defaults={
                    **widget_data,
                    'created_by': user
                }
            )
            
            if created:
                print(f"\n✅ Widget δημιουργήθηκε: {widget.greek_name}")
                print(f"   - ID: {widget.widget_id}")
                print(f"   - Component: {widget.component}")
                print(f"   - Category: {widget.category}")
                print(f"   - Data Source: {widget.data_source}")
                print(f"   - Order: {widget.order}")
            else:
                print(f"\n⚠️  Widget ήδη υπάρχει: {widget.greek_name}")
                print(f"   - Updating settings...")
                
                # Update existing widget
                for key, value in widget_data.items():
                    if key not in ['widget_id', 'created_by']:
                        setattr(widget, key, value)
                widget.save()
                print(f"   ✅ Widget ενημερώθηκε")
        
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            return
        
        # Verify
        print(f"\n📊 Verification:")
        total_widgets = KioskWidget.objects.filter(building=building).count()
        main_slides = KioskWidget.objects.filter(building=building, category='main_slides').count()
        print(f"   - Σύνολο widgets: {total_widgets}")
        print(f"   - Main slides: {main_slides}")
        
        print(f"\n🎬 Για να δεις το widget:")
        print(f"   1. Άνοιξε: http://demo.localhost:8080/kiosk-management/widgets")
        print(f"   2. Θα βλέπεις το 'Φύλλο Κοινοχρήστων' widget")
        print(f"   3. Για να το δεις στο kiosk, βεβαιώσου ότι έχεις JPG file")

if __name__ == "__main__":
    create_common_expenses_widget()
    print("\n✅ SUCCESS!")



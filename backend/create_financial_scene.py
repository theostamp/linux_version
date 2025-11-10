#!/usr/bin/env python3
"""
Script to create Financial Information Scene
Layout:
- Left column (25%): Weather + QR Code
- Center (75% width, 70% height): Common Expenses Sheet
- Bottom center: Announcements
- Footer: News Ticker
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskWidget, KioskScene, WidgetPlacement
from buildings.models import Building
from django.contrib.auth import get_user_model

User = get_user_model()

def create_financial_scene():
    """Create Financial Information scene with Common Expenses Sheet"""
    
    print("💰 Δημιουργία Σκηνής: Οικονομική Ενημέρωση")
    print("=" * 70)
    
    with schema_context('demo'):
        # Get building
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο")
            return
        print(f"✅ Κτίριο: {building.name}")
        
        # Get user
        user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        print(f"✅ Χρήστης: {user.email if user else 'None'}")
        
        # Delete existing scene if exists
        existing = KioskScene.objects.filter(
            building=building,
            name="Οικονομική Ενημέρωση"
        ).first()
        
        if existing:
            print(f"⚠️  Η scene υπάρχει ήδη - διαγραφή...")
            existing.delete()
        
        # Create scene
        scene = KioskScene.objects.create(
            building=building,
            name="Οικονομική Ενημέρωση",
            order=2,
            duration_seconds=45,  # 45 seconds - more time to read the bill
            transition='fade',
            is_enabled=True,
            active_start_time="07:00:00",
            active_end_time="22:00:00",
            created_by=user
        )
        
        print(f"\n✅ Scene δημιουργήθηκε: {scene.name} (ID: {scene.id})")
        print(f"   - Διάρκεια: {scene.duration_seconds} δευτερόλεπτα")
        print(f"   - Ενεργή: {scene.active_start_time} - {scene.active_end_time}")
        print(f"   - Μετάβαση: {scene.transition}")
        
        # Define widgets layout
        # Grid: 8 rows x 12 columns
        # Left column: 3 cols (25%)
        # Center: 9 cols (75%)
        
        widgets_layout = [
            {
                'widget_id': 'weather_widget',
                'name': 'Καιρός',
                'row_start': 1, 'col_start': 1,
                'row_end': 4, 'col_end': 4,  # Rows 1-3, Cols 1-3
                'description': 'Αριστερά πάνω - Πρόγνωση καιρού (25% πλάτος)'
            },
            {
                'widget_id': 'qr_code_connection',
                'name': 'QR Code Σύνδεσης',
                'row_start': 4, 'col_start': 1,
                'row_end': 8, 'col_end': 4,  # Rows 4-7, Cols 1-3
                'description': 'Αριστερά κάτω - QR για σύνδεση (25% πλάτος)'
            },
            {
                'widget_id': 'common_expenses_sheet',
                'name': 'Φύλλο Κοινοχρήστων',
                'row_start': 1, 'col_start': 4,
                'row_end': 6, 'col_end': 13,  # Rows 1-5, Cols 4-12 (70% ύψος, 75% πλάτος)
                'description': 'Κέντρο - Φύλλο κοινοχρήστων JPG (75% πλάτος, 70% ύψος)'
            },
            {
                'widget_id': 'announcements',
                'name': 'Ανακοινώσεις',
                'row_start': 6, 'col_start': 4,
                'row_end': 8, 'col_end': 13,  # Rows 6-7, Cols 4-12
                'description': 'Κάτω κέντρο - Τελευταίες ανακοινώσεις (75% πλάτος)'
            },
            {
                'widget_id': 'news_ticker',
                'name': 'Ταινία Ειδήσεων',
                'row_start': 8, 'col_start': 1,
                'row_end': 9, 'col_end': 13,  # Row 8, Full width
                'description': 'Footer - Κυλιόμενες ειδήσεις (100% πλάτος)'
            },
        ]
        
        print(f"\n📦 Τοποθέτηση {len(widgets_layout)} Widgets:")
        print("-" * 70)
        
        created = 0
        for config in widgets_layout:
            try:
                widget = KioskWidget.objects.get(
                    widget_id=config['widget_id'],
                    building=building
                )
                
                placement = WidgetPlacement.objects.create(
                    scene=scene,
                    widget=widget,
                    grid_row_start=config['row_start'],
                    grid_col_start=config['col_start'],
                    grid_row_end=config['row_end'],
                    grid_col_end=config['col_end'],
                    z_index=0
                )
                
                width = config['col_end'] - config['col_start']
                height = config['row_end'] - config['row_start']
                
                print(f"✅ {widget.greek_name}")
                print(f"   Position: Row {config['row_start']}-{config['row_end']}, "
                      f"Col {config['col_start']}-{config['col_end']}")
                print(f"   Size: {height} rows x {width} cols")
                print(f"   {config['description']}")
                print()
                
                created += 1
                
            except KioskWidget.DoesNotExist:
                print(f"⚠️  Widget '{config['widget_id']}' δεν βρέθηκε - παραλείπεται")
                print()
            except Exception as e:
                print(f"❌ Σφάλμα: {e}")
                print()
        
        # Summary
        print("=" * 70)
        print(f"\n🎯 Ολοκληρώθηκε!")
        print(f"   - Scene: {scene.name}")
        print(f"   - ID: {scene.id}")
        print(f"   - Widgets: {created}/{len(widgets_layout)}")
        print(f"   - Grid: 8x12")
        print(f"   - Διάρκεια: {scene.duration_seconds}s")
        
        # Visual representation
        print(f"\n📐 Layout (Grid 8x12):")
        print("-" * 70)
        print("""
        Cols:  1   2   3 │  4   5   6   7   8   9  10  11  12
             ┌─────────────┼──────────────────────────────────┐
        1    │             │                                  │
        2    │   Καιρός    │                                  │
        3    │   (25%)     │   Φύλλο Κοινοχρήστων           │
             ├─────────────┤         (75% x 70%)              │
        4    │             │                                  │
        5    │  QR Code    │                                  │
             │  Σύνδεσης   ├──────────────────────────────────┤
        6    │   (25%)     │                                  │
        7    │             │     Ανακοινώσεις (75%)          │
             ├─────────────┴──────────────────────────────────┤
        8    │        Ειδήσεις - News Ticker (100%)          │
             └────────────────────────────────────────────────┘
        """)
        
        print(f"\n🌐 Για να δεις τη scene:")
        print(f"   URL: http://demo.localhost:8080/kiosk/1?mode=scene")
        print(f"   (Θα εναλλάσσεται με την 'Πρωινή Επισκόπηση' κάθε 30-45 δευτερόλεπτα)")
        
        # Show all scenes
        all_scenes = KioskScene.objects.filter(building=building, is_enabled=True).order_by('order')
        print(f"\n📋 Όλες οι Ενεργές Scenes ({all_scenes.count()}):")
        for s in all_scenes:
            print(f"   {s.order}. {s.name} - {s.placements.count()} widgets - {s.duration_seconds}s")

if __name__ == "__main__":
    create_financial_scene()
    print("\n✅ SUCCESS!")




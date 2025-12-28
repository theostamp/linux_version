#!/usr/bin/env python3
"""
Script to create a test kiosk scene
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

def create_test_scene():
    """Create a test kiosk scene with sample widgets"""
    
    print("🎬 Δημιουργία Δοκιμαστικής Scene")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get the building
        try:
            building = Building.objects.first()
            if not building:
                print("❌ Δεν βρέθηκε κτίριο")
                return
            print(f"✅ Κτίριο: {building.name}")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            return
        
        # Get user
        try:
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                user = User.objects.first()
            print(f"✅ Χρήστης: {user.email if user else 'None'}")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            user = None
        
        # Check if scene already exists
        existing_scene = KioskScene.objects.filter(
            building=building,
            name="Πρωινή Επισκόπηση"
        ).first()
        
        if existing_scene:
            print(f"⚠️  Η scene 'Πρωινή Επισκόπηση' υπάρχει ήδη (ID: {existing_scene.id})")
            print("   Θα τη διαγράψουμε και θα τη δημιουργήσουμε ξανά...")
            existing_scene.delete()
        
        # Create the scene
        try:
            scene = KioskScene.objects.create(
                building=building,
                name="Πρωινή Επισκόπηση",
                order=1,
                duration_seconds=30,
                transition='fade',
                is_enabled=True,
                active_start_time="07:00:00",
                active_end_time="20:00:00",
                created_by=user
            )
            print(f"\n✅ Scene δημιουργήθηκε: {scene.name} (ID: {scene.id})")
            print(f"   - Διάρκεια: {scene.duration_seconds} δευτερόλεπτα")
            print(f"   - Ενεργή: {scene.active_start_time} - {scene.active_end_time}")
            print(f"   - Μετάβαση: {scene.transition}")
        except Exception as e:
            print(f"❌ Σφάλμα δημιουργίας scene: {e}")
            return
        
        # Get widgets to place
        widgets_config = [
            {
                'widget_id': 'weather_widget',
                'name': 'Καιρός',
                'row_start': 1, 'col_start': 1,
                'row_end': 4, 'col_end': 5,
                'description': 'Μεγάλο widget αριστερά πάνω (3x4 cells)'
            },
            {
                'widget_id': 'announcements',
                'name': 'Ανακοινώσεις',
                'row_start': 1, 'col_start': 5,
                'row_end': 4, 'col_end': 8,
                'description': 'Μεγάλο widget δεξιά πάνω (3x3 cells)'
            },
            {
                'widget_id': 'emergency_contacts',
                'name': 'Έκτακτα Τηλέφωνα',
                'row_start': 4, 'col_start': 1,
                'row_end': 6, 'col_end': 8,
                'description': 'Μεγάλο widget κάτω (2x7 cells - full width)'
            },
        ]
        
        print(f"\n📦 Τοποθέτηση Widgets:")
        print("-" * 60)
        
        created_placements = 0
        for widget_config in widgets_config:
            try:
                # Get the widget
                widget = KioskWidget.objects.get(
                    widget_id=widget_config['widget_id'],
                    building=building
                )
                
                # Create placement
                placement = WidgetPlacement.objects.create(
                    scene=scene,
                    widget=widget,
                    grid_row_start=widget_config['row_start'],
                    grid_col_start=widget_config['col_start'],
                    grid_row_end=widget_config['row_end'],
                    grid_col_end=widget_config['col_end'],
                    z_index=0
                )
                
                print(f"✅ {widget.greek_name}")
                print(f"   Position: ({widget_config['row_start']},{widget_config['col_start']}) → "
                      f"({widget_config['row_end']},{widget_config['col_end']})")
                print(f"   {widget_config['description']}")
                print()
                
                created_placements += 1
                
            except KioskWidget.DoesNotExist:
                print(f"⚠️  Widget '{widget_config['widget_id']}' δεν βρέθηκε - παραλείπεται")
            except Exception as e:
                print(f"❌ Σφάλμα τοποθέτησης widget '{widget_config['name']}': {e}")
        
        # Summary
        print("=" * 60)
        print(f"\n🎯 Ολοκληρώθηκε!")
        print(f"   - Scene ID: {scene.id}")
        print(f"   - Όνομα: {scene.name}")
        print(f"   - Widgets: {created_placements}/{len(widgets_config)}")
        print(f"   - Grid: 8x12 (rows x cols)")
        
        # Visual representation
        print(f"\n📊 Visual Layout (Grid 8x12):")
        print("-" * 60)
        print("""
        Columns: 1   2   3   4   5   6   7   8   9   10  11  12
                 ┌───────────────────┬───────────────┐
        Row 1    │                   │               │
        Row 2    │     Καιρός        │ Ανακοινώσεις  │
        Row 3    │    (Large)        │   (Large)     │
        Row 4    │                   │               │
                 ├───────────────────┴───────────────┤
        Row 5    │                                   │
        Row 6    │      Επείγοντα Τηλέφωνα (Full)    │
                 └───────────────────────────────────┘
        """)
        
        print(f"\n🌐 Για να δεις τη scene:")
        print(f"   1. Άνοιξε: http://demo.localhost:8080/kiosk?mode=scene")
        print(f"   2. Ή χρησιμοποίησε το Scene API endpoint")
        print(f"   3. Η scene θα εμφανίζεται 07:00-20:00 για 30 δευτερόλεπτα")
        
        # Return scene info
        return {
            'scene_id': scene.id,
            'scene_name': scene.name,
            'placements': created_placements,
            'building': building.name
        }

if __name__ == "__main__":
    result = create_test_scene()
    if result:
        print(f"\n✅ SUCCESS: Scene '{result['scene_name']}' created!")




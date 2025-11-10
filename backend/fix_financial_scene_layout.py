#!/usr/bin/env python3
"""
Fix Financial Scene Layout:
- Left column: 20% (2.4 cols ≈ cols 1-3)
- Center: 80% (remaining cols 3-12)
- Fix news ticker to be within 8 rows
"""

import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskScene, WidgetPlacement

def fix_layout():
    print("🔧 Διόρθωση Layout: Οικονομική Ενημέρωση")
    print("=" * 70)
    
    with schema_context('demo'):
        scene = KioskScene.objects.get(name='Οικονομική Ενημέρωση')
        print(f"✅ Scene: {scene.name}")
        
        # Delete all placements
        scene.placements.all().delete()
        print(f"🗑️  Διαγράφηκαν παλιές τοποθετήσεις")
        
        # New layout
        # Grid: 8 rows x 12 cols
        # Left: cols 1-3 (20%)
        # Center: cols 3-13 (80%)
        
        new_layout = [
            {
                'widget_id': 'weather_widget',
                'row_start': 1, 'col_start': 1,
                'row_end': 4, 'col_end': 3,  # Rows 1-3, Cols 1-2 (20%)
                'description': 'Αριστερά πάνω - Καιρός (20% πλάτος)'
            },
            {
                'widget_id': 'qr_code_connection',
                'row_start': 4, 'col_start': 1,
                'row_end': 8, 'col_end': 3,  # Rows 4-7, Cols 1-2 (20%)
                'description': 'Αριστερά κάτω - QR Code (20% πλάτος)'
            },
            {
                'widget_id': 'common_expenses_sheet',
                'row_start': 1, 'col_start': 3,
                'row_end': 6, 'col_end': 13,  # Rows 1-5, Cols 3-12 (70% ύψος, 80% πλάτος)
                'description': 'Κέντρο - Φύλλο κοινοχρήστων (80% πλάτος, 70% ύψος)'
            },
            {
                'widget_id': 'announcements',
                'row_start': 6, 'col_start': 3,
                'row_end': 8, 'col_end': 13,  # Rows 6-7, Cols 3-12 (30% ύψος, 80% πλάτος)
                'description': 'Κάτω κέντρο - Ανακοινώσεις (80% πλάτος, 30% ύψος)'
            },
            # News ticker removed - will be shown as special widget outside grid
        ]
        
        print(f"\n📦 Νέα Τοποθέτηση ({len(new_layout)} widgets):")
        print("-" * 70)
        
        created = 0
        from kiosk.models import KioskWidget
        
        for config in new_layout:
            try:
                widget = KioskWidget.objects.get(
                    widget_id=config['widget_id'],
                    building=scene.building
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
                width_pct = (width / 12) * 100
                
                print(f"✅ {widget.greek_name}")
                print(f"   Position: Row {config['row_start']}-{config['row_end']}, "
                      f"Col {config['col_start']}-{config['col_end']}")
                print(f"   Size: {height} rows x {width} cols (~{width_pct:.0f}% πλάτος)")
                print(f"   {config['description']}")
                print()
                
                created += 1
                
            except Exception as e:
                print(f"❌ Σφάλμα: {e}")
                print()
        
        print("=" * 70)
        print(f"\n📐 Νέο Layout (Grid 8x12):")
        print("-" * 70)
        print("""
        Cols:  1  2│ 3   4   5   6   7   8   9  10  11  12
             ┌──────┼────────────────────────────────────┐
        1    │      │                                    │
        2    │Καιρός│                                    │
        3    │ 20% │   Φύλλο Κοινοχρήστων 💰          │
        ├──────┤        (80% x 70%)                 │
        4    │      │                                    │
        5    │ QR   │                                    │
        6    │Code  ├────────────────────────────────────┤
        7    │ 20% │     Ανακοινώσεις 📢 (80%)         │
             └──────┴────────────────────────────────────┘
        
        Note: News Ticker αφαιρέθηκε από το grid (θα εμφανίζεται
              ως special widget ή θα το προσθέσουμε αργότερα)
        """)
        
        print(f"\n✅ Διόρθωση ολοκληρώθηκε!")
        print(f"   - Scene: {scene.name}")
        print(f"   - Widgets: {created}/{len(new_layout)}")
        print(f"   - Αριστερή στήλη: 20% (~2 cols)")
        print(f"   - Κεντρική περιοχή: 80% (~10 cols)")

if __name__ == "__main__":
    fix_layout()




#!/usr/bin/env python3
"""
Optimize Financial Scene Layout:
- Increase Common Expenses Sheet to 87.5% height (7 rows)
- Reduce Announcements to 1 row (12.5% height)
"""

import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskScene, WidgetPlacement, KioskWidget

def optimize_layout():
    print("⚡ Βελτιστοποίηση Layout: Οικονομική Ενημέρωση")
    print("=" * 70)
    
    with schema_context('demo'):
        scene = KioskScene.objects.get(name='Οικονομική Ενημέρωση')
        print(f"✅ Scene: {scene.name}")
        
        # Delete existing placements
        scene.placements.all().delete()
        print(f"🗑️  Διαγράφηκαν παλιές τοποθετήσεις")
        
        # Optimized layout
        # Grid: 8 rows x 12 cols
        # Left: cols 1-3 (20%)
        # Right: cols 3-13 (80%)
        
        optimized_layout = [
            {
                'widget_id': 'weather_widget',
                'row_start': 1, 'col_start': 1,
                'row_end': 4, 'col_end': 3,
                'description': 'Αριστερά πάνω - Καιρός (20%, 37.5% ύψος)'
            },
            {
                'widget_id': 'qr_code_connection',
                'row_start': 4, 'col_start': 1,
                'row_end': 8, 'col_end': 3,
                'description': 'Αριστερά κάτω - QR Code (20%, 50% ύψος)'
            },
            {
                'widget_id': 'common_expenses_sheet',
                'row_start': 1, 'col_start': 3,
                'row_end': 8, 'col_end': 13,  # ⭐ NOW: Rows 1-7 (87.5% ύψος!)
                'description': 'Κέντρο - Φύλλο κοινοχρήστων (80% πλάτος, 87.5% ύψος) ⭐ ΜΕΓΑΛΥΤΕΡΟ!'
            },
            {
                'widget_id': 'announcements',
                'row_start': 8, 'col_start': 3,
                'row_end': 9, 'col_end': 13,  # ⭐ NOW: Row 8 only (12.5% ύψος - compact)
                'description': 'Κάτω - Ανακοινώσεις σε 1 γραμμή (80% πλάτος, 12.5% ύψος - compact)'
            },
        ]
        
        print(f"\n📦 Βελτιστοποιημένη Τοποθέτηση ({len(optimized_layout)} widgets):")
        print("-" * 70)
        
        created = 0
        
        for config in optimized_layout:
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
                height_pct = (height / 8) * 100
                
                emoji = "⭐" if widget.widget_id == 'common_expenses_sheet' else ""
                
                print(f"✅ {widget.greek_name} {emoji}")
                print(f"   Position: Row {config['row_start']}-{config['row_end']}, "
                      f"Col {config['col_start']}-{config['col_end']}")
                print(f"   Size: {height} rows x {width} cols "
                      f"(~{width_pct:.0f}% πλάτος x {height_pct:.1f}% ύψος)")
                print(f"   {config['description']}")
                print()
                
                created += 1
                
            except Exception as e:
                print(f"❌ Σφάλμα: {e}")
                print()
        
        print("=" * 70)
        print(f"\n📐 Βελτιστοποιημένο Layout (Grid 8x12):")
        print("-" * 70)
        print("""
        Cols:  1  2│ 3   4   5   6   7   8   9  10  11  12
             ┌──────┼────────────────────────────────────┐
        1    │      │                                    │
        2    │Καιρός│                                    │
        3    │ 20% │                                    │
             ├──────┤   💰 Φύλλο Κοινοχρήστων          │
        4    │      │        (80% x 87.5% ύψος!)        │
        5    │ QR   │                                    │
        6    │Code  │      ⭐ ΜΕΓΑΛΥΤΕΡΟ! ⭐            │
        7    │ 20% │                                    │
             │      ├────────────────────────────────────┤
        8    │      │  📢 Ανακοινώσεις (1 row, compact) │
             └──────┴────────────────────────────────────┘
        """)
        
        print(f"\n✅ Βελτιστοποίηση ολοκληρώθηκε!")
        print(f"   - Φύλλο Κοινοχρήστων: +16.7% ύψος (5→7 rows)")
        print(f"   - Ανακοινώσεις: Compact σε 1 row")
        print(f"   - Περισσότερος χώρος για ανάγνωση του φύλλου!")

if __name__ == "__main__":
    optimize_layout()
    print("\n✅ SUCCESS!")


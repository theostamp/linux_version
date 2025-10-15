#!/usr/bin/env python3
"""Update Kiosk Scene - Replace Building Statistics with Weather"""

import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskScene, WidgetPlacement, KioskWidget
from buildings.models import Building

print("🔄 Ενημέρωση Kiosk Scene...")

with schema_context('demo'):
    building = Building.objects.first()
    scene = KioskScene.objects.get(name='Πρωινή Επισκόπηση')
    
    # Delete existing placements
    old_count = WidgetPlacement.objects.filter(scene=scene).count()
    WidgetPlacement.objects.filter(scene=scene).delete()
    print(f"✅ Διαγράφηκαν {old_count} παλιά placements")
    
    # New widgets config
    widgets_config = [
        {
            'widget_id': 'weather_widget',
            'name': 'Καιρός',
            'row_start': 1, 'col_start': 1,
            'row_end': 4, 'col_end': 5
        },
        {
            'widget_id': 'announcements',
            'name': 'Ανακοινώσεις',
            'row_start': 1, 'col_start': 5,
            'row_end': 4, 'col_end': 8
        },
        {
            'widget_id': 'emergency_contacts',
            'name': 'Επείγοντα Τηλέφωνα',
            'row_start': 4, 'col_start': 1,
            'row_end': 6, 'col_end': 8
        },
    ]
    
    created = 0
    for config in widgets_config:
        try:
            widget = KioskWidget.objects.get(widget_id=config['widget_id'], building=building)
            WidgetPlacement.objects.create(
                scene=scene,
                widget=widget,
                grid_row_start=config['row_start'],
                grid_col_start=config['col_start'],
                grid_row_end=config['row_end'],
                grid_col_end=config['col_end'],
                z_index=0
            )
            print(f"✅ {widget.greek_name} - Position: ({config['row_start']},{config['col_start']}) → ({config['row_end']},{config['col_end']})")
            created += 1
        except KioskWidget.DoesNotExist:
            print(f"⚠️ Widget '{config['widget_id']}' δεν βρέθηκε")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
    
    print(f"\n🎯 Ολοκλήρωση: {created}/{len(widgets_config)} widgets τοποθετήθηκαν επιτυχώς")
    print(f"📺 Scene: {scene.name} (ID: {scene.id})")
    print(f"\nΝέο Layout:")
    print("  - Καιρός: Αριστερά πάνω")
    print("  - Ανακοινώσεις: Δεξιά πάνω")
    print("  - Επείγοντα Τηλέφωνα: Κάτω (full width)")



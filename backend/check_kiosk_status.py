#!/usr/bin/env python
"""
Script to check kiosk status in demo tenant
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskScene, KioskWidget
from buildings.models import Building

print("=" * 60)
print("KIOSK STATUS CHECK")
print("=" * 60)

with schema_context('demo'):
    buildings = Building.objects.all()
    print(f"\n✓ Buildings: {buildings.count()}")
    for building in buildings[:3]:
        print(f"  - {building.id}: {building.name}")
    
    widgets = KioskWidget.objects.all()
    print(f"\n✓ Widgets: {widgets.count()}")
    for widget in widgets[:5]:
        print(f"  - {widget.widget_id}: {widget.greek_name}")
    
    scenes = KioskScene.objects.all()
    print(f"\n✓ Scenes: {scenes.count()}")
    for scene in scenes[:5]:
        print(f"  - {scene.id}: {scene.name} ({scene.placements.count()} placements)")

print("\n" + "=" * 60)



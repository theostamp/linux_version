#!/usr/bin/env python3
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from kiosk.models import KioskScene, WidgetPlacement

with schema_context('demo'):
    scenes = KioskScene.objects.all()
    print(f"📊 Total scenes: {scenes.count()}\n")
    
    for scene in scenes:
        placements = scene.placements.all()
        print(f"🎬 Scene: {scene.name}")
        print(f"   - ID: {scene.id}")
        print(f"   - Duration: {scene.duration_seconds}s")
        print(f"   - Active: {scene.active_start_time} - {scene.active_end_time}")
        print(f"   - Widgets: {placements.count()}")
        print(f"   - Enabled: {'✅' if scene.is_enabled else '❌'}")
        
        for p in placements:
            print(f"     • {p.widget.greek_name}: ({p.grid_row_start},{p.grid_col_start}) → ({p.grid_row_end},{p.grid_col_end})")
        print()


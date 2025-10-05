#!/usr/bin/env python
"""
Toggle a specific widget's enabled status
Usage: python toggle_widget.py <widget_id> [true|false]
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

def toggle_widget(widget_id, enabled=None):
    """Toggle widget enabled status"""
    with schema_context('demo'):
        try:
            widget = KioskWidget.objects.get(widget_id=widget_id)

            if enabled is None:
                # Toggle
                widget.enabled = not widget.enabled
            else:
                # Set specific value
                widget.enabled = enabled

            widget.save()

            status = "ENABLED ✓" if widget.enabled else "DISABLED ✗"
            print(f"{status} {widget.greek_name} ({widget.component})")

        except KioskWidget.DoesNotExist:
            print(f"✗ Widget '{widget_id}' not found!")
            print("\nAvailable widgets:")
            for w in KioskWidget.objects.all():
                status = "✓" if w.enabled else "✗"
                print(f"  [{status}] {w.widget_id} - {w.greek_name}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python toggle_widget.py <widget_id> [true|false]")
        print("\nExample: python toggle_widget.py financial_overview false")
        sys.exit(1)

    widget_id = sys.argv[1]
    enabled = None

    if len(sys.argv) >= 3:
        enabled = sys.argv[2].lower() in ['true', '1', 'yes', 'on']

    toggle_widget(widget_id, enabled)

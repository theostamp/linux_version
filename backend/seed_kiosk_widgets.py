#!/usr/bin/env python
"""
Seed kiosk widgets to database from frontend registry
This script populates the database with default widget configurations
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

# Default widget configurations (from frontend/lib/kiosk/widgets/registry.ts)
DEFAULT_WIDGETS = [
    # Main Slides
    {
        'widget_id': 'dashboard_overview',
        'name': 'Dashboard Overview',
        'greek_name': 'Επισκόπηση Κτιρίου',
        'description': 'Building overview with key statistics',
        'greek_description': 'Επισκόπηση κτιρίου με βασικά στατιστικά',
        'category': 'main_slides',
        'component': 'DashboardWidget',
        'icon': 'Home',
        'enabled': True,
        'order': 1,
        'settings': {
            'title': 'Επισκόπηση Κτιρίου',
            'showTitle': True,
            'gridSize': 'large',
            'backgroundColor': '#0F172A',
            'dataSource': '/api/public-info',
            'refreshInterval': 300,
        },
    },
    {
        'widget_id': 'announcements',
        'name': 'Announcements',
        'greek_name': 'Ανακοινώσεις',
        'description': 'Latest building announcements',
        'greek_description': 'Τελευταίες ανακοινώσεις κτιρίου',
        'category': 'main_slides',
        'component': 'AnnouncementsWidget',
        'icon': 'Bell',
        'enabled': True,
        'order': 2,
        'settings': {
            'title': 'Ανακοινώσεις',
            'showTitle': True,
            'gridSize': 'large',
            'displayLimit': 3,
            'maxItems': 3,
            'backgroundColor': '#1E293B',
            'dataSource': '/api/announcements',
            'refreshInterval': 180,
        },
    },
    {
        'widget_id': 'general_assembly',
        'name': 'General Assembly',
        'greek_name': 'Γενική Συνέλευση',
        'description': 'Upcoming general assembly information',
        'greek_description': 'Πληροφορίες επερχόμενης γενικής συνέλευσης',
        'category': 'main_slides',
        'component': 'AssemblyWidget',
        'icon': 'Calendar',
        'enabled': True,
        'order': 2.5,
        'settings': {
            'title': 'Γενική Συνέλευση',
            'showTitle': True,
            'gridSize': 'large',
            'backgroundColor': '#6B21A8',
            'dataSource': '/api/public-info',
            'refreshInterval': 300,
        },
    },
    {
        'widget_id': 'active_votes',
        'name': 'Active Votes',
        'greek_name': 'Ψηφοφορίες',
        'description': 'Current voting sessions',
        'greek_description': 'Τρέχουσες ψηφοφορίες',
        'category': 'main_slides',
        'component': 'VotesWidget',
        'icon': 'Vote',
        'enabled': True,
        'order': 3,
        'settings': {
            'title': 'Ψηφοφορίες',
            'showTitle': True,
            'gridSize': 'medium',
            'displayLimit': 2,
            'maxItems': 2,
            'backgroundColor': '#0F766E',
            'dataSource': '/api/votes',
            'refreshInterval': 300,
        },
    },
    {
        'widget_id': 'financial_overview',
        'name': 'Financial Overview',
        'greek_name': 'Οικονομικά Στοιχεία',
        'description': 'Financial information and common expenses',
        'greek_description': 'Οικονομικές πληροφορίες και κοινόχρηστα',
        'category': 'main_slides',
        'component': 'FinancialWidget',
        'icon': 'DollarSign',
        'enabled': True,
        'order': 4,
        'settings': {
            'title': 'Οικονομικά Στοιχεία',
            'showTitle': True,
            'gridSize': 'large',
            'backgroundColor': '#059669',
            'dataSource': '/api/financial',
            'refreshInterval': 600,
        },
    },
    {
        'widget_id': 'maintenance_services',
        'name': 'Maintenance & Services',
        'greek_name': 'Συντήρηση & Υπηρεσίες',
        'description': 'Maintenance schedules and service information',
        'greek_description': 'Πρόγραμμα συντήρησης και πληροφορίες υπηρεσιών',
        'category': 'main_slides',
        'component': 'MaintenanceWidget',
        'icon': 'Wrench',
        'enabled': True,
        'order': 5,
        'settings': {
            'title': 'Συντήρηση & Υπηρεσίες',
            'showTitle': True,
            'gridSize': 'medium',
            'backgroundColor': '#D97706',
            'displayLimit': 3,
            'maxItems': 3,
            'dataSource': '/api/maintenance',
            'refreshInterval': 300,
        },
    },
]

def seed_widgets():
    """Seed kiosk widgets to database"""
    with schema_context('demo'):
        # Get the main building (Building ID 1 - Αλκμάνος 22)
        try:
            building = Building.objects.get(id=1)
            print(f"✓ Found building: {building.name}")
        except Building.DoesNotExist:
            print("✗ Building with ID 1 not found!")
            return

        created_count = 0
        updated_count = 0

        for widget_data in DEFAULT_WIDGETS:
            widget_id = widget_data['widget_id']

            # Check if widget already exists
            existing_widget = KioskWidget.objects.filter(widget_id=widget_id, building=building).first()

            if existing_widget:
                # Update existing widget
                for field, value in widget_data.items():
                    if field != 'widget_id':  # Don't update the ID
                        setattr(existing_widget, field, value)
                existing_widget.building = building
                existing_widget.save()
                print(f"✓ Updated widget: {widget_data['greek_name']} (enabled={widget_data['enabled']})")
                updated_count += 1
            else:
                # Create new widget
                widget = KioskWidget.objects.create(
                    widget_id=widget_id,
                    name=widget_data['name'],
                    greek_name=widget_data['greek_name'],
                    description=widget_data['description'],
                    greek_description=widget_data['greek_description'],
                    category=widget_data['category'],
                    component=widget_data['component'],
                    icon=widget_data['icon'],
                    enabled=widget_data['enabled'],
                    order=widget_data['order'],
                    settings=widget_data['settings'],
                    building=building,
                )
                print(f"✓ Created widget: {widget_data['greek_name']} (enabled={widget_data['enabled']})")
                created_count += 1

        print(f"\n{'='*60}")
        print(f"Seed completed!")
        print(f"  Created: {created_count} widgets")
        print(f"  Updated: {updated_count} widgets")
        print(f"  Total: {created_count + updated_count} widgets")
        print(f"{'='*60}\n")

        # Display current state
        all_widgets = KioskWidget.objects.filter(building=building).order_by('order')
        print("Current widgets in database:")
        for w in all_widgets:
            status = "✓ ENABLED" if w.enabled else "✗ DISABLED"
            print(f"  [{status}] {w.greek_name} ({w.component})")

if __name__ == '__main__':
    seed_widgets()

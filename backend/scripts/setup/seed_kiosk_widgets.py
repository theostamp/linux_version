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
        'widget_id': 'common_expense_bill',
        'name': 'Common Expense Bill',
        'greek_name': 'Φύλλο Κοινόχρηστων',
        'description': 'Current common expense bill as generated image',
        'greek_description': 'Τρέχον φύλλο κοινόχρηστων ως εικόνα',
        'category': 'main_slides',
        'component': 'CommonExpenseBillWidget',
        'icon': 'FileText',
        'enabled': True,
        'order': 3.5,
        'settings': {
            'title': 'Φύλλο Κοινόχρηστων',
            'showTitle': True,
            'gridSize': 'large',
            'backgroundColor': '#059669',
            'dataSource': '/api/common-expense-bills',
            'refreshInterval': 600,
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
    {
        'widget_id': 'projects_construction',
        'name': 'Projects & Construction',
        'greek_name': 'Έργα & Κατασκευές',
        'description': 'Ongoing projects and construction updates',
        'greek_description': 'Συνεχιζόμενα έργα και ενημερώσεις κατασκευών',
        'category': 'main_slides',
        'component': 'ProjectsWidget',
        'icon': 'FolderOpen',
        'enabled': False,
        'order': 6,
        'settings': {
            'title': 'Έργα & Κατασκευές',
            'showTitle': True,
            'gridSize': 'medium',
            'backgroundColor': '#0284C5',
            'dataSource': '/api/projects',
            'refreshInterval': 600,
        },
    },
    {
        'widget_id': 'emergency_contacts',
        'name': 'Emergency Contacts',
        'greek_name': 'Επείγοντα Τηλέφωνα',
        'description': 'Emergency contacts and safety information',
        'greek_description': 'Επείγοντα τηλέφωνα και πληροφορίες ασφαλείας',
        'category': 'main_slides',
        'component': 'EmergencyWidget',
        'icon': 'AlertTriangle',
        'enabled': True,
        'order': 7,
        'settings': {
            'title': 'Επείγοντα Τηλέφωνα',
            'showTitle': True,
            'gridSize': 'medium',
            'backgroundColor': '#DC2626',
            'refreshInterval': 86400,
        },
    },
    {
        'widget_id': 'building_statistics',
        'name': 'Building Statistics',
        'greek_name': 'Στατιστικά Κτιρίου',
        'description': 'Building statistics and metrics',
        'greek_description': 'Στατιστικά κτιρίου και μετρικές',
        'category': 'main_slides',
        'component': 'StatisticsWidget',
        'icon': 'BarChart3',
        'enabled': False,
        'order': 8,
        'settings': {
            'title': 'Στατιστικά Κτιρίου',
            'showTitle': True,
            'gridSize': 'medium',
            'backgroundColor': '#059669',
            'dataSource': '/api/statistics',
            'refreshInterval': 600,
        },
    },

    # Sidebar Widgets
    {
        'widget_id': 'current_time',
        'name': 'Current Time',
        'greek_name': 'Τρέχουσα Ώρα',
        'description': 'Current date and time display',
        'greek_description': 'Εμφάνιση τρέχουσας ημερομηνίας και ώρας',
        'category': 'sidebar_widgets',
        'component': 'TimeWidget',
        'icon': 'Clock',
        'enabled': False,
        'order': 1,
        'settings': {
            'showTitle': False,
            'gridSize': 'small',
            'backgroundColor': '#1e293b',
            'textColor': '#ffffff',
            'refreshInterval': 1,
        },
    },
    {
        'widget_id': 'qr_code',
        'name': 'QR Code',
        'greek_name': 'QR Κωδικός',
        'description': 'QR code for building information',
        'greek_description': 'QR κωδικός για πληροφορίες κτιρίου',
        'category': 'sidebar_widgets',
        'component': 'QRCodeWidget',
        'icon': 'QrCode',
        'enabled': False,
        'order': 2,
        'settings': {
            'title': 'Σάρωση για Πληροφορίες',
            'showTitle': True,
            'gridSize': 'small',
            'backgroundColor': '#0F172A',
        },
    },
    {
        'widget_id': 'weather_display',
        'name': 'Weather Display',
        'greek_name': 'Εμφάνιση Καιρού',
        'description': 'Current weather conditions',
        'greek_description': 'Τρέχουσες συνθήκες καιρού',
        'category': 'sidebar_widgets',
        'component': 'WeatherWidget',
        'icon': 'Cloud',
        'enabled': False,
        'order': 3,
        'settings': {
            'showTitle': False,
            'gridSize': 'small',
            'backgroundColor': '#0ea5e9',
            'textColor': '#ffffff',
            'dataSource': 'weather-api',
            'refreshInterval': 600,
        },
    },
    {
        'widget_id': 'manager_information',
        'name': 'Manager Information',
        'greek_name': 'Πληροφορίες Διαχειριστή',
        'description': 'Building manager contact information',
        'greek_description': 'Πληροφορίες επαφής διαχειριστή κτιρίου',
        'category': 'sidebar_widgets',
        'component': 'ManagerWidget',
        'icon': 'Phone',
        'enabled': True,
        'order': 4,
        'settings': {
            'title': 'Διαχειριστής',
            'showTitle': True,
            'gridSize': 'small',
            'backgroundColor': '#1E293B',
            'dataSource': '/api/manager-info',
            'refreshInterval': 86400,
        },
    },
    {
        'widget_id': 'community_message',
        'name': 'Community Message',
        'greek_name': 'Μήνυμα Κοινότητας',
        'description': 'Community message or notice',
        'greek_description': 'Μήνυμα ή ειδοποίηση κοινότητας',
        'category': 'sidebar_widgets',
        'component': 'CommunityWidget',
        'icon': 'Mail',
        'enabled': False,
        'order': 5,
        'settings': {
            'title': 'Μήνυμα Κοινότητας',
            'showTitle': True,
            'gridSize': 'small',
            'backgroundColor': '#0D9488',
        },
    },
    {
        'widget_id': 'advertising_banner',
        'name': 'Advertising Banner',
        'greek_name': 'Διαφημιστικό Banner',
        'description': 'Advertising or promotional content',
        'greek_description': 'Διαφημιστικό ή προωθητικό περιεχόμενο',
        'category': 'sidebar_widgets',
        'component': 'AdvertisingWidget',
        'icon': 'Package',
        'enabled': False,
        'order': 6,
        'settings': {
            'showTitle': False,
            'gridSize': 'small',
            'backgroundColor': '#1E293B',
        },
    },

    # Top Bar Widgets
    {
        'widget_id': 'weather_top_bar',
        'name': 'Weather Top Bar',
        'greek_name': 'Καιρός Top Bar',
        'description': 'Compact weather display for top bar',
        'greek_description': 'Συμπαγής εμφάνιση καιρού για την κορυφή',
        'category': 'top_bar_widgets',
        'component': 'WeatherTopBarWidget',
        'icon': 'Cloud',
        'enabled': True,
        'order': 1,
        'settings': {
            'showTitle': False,
            'backgroundColor': 'transparent',
            'textColor': '#ffffff',
            'dataSource': 'weather-api',
            'refreshInterval': 600,
        },
    },
    {
        'widget_id': 'advertising_top_bar',
        'name': 'Advertising Top Bar',
        'greek_name': 'Διαφημιστικό Top Bar',
        'description': 'Rotating advertisements in top bar',
        'greek_description': 'Περιστρεφόμενες διαφημίσεις στην κορυφή',
        'category': 'top_bar_widgets',
        'component': 'AdvertisingTopBarWidget',
        'icon': 'Package',
        'enabled': False,
        'order': 2,
        'settings': {
            'showTitle': False,
            'backgroundColor': 'transparent',
            'animationType': 'slide',
            'animationDuration': 3000,
        },
    },

    # Special Widgets
    {
        'widget_id': 'urgent_priorities',
        'name': 'Urgent Priorities',
        'greek_name': 'Άμεσες Προτεραιότητες',
        'description': 'Immediate priorities and urgent tasks',
        'greek_description': 'Άμεσες προτεραιότητες και επείγοντα καθήκοντα',
        'category': 'special_widgets',
        'component': 'UrgentPrioritiesWidget',
        'icon': 'AlertTriangle',
        'enabled': True,
        'order': 1,
        'settings': {
            'title': 'Άμεσες Προτεραιότητες',
            'showTitle': True,
            'gridSize': 'large',
            'backgroundColor': '#DC2626',
            'maxItems': 5,
            'showDueDates': True,
            'showContact': True,
            'dataSource': '/api/urgent-priorities',
            'refreshInterval': 300,
        },
    },
    {
        'widget_id': 'news_ticker',
        'name': 'News Ticker',
        'greek_name': 'News Ticker',
        'description': 'Scrolling news ticker',
        'greek_description': 'Κυλιόμενο ticker ειδήσεων',
        'category': 'special_widgets',
        'component': 'NewsTickerWidget',
        'icon': 'Bell',
        'enabled': False,
        'order': 2,
        'settings': {
            'showTitle': False,
            'backgroundColor': '#1e293b',
            'textColor': '#ffffff',
            'animationType': 'slide',
            'animationDuration': 10000,
            'dataSource': '/api/news',
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

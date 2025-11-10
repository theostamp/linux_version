#!/usr/bin/env python3
"""
Script to create default kiosk widgets for the demo building
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
from django.contrib.auth import get_user_model

User = get_user_model()

def create_default_widgets():
    """Create default kiosk widgets for the demo building"""
    
    print("🎯 Creating Default Kiosk Widgets")
    print("=" * 50)
    
    with schema_context('demo'):
        # Get the demo building
        try:
            building = Building.objects.first()
            if not building:
                print("❌ No buildings found")
                return
            print(f"✅ Found building: {building.name}")
        except Exception as e:
            print(f"❌ Error getting building: {e}")
            return
        
        # Get or create a user for the widgets
        try:
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                user = User.objects.first()
            print(f"✅ Using user: {user.email if user else 'None'}")
        except Exception as e:
            print(f"❌ Error getting user: {e}")
            user = None
        
        # Default widgets configuration
        default_widgets = [
            # Main Slides
            {
                'widget_id': 'dashboard_overview',
                'name': 'Dashboard Overview',
                'greek_name': 'Επισκόπηση Κτιρίου',
                'description': 'Overview of building information, announcements, and key metrics',
                'greek_description': 'Επισκόπηση πληροφοριών κτιρίου, ανακοινώσεων και βασικών μετρικών',
                'category': 'main_slides',
                'icon': 'Home',
                'enabled': True,
                'order': 1,
                'settings': {},
                'component': 'DashboardOverview',
                'data_source': 'public_info',
                'is_custom': False
            },
            {
                'widget_id': 'building_statistics',
                'name': 'Building Statistics',
                'greek_name': 'Στατιστικά Κτιρίου',
                'description': 'Building occupancy, residents, parking, and storage statistics',
                'greek_description': 'Στατιστικά πληρότητας, κατοίκων, parking και αποθηκών',
                'category': 'main_slides',
                'icon': 'Building',
                'enabled': True,
                'order': 2,
                'settings': {},
                'component': 'BuildingStatistics',
                'data_source': 'building_info',
                'is_custom': False
            },
            {
                'widget_id': 'announcements',
                'name': 'Announcements',
                'greek_name': 'Ανακοινώσεις',
                'description': 'Latest building announcements and important notices',
                'greek_description': 'Τελευταίες ανακοινώσεις κτιρίου και σημαντικές ειδοποιήσεις',
                'category': 'main_slides',
                'icon': 'Bell',
                'enabled': True,
                'order': 3,
                'settings': {},
                'component': 'Announcements',
                'data_source': 'announcements',
                'is_custom': False
            },
            {
                'widget_id': 'votes',
                'name': 'Votes',
                'greek_name': 'Ψηφοφορίες',
                'description': 'Active building votes and polls',
                'greek_description': 'Ενεργές ψηφοφορίες και δημοσκοπήσεις κτιρίου',
                'category': 'main_slides',
                'icon': 'Vote',
                'enabled': True,
                'order': 4,
                'settings': {},
                'component': 'Votes',
                'data_source': 'votes',
                'is_custom': False
            },
            {
                'widget_id': 'financial_overview',
                'name': 'Financial Overview',
                'greek_name': 'Οικονομική Επισκόπηση',
                'description': 'Building financial status and payment information',
                'greek_description': 'Οικονομική κατάσταση κτιρίου και πληροφορίες πληρωμών',
                'category': 'main_slides',
                'icon': 'Euro',
                'enabled': True,
                'order': 5,
                'settings': {},
                'component': 'FinancialOverview',
                'data_source': 'financial_info',
                'is_custom': False
            },
            {
                'widget_id': 'apartment_debts',
                'name': 'Apartment Debts',
                'greek_name': 'Οφειλές Διαμερισμάτων',
                'description': 'Summarized view of apartment debts with owner names and amounts',
                'greek_description': 'Περιληπτική εμφάνιση οφειλών διαμερισμάτων με ονόματα και ποσά',
                'category': 'main_slides',
                'icon': 'Euro',
                'enabled': True,
                'order': 5.5,
                'settings': {},
                'component': 'ApartmentDebtsWidget',
                'data_source': 'apartment_balances',
                'is_custom': False
            },
            {
                'widget_id': 'maintenance_overview',
                'name': 'Maintenance Overview',
                'greek_name': 'Υπηρεσίες & Συντήρηση',
                'description': 'Maintenance services and contractor information',
                'greek_description': 'Υπηρεσίες συντήρησης και πληροφορίες συνεργείων',
                'category': 'main_slides',
                'icon': 'Wrench',
                'enabled': True,
                'order': 6,
                'settings': {},
                'component': 'MaintenanceOverview',
                'data_source': 'maintenance_info',
                'is_custom': False
            },
            {
                'widget_id': 'projects_overview',
                'name': 'Projects Overview',
                'greek_name': 'Προσφορές & Έργα',
                'description': 'Active projects and offers',
                'greek_description': 'Ενεργά έργα και προσφορές',
                'category': 'main_slides',
                'icon': 'FileText',
                'enabled': True,
                'order': 7,
                'settings': {},
                'component': 'ProjectsOverview',
                'data_source': 'projects_info',
                'is_custom': False
            },
            {
                'widget_id': 'emergency_contacts',
                'name': 'Emergency Contacts',
                'greek_name': 'Τηλέφωνα Έκτακτης Ανάγκης',
                'description': 'Emergency contact information and procedures',
                'greek_description': 'Πληροφορίες επικοινωνίας και διαδικασίες έκτακτης ανάγκης',
                'category': 'main_slides',
                'icon': 'Shield',
                'enabled': True,
                'order': 8,
                'settings': {},
                'component': 'EmergencyContacts',
                'data_source': 'building_info',
                'is_custom': False
            },
            
            # Sidebar Widgets
            {
                'widget_id': 'weather_widget',
                'name': 'Weather',
                'greek_name': 'Καιρός',
                'description': 'Current weather information',
                'greek_description': 'Τρέχουσες πληροφορίες καιρού',
                'category': 'sidebar_widgets',
                'icon': 'Cloud',
                'enabled': True,
                'order': 1,
                'settings': {},
                'component': 'WeatherWidget',
                'data_source': 'weather_api',
                'is_custom': False
            },
            {
                'widget_id': 'qr_code_connection',
                'name': 'QR Code Connection',
                'greek_name': 'Σύνδεση Κινητού',
                'description': 'QR code for mobile app connection',
                'greek_description': 'QR code για σύνδεση με την εφαρμογή κινητού',
                'category': 'sidebar_widgets',
                'icon': 'QrCode',
                'enabled': True,
                'order': 2,
                'settings': {},
                'component': 'QRCodeConnection',
                'data_source': 'building_info',
                'is_custom': False
            },
            {
                'widget_id': 'building_info',
                'name': 'Building Info',
                'greek_name': 'Πληροφορίες Κτιρίου',
                'description': 'Basic building information and contact details',
                'greek_description': 'Βασικές πληροφορίες κτιρίου και στοιχεία επικοινωνίας',
                'category': 'sidebar_widgets',
                'icon': 'Building',
                'enabled': True,
                'order': 3,
                'settings': {},
                'component': 'BuildingInfo',
                'data_source': 'building_info',
                'is_custom': False
            },
            
            # Top Bar Widgets
            {
                'widget_id': 'time_date',
                'name': 'Time & Date',
                'greek_name': 'Ώρα & Ημερομηνία',
                'description': 'Current time and date display',
                'greek_description': 'Εμφάνιση τρέχουσας ώρας και ημερομηνίας',
                'category': 'top_bar_widgets',
                'icon': 'Clock',
                'enabled': True,
                'order': 1,
                'settings': {},
                'component': 'TimeDate',
                'data_source': 'system',
                'is_custom': False
            },
            {
                'widget_id': 'building_selector',
                'name': 'Building Selector',
                'greek_name': 'Επιλογή Κτιρίου',
                'description': 'Building selection dropdown',
                'greek_description': 'Dropdown επιλογής κτιρίου',
                'category': 'top_bar_widgets',
                'icon': 'Building',
                'enabled': True,
                'order': 2,
                'settings': {},
                'component': 'BuildingSelector',
                'data_source': 'buildings_list',
                'is_custom': False
            },
            
            # Special Widgets
            {
                'widget_id': 'news_ticker',
                'name': 'News Ticker',
                'greek_name': 'Ταινία Ειδήσεων',
                'description': 'Scrolling news ticker',
                'greek_description': 'Κυλιόμενη ταινία ειδήσεων',
                'category': 'special_widgets',
                'icon': 'Globe',
                'enabled': True,
                'order': 1,
                'settings': {},
                'component': 'NewsTicker',
                'data_source': 'news_api',
                'is_custom': False
            }
        ]
        
        # Create widgets
        created_count = 0
        for widget_data in default_widgets:
            try:
                widget, created = KioskWidget.objects.get_or_create(
                    widget_id=widget_data['widget_id'],
                    building=building,
                    defaults={
                        **widget_data,
                        'created_by': user
                    }
                )
                
                if created:
                    print(f"✅ Created widget: {widget.greek_name}")
                    created_count += 1
                else:
                    print(f"↺ Widget already exists: {widget.greek_name}")
                    
            except Exception as e:
                print(f"❌ Error creating widget {widget_data['widget_id']}: {e}")
        
        print(f"\n🎯 Summary:")
        print(f"   - Total widgets configured: {len(default_widgets)}")
        print(f"   - New widgets created: {created_count}")
        print(f"   - Existing widgets: {len(default_widgets) - created_count}")
        
        # Verify widgets
        total_widgets = KioskWidget.objects.filter(building=building).count()
        enabled_widgets = KioskWidget.objects.filter(building=building, enabled=True).count()
        
        print(f"   - Total widgets in database: {total_widgets}")
        print(f"   - Enabled widgets: {enabled_widgets}")
        
        # Show widgets by category
        categories = ['main_slides', 'sidebar_widgets', 'top_bar_widgets', 'special_widgets']
        for category in categories:
            count = KioskWidget.objects.filter(building=building, category=category, enabled=True).count()
            print(f"   - {category}: {count} widgets")

if __name__ == "__main__":
    create_default_widgets()

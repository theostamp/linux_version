#!/usr/bin/env python3
"""
🛡️ Script για validation ανακοινώσεων και αποφυγή διπλότυπων
"""

import os
import sys
from datetime import datetime
from collections import defaultdict

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from announcements.models import Announcement

class AnnouncementValidator:
    """Κλάση για validation ανακοινώσεων"""
    
    @staticmethod
    def validate_building_announcements(building_id):
        """Validation όλων των ανακοινώσεων ενός κτιρίου"""
        
        with schema_context('demo'):
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return {'valid': False, 'error': f'Κτίριο με ID {building_id} δεν βρέθηκε'}
            
            announcements = Announcement.objects.filter(building=building).order_by('-created_at')
            
            results = {
                'valid': True,
                'building_name': building.name,
                'total_announcements': announcements.count(),
                'duplicates_found': 0,
                'issues': []
            }
            
            # Ομαδοποίηση ανά τίτλο
            title_groups = defaultdict(list)
            for announcement in announcements:
                title_groups[announcement.title].append(announcement)
            
            # Έλεγχος για διπλότυπα
            for title, announcements_list in title_groups.items():
                if len(announcements_list) > 1:
                    results['valid'] = False
                    results['duplicates_found'] += len(announcements_list) - 1
                    results['issues'].append({
                        'type': 'duplicate_title',
                        'title': title,
                        'count': len(announcements_list),
                        'announcements': [{'id': ann.id, 'created_at': ann.created_at} for ann in announcements_list]
                    })
            
            return results
    
    @staticmethod
    def get_announcement_summary(building_id):
        """Σύνοψη ανακοινώσεων ενός κτιρίου"""
        
        with schema_context('demo'):
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return {'error': f'Κτίριο με ID {building_id} δεν βρέθηκε'}
            
            announcements = Announcement.objects.filter(building=building).order_by('-created_at')
            
            summary = {
                'building_name': building.name,
                'total_announcements': announcements.count(),
                'by_type': defaultdict(int),
                'by_status': {
                    'urgent': announcements.filter(is_urgent=True).count(),
                    'published': announcements.filter(published=True).count(),
                    'active': announcements.filter(is_active=True).count(),
                },
                'recent_announcements': []
            }
            
            # Ανάλυση ανά τύπο (βασισμένη στον τίτλο)
            for announcement in announcements:
                if 'προσφορά' in announcement.title.lower():
                    summary['by_type']['προσφορές'] += 1
                elif 'έργο' in announcement.title.lower():
                    summary['by_type']['έργα'] += 1
                elif 'συνέλευση' in announcement.title.lower():
                    summary['by_type']['συνέλευσεις'] += 1
                else:
                    summary['by_type']['άλλες'] += 1
            
            # Πρόσφατες ανακοινώσεις
            for announcement in announcements[:5]:
                summary['recent_announcements'].append({
                    'id': announcement.id,
                    'title': announcement.title,
                    'created_at': announcement.created_at.strftime('%d/%m/%Y %H:%M'),
                    'is_urgent': announcement.is_urgent,
                    'is_active': announcement.is_active
                })
            
            return summary

def main():
    """Κύρια συνάρτηση"""
    
    print("🛡️ ANNOUNCEMENT VALIDATOR")
    print("=" * 70)
    
    # Validation
    print("🔍 ΕΛΕΓΧΟΣ ΑΝΑΚΟΙΝΩΣΕΩΝ...")
    result = AnnouncementValidator.validate_building_announcements(1)
    
    if result['valid']:
        print("✅ Όλες οι ανακοινώσεις είναι σωστές!")
        print(f"✅ Σύνολο ανακοινώσεων: {result['total_announcements']}")
    else:
        print("❌ Βρέθηκαν προβλήματα!")
        print(f"❌ {result['duplicates_found']} διπλότυπα ανακοινώσεις")
        
        for issue in result['issues']:
            print(f"   🔄 Διπλότυπο: '{issue['title']}' ({issue['count']} φορές)")
            for ann in issue['announcements']:
                print(f"      - ID {ann['id']}: {ann['created_at'].strftime('%d/%m/%Y %H:%M')}")
    
    print()
    
    # Σύνοψη
    print("📊 ΣΥΝΟΨΗ ΑΝΑΚΟΙΝΩΣΕΩΝ:")
    print("-" * 50)
    summary = AnnouncementValidator.get_announcement_summary(1)
    
    if 'error' not in summary:
        print(f"🏢 Κτίριο: {summary['building_name']}")
        print(f"📢 Σύνολο: {summary['total_announcements']} ανακοινώσεις")
        print()
        
        print("📋 ΑΝΑ ΤΥΠΟ:")
        for type_name, count in summary['by_type'].items():
            print(f"   - {type_name}: {count}")
        
        print()
        
        print("📊 ΑΝΑ ΚΑΤΑΣΤΑΣΗ:")
        print(f"   🚨 Επείγουσες: {summary['by_status']['urgent']}")
        print(f"   📢 Δημοσιευμένες: {summary['by_status']['published']}")
        print(f"   ✅ Ενεργές: {summary['by_status']['active']}")
        
        print()
        
        print("🕒 ΠΡΟΣΦΑΤΕΣ ΑΝΑΚΟΙΝΩΣΕΙΣ:")
        for ann in summary['recent_announcements']:
            urgent_icon = "🚨" if ann['is_urgent'] else "📢"
            active_icon = "✅" if ann['is_active'] else "⏸️"
            print(f"   {urgent_icon} {active_icon} {ann['title']} ({ann['created_at']})")
    
    print("\n" + "=" * 70)
    print("✅ Η validation ολοκληρώθηκε!")

if __name__ == "__main__":
    main()

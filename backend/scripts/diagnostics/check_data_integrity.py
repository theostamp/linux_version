#!/usr/bin/env python
"""
Script για έλεγχο ακεραιότητας δεδομένων
Ελέγχει για gaps σε IDs, orphaned records, και άλλα προβλήματα
"""

import os
import django
from django_tenants.utils import schema_context

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from announcements.models import Announcement
from buildings.models import Building
from user_requests.models import UserRequest
from votes.models import Vote
from obligations.models import Obligation

def check_id_gaps(model_class, model_name):
    """Ελέγχει για gaps στα IDs ενός μοντέλου"""
    print(f"\n🔍 Ελέγχος gaps στα IDs για {model_name}...")
    
    try:
        objects = model_class.objects.all().order_by('id')
        ids = [obj.id for obj in objects]
        
        if not ids:
            print(f"   ✅ Δεν υπάρχουν {model_name}")
            return
        
        min_id = min(ids)
        max_id = max(ids)
        expected_ids = set(range(min_id, max_id + 1))
        actual_ids = set(ids)
        missing_ids = expected_ids - actual_ids
        
        print(f"   📊 Σύνολο: {len(ids)} {model_name}")
        print(f"   📊 Εύρος IDs: {min_id} - {max_id}")
        
        if missing_ids:
            print(f"   ⚠️  Λείπουντα IDs: {sorted(missing_ids)}")
        else:
            print("   ✅ Δεν υπάρχουν gaps στα IDs")
            
    except Exception as e:
        print(f"   ❌ Σφάλμα κατά τον έλεγχο: {e}")

def check_orphaned_records():
    """Ελέγχει για orphaned records"""
    print("\n🔍 Ελέγχος orphaned records...")
    
    try:
        # Ελέγχος ανακοινώσεις χωρίς κτίριο
        orphaned_announcements = Announcement.objects.filter(building__isnull=True)
        if orphaned_announcements.exists():
            print(f"   ⚠️  {orphaned_announcements.count()} ανακοινώσεις χωρίς κτίριο")
            for ann in orphaned_announcements[:5]:
                print(f"      - ID: {ann.id}, Title: {ann.title}")
        else:
            print("   ✅ Όλες οι ανακοινώσεις έχουν κτίριο")
            
        # Ελέγχος αιτήματα χωρίς κτίριο
        orphaned_requests = UserRequest.objects.filter(building__isnull=True)
        if orphaned_requests.exists():
            print(f"   ⚠️  {orphaned_requests.count()} αιτήματα χωρίς κτίριο")
        else:
            print("   ✅ Όλα τα αιτήματα έχουν κτίριο")
            
        # Ελέγχος ψηφοφορίες χωρίς κτίριο
        orphaned_votes = Vote.objects.filter(building__isnull=True)
        if orphaned_votes.exists():
            print(f"   ⚠️  {orphaned_votes.count()} ψηφοφορίες χωρίς κτίριο")
        else:
            print("   ✅ Όλες οι ψηφοφορίες έχουν κτίριο")
            
    except Exception as e:
        print(f"   ❌ Σφάλμα κατά τον έλεγχο: {e}")

def check_data_consistency():
    """Ελέγχει για consistency στα δεδομένα"""
    print("\n🔍 Ελέγχος consistency δεδομένων...")
    
    try:
        # Ελέγχος ανακοινώσεις με λάθος ημερομηνίες
        invalid_dates = Announcement.objects.filter(
            start_date__gt=models.F('end_date')
        )
        if invalid_dates.exists():
            print(f"   ⚠️  {invalid_dates.count()} ανακοινώσεις με λάθος ημερομηνίες")
        else:
            print("   ✅ Όλες οι ανακοινώσεις έχουν σωστές ημερομηνίες")
            
        # Ελέγχος κτίρια χωρίς διαμερίσματα
        buildings_no_apartments = Building.objects.filter(apartments_count=0)
        if buildings_no_apartments.exists():
            print(f"   ⚠️  {buildings_no_apartments.count()} κτίρια χωρίς διαμερίσματα")
        else:
            print("   ✅ Όλα τα κτίρια έχουν διαμερίσματα")
            
    except Exception as e:
        print(f"   ❌ Σφάλμα κατά τον έλεγχο: {e}")

def generate_report():
    """Δημιουργεί αναφορά για όλα τα δεδομένα"""
    print("📋 ΑΝΑΦΟΡΑ ΑΚΕΡΑΙΟΤΗΤΑΣ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 50)
    
    # Ελέγχος για κάθε tenant
    from tenants.models import Client
    
    for tenant in Client.objects.all():
        print(f"\n🏢 TENANT: {tenant.schema_name}")
        print("-" * 30)
        
        with schema_context(tenant.schema_name):
            check_id_gaps(Announcement, "ανακοινώσεις")
            check_id_gaps(Building, "κτίρια")
            check_id_gaps(UserRequest, "αιτήματα")
            check_id_gaps(Vote, "ψηφοφορίες")
            check_id_gaps(Obligation, "υποχρεώσεις")
            
            check_orphaned_records()
            check_data_consistency()

def fix_common_issues():
    """Διορθώνει κοινά προβλήματα"""
    print("\n🔧 ΔΙΟΡΘΩΣΗ ΚΟΙΝΩΝ ΠΡΟΒΛΗΜΑΤΩΝ")
    print("=" * 50)
    
    for tenant in Client.objects.all():
        print(f"\n🏢 TENANT: {tenant.schema_name}")
        
        with schema_context(tenant.schema_name):
            # Διόρθωση orphaned announcements
            orphaned = Announcement.objects.filter(building__isnull=True)
            if orphaned.exists():
                print(f"   🗑️  Διαγραφή {orphaned.count()} orphaned ανακοινώσεων")
                orphaned.delete()
            
            # Διόρθωση orphaned requests
            orphaned_requests = UserRequest.objects.filter(building__isnull=True)
            if orphaned_requests.exists():
                print(f"   🗑️  Διαγραφή {orphaned_requests.count()} orphaned αιτημάτων")
                orphaned_requests.delete()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--fix":
        fix_common_issues()
    else:
        generate_report()
        
    print("\n✅ Έλεγχος ολοκληρώθηκε!") 
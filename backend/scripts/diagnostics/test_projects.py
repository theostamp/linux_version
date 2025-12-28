import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from buildings.models import Building
from django.contrib.auth import get_user_model

User = get_user_model()

with schema_context('demo'):
    # Get building
    building = Building.objects.first()
    if not building:
        print("No building found!")
        exit(1)
    
    # Get or create user
    user, created = User.objects.get_or_create(
        email="admin@demo.com",
        defaults={'first_name': 'Admin', 'last_name': 'User'}
    )
    
    # Create test project
    project = Project.objects.create(
        title="Επισκευή Ανελκυστήρα",
        description="Αντικατάσταση παλαιού ανελκυστήρα με καινούριο",
        building=building,
        estimated_cost=Decimal("15000.00"),
        priority="high",
        status="tendering",
        created_by=user,
        tender_deadline=date(2025, 10, 1),
        general_assembly_date=date(2025, 10, 15)
    )
    print(f"Created project: {project}")
    
    # Create test offer
    offer = Offer.objects.create(
        project=project,
        contractor_name="Τεχνική Εταιρία ΑΕ",
        contractor_phone="210-1234567",
        contractor_email="info@techniki.gr",
        amount=Decimal("14500.00"),
        description="Πλήρης αντικατάσταση ανελκυστήρα με νέο μοντέλο OTIS",
        payment_terms="30% προκαταβολή, 70% με την παράδοση",
        warranty_period="5 έτη",
        completion_time="45 εργάσιμες ημέρες",
        status="submitted"
    )
    print(f"Created offer: {offer}")
    
    # Test retrieving data
    projects_count = Project.objects.count()
    offers_count = Offer.objects.count()
    
    print(f"\nSummary:")
    print(f"  - Total projects: {projects_count}")
    print(f"  - Total offers: {offers_count}")
    
    # Verify fields
    offer_refresh = Offer.objects.get(id=offer.id)
    print(f"\nOffer details:")
    print(f"  - Submitted at: {offer_refresh.submitted_at}")
    print(f"  - Reviewed at: {offer_refresh.reviewed_at}")
    print(f"  - Status: {offer_refresh.status}")
    
    print("\nTest completed successfully! ✅")

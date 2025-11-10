import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date, timedelta

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from buildings.models import Building
from django.contrib.auth import get_user_model

User = get_user_model()

with schema_context('demo'):
    # Get building and user
    building = Building.objects.first()
    user = User.objects.filter(email="admin@demo.com").first()
    
    # Create more sample projects
    projects_data = [
        {
            'title': 'Αντικατάσταση Σωλήνων Ύδρευσης',
            'description': 'Αντικατάσταση παλαιών σωλήνων ύδρευσης στους κοινόχρηστους χώρους',
            'estimated_cost': Decimal('8500.00'),
            'priority': 'high',
            'status': 'tendering',
            'tender_deadline': date(2025, 10, 5),
        },
        {
            'title': 'Βάψιμο Κοινόχρηστων Χώρων',
            'description': 'Ανανέωση βαφής σε όλους τους κοινόχρηστους χώρους του κτιρίου',
            'estimated_cost': Decimal('3200.00'),
            'priority': 'medium',
            'status': 'planning',
        },
        {
            'title': 'Εγκατάσταση Συστήματος Ασφαλείας',
            'description': 'Τοποθέτηση καμερών και συστήματος access control',
            'estimated_cost': Decimal('12000.00'),
            'priority': 'medium',
            'status': 'evaluation',
            'general_assembly_date': date(2025, 11, 1),
        },
    ]
    
    for proj_data in projects_data:
        project = Project.objects.create(
            building=building,
            created_by=user,
            **proj_data
        )
        print(f"Created project: {project.title}")
        
        # Add some offers for the second project
        if project.status in ['tendering', 'evaluation']:
            offers_data = [
                {
                    'contractor_name': 'Κατασκευαστική Αθηνών ΑΕ',
                    'contractor_phone': '210-2223334',
                    'contractor_email': 'info@kataskevastiki.gr',
                    'amount': project.estimated_cost * Decimal('0.95'),
                    'description': f'Πλήρης υλοποίηση έργου: {project.title}',
                    'payment_terms': '40% προκαταβολή, 60% με την παράδοση',
                    'warranty_period': '2 έτη',
                    'completion_time': '30 εργάσιμες ημέρες',
                },
                {
                    'contractor_name': 'Τεχνική Ομάδα ΑΒΕΕ',
                    'contractor_phone': '210-3334445',
                    'contractor_email': 'offers@techniki-omada.gr',
                    'amount': project.estimated_cost * Decimal('0.90'),
                    'description': f'Εξειδικευμένη υλοποίηση: {project.title}',
                    'payment_terms': '20% προκαταβολή, 80% σε 3 δόσεις',
                    'warranty_period': '3 έτη',
                    'completion_time': '25 εργάσιμες ημέρες',
                },
            ]
            
            for offer_data in offers_data:
                offer = Offer.objects.create(
                    project=project,
                    status='submitted',
                    **offer_data
                )
                print(f"  - Added offer from: {offer.contractor_name} (€{offer.amount})")
    
    # Summary
    print(f"\n=== SUMMARY ===")
    print(f"Total projects: {Project.objects.count()}")
    print(f"Total offers: {Offer.objects.count()}")
    
    # List all projects with offers
    print(f"\n=== PROJECTS & OFFERS ===")
    for project in Project.objects.all():
        print(f"\n{project.title} ({project.status}):")
        print(f"  Estimated cost: €{project.estimated_cost}")
        offers = project.offers.all()
        if offers:
            print(f"  Offers ({offers.count()}):")
            for offer in offers:
                print(f"    - {offer.contractor_name}: €{offer.amount}")
        else:
            print(f"  No offers yet")

print("\n✅ Sample data created successfully!")

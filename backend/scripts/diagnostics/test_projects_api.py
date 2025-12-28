#!/usr/bin/env python
"""
Test if projects are accessible through the API
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from projects.views import ProjectViewSet
from projects.models import Project

User = get_user_model()

def test_projects_api():
    with schema_context('demo'):
        print("\n🔍 TESTING PROJECT API ENDPOINT")
        print("=" * 60)

        # Get a user for authentication
        user = User.objects.first()
        if not user:
            print("❌ No user found")
            return

        print(f"✅ Using user: {user.email}")

        # Create request factory
        factory = RequestFactory()

        # Create a GET request with building filter
        request = factory.get('/api/projects/projects/', {'building': 1, 'page_size': 1000})
        request.user = user
        request.query_params = request.GET

        # Create viewset and get queryset
        viewset = ProjectViewSet()
        viewset.request = request
        viewset.format_kwarg = None

        # Get the filtered queryset
        queryset = viewset.filter_queryset(viewset.get_queryset())

        print(f"\n📋 Projects returned by API (filtered for building 1):")
        print(f"Total count: {queryset.count()}")

        for project in queryset:
            print(f"\n  - ID: {project.id}")
            print(f"    Title: {project.title}")
            print(f"    Status: {project.status}")
            print(f"    Building: {project.building.name if project.building else 'None'}")
            print(f"    Created: {project.created_at}")

            # Check if this would be visible for offers
            can_receive_offers = (
                project.status in ['planning', 'bidding', 'awarded'] and
                not project.selected_contractor
            )

            if can_receive_offers:
                print(f"    ✅ Can receive offers")
            else:
                print(f"    ❌ Cannot receive offers")
                if project.status not in ['planning', 'bidding', 'awarded']:
                    print(f"       - Status '{project.status}' not eligible")
                if project.selected_contractor:
                    print(f"       - Already has contractor: {project.selected_contractor}")

if __name__ == '__main__':
    test_projects_api()
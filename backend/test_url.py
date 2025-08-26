#!/usr/bin/env python3
"""
Test script για το URL pattern
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.urls import reverse


def test_url():
    """Test του URL pattern"""
    
    print("🧪 Testing URL patterns")
    print("=" * 30)
    
    try:
        # Test reverse URL
        url = reverse('dashboard-summary')
        print(f"✅ URL: {url}")
    except Exception as e:
        print(f"❌ Error with reverse: {e}")
    
    try:
        # Test list URL
        url = reverse('dashboard-list')
        print(f"✅ List URL: {url}")
    except Exception as e:
        print(f"❌ Error with list reverse: {e}")


if __name__ == "__main__":
    test_url()

#!/usr/bin/env python
"""
Test script για Projects & Offers Flow
Ελέγχει ότι όλα τα components λειτουργούν σωστά:
1. Project creation → Announcement & Vote creation
2. Offer creation → Validation
3. Offer approval → ScheduledMaintenance & Expenses creation
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from projects.models import Project, Offer
from announcements.models import Announcement
from votes.models import Vote
from maintenance.models import ScheduledMaintenance
from financial.models import Expense
from decimal import Decimal
from datetime import date, timedelta

User = get_user_model()

def test_project_creation_signals():
    """Test ότι δημιουργείται announcement και vote για νέο project"""
    print("\n" + "="*60)
    print("TEST 1: Project Creation → Announcement & Vote")
    print("="*60)
    
    # Βρες user και building
    user = User.objects.first()
    if not user:
        print("❌ Δεν βρέθηκε user. Δημιούργησε έναν πρώτα.")
        return False
    
    from buildings.models import Building
    building = Building.objects.first()
    if not building:
        print("❌ Δεν βρέθηκε building. Δημιούργησε ένα πρώτα.")
        return False
    
    # Μετρήσε υπάρχοντα
    initial_announcements = Announcement.objects.filter(building=building).count()
    initial_votes = Vote.objects.filter(building=building).count()
    
    # Δημιούργησε project
    project = Project.objects.create(
        title="Test Project - Signal Verification",
        description="Test project για verification signals",
        building=building,
        created_by=user,
        estimated_cost=Decimal('10000.00'),
        priority='medium',
        status='planning',
    )
    
    print(f"✅ Project created: {project.id}")
    
    # Έλεγξε announcement
    announcements = Announcement.objects.filter(
        building=building,
        project=project,
        title__icontains=project.title
    )
    
    if announcements.exists():
        announcement = announcements.first()
        print(f"✅ Announcement created: {announcement.id}")
        print(f"   Title: {announcement.title}")
        print(f"   Linked to project: {project in announcement.projects.all()}")
    else:
        print("❌ Announcement NOT created!")
        return False
    
    # Έλεγξε vote
    votes = Vote.objects.filter(
        building=building,
        project=project
    )
    
    if votes.exists():
        vote = votes.first()
        print(f"✅ Vote created: {vote.id}")
        print(f"   Title: {vote.title}")
        print(f"   Linked to project: {vote.project_id == project.id}")
        print(f"   End date: {vote.end_date}")
    else:
        print("❌ Vote NOT created!")
        return False
    
    # Cleanup
    project.delete()
    print("\n✅ Test 1 PASSED: Announcement & Vote created correctly")
    return True


def test_offer_validation():
    """Test ότι το offer validation λειτουργεί"""
    print("\n" + "="*60)
    print("TEST 2: Offer Validation")
    print("="*60)
    
    from projects.serializers import OfferSerializer
    from rest_framework.exceptions import ValidationError
    
    user = User.objects.first()
    from buildings.models import Building
    building = Building.objects.first()
    
    if not user or not building:
        print("❌ Missing user or building")
        return False
    
    # Δημιούργησε project
    project = Project.objects.create(
        title="Test Project - Offer Validation",
        building=building,
        created_by=user,
    )
    
    # Test 1: Missing contractor_name
    print("\nTest 2.1: Missing contractor_name")
    try:
        serializer = OfferSerializer(data={
            'project': project.id,
            'amount': 1000,
        })
        serializer.is_valid(raise_exception=True)
        print("❌ Should have failed validation")
        return False
    except ValidationError as e:
        if 'contractor_name' in str(e):
            print("✅ Validation correctly rejected missing contractor_name")
        else:
            print(f"❌ Wrong validation error: {e}")
            return False
    
    # Test 2: Negative amount
    print("\nTest 2.2: Negative amount")
    try:
        serializer = OfferSerializer(data={
            'project': project.id,
            'contractor_name': 'Test Contractor',
            'amount': -100,
        })
        serializer.is_valid(raise_exception=True)
        print("❌ Should have failed validation")
        return False
    except ValidationError as e:
        if 'amount' in str(e) or 'ποσό' in str(e).lower():
            print("✅ Validation correctly rejected negative amount")
        else:
            print(f"❌ Wrong validation error: {e}")
            return False
    
    # Test 3: Valid offer
    print("\nTest 2.3: Valid offer")
    serializer = OfferSerializer(data={
        'project': project.id,
        'contractor_name': 'Test Contractor',
        'amount': 1000,
        'payment_method': 'one_time',
    })
    if serializer.is_valid():
        print("✅ Valid offer accepted")
    else:
        print(f"❌ Valid offer rejected: {serializer.errors}")
        return False
    
    # Test 4: Advance payment > amount
    print("\nTest 2.4: Advance payment > amount")
    try:
        serializer = OfferSerializer(data={
            'project': project.id,
            'contractor_name': 'Test Contractor',
            'amount': 1000,
            'advance_payment': 1500,
        })
        serializer.is_valid(raise_exception=True)
        print("❌ Should have failed validation")
        return False
    except ValidationError as e:
        if 'advance_payment' in str(e) or 'προκαταβολή' in str(e).lower():
            print("✅ Validation correctly rejected advance_payment > amount")
        else:
            print(f"❌ Wrong validation error: {e}")
            return False
    
    # Cleanup
    project.delete()
    print("\n✅ Test 2 PASSED: Offer validation works correctly")
    return True


def test_offer_approval_flow():
    """Test ότι το approve offer δημιουργεί ScheduledMaintenance & Expenses"""
    print("\n" + "="*60)
    print("TEST 3: Offer Approval → ScheduledMaintenance & Expenses")
    print("="*60)
    
    user = User.objects.first()
    from buildings.models import Building
    building = Building.objects.first()
    
    if not user or not building:
        print("❌ Missing user or building")
        return False
    
    # Δημιούργησε project
    project = Project.objects.create(
        title="Test Project - Offer Approval",
        building=building,
        created_by=user,
        estimated_cost=Decimal('10000.00'),
    )
    
    # Δημιούργησε offer
    offer = Offer.objects.create(
        project=project,
        contractor_name="Test Contractor",
        amount=Decimal('12000.00'),
        payment_method='installments',
        installments=3,
        advance_payment=Decimal('2000.00'),
    )
    
    print(f"✅ Project created: {project.id}")
    print(f"✅ Offer created: {offer.id}")
    
    # Approve offer
    from projects.views import OfferViewSet
    from rest_framework.test import APIRequestFactory
    from rest_framework.request import Request
    
    factory = APIRequestFactory()
    request = factory.post(f'/api/projects/offers/{offer.id}/approve/')
    request.user = user
    
    viewset = OfferViewSet()
    viewset.request = request
    viewset.format_kwarg = None
    
    try:
        response = viewset.approve(request, pk=str(offer.id))
        print(f"✅ Offer approved: {response.status_code}")
    except Exception as e:
        print(f"❌ Error approving offer: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Refresh from DB
    project.refresh_from_db()
    offer.refresh_from_db()
    
    # Έλεγξε ScheduledMaintenance
    scheduled_maintenance = ScheduledMaintenance.objects.filter(
        linked_project=project
    ).first()
    
    if scheduled_maintenance:
        print(f"✅ ScheduledMaintenance created: {scheduled_maintenance.id}")
        print(f"   Title: {scheduled_maintenance.title}")
        print(f"   Contractor: {scheduled_maintenance.contractor_name}")
        print(f"   Total cost: {scheduled_maintenance.total_cost}")
    else:
        print("❌ ScheduledMaintenance NOT created!")
        return False
    
    # Έλεγξε Expenses
    expenses = Expense.objects.filter(project=project)
    print(f"\n✅ Expenses created: {expenses.count()}")
    
    if expenses.exists():
        for expense in expenses:
            print(f"   - {expense.title}: €{expense.amount}")
        
        # Έλεγξε προκαταβολή
        advance_expense = expenses.filter(title__icontains='Προκαταβολή').first()
        if advance_expense:
            print(f"✅ Advance payment expense: €{advance_expense.amount}")
        else:
            print("⚠️  Advance payment expense not found")
        
        # Έλεγξε δόσεις
        installments = expenses.filter(title__icontains='Δόση')
        print(f"✅ Installment expenses: {installments.count()}")
    else:
        print("❌ Expenses NOT created!")
        return False
    
    # Cleanup
    project.delete()
    print("\n✅ Test 3 PASSED: ScheduledMaintenance & Expenses created correctly")
    return True


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("PROJECTS & OFFERS FLOW VERIFICATION")
    print("="*60)
    
    results = []
    
    try:
        results.append(("Project Creation Signals", test_project_creation_signals()))
    except Exception as e:
        print(f"\n❌ Test 1 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Project Creation Signals", False))
    
    try:
        results.append(("Offer Validation", test_offer_validation()))
    except Exception as e:
        print(f"\n❌ Test 2 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Offer Validation", False))
    
    try:
        results.append(("Offer Approval Flow", test_offer_approval_flow()))
    except Exception as e:
        print(f"\n❌ Test 3 FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Offer Approval Flow", False))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())




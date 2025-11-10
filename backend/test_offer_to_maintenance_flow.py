#!/usr/bin/env python
"""
Test για την πλήρη ροή δεδομένων από αποδοχή προσφοράς σε scheduled maintenance.

Ελέγχει ότι όλα τα πεδία μεταφέρονται σωστά:
- payment_method
- installments
- advance_payment
- payment_terms
- contractor details
"""

import os
import sys
import django
from django.utils import timezone
from decimal import Decimal

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance
from financial.models import Expense

def test_offer_to_maintenance_flow():
    """Test the complete flow from offer acceptance to scheduled maintenance"""

    with schema_context('demo'):
        print("\n🧪 TEST: Αποδοχή προσφοράς → Scheduled Maintenance")
        print("=" * 60)

        # 1. Έλεγχος αν υπάρχει εγκεκριμένο project με προσφορά
        approved_project = Project.objects.filter(
            status='approved',
            selected_contractor__isnull=False
        ).first()

        if approved_project:
            print(f"\n✅ Βρέθηκε εγκεκριμένο έργο: {approved_project.title}")
            print(f"   - ID: {approved_project.id}")
            print(f"   - Ανάδοχος: {approved_project.selected_contractor}")
            print(f"   - Τελικό κόστος: €{approved_project.final_cost}")
            print(f"   - Payment Method: {approved_project.payment_method}")
            print(f"   - Installments: {approved_project.installments}")
            print(f"   - Advance Payment: €{approved_project.advance_payment}")
            print(f"   - Payment Terms: {approved_project.payment_terms}")

            # 2. Έλεγχος αν υπάρχει αντίστοιχο ScheduledMaintenance
            scheduled = ScheduledMaintenance.objects.filter(
                title=approved_project.title,
                building=approved_project.building
            ).first()

            if scheduled:
                print(f"\n📋 ScheduledMaintenance βρέθηκε:")
                print(f"   - ID: {scheduled.id}")
                print(f"   - Title: {scheduled.title}")
                print(f"   - Contractor Name: {scheduled.contractor_name}")
                print(f"   - Total Cost: €{scheduled.total_cost}")
                print(f"   - Payment Method: {scheduled.payment_method}")
                print(f"   - Installments: {scheduled.installments}")
                print(f"   - Advance Payment: €{scheduled.advance_payment}")
                print(f"   - Payment Terms: {scheduled.payment_terms}")
                print(f"   - Contractor Contact: {scheduled.contractor_contact}")
                print(f"   - Contractor Phone: {scheduled.contractor_phone}")
                print(f"   - Contractor Email: {scheduled.contractor_email}")

                # 3. Έλεγχος συμβατότητας
                print(f"\n🔍 Έλεγχος συμβατότητας δεδομένων:")

                issues = []

                # Check contractor name
                if scheduled.contractor_name != approved_project.selected_contractor:
                    issues.append(f"❌ Contractor name mismatch: '{scheduled.contractor_name}' != '{approved_project.selected_contractor}'")
                else:
                    print("   ✅ Contractor name OK")

                # Check total cost
                if scheduled.total_cost != approved_project.final_cost:
                    issues.append(f"❌ Total cost mismatch: €{scheduled.total_cost} != €{approved_project.final_cost}")
                else:
                    print("   ✅ Total cost OK")

                # Check payment method
                if scheduled.payment_method != approved_project.payment_method:
                    issues.append(f"❌ Payment method mismatch: '{scheduled.payment_method}' != '{approved_project.payment_method}'")
                else:
                    print("   ✅ Payment method OK")

                # Check installments
                if scheduled.installments != approved_project.installments:
                    issues.append(f"❌ Installments mismatch: {scheduled.installments} != {approved_project.installments}")
                else:
                    print("   ✅ Installments OK")

                # Check advance payment
                if scheduled.advance_payment != approved_project.advance_payment:
                    issues.append(f"❌ Advance payment mismatch: €{scheduled.advance_payment} != €{approved_project.advance_payment}")
                else:
                    print("   ✅ Advance payment OK")

                # Check payment terms
                if scheduled.payment_terms != approved_project.payment_terms:
                    issues.append(f"❌ Payment terms mismatch: '{scheduled.payment_terms}' != '{approved_project.payment_terms}'")
                else:
                    print("   ✅ Payment terms OK")

                # 4. Find related offer for contractor details
                accepted_offer = Offer.objects.filter(
                    project=approved_project,
                    status='accepted'
                ).first()

                if accepted_offer:
                    print(f"\n📄 Εγκεκριμένη προσφορά:")
                    print(f"   - Contractor: {accepted_offer.contractor_name}")
                    print(f"   - Contact: {accepted_offer.contractor_contact}")
                    print(f"   - Phone: {accepted_offer.contractor_phone}")
                    print(f"   - Email: {accepted_offer.contractor_email}")

                    # Check contractor details
                    if scheduled.contractor_contact != accepted_offer.contractor_contact:
                        issues.append(f"❌ Contractor contact mismatch: '{scheduled.contractor_contact}' != '{accepted_offer.contractor_contact}'")
                    else:
                        print("   ✅ Contractor contact OK")

                    if scheduled.contractor_phone != accepted_offer.contractor_phone:
                        issues.append(f"❌ Contractor phone mismatch: '{scheduled.contractor_phone}' != '{accepted_offer.contractor_phone}'")
                    else:
                        print("   ✅ Contractor phone OK")

                    if scheduled.contractor_email != accepted_offer.contractor_email:
                        issues.append(f"❌ Contractor email mismatch: '{scheduled.contractor_email}' != '{accepted_offer.contractor_email}'")
                    else:
                        print("   ✅ Contractor email OK")
                else:
                    print("\n⚠️ Δεν βρέθηκε εγκεκριμένη προσφορά για το έργο")

                # 5. Check linked expense
                expense = Expense.objects.filter(
                    title__icontains=approved_project.title,
                    building=approved_project.building
                ).first()

                if expense:
                    print(f"\n💰 Συνδεδεμένη δαπάνη:")
                    print(f"   - Title: {expense.title}")
                    print(f"   - Amount: €{expense.amount}")
                    print(f"   - Category: {expense.category}")
                    print(f"   - Notes: {expense.notes[:100]}...")
                else:
                    issues.append("❌ Δεν βρέθηκε συνδεδεμένη δαπάνη")

                # Final report
                if issues:
                    print(f"\n❌ ΒΡΕΘΗΚΑΝ {len(issues)} ΠΡΟΒΛΗΜΑΤΑ:")
                    for issue in issues:
                        print(f"   {issue}")
                else:
                    print("\n✅ ΟΛΑ ΤΑ ΔΕΔΟΜΕΝΑ ΕΧΟΥΝ ΜΕΤΑΦΕΡΘΕΙ ΣΩΣΤΑ!")

            else:
                print(f"\n❌ ΔΕΝ βρέθηκε ScheduledMaintenance για το έργο '{approved_project.title}'")
                print("   Πιθανώς πρέπει να εκτελεστεί η update_project_schedule()")
        else:
            print("\n⚠️ Δεν βρέθηκαν εγκεκριμένα έργα με ανάδοχο")
            print("   Παρακαλώ εγκρίνετε μια προσφορά πρώτα από το UI")

            # Show available projects
            projects = Project.objects.all().order_by('-created_at')[:5]
            if projects:
                print("\n📁 Διαθέσιμα έργα:")
                for p in projects:
                    print(f"   - {p.title} (status: {p.status}, contractor: {p.selected_contractor or 'None'})")

if __name__ == '__main__':
    test_offer_to_maintenance_flow()
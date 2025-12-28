#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance
from maintenance.serializers import ScheduledMaintenanceWithPaymentsSerializer
from django.test import RequestFactory
from users.models import CustomUser

with schema_context('demo'):
    print("\n" + "="*70)
    print("ΕΛΕΓΧΟΣ API RESPONSE ΓΙΑ SCHEDULED MAINTENANCE")
    print("="*70)

    # Βρες το ScheduledMaintenance
    sm = ScheduledMaintenance.objects.filter(title='Στεγανοποίηση Ταράτσας').first()

    if sm:
        # Create a mock request
        factory = RequestFactory()
        request = factory.get(f'/api/maintenance/scheduled/{sm.id}/')

        # Create a test user for the request
        user = CustomUser.objects.first()
        if user:
            request.user = user

        # Serialize the data
        serializer = ScheduledMaintenanceWithPaymentsSerializer(sm, context={'request': request})
        data = serializer.data

        print(f"\n📋 ScheduledMaintenance ID: {sm.id}")
        print(f"\nΠΛΗΡΗΣ API RESPONSE:")
        print("-"*50)

        # Basic info
        print(f"ID: {data.get('id')}")
        print(f"Τίτλος: {data.get('title')}")
        print(f"Κατάσταση: {data.get('status')}")
        print(f"Προγραμματισμένη Ημερομηνία: {data.get('scheduled_date')}")
        print(f"Συνολικό Κόστος: €{data.get('total_cost')}")

        # Payment info
        print(f"\nΣτοιχεία Πληρωμής:")
        print(f"  Τρόπος Πληρωμής: {data.get('payment_method')}")
        print(f"  Δόσεις: {data.get('installments')}")
        print(f"  Προκαταβολή: €{data.get('advance_payment')}")

        # Contractor info
        print(f"\nΣυνεργείο:")
        print(f"  Όνομα: {data.get('contractor_name')}")
        print(f"  Επαφή: {data.get('contractor_contact')}")
        print(f"  Τηλέφωνο: {data.get('contractor_phone')}")
        print(f"  Email: {data.get('contractor_email')}")

        # Payment Schedule
        ps = data.get('payment_schedule')
        if ps:
            print(f"\n✅ Payment Schedule:")
            print(f"  ID: {ps.get('id')}")
            print(f"  Τύπος: {ps.get('payment_type')}")
            print(f"  Σύνολο: €{ps.get('total_amount')}")
            print(f"  Δόσεις: {ps.get('installment_count')}")
            print(f"  Προκαταβολή: {ps.get('advance_percentage')}%")
        else:
            print(f"\n❌ Δεν υπάρχει payment_schedule στο response")

        # Payment aggregates
        aggregates = data.get('payment_aggregates')
        if aggregates:
            print(f"\n📊 Payment Aggregates:")
            print(f"  Total Installments: {aggregates.get('total_installments')}")
            print(f"  Total Amount: €{aggregates.get('total_amount')}")
            print(f"  Paid Amount: €{aggregates.get('paid_amount')}")
            print(f"  Remaining Amount: €{aggregates.get('remaining_amount')}")
            print(f"  Total Receipts: {aggregates.get('total_receipts')}")
        else:
            print(f"\n⚠️ Δεν υπάρχουν payment_aggregates στο response")

        # Check payment history endpoint
        print(f"\n" + "-"*50)
        print("ΕΛΕΓΧΟΣ PAYMENT HISTORY ENDPOINT:")
        print("-"*50)

        from maintenance.views import ScheduledMaintenanceViewSet
        viewset = ScheduledMaintenanceViewSet()
        viewset.request = request
        viewset.kwargs = {'pk': sm.id}

        try:
            response = viewset.payment_history(request, pk=sm.id)
            history = response.data

            print(f"\nInstallments: {len(history.get('installments', []))} δόσεις")
            for inst in history.get('installments', []):
                print(f"  • Δόση {inst['installment_number']}: €{inst['amount']} - {inst['due_date']} ({inst['status']})")

            print(f"\nReceipts: {len(history.get('receipts', []))} αποδείξεις")

        except Exception as e:
            print(f"❌ Σφάλμα στο payment_history: {e}")

    else:
        print("\n❌ Δεν βρέθηκε το ScheduledMaintenance")

    print("\n" + "="*70)
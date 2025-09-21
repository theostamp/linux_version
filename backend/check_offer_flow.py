#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from financial.models import Expense
from maintenance.models import ScheduledMaintenance

with schema_context('demo'):
    print("\n" + "="*60)
    print("ΕΛΕΓΧΟΣ ΡΟΗΣ: ΠΡΟΣΦΟΡΑ → ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΟ ΕΡΓΟ → ΔΑΠΑΝΗ")
    print("="*60)

    # 1. Βρες εγκεκριμένες προσφορές
    accepted_offers = Offer.objects.filter(status='accepted').select_related('project')

    if not accepted_offers.exists():
        print("\n❌ Δεν βρέθηκαν εγκεκριμένες προσφορές")
    else:
        print(f"\n✅ Βρέθηκαν {accepted_offers.count()} εγκεκριμένες προσφορές")

    for offer in accepted_offers:
        print(f"\n{'─'*50}")
        print(f"📋 ΠΡΟΣΦΟΡΑ: {offer.contractor_name}")
        print(f"   Έργο: {offer.project.title}")
        print(f"   Ποσό: €{offer.amount}")
        print(f"   Δόσεις: {offer.installments or 1}")
        print(f"   Προκαταβολή: €{offer.advance_payment or 0}")
        print(f"   Μέθοδος πληρωμής: {offer.payment_method or 'Δεν ορίστηκε'}")

        # 2. Έλεγχος αν το έργο έχει linked_expense
        project = offer.project
        if project.linked_expense:
            print(f"\n   ✅ Συνδεδεμένη Δαπάνη ID: {project.linked_expense.id}")
            expense = project.linked_expense
            print(f"      Τίτλος: {expense.title}")
            print(f"      Ποσό: €{expense.amount}")
            print(f"      Κατηγορία: {expense.category}")
            print(f"      Ημερομηνία λήξης: {expense.due_date}")
            print(f"      Τύπος κατανομής: {expense.distribution_type}")
        else:
            print(f"\n   ❌ ΔΕΝ υπάρχει συνδεδεμένη δαπάνη")

        # 3. Έλεγχος για ScheduledMaintenance
        scheduled = ScheduledMaintenance.objects.filter(
            title=project.title,
            building=project.building
        ).first()

        if scheduled:
            print(f"\n   ✅ Προγραμματισμένη Συντήρηση:")
            print(f"      ID: {scheduled.id}")
            print(f"      Ημερομηνία: {scheduled.scheduled_date}")
            print(f"      Κόστος: €{scheduled.total_cost}")
            print(f"      Κατάσταση: {scheduled.status}")
            print(f"      Δόσεις: {scheduled.installments}")
            print(f"      Προκαταβολή: €{scheduled.advance_payment or 0}")
        else:
            print(f"\n   ❌ ΔΕΝ υπάρχει προγραμματισμένη συντήρηση")

    # 4. Γενικός έλεγχος δαπανών για έργα
    print(f"\n{'='*60}")
    print("ΣΥΝΟΛΙΚΟΣ ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ")
    print("="*60)

    project_expenses = Expense.objects.filter(
        title__startswith='Έργο:'
    ).order_by('-created_at')[:5]

    if project_expenses:
        print(f"\n✅ Βρέθηκαν {project_expenses.count()} δαπάνες έργων:")
        for exp in project_expenses:
            print(f"\n   • {exp.title}")
            print(f"     Ποσό: €{exp.amount}")
            print(f"     Ημερομηνία: {exp.date}")
            print(f"     Κατηγορία: {exp.category}")
    else:
        print("\n❌ Δεν βρέθηκαν δαπάνες έργων")
#!/usr/bin/env python
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from projects.views import update_project_schedule
from datetime import datetime, timedelta

with schema_context('demo'):
    print("\n" + "="*60)
    print("ΔΙΟΡΘΩΣΗ: Δημιουργία Δαπάνης & Προγραμματισμένου Έργου")
    print("="*60)

    # Βρες την εγκεκριμένη προσφορά
    offer = Offer.objects.filter(
        status='accepted',
        contractor_name='αβφγ'
    ).select_related('project').first()

    if not offer:
        print("\n❌ Δεν βρέθηκε η εγκεκριμένη προσφορά")
        sys.exit(1)

    project = offer.project

    print(f"\n📋 Προσφορά: {offer.contractor_name}")
    print(f"   Έργο: {project.title}")
    print(f"   Ποσό: €{offer.amount}")
    print(f"   Δόσεις: {offer.installments}")
    print(f"   Προκαταβολή: €{offer.advance_payment or 0}")

    # Ενημέρωση του project με τα στοιχεία της προσφοράς
    print("\n🔧 Ενημέρωση στοιχείων έργου...")
    project.selected_contractor = offer.contractor_name
    project.final_cost = offer.amount
    project.payment_terms = offer.payment_terms
    project.payment_method = offer.payment_method
    project.installments = offer.installments
    project.advance_payment = offer.advance_payment

    # Ορισμός deadline αν δεν υπάρχει
    if not project.deadline:
        project.deadline = datetime.now().date() + timedelta(days=30)

    project.save()
    print("✅ Ενημερώθηκε το έργο")

    # Κλήση της update_project_schedule
    print("\n🔧 Εκτέλεση update_project_schedule...")
    try:
        update_project_schedule(project, offer)
        print("✅ Επιτυχής δημιουργία!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

    # Έλεγχος αποτελεσμάτων
    project.refresh_from_db()

    if project.linked_expense:
        expense = project.linked_expense
        print(f"\n✅ ΔΗΜΙΟΥΡΓΗΘΗΚΕ ΔΑΠΑΝΗ:")
        print(f"   ID: {expense.id}")
        print(f"   Τίτλος: {expense.title}")
        print(f"   Ποσό: €{expense.amount}")
        print(f"   Ημερομηνία λήξης: {expense.due_date}")
        print(f"   Κατηγορία: {expense.category}")
        print(f"   Τύπος κατανομής: {expense.distribution_type}")
    else:
        print("\n❌ Δεν δημιουργήθηκε δαπάνη")

    # Έλεγχος για ScheduledMaintenance
    from maintenance.models import ScheduledMaintenance
    scheduled = ScheduledMaintenance.objects.filter(
        title=project.title,
        building=project.building
    ).first()

    if scheduled:
        print(f"\n✅ ΔΗΜΙΟΥΡΓΗΘΗΚΕ ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗ ΣΥΝΤΗΡΗΣΗ:")
        print(f"   ID: {scheduled.id}")
        print(f"   Ημερομηνία: {scheduled.scheduled_date}")
        print(f"   Κόστος: €{scheduled.total_cost}")
        print(f"   Δόσεις: {scheduled.installments}")
        print(f"   Προκαταβολή: €{scheduled.advance_payment or 0}")
    else:
        print("\n❌ Δεν δημιουργήθηκε προγραμματισμένη συντήρηση")